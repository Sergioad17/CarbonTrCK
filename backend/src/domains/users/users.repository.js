import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { normalizeRoleKey } from "../../shared/utils/rbac.js";
import { buildNormalizedUserShape } from "../../shared/utils/user-shape.js";
import { generateTemporaryPassword, hashPassword } from "../../shared/utils/password.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

function mapUserRow(row, authorization = {}) {
  return buildNormalizedUserShape({
    id: row.id,
    numericId: row.numeric_id,
    firstName: row.first_name,
    paternalLastName: row.paternal_last_name,
    maternalLastName: row.maternal_last_name,
    fullName: row.full_name,
    email: row.email,
    campusCode: row.campus_code,
    areaAccessMode: row.area_access_mode,
    areaCodes: row.area_codes || [],
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes,
    roles: authorization.roles || [],
  });
}

function changedFields(before = {}, after = {}) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys.reduce((acc, key) => {
    const previousValue = before[key] ?? null;
    const nextValue = after[key] ?? null;
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      acc[key] = { before: previousValue, after: nextValue };
    }
    return acc;
  }, {});
}

async function getAuthorizationData(userId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        r.id,
        r.name,
        jsonb_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL) AS permissions
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1
      GROUP BY r.id, r.name
      ORDER BY r.name
    `,
    [userId],
  );

  const roles = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    key: normalizeRoleKey(row.name),
    label: row.name,
    permissions: row.permissions || [],
  }));

  const permissionSet = new Set();
  for (const role of roles) {
    for (const permission of role.permissions) {
      permissionSet.add(permission);
    }
  }

  return {
    roles,
    permissions: Array.from(permissionSet),
  };
}

async function getAreaCodes(userId, client = { query }) {
  const result = await client.query(
    `
      SELECT a.code
      FROM user_area_access uaa
      JOIN areas a ON a.id = uaa.area_id
      WHERE uaa.user_id = $1
      ORDER BY a.code
    `,
    [userId],
  );

  return result.rows.map((row) => row.code).filter(Boolean);
}

export async function getUserAuthorizationContext(userId) {
  const userResult = await query(
    `
      SELECT
        u.id,
        u.organization_id,
        u.numeric_id,
        u.first_name,
        u.paternal_last_name,
        u.maternal_last_name,
        u.full_name,
        u.email::text AS email,
        u.notes,
        u.area_access_mode,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        c.code AS campus_code
      FROM users u
      LEFT JOIN campuses c ON c.id = u.campus_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (userResult.rowCount < 1) {
    return null;
  }

  const row = userResult.rows[0];
  const authorization = await getAuthorizationData(userId);
  const areaCodes = await getAreaCodes(userId);
  const user = mapUserRow({ ...row, area_codes: areaCodes }, authorization);

  return {
    ...user,
    organizationId: row.organization_id,
    permissions: authorization.permissions,
    roles: authorization.roles,
  };
}

export async function getUserForAuthByEmail(email) {
  const result = await query(
    `
      SELECT
        u.*,
        c.code AS campus_code
      FROM users u
      LEFT JOIN campuses c ON c.id = u.campus_id
      WHERE u.email = $1
      ORDER BY
        u.is_active DESC,
        u.created_at DESC,
        u.id DESC
      LIMIT 1
    `,
    [String(email || "").trim().toLowerCase()],
  );

  return result.rows[0] || null;
}

export async function getAnyOrganizationId() {
  const result = await query(
    `
      SELECT id
      FROM organizations
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `,
  );

  return result.rows[0]?.id || null;
}

export async function updateLastLoginAt(userId, client = { query }) {
  await client.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}

async function getCampusByCode(organizationId, campusCode, client) {
  const result = await client.query(
    `
      SELECT id, code
      FROM campuses
      WHERE organization_id = $1
        AND code = $2
      LIMIT 1
    `,
    [organizationId, campusCode],
  );

  return result.rows[0] || null;
}

async function getRoleByKey(organizationId, roleKey, client) {
  const result = await client.query(
    `
      SELECT id, name
      FROM roles
      WHERE organization_id = $1
    `,
    [organizationId],
  );

  return result.rows.find((row) => normalizeRoleKey(row.name) === normalizeRoleKey(roleKey)) || null;
}

async function getAreasByCodes(organizationId, campusId, areaCodes, client) {
  if (!Array.isArray(areaCodes) || areaCodes.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      SELECT a.id, a.code
      FROM areas a
      JOIN campuses c ON c.id = a.campus_id
      WHERE c.organization_id = $1
        AND a.campus_id = $2
        AND a.code = ANY($3::varchar[])
    `,
    [organizationId, campusId, areaCodes],
  );

  return result.rows;
}

async function ensureUserWritePayload(actor, payload, client) {
  const campusCode = String(payload.campusCode || "").trim();
  const campus = campusCode ? await getCampusByCode(actor.organizationId, campusCode, client) : null;

  if (!campus) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_CAMPUS",
      message: "A valid campusCode is required.",
    });
  }

  const role = await getRoleByKey(actor.organizationId, payload.role || payload.roleKey, client);
  if (!role) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_ROLE",
      message: "A valid role is required.",
    });
  }

  const areaAccessMode = payload.areaAccess?.mode === "custom" ? "custom" : "all";
  const requestedAreaCodes = areaAccessMode === "custom" ? payload.areaAccess?.areaCodes || [] : [];
  const areas = await getAreasByCodes(actor.organizationId, campus.id, requestedAreaCodes, client);

  if (areaAccessMode === "custom" && areas.length !== requestedAreaCodes.length) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_AREA_ACCESS",
      message: "All custom areas must exist inside the selected campus.",
    });
  }

  return {
    campus,
    role,
    areaAccessMode,
    areas,
  };
}

export async function listUsers(actor, filters) {
  const clauses = ["u.organization_id = $1"];
  const values = [actor.organizationId];
  let index = values.length + 1;

  if (typeof filters.isActive === "boolean") {
    clauses.push(`u.is_active = $${index++}`);
    values.push(filters.isActive);
  }

  if (filters.campusCode) {
    clauses.push(`c.code = $${index++}`);
    values.push(filters.campusCode);
  }

  if (filters.search) {
    clauses.push(`(u.full_name ILIKE $${index} OR u.email::text ILIKE $${index})`);
    values.push(`%${filters.search}%`);
    index += 1;
  }

  if (filters.role) {
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM user_roles ur2
        JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = u.id
          AND LOWER(r2.name) = $${index}
      )
    `);
    values.push(filters.role);
    index += 1;
  }

  const result = await query(
    `
      SELECT
        u.id,
        u.numeric_id,
        u.first_name,
        u.paternal_last_name,
        u.maternal_last_name,
        u.full_name,
        u.email::text AS email,
        u.notes,
        u.is_active,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.area_access_mode,
        c.code AS campus_code
      FROM users u
      LEFT JOIN campuses c ON c.id = u.campus_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY u.created_at DESC, u.full_name ASC
    `,
    values,
  );

  const users = [];
  for (const row of result.rows) {
    const authorization = await getAuthorizationData(row.id);
    const areaCodes = await getAreaCodes(row.id);
    users.push({
      ...mapUserRow({ ...row, area_codes: areaCodes }, authorization),
      roles: authorization.roles,
      permissions: authorization.permissions,
    });
  }

  return users;
}

export async function listRolesCatalog(actor) {
  const result = await query(
    `
      SELECT id, name
      FROM roles
      WHERE organization_id = $1
      ORDER BY name
    `,
    [actor.organizationId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    key: normalizeRoleKey(row.name),
    value: normalizeRoleKey(row.name),
    label: row.name,
    name: row.name,
  }));
}

export async function createUser(actor, payload, auditContext) {
  const result = await withTransaction(async (client) => {
    const validPayload = await ensureUserWritePayload(actor, payload, client);
    const temporaryPassword = payload.password || payload.temporaryPassword || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const created = await client.query(
      `
        INSERT INTO users (
          organization_id,
          campus_id,
          area_access_mode,
          numeric_id,
          first_name,
          paternal_last_name,
          maternal_last_name,
          email,
          password_hash,
          full_name,
          notes,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id
      `,
      [
        actor.organizationId,
        validPayload.campus.id,
        validPayload.areaAccessMode,
        payload.numericId || null,
        payload.firstName,
        payload.paternalLastName,
        payload.maternalLastName || null,
        String(payload.email).trim().toLowerCase(),
        passwordHash,
        payload.fullName,
        payload.notes || null,
        payload.isActive ?? true,
      ],
    );

    const userId = created.rows[0].id;

    await client.query(
      `
        INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
        VALUES ($1,$2,$3,$4)
      `,
      [actor.organizationId, userId, validPayload.role.id, validPayload.campus.id],
    );

    if (validPayload.areaAccessMode === "custom") {
      for (const area of validPayload.areas) {
        await client.query(
          `
            INSERT INTO user_area_access (organization_id, user_id, campus_id, area_id, created_by)
            VALUES ($1,$2,$3,$4,$5)
          `,
          [actor.organizationId, userId, validPayload.campus.id, area.id, actor.id],
        );
      }
    }

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "users.create",
      entityType: "user",
      entityId: userId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        email: String(payload.email).trim().toLowerCase(),
        role: normalizeRoleKey(validPayload.role.name),
      },
    });

    return {
      userId,
      temporaryPassword,
    };
  });

  return {
    user: await getUserAuthorizationContext(result.userId),
    temporaryPassword: result.temporaryPassword,
  };
}

export async function updateUser(actor, userId, payload, auditContext) {
  await withTransaction(async (client) => {
    const currentUser = await client.query(
      `
        SELECT
          u.id,
          u.email::text AS email,
          u.full_name,
          u.is_active,
          u.area_access_mode,
          c.code AS campus_code,
          COALESCE(r.name, '') AS role
        FROM users u
        LEFT JOIN campuses c ON c.id = u.campus_id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = $1 AND u.organization_id = $2
        ORDER BY
          CASE lower(r.name)
            WHEN 'admin' THEN 1
            WHEN 'directivo' THEN 2
            WHEN 'operativo' THEN 3
            ELSE 9
          END
        LIMIT 1
      `,
      [userId, actor.organizationId],
    );

    if (currentUser.rowCount < 1) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    const validPayload = await ensureUserWritePayload(actor, payload, client);
    const before = {
      email: currentUser.rows[0].email,
      fullName: currentUser.rows[0].full_name,
      role: normalizeRoleKey(currentUser.rows[0].role),
      campusCode: currentUser.rows[0].campus_code,
      areaAccessMode: currentUser.rows[0].area_access_mode,
      isActive: Boolean(currentUser.rows[0].is_active),
    };
    const after = {
      email: String(payload.email).trim().toLowerCase(),
      fullName: payload.fullName,
      role: normalizeRoleKey(validPayload.role.name),
      campusCode: validPayload.campus.code,
      areaAccessMode: validPayload.areaAccessMode,
      isActive: payload.isActive ?? true,
    };

    await client.query(
      `
        UPDATE users
        SET
          campus_id = $1,
          area_access_mode = $2,
          numeric_id = $3,
          first_name = $4,
          paternal_last_name = $5,
          maternal_last_name = $6,
          email = $7,
          full_name = $8,
          notes = $9,
          is_active = $10
        WHERE id = $11
      `,
      [
        validPayload.campus.id,
        validPayload.areaAccessMode,
        payload.numericId || null,
        payload.firstName,
        payload.paternalLastName,
        payload.maternalLastName || null,
        String(payload.email).trim().toLowerCase(),
        payload.fullName,
        payload.notes || null,
        payload.isActive ?? true,
        userId,
      ],
    );

    await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM user_area_access WHERE user_id = $1`, [userId]);

    await client.query(
      `
        INSERT INTO user_roles (organization_id, user_id, role_id, campus_id)
        VALUES ($1,$2,$3,$4)
      `,
      [actor.organizationId, userId, validPayload.role.id, validPayload.campus.id],
    );

    if (validPayload.areaAccessMode === "custom") {
      for (const area of validPayload.areas) {
        await client.query(
          `
            INSERT INTO user_area_access (organization_id, user_id, campus_id, area_id, created_by)
            VALUES ($1,$2,$3,$4,$5)
          `,
          [actor.organizationId, userId, validPayload.campus.id, area.id, actor.id],
        );
      }
    }

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "users.update",
      entityType: "user",
      entityId: userId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        target: after.email,
        email: after.email,
        role: after.role,
        before,
        after,
        changes: changedFields(before, after),
      },
    });

  });

  return getUserAuthorizationContext(userId);
}

export async function updateUserStatus(actor, userId, isActive, auditContext) {
  await withTransaction(async (client) => {
    const targetUser = await client.query(
      `
        SELECT id, is_active, email::text AS email
        FROM users
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `,
      [userId, actor.organizationId],
    );

    if (targetUser.rowCount < 1) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    if (actor.id === userId && !isActive) {
      throw new AppError({
        statusCode: 409,
        code: "SELF_DEACTIVATION_FORBIDDEN",
        message: "You cannot deactivate your own account.",
      });
    }

    if (!isActive) {
      const adminCount = await client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          WHERE u.organization_id = $1
            AND u.is_active = true
            AND LOWER(r.name) IN ('admin', 'administrador')
        `,
        [actor.organizationId],
      );

      const targetRole = await client.query(
        `
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = $1
            AND LOWER(r.name) IN ('admin', 'administrador')
          LIMIT 1
        `,
        [userId],
      );

      if (targetRole.rowCount > 0 && adminCount.rows[0].total <= 1) {
        throw new AppError({
          statusCode: 409,
          code: "LAST_ADMIN_CONFLICT",
          message: "The last active admin cannot be deactivated.",
        });
      }
    }

    await client.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [isActive, userId]);
    await client.query(`UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "users.status_change",
      entityType: "user",
      entityId: userId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        target: targetUser.rows[0].email,
        before: { isActive: Boolean(targetUser.rows[0].is_active) },
        after: { isActive },
        changes: { isActive: { before: Boolean(targetUser.rows[0].is_active), after: isActive } },
      },
    });
  });

  return getUserAuthorizationContext(userId);
}

export async function deleteUser(actor, userId, auditContext) {
  return withTransaction(async (client) => {
    const targetUser = await client.query(
      `
        SELECT
          u.id,
          u.is_active,
          u.email::text AS email,
          u.full_name,
          COALESCE(r.name, '') AS role
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = $1 AND u.organization_id = $2
        ORDER BY
          CASE lower(r.name)
            WHEN 'admin' THEN 1
            WHEN 'administrador' THEN 1
            WHEN 'directivo' THEN 2
            WHEN 'operativo' THEN 3
            ELSE 9
          END
        LIMIT 1
      `,
      [userId, actor.organizationId],
    );

    if (targetUser.rowCount < 1) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    if (actor.id === userId) {
      throw new AppError({
        statusCode: 409,
        code: "SELF_DELETE_FORBIDDEN",
        message: "You cannot delete your own account.",
      });
    }

    const targetRole = normalizeRoleKey(targetUser.rows[0].role);
    if (targetRole === "admin" && targetUser.rows[0].is_active) {
      const adminCount = await client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          WHERE u.organization_id = $1
            AND u.is_active = true
            AND LOWER(r.name) IN ('admin', 'administrador')
        `,
        [actor.organizationId],
      );

      if (adminCount.rows[0].total <= 1) {
        throw new AppError({
          statusCode: 409,
          code: "LAST_ADMIN_CONFLICT",
          message: "The last active admin cannot be deleted.",
        });
      }
    }

    const dependencyChecks = [];
    dependencyChecks.push(await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM records
        WHERE organization_id = $1
          AND $2 IN (created_by, updated_by, approved_by)
      `,
      [actor.organizationId, userId],
    ));
    dependencyChecks.push(await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM equipment_inventory
        WHERE organization_id = $1
          AND created_by = $2
      `,
      [actor.organizationId, userId],
    ));
    dependencyChecks.push(await client.query(
      `
        SELECT COUNT(*)::int AS total
        FROM target_actions
        WHERE organization_id = $1
          AND $2 IN (owner_user_id, created_by)
      `,
      [actor.organizationId, userId],
    ));
    const hasBusinessActivity = dependencyChecks.some((result) => result.rows[0]?.total > 0);

    if (hasBusinessActivity) {
      throw new AppError({
        statusCode: 409,
        code: "USER_HAS_ACTIVITY",
        message: "This user already has operational activity and cannot be deleted. Deactivate it instead.",
      });
    }

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "users.delete",
      entityType: "user",
      entityId: userId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        target: targetUser.rows[0].email,
        fullName: targetUser.rows[0].full_name,
        role: targetRole,
      },
    });

    await client.query(
      `
        UPDATE profile_change_request_events
        SET actor_user_id = NULL,
            actor_organization_id = NULL
        WHERE actor_user_id = $1
          AND actor_organization_id = $2
      `,
      [userId, actor.organizationId],
    );
    await client.query(
      `
        UPDATE user_area_access
        SET created_by = NULL
        WHERE created_by = $1
          AND organization_id = $2
      `,
      [userId, actor.organizationId],
    );
    await client.query(
      `
        UPDATE audit_events
        SET user_id = NULL
        WHERE user_id = $1
          AND organization_id = $2
      `,
      [userId, actor.organizationId],
    );
    await client.query(
      `
        DELETE FROM users
        WHERE id = $1
          AND organization_id = $2
      `,
      [userId, actor.organizationId],
    );

    return { ok: true, deletedUserId: userId };
  });
}

export async function resetUserPassword(actor, userId, auditContext) {
  return withTransaction(async (client) => {
    const existingUser = await client.query(
      `SELECT id FROM users WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [userId, actor.organizationId],
    );

    if (existingUser.rowCount < 1) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, userId]);
    await client.query(`UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "users.password_reset",
      entityType: "user",
      entityId: userId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });

    return temporaryPassword;
  });
}

export async function updateOwnPassword(actor, _currentPasswordHash, nextPasswordHash, auditContext) {
  return withTransaction(async (client) => {
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [nextPasswordHash, actor.id]);
    await client.query(`UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [actor.id]);

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "profile.password_change",
      entityType: "user",
      entityId: actor.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });
  });
}
