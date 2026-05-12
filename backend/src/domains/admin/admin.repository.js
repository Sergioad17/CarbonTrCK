import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { ensureAdminPeriodsSchema } from "./admin.periods.repository.js";
import {
  DEFAULT_INSTITUTIONAL_CONFIG,
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_SYSTEM_CONFIG,
} from "./admin.defaults.js";

function compactObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mergeConfig(defaults, value) {
  return { ...defaults, ...compactObject(value) };
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeSecurityConfig(value = {}) {
  const source = mergeConfig(DEFAULT_SECURITY_CONFIG, value);
  return {
    minPasswordLength: clampNumber(source.minPasswordLength, 6, 32, DEFAULT_SECURITY_CONFIG.minPasswordLength),
    requireUppercase: Boolean(source.requireUppercase),
    requireNumber: Boolean(source.requireNumber),
    requireSpecialChar: Boolean(source.requireSpecialChar),
    forceChangeOnFirstLogin: false,
    sessionTimeout: clampNumber(source.sessionTimeout, 5, 480, DEFAULT_SECURITY_CONFIG.sessionTimeout),
    maxFailedAttempts: clampNumber(source.maxFailedAttempts, 3, 15, DEFAULT_SECURITY_CONFIG.maxFailedAttempts),
    lockoutDuration: clampNumber(source.lockoutDuration, 5, 120, DEFAULT_SECURITY_CONFIG.lockoutDuration),
    emailVerification: false,
    twoFactorEnabled: false,
    twoFactorReady: false,
  };
}

function countryCodeFromName(country) {
  const key = String(country || "").trim().toLowerCase();
  const map = new Map([
    ["mexico", "MX"],
    ["méxico", "MX"],
    ["colombia", "CO"],
    ["chile", "CL"],
    ["argentina", "AR"],
    ["espana", "ES"],
    ["españa", "ES"],
    ["estados unidos", "US"],
  ]);
  return map.get(key) || "MX";
}

function buildAuditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
    details,
  };
}

async function getOrganizationDefaults(actor, client = { query }) {
  const result = await client.query(
    `
      SELECT name, country_code, state, city, timezone
      FROM organizations
      WHERE id = $1
      LIMIT 1
    `,
    [actor.organizationId],
  );

  const row = result.rows[0] || {};
  return {
    institutional: {
      ...DEFAULT_INSTITUTIONAL_CONFIG,
      name: row.name || DEFAULT_INSTITUTIONAL_CONFIG.name,
      country: row.country_code === "MX" ? "Mexico" : row.country_code || DEFAULT_INSTITUTIONAL_CONFIG.country,
      state: row.state || "",
      city: row.city || "",
      timezone: row.timezone || DEFAULT_INSTITUTIONAL_CONFIG.timezone,
    },
    system: {
      ...DEFAULT_SYSTEM_CONFIG,
      timezone: row.timezone || DEFAULT_SYSTEM_CONFIG.timezone,
    },
    security: DEFAULT_SECURITY_CONFIG,
  };
}

function shapeSettings(row, defaults) {
  return {
    institutional: mergeConfig(defaults.institutional, row?.institutional),
    system: mergeConfig(defaults.system, row?.system),
    security: normalizeSecurityConfig(row?.security || defaults.security),
    updatedAt: row?.updated_at || null,
  };
}

export async function getSecurityConfigForOrganization(organizationId, client = { query }) {
  const result = await client.query(
    `
      SELECT security
      FROM organization_admin_settings
      WHERE organization_id = $1
      LIMIT 1
    `,
    [organizationId],
  );
  return normalizeSecurityConfig(result.rows[0]?.security || DEFAULT_SECURITY_CONFIG);
}

export async function getAdminGovernmentSettings(actor, auditContext) {
  return withTransaction(async (client) => {
    const defaults = await getOrganizationDefaults(actor, client);
    const result = await client.query(
      `
        SELECT institutional, system, security, updated_at
        FROM organization_admin_settings
        WHERE organization_id = $1
        LIMIT 1
      `,
      [actor.organizationId],
    );
    const settings = shapeSettings(result.rows[0], defaults);

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { section: "government" }),
      eventType: "admin.government.read",
      entityType: "organization_admin_settings",
      entityId: actor.organizationId,
    });

    return settings;
  });
}

export async function upsertAdminGovernmentSettings(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const defaults = await getOrganizationDefaults(actor, client);
    const next = {
      institutional: mergeConfig(defaults.institutional, payload.institutional),
      system: mergeConfig(defaults.system, payload.system),
      security: normalizeSecurityConfig(payload.security || defaults.security),
    };

    const result = await client.query(
      `
        INSERT INTO organization_admin_settings (
          organization_id, institutional, system, security, updated_by_user_id
        )
        VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5)
        ON CONFLICT (organization_id)
        DO UPDATE SET
          institutional = EXCLUDED.institutional,
          system = EXCLUDED.system,
          security = EXCLUDED.security,
          updated_by_user_id = EXCLUDED.updated_by_user_id
        RETURNING institutional, system, security, updated_at
      `,
      [
        actor.organizationId,
        JSON.stringify(next.institutional),
        JSON.stringify(next.system),
        JSON.stringify(next.security),
        actor.id,
      ],
    );

    await client.query(
      `
        UPDATE organizations
        SET name = $2,
            country_code = $3,
            state = $4,
            city = $5,
            timezone = $6
        WHERE id = $1
      `,
      [
        actor.organizationId,
        next.institutional.name,
        countryCodeFromName(next.institutional.country),
        next.institutional.state || null,
        next.institutional.city || null,
        next.institutional.timezone,
      ],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        sections: ["institutional", "system", "security"],
        organizationName: next.institutional.name,
      }),
      eventType: "admin.government.update",
      entityType: "organization_admin_settings",
      entityId: actor.organizationId,
    });

    return shapeSettings(result.rows[0], defaults);
  });
}

export async function listActiveSessions(actor, options = {}) {
  const result = await query(
    `
      SELECT
        s.id,
        s.user_id,
        u.full_name,
        u.email::text AS email,
        COALESCE(r.name, 'operativo') AS role,
        s.created_by_ip,
        s.created_by_user_agent,
        s.created_at,
        COALESCE(s.last_used_at, u.last_login_at, s.created_at) AS last_activity
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id AND u.organization_id = s.organization_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE s.organization_id = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      ORDER BY last_activity DESC
      LIMIT 100
    `,
    [actor.organizationId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    user: row.full_name,
    email: row.email,
    role: String(row.role || "operativo").toLowerCase(),
    ip: row.created_by_ip || "N/D",
    device: row.created_by_user_agent || "N/D",
    startedAt: row.created_at,
    lastActivity: row.last_activity,
    current: row.id === options.currentSessionId,
  }));
}

export async function revokeSession(actor, sessionId, auditContext) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE auth_sessions
        SET revoked_at = now()
        WHERE id = $1
          AND organization_id = $2
          AND revoked_at IS NULL
        RETURNING id
      `,
      [sessionId, actor.organizationId],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { sessionId, revoked: result.rowCount > 0 }),
      eventType: "admin.security.session_revoke",
      entityType: "session",
      entityId: sessionId,
    });

    if (result.rowCount < 1) {
      throw new AppError({
        statusCode: 404,
        code: "SESSION_NOT_FOUND",
        message: "The session does not exist, is expired, or was already revoked.",
      });
    }

    return { revoked: result.rowCount > 0 };
  });
}

export async function revokeOtherSessions(actor, currentSessionId, auditContext) {
  if (!currentSessionId) {
    throw new AppError({
      statusCode: 401,
      code: "CURRENT_SESSION_REQUIRED",
      message: "The current session is required to close remote sessions.",
    });
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE auth_sessions
        SET revoked_at = now()
        WHERE organization_id = $1
          AND id <> $2
          AND revoked_at IS NULL
          AND expires_at > now()
      `,
      [actor.organizationId, currentSessionId],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        currentSessionId,
        revokedCount: result.rowCount,
        description: `Cerró ${result.rowCount} sesiones remotas activas`,
      }),
      eventType: "admin.security.sessions_revoke_all",
      entityType: "session",
      entityId: currentSessionId,
    });

    return { revokedCount: result.rowCount };
  });
}

function inferAuditStatus(eventType) {
  const value = String(eventType || "");
  if (value.includes(".failure") || value.includes(".locked") || value.includes(".inactive_user")) return "error";
  return "success";
}

function inferAuditSeverity(eventType, status) {
  const value = String(eventType || "");
  if (status === "error") return "high";
  if (value.includes(".status_change") || value.includes(".remove") || value.includes(".delete")) return "medium";
  return "low";
}

function auditSeverityExpression() {
  return `
    COALESCE(
      e.details->>'severity',
      CASE
        WHEN COALESCE(e.details->>'status', '') = 'error'
          OR e.event_type ILIKE '%.failure'
          OR e.event_type ILIKE '%.locked'
          OR e.event_type ILIKE '%.inactive_user'
        THEN 'high'
        WHEN e.event_type ILIKE '%.status_change'
          OR e.event_type ILIKE '%.remove'
          OR e.event_type ILIKE '%.delete'
        THEN 'medium'
        ELSE 'low'
      END
    )
  `;
}

export async function listAuditEvents(actor, filters = {}) {
  const params = [actor.organizationId];
  const where = ["e.organization_id = $1"];

  if (filters.module && filters.module !== "all") {
    params.push(filters.module);
    where.push(`COALESCE(e.details->>'module', e.entity_type, split_part(e.event_type, '.', 1)) = $${params.length}`);
  }

  if (filters.action && filters.action !== "all") {
    params.push(filters.action);
    where.push(`split_part(e.event_type, '.', 2) = $${params.length}`);
  }

  if (filters.status && filters.status !== "all") {
    params.push(filters.status);
    where.push(`COALESCE(e.details->>'status', 'success') = $${params.length}`);
  }

  if (filters.severity && filters.severity !== "all") {
    params.push(filters.severity);
    where.push(`${auditSeverityExpression()} = $${params.length}`);
  }

  if (filters.user && filters.user !== "all") {
    params.push(`%${filters.user}%`);
    where.push(`(u.full_name ILIKE $${params.length} OR u.email::text ILIKE $${params.length})`);
  }

  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    where.push(`e.created_at >= $${params.length}::date`);
  }

  if (filters.dateTo) {
    params.push(filters.dateTo);
    where.push(`e.created_at < ($${params.length}::date + interval '1 day')`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(
      u.full_name ILIKE $${params.length}
      OR u.email::text ILIKE $${params.length}
      OR e.event_type ILIKE $${params.length}
      OR e.entity_type ILIKE $${params.length}
      OR e.entity_id::text ILIKE $${params.length}
      OR e.details::text ILIKE $${params.length}
    )`);
  }

  const result = await query(
    `
      SELECT
        e.id,
        e.event_type,
        e.entity_type,
        e.entity_id,
        e.ip_address,
        e.user_agent,
        e.details,
        e.created_at,
        COALESCE(u.full_name, 'Sistema') AS user_name,
        COALESCE(role_data.role_name, e.details->>'actorRole', 'Sistema') AS user_role
      FROM audit_events e
      LEFT JOIN users u ON u.id = e.user_id AND u.organization_id = e.organization_id
      LEFT JOIN LATERAL (
        SELECT r.name AS role_name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = u.id
          AND ur.organization_id = e.organization_id
        ORDER BY
          CASE lower(r.name)
            WHEN 'admin' THEN 1
            WHEN 'directivo' THEN 2
            WHEN 'operativo' THEN 3
            ELSE 9
          END,
          r.name
        LIMIT 1
      ) role_data ON true
      WHERE ${where.join(" AND ")}
      ORDER BY e.created_at DESC
      LIMIT 300
    `,
    params,
  );

  return result.rows.map((row) => {
    const [modulePart, actionPart = "system", subActionPart = ""] = String(row.event_type || "").split(".");
    const details = compactObject(row.details);
    const status = details.status || inferAuditStatus(row.event_type);
    return {
      id: row.id,
      eventType: row.event_type,
      moduleKey: modulePart,
      actionKey: subActionPart || actionPart,
      user: row.user_name,
      role: row.user_role,
      action: details.action || subActionPart || actionPart,
      module: details.module || row.entity_type || modulePart,
      description: details.description || row.event_type,
      target: details.target || row.entity_id || row.entity_type || "",
      status,
      severity: details.severity || inferAuditSeverity(row.event_type, status),
      ts: row.created_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      details,
    };
  });
}

export async function createAdminAuditEvent(actor, payload = {}, auditContext) {
  const eventType = String(payload.eventType || "").trim();
  if (!/^[a-z0-9_]+(\.[a-z0-9_]+){1,3}$/i.test(eventType)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "eventType must be a valid audit event key.",
      details: { field: "eventType" },
    });
  }

  const entityType = String(payload.entityType || "").trim() || eventType.split(".")[0];
  const details = compactObject(payload.details);

  await withTransaction(async (client) => {
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType,
      entityType,
      entityId: payload.entityId || null,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details,
    });
  });

  return { recorded: true };
}

function intValue(row, key) {
  return Number(row?.[key] || 0);
}

function serviceStatus(label, status, latencyMs = null) {
  return {
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    status,
    latency: latencyMs === null ? "-" : `${latencyMs} ms`,
    updatedAt: new Date().toISOString(),
  };
}

const AUDIT_MODULE_LABELS = Object.freeze({
  actions: "Acciones",
  admin: "Administración",
  admin_alerts: "Alertas",
  ai: "Inteligencia artificial",
  auth: "Autenticación",
  dashboard: "Dashboard",
  devices: "Dispositivos",
  equipment: "Equipo",
  factors: "Factores",
  files: "Archivos",
  iot: "IoT",
  notifications: "Notificaciones",
  profile: "Perfil",
  records: "Registros",
  reports: "Reportes",
  settings: "Configuración",
  targets: "Metas",
  users: "Usuarios",
});

const AUDIT_ICON_MAP = Object.freeze({
  actions: "calendar",
  admin: "shield",
  admin_alerts: "file",
  ai: "zap",
  auth: "shield",
  dashboard: "database",
  devices: "zap",
  equipment: "building",
  factors: "beaker",
  files: "file",
  iot: "zap",
  notifications: "file",
  profile: "user",
  records: "zap",
  reports: "file",
  settings: "database",
  targets: "calendar",
  users: "user",
});

function auditModuleLabel(moduleKey, entityType) {
  return AUDIT_MODULE_LABELS[moduleKey] || entityType || moduleKey || "Sistema";
}

function auditIcon(moduleKey) {
  return AUDIT_ICON_MAP[moduleKey] || "default";
}

function auditActionText(row) {
  const details = compactObject(row.details);
  const [moduleKey, actionKey = "system", subActionKey = ""] = String(row.event_type || "").split(".");

  if (details.description) return details.description;

  switch (row.event_type) {
    case "actions.create":
      return `creo una accion${details.title ? `: ${details.title}` : ""}`;
    case "actions.update":
      return "actualizo una accion";
    case "admin.government.update":
      return "actualizo la configuracion de gobierno";
    case "admin.security.session_revoke":
      return "cerro una sesion remota";
    case "admin.security.sessions_revoke_all":
      return `cerro ${details.revokedCount || 0} sesiones remotas activas`;
    case "admin_alerts.create":
      return `creo una regla de alerta${details.name ? `: ${details.name}` : ""}`;
    case "admin_alerts.update":
      return `actualizo una regla de alerta${details.name ? `: ${details.name}` : ""}`;
    case "admin_alerts.status_change":
      return `${details.enabled ? "activo" : "desactivo"} una regla de alerta${details.name ? `: ${details.name}` : ""}`;
    case "ai.engine.update":
      return "actualizo el motor IA";
    case "ai.module.update":
      return "actualizo un modulo IA";
    case "ai.model.execute":
      return details.description || "ejecuto un modelo IA";
    case "auth.login.success":
      return "inicio sesion";
    case "auth.logout.success":
      return "cerro sesion";
    case "auth.login.failure":
      return "tuvo un intento de acceso fallido";
    case "auth.forgot_password.requested":
      return "solicito recuperacion de contrasena";
    case "dashboard.activity.update":
      return "actualizo la actividad del dashboard";
    case "devices.create":
      return `registro un dispositivo${details.code ? `: ${details.code}` : ""}`;
    case "devices.update":
      return "actualizo un dispositivo";
    case "devices.status_change":
      return "cambio el estado de un dispositivo";
    case "devices.duplicate":
      return "duplico un dispositivo";
    case "devices.remove":
      return "elimino un dispositivo";
    case "equipment.create":
      return "registro equipo";
    case "equipment.update":
      return "actualizo equipo";
    case "equipment.status_change":
      return "cambio el estado de equipo";
    case "factors.create":
      return `creo un factor de emision${details.category ? `: ${details.category}` : ""}`;
    case "factors.update":
      return "actualizo un factor de emision";
    case "factors.new_version":
      return "creo una nueva version de factor";
    case "factors.default_change":
      return "cambio el factor predeterminado";
    case "factors.status_change":
      return "cambio el estado de un factor";
    case "files.upload":
      return "subio un archivo";
    case "records.create":
      return `capturo un registro${details.category ? ` de ${details.category}` : ""}`;
    case "records.archive":
      return "archivo un registro";
    case "reports.export":
      return `exporto un reporte${details.target ? `: ${details.target}` : ""}`;
    case "records.files_attached":
      return "adjunto evidencia a un registro";
    case "settings.update":
      return "actualizo preferencias de configuracion";
    case "targets.create":
      return "creo una meta";
    case "targets.update":
      return "actualizo una meta";
    case "targets.status_change":
      return "cambio el estado de una meta";
    case "targets.delete":
      return "elimino una meta";
    case "users.create":
      return `creo un usuario${details.email ? `: ${details.email}` : ""}`;
    case "users.update":
      return `actualizo un usuario${details.email ? `: ${details.email}` : ""}`;
    case "users.status_change":
      return "cambio el estado de un usuario";
    case "users.password_reset":
      return "restablecio una contrasena";
    case "profile.password_change":
      return "cambio su contrasena";
    case "notifications.create":
      return "creo una notificacion";
    case "notifications.status_change":
      return "actualizo una notificacion";
    case "notifications.mark_all_read":
      return "marco notificaciones como leidas";
    case "notifications.clear_archived":
      return "limpio notificaciones archivadas";
    default:
      return [actionKey, subActionKey].filter(Boolean).join(".") || row.event_type || "actualizo el sistema";
  }
}

function buildHomeActivityItem(row) {
  const [moduleKey] = String(row.event_type || "").split(".");
  return {
    id: row.id,
    user: row.user_name,
    action: auditActionText(row),
    module: auditModuleLabel(moduleKey, row.entity_type),
    ts: row.created_at,
    icon: auditIcon(moduleKey),
  };
}

export async function getAdminHomeSummary(actor) {
  await ensureAdminPeriodsSchema();
  const startedAt = Date.now();
  const dbPing = await query(`SELECT 1`);
  const dbLatency = Date.now() - startedAt;

  const [
    usersResult,
    areasResult,
    recordsResult,
    periodsResult,
    targetsResult,
    devicesResult,
    auditResult,
  ] = await Promise.all([
    query(
      `
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE is_active)::int AS active,
          count(*) FILTER (WHERE NOT is_active)::int AS inactive
        FROM users
        WHERE organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT count(*) FILTER (WHERE a.is_active)::int AS active
        FROM areas a
        JOIN campuses c ON c.id = a.campus_id
        WHERE c.organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          count(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
          count(*) FILTER (WHERE deleted_at IS NULL AND approved_at IS NULL)::int AS pending
        FROM records
        WHERE organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          count(*) FILTER (WHERE status = 'open')::int AS open,
          count(*) FILTER (WHERE status = 'closed')::int AS closed
        FROM admin_periods
        WHERE organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT count(*) FILTER (WHERE is_active AND status = 'active')::int AS active
        FROM targets
        WHERE organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          count(*) FILTER (WHERE d.is_active)::int AS connected,
          count(*) FILTER (
            WHERE d.is_active
              AND (t.last_timestamp IS NULL OR t.last_timestamp < now() - interval '48 hours')
          )::int AS offline
        FROM iot_devices d
        LEFT JOIN device_last_totals t ON t.device_id = d.id AND t.organization_id = d.organization_id
        WHERE d.organization_id = $1
      `,
      [actor.organizationId],
    ),
    query(
      `
        SELECT
          e.id,
          e.event_type,
          e.entity_type,
          e.entity_id,
          e.details,
          e.created_at,
          COALESCE(u.full_name, 'Sistema') AS user_name
        FROM audit_events e
        LEFT JOIN users u ON u.id = e.user_id AND u.organization_id = e.organization_id
        WHERE e.organization_id = $1
          AND e.event_type NOT IN (
            'admin.government.read',
            'auth.login.success',
            'dashboard.activity.update',
            'settings.read',
            'notifications.read'
          )
          AND e.event_type NOT LIKE 'auth.refresh.%'
        ORDER BY e.created_at DESC
        LIMIT 8
      `,
      [actor.organizationId],
    ),
  ]);

  void dbPing;
  const users = usersResult.rows[0] || {};
  const records = recordsResult.rows[0] || {};
  const periods = periodsResult.rows[0] || {};
  const devices = devicesResult.rows[0] || {};
  const pendingRecords = intValue(records, "pending");
  const offlineDevices = intValue(devices, "offline");
  const criticalAlerts = pendingRecords + offlineDevices;

  const alerts = [];
  if (offlineDevices > 0) {
    alerts.push({
      id: "devices-offline",
      severity: "critical",
      title: `${offlineDevices} dispositivo${offlineDevices === 1 ? "" : "s"} sin reporte en 48 h`,
      module: "Dispositivos",
      ts: new Date().toISOString(),
      read: false,
    });
  }
  if (pendingRecords > 0) {
    alerts.push({
      id: "records-pending",
      severity: pendingRecords > 10 ? "critical" : "warning",
      title: `${pendingRecords} registro${pendingRecords === 1 ? "" : "s"} pendiente${pendingRecords === 1 ? "" : "s"} de validacion`,
      module: "Registros",
      ts: new Date().toISOString(),
      read: false,
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "system-ok",
      severity: "info",
      title: "Sin alertas criticas activas",
      module: "Sistema",
      ts: new Date().toISOString(),
      read: true,
    });
  }

  const recentActivity = auditResult.rows.map(buildHomeActivityItem);

  const pendingTasks = alerts
    .filter((alert) => !alert.read)
    .map((alert) => ({
      id: `task-${alert.id}`,
      title: alert.title,
      priority: alert.severity === "critical" ? "high" : "medium",
      dueDate: new Date().toISOString().slice(0, 10),
      assignee: "Admin",
    }));

  return {
    overviewKpis: {
      totalUsers: intValue(users, "total"),
      activeUsers: intValue(users, "active"),
      inactiveUsers: intValue(users, "inactive"),
      areasRegistered: intValue(areasResult.rows[0], "active"),
      openPeriods: intValue(periods, "open"),
      closedPeriods: intValue(periods, "closed"),
      recordsCaptured: intValue(records, "total"),
      recordsPending: pendingRecords,
      activeGoals: intValue(targetsResult.rows[0], "active"),
      criticalAlerts,
      devicesConnected: intValue(devices, "connected"),
      devicesOffline: offlineDevices,
    },
    serviceHealth: [
      serviceStatus("Backend API", "online", 0),
      serviceStatus("Base de datos", "online", dbLatency),
      serviceStatus("Almacenamiento", "online", 0),
    ],
    systemAlerts: alerts,
    recentActivity,
    pendingTasks,
  };
}
