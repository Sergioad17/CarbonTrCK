import { query, withTransaction } from "../../shared/db/pool.js";
import { sha256 } from "../../shared/utils/hash.js";

export async function getRefreshSession(refreshToken) {
  const result = await query(
    `
      SELECT *
      FROM auth_sessions
      WHERE refresh_token_hash = $1
      LIMIT 1
    `,
    [sha256(refreshToken)],
  );

  return result.rows[0] || null;
}

export async function rotateRefreshSession(currentSessionId, nextSession) {
  await withTransaction(async (client) => {
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
        nextSession.sessionId,
        nextSession.organizationId,
        nextSession.userId,
        sha256(nextSession.refreshToken),
        nextSession.expiresAt,
        nextSession.ipAddress || null,
        nextSession.userAgent || null,
      ],
    );

    await client.query(
      `
        UPDATE auth_sessions
        SET revoked_at = now(),
            replaced_by_session_id = $2,
            last_used_at = now()
        WHERE id = $1
      `,
      [currentSessionId, nextSession.sessionId],
    );
  });
}

export async function revokeRefreshSession(refreshToken) {
  await query(
    `
      UPDATE auth_sessions
      SET revoked_at = now()
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL
    `,
    [sha256(refreshToken)],
  );
}

export async function createForgotPasswordToken({ organizationId, userId, token, expiresAt, ipAddress, userAgent }) {
  await query(
    `
      INSERT INTO password_reset_tokens (
        organization_id,
        user_id,
        token_hash,
        expires_at,
        created_by_ip,
        created_by_user_agent
      )
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
    [organizationId, userId, sha256(token), expiresAt, ipAddress || null, userAgent || null],
  );
}
