import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../shared/logger/index.js";
import { sha256 } from "../../shared/utils/hash.js";
import { signAccessToken, signForgotPasswordToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt.js";
import { verifyPassword } from "../../shared/utils/password.js";
import { assertEmail, assertRequiredString } from "../../shared/utils/validation.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { createForgotPasswordToken, getRefreshSession, revokeRefreshSession, rotateRefreshSession } from "./auth.repository.js";
import { getAnyOrganizationId, getUserAuthorizationContext, getUserForAuthByEmail, updateLastLoginAt } from "../users/users.repository.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { getSecurityConfigForOrganization } from "../admin/admin.repository.js";

function parseJwtExpiryToDate(ttl) {
  const now = Date.now();
  const value = String(ttl);

  if (value.endsWith("m")) return new Date(now + Number(value.slice(0, -1)) * 60_000);
  if (value.endsWith("h")) return new Date(now + Number(value.slice(0, -1)) * 3_600_000);
  if (value.endsWith("d")) return new Date(now + Number(value.slice(0, -1)) * 86_400_000);
  return new Date(now + Number(value) * 1000);
}

function buildTokenPayload(user, sessionId) {
  return {
    sub: user.id,
    orgId: user.organizationId,
    role: user.roleKey,
    sid: sessionId,
  };
}

async function auditRefreshFailure({
  refreshToken,
  decodedPayload,
  auditContext,
  reason,
}) {
  const fallbackOrganizationId = decodedPayload?.orgId || (await getAnyOrganizationId());

  if (!fallbackOrganizationId) {
    return;
  }

  await withTransaction(async (client) => {
    await insertAuditEvent(client, {
      organizationId: fallbackOrganizationId,
      userId: decodedPayload?.sub || null,
      eventType: "auth.refresh.failure",
      entityType: "session",
      entityId: decodedPayload?.sid || null,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        reason,
        tokenHint: refreshToken ? "provided" : "missing",
      },
    });
  });
}

export async function loginService(payload, auditContext, env) {
  assertEmail(payload.email);
  assertRequiredString(payload.password, "password");

  const userRecord = await getUserForAuthByEmail(payload.email);

  if (!userRecord) {
    const fallbackOrganizationId = await getAnyOrganizationId();
    if (fallbackOrganizationId) {
      await withTransaction(async (client) => {
        await insertAuditEvent(client, {
          organizationId: fallbackOrganizationId,
          userId: null,
          eventType: "auth.login.failure",
          entityType: "auth_attempt",
          entityId: null,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
          details: {
            email: String(payload.email).trim().toLowerCase(),
            reason: "user_not_found",
          },
        });
      });
    }

    throw new AppError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  }

  if (!userRecord.is_active) {
    await withTransaction(async (client) => {
      await insertAuditEvent(client, {
        organizationId: userRecord.organization_id,
        userId: userRecord.id,
        eventType: "auth.login.inactive_user",
        entityType: "user",
        entityId: userRecord.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: { email: String(payload.email).trim().toLowerCase() },
      });
    });

    throw new AppError({
      statusCode: 401,
      code: "USER_INACTIVE",
      message: "This user is inactive.",
    });
  }

  const securityConfig = await getSecurityConfigForOrganization(userRecord.organization_id);
  const lockoutWindow = `${securityConfig.lockoutDuration} minutes`;
  const recentFailures = await query(
    `
      SELECT count(*)::int AS total
      FROM audit_events
      WHERE organization_id = $1
        AND user_id = $2
        AND event_type = 'auth.login.failure'
        AND created_at >= now() - $3::interval
    `,
    [userRecord.organization_id, userRecord.id, lockoutWindow],
  );

  if (recentFailures.rows[0]?.total >= securityConfig.maxFailedAttempts) {
    await withTransaction(async (client) => {
      await insertAuditEvent(client, {
        organizationId: userRecord.organization_id,
        userId: userRecord.id,
        eventType: "auth.login.locked",
        entityType: "user",
        entityId: userRecord.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: {
          reason: "too_many_failed_attempts",
          maxFailedAttempts: securityConfig.maxFailedAttempts,
          lockoutDuration: securityConfig.lockoutDuration,
        },
      });
    });

    throw new AppError({
      statusCode: 423,
      code: "ACCOUNT_LOCKED",
      message: `Account is temporarily locked. Try again in ${securityConfig.lockoutDuration} minutes.`,
    });
  }

  const passwordMatches = await verifyPassword(payload.password, userRecord.password_hash);
  if (!passwordMatches) {
    await withTransaction(async (client) => {
      await insertAuditEvent(client, {
        organizationId: userRecord.organization_id,
        userId: userRecord.id,
        eventType: "auth.login.failure",
        entityType: "user",
        entityId: userRecord.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: {
          email: String(payload.email).trim().toLowerCase(),
          reason: "invalid_password",
        },
      });
    });

    throw new AppError({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
  }

  const user = await getUserAuthorizationContext(userRecord.id);
  const previousLoginAt = user?.lastLoginAt || null;
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken(buildTokenPayload(user, sessionId));
  const refreshToken = signRefreshToken(buildTokenPayload(user, sessionId));
  const refreshExpiresAt = parseJwtExpiryToDate(env.JWT_REFRESH_TTL);

  await withTransaction(async (client) => {
    await updateLastLoginAt(user.id, client);
    await client.query(
      `
        INSERT INTO auth_sessions (
          id,
          organization_id,
          user_id,
          refresh_token_hash,
          expires_at,
          created_by_ip,
          created_by_user_agent
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        sessionId,
        user.organizationId,
        user.id,
        sha256(refreshToken),
        refreshExpiresAt,
        auditContext.ipAddress || null,
        auditContext.userAgent || null,
      ],
    );
    await insertAuditEvent(client, {
      organizationId: user.organizationId,
      userId: user.id,
      eventType: "auth.login.success",
      entityType: "user",
      entityId: user.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { role: user.roleKey },
    });
  });

  logger.info({ userId: user.id, email: user.email }, "login_success");

  const freshUser = await getUserAuthorizationContext(user.id);
  return {
    user: { ...freshUser, previousLoginAt },
    token: accessToken,
    refreshToken,
  };
}

export async function meService(actor) {
  const freshUser = await getUserAuthorizationContext(actor.id);
  if (!freshUser || !freshUser.isActive) {
    throw new AppError({
      statusCode: 401,
      code: "USER_INACTIVE",
      message: "This user is inactive.",
    });
  }

  return freshUser;
}

export async function refreshService(refreshToken, auditContext, env) {
  assertRequiredString(refreshToken, "refreshToken");

  const decodedPayload = jwt.decode(refreshToken) || null;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    await auditRefreshFailure({
      refreshToken,
      decodedPayload,
      auditContext,
      reason: "invalid_refresh_token",
    });
    throw error;
  }

  const storedSession = await getRefreshSession(refreshToken);

  if (!storedSession || storedSession.revoked_at || new Date(storedSession.expires_at).getTime() <= Date.now()) {
    await auditRefreshFailure({
      refreshToken,
      decodedPayload: payload,
      auditContext,
      reason: "session_not_found_or_expired",
    });

    await revokeRefreshSession(refreshToken);
    throw new AppError({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or expired.",
    });
  }

  const user = await getUserAuthorizationContext(payload.sub);
  if (!user || !user.isActive) {
    await revokeRefreshSession(refreshToken);
    throw new AppError({
      statusCode: 401,
      code: "USER_INACTIVE",
      message: "This user is inactive.",
    });
  }

  const nextSessionId = crypto.randomUUID();
  const nextAccessToken = signAccessToken(buildTokenPayload(user, nextSessionId));
  const nextRefreshToken = signRefreshToken(buildTokenPayload(user, nextSessionId));
  const nextRefreshExpiresAt = parseJwtExpiryToDate(env.JWT_REFRESH_TTL);

  await rotateRefreshSession(storedSession.id, {
    sessionId: nextSessionId,
    organizationId: user.organizationId,
    userId: user.id,
    refreshToken: nextRefreshToken,
    expiresAt: nextRefreshExpiresAt,
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  return {
    token: nextAccessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function forgotPasswordService(payload, auditContext, env) {
  assertEmail(payload.email);
  const userRecord = await getUserForAuthByEmail(payload.email);

  if (!userRecord) {
    return {
      ok: true,
      message: "If the account exists, password recovery instructions will be sent.",
    };
  }

  const token = signForgotPasswordToken({
    sub: userRecord.id,
    orgId: userRecord.organization_id,
    type: "forgot_password",
  });

  await createForgotPasswordToken({
    organizationId: userRecord.organization_id,
    userId: userRecord.id,
    token,
    expiresAt: parseJwtExpiryToDate(env.FORGOT_PASSWORD_TOKEN_TTL),
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
  });

  await withTransaction(async (client) => {
    await insertAuditEvent(client, {
      organizationId: userRecord.organization_id,
      userId: userRecord.id,
      eventType: "auth.forgot_password.requested",
      entityType: "user",
      entityId: userRecord.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        tokenType: "forgot_password",
        expiresAt: parseJwtExpiryToDate(env.FORGOT_PASSWORD_TOKEN_TTL).toISOString(),
      },
    });
  });

  logger.info(
    {
      userId: userRecord.id,
      email: String(payload.email).trim().toLowerCase(),
      resetPreviewUrl: `${env.APP_BASE_URL}/reset-password?token=${token}`,
    },
    "forgot_password_requested",
  );

  return {
    ok: true,
    message: "If the account exists, password recovery instructions will be sent.",
  };
}
