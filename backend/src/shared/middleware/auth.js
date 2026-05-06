import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { getUserAuthorizationContext } from "../../domains/users/users.repository.js";
import { getSecurityConfigForOrganization } from "../../domains/admin/admin.repository.js";
import { query } from "../db/pool.js";

export async function requireAuth(request, _response, next) {
  try {
    const authorization = String(request.headers.authorization || "");
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "A valid Bearer token is required.",
      });
    }

    const payload = verifyAccessToken(token);
    const actor = await getUserAuthorizationContext(payload.sub);

    if (!actor) {
      throw new AppError({
        statusCode: 401,
        code: "UNAUTHENTICATED",
        message: "The user for this token no longer exists.",
      });
    }

    if (!actor.isActive) {
      throw new AppError({
        statusCode: 401,
        code: "USER_INACTIVE",
        message: "This user is inactive.",
      });
    }

    if (payload.sid) {
      const securityConfig = await getSecurityConfigForOrganization(actor.organizationId);
      const timeoutWindow = `${securityConfig.sessionTimeout} minutes`;
      const sessionResult = await query(
        `
          SELECT id
          FROM auth_sessions
          WHERE id = $1
            AND organization_id = $2
            AND user_id = $3
            AND revoked_at IS NULL
            AND expires_at > now()
            AND COALESCE(last_used_at, created_at) >= now() - $4::interval
          LIMIT 1
        `,
        [payload.sid, actor.organizationId, actor.id, timeoutWindow],
      );

      if (sessionResult.rowCount < 1) {
        await query(
          `
            UPDATE auth_sessions
            SET revoked_at = COALESCE(revoked_at, now())
            WHERE id = $1
              AND organization_id = $2
              AND user_id = $3
          `,
          [payload.sid, actor.organizationId, actor.id],
        );
        throw new AppError({
          statusCode: 401,
          code: "SESSION_EXPIRED",
          message: "This session has expired due to inactivity.",
        });
      }

      await query(
        `
          UPDATE auth_sessions
          SET last_used_at = now()
          WHERE id = $1
            AND organization_id = $2
            AND user_id = $3
            AND revoked_at IS NULL
        `,
        [payload.sid, actor.organizationId, actor.id],
      );
    }

    request.user = actor;
    request.auth = {
      sessionId: payload.sid,
      organizationId: payload.orgId,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return function roleGuard(request, _response, next) {
    const roleKey = request.user?.roleKey;
    if (!roleKey || !allowedRoles.includes(roleKey)) {
      return next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not have the required role.",
        }),
      );
    }

    return next();
  };
}

export function requirePermission(...requiredPermissions) {
  return function permissionGuard(request, _response, next) {
    const permissionSet = new Set(request.user?.permissions || []);
    const hasPermission = requiredPermissions.every((permission) => permissionSet.has(permission));

    if (!hasPermission) {
      return next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not have the required permission.",
        }),
      );
    }

    return next();
  };
}

export function requireAnyPermission(...allowedPermissions) {
  return function anyPermissionGuard(request, _response, next) {
    const permissionSet = new Set(request.user?.permissions || []);
    const hasPermission = allowedPermissions.some((permission) => permissionSet.has(permission));

    if (!hasPermission) {
      return next(
        new AppError({
          statusCode: 403,
          code: "FORBIDDEN",
          message: "You do not have the required permission.",
        }),
      );
    }

    return next();
  };
}

export function requireActiveUser(request, _response, next) {
  if (!request.user?.isActive) {
    return next(
      new AppError({
        statusCode: 403,
        code: "USER_INACTIVE",
        message: "This user is inactive.",
      }),
    );
  }

  return next();
}
