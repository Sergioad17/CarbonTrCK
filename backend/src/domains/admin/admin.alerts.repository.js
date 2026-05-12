import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { runScheduledAdminAlertChecks } from "./admin.alerts-engine.js";

const ALERT_TYPES = new Set(["device", "anomaly", "factor", "period", "goal", "validation", "security", "system"]);
const SEVERITIES = new Set(["info", "warning", "critical"]);
const PRIORITIES = new Set(["low", "normal", "high"]);
const FREQUENCIES = new Set(["immediate", "hourly", "daily", "weekly"]);
const CHANNELS = [
  { id: "email", label: "Correo", icon: "Mail" },
  { id: "push", label: "Push", icon: "Bell" },
  { id: "inapp", label: "En la app", icon: "MessageSquare" },
  { id: "sms", label: "SMS", icon: "Smartphone" },
];
const CHANNEL_IDS = new Set(CHANNELS.map((channel) => channel.id));

const TEMPLATES = [
  {
    id: "device-offline",
    name: "Dispositivo desconectado",
    subject: "[CarbonTrack] Dispositivo {{deviceName}} sin reporte",
    body: "El dispositivo {{deviceName}} en {{areaName}} no ha enviado lectura desde {{lastReading}}.",
    channel: "email",
  },
  {
    id: "anomaly-detected",
    name: "Anomalía detectada",
    subject: "[CarbonTrack] Lectura anómala en {{areaName}}",
    body: "Se detectó una variación de {{delta}}% en la lectura del {{date}}.",
    channel: "email",
  },
  {
    id: "factor-expired",
    name: "Factor vencido",
    subject: "[CarbonTrack] Factor {{factorCode}} vencido",
    body: "El factor {{factorCode}} venció el {{validUntil}}. Actualícelo lo antes posible.",
    channel: "email",
  },
  {
    id: "period-closing",
    name: "Cierre de periodo",
    subject: "[CarbonTrack] Periodo {{periodName}} próximo a cerrar",
    body: "El periodo {{periodName}} cierra el {{endDate}}. Captura pendiente: {{pendingCount}}.",
    channel: "email",
  },
];

const DEFAULT_RULES = [
  {
    name: "Dispositivo desconectado",
    type: "device",
    condition: "sin lectura > 24h",
    severity: "critical",
    priority: "high",
    frequency: "immediate",
    channels: ["email", "push", "inapp"],
    recipients: ["admin", "Mantenimiento"],
  },
  {
    name: "Lectura fuera de rango",
    type: "anomaly",
    condition: "delta > 30% vs media",
    severity: "warning",
    priority: "normal",
    frequency: "immediate",
    channels: ["email", "inapp"],
    recipients: ["Validadores"],
  },
  {
    name: "Factor de emisión vencido",
    type: "factor",
    condition: "validUntil < hoy",
    severity: "critical",
    priority: "high",
    frequency: "daily",
    channels: ["email", "inapp"],
    recipients: ["admin"],
  },
  {
    name: "Periodo próximo a cerrar",
    type: "period",
    condition: "endDate <= 7 días",
    severity: "info",
    priority: "low",
    frequency: "daily",
    channels: ["email", "inapp"],
    recipients: ["directivo", "operativo"],
  },
  {
    name: "Meta en riesgo",
    type: "goal",
    condition: "progreso < 50% al 75% del plazo",
    severity: "warning",
    priority: "high",
    frequency: "weekly",
    channels: ["email", "inapp"],
    recipients: ["directivo"],
  },
  {
    name: "Registro pendiente > 5 días",
    type: "validation",
    condition: "submittedAt > 5 días",
    severity: "warning",
    priority: "normal",
    frequency: "daily",
    channels: ["inapp"],
    recipients: ["Validadores"],
  },
  {
    name: "Login fallido reiterado",
    type: "security",
    condition: "5 intentos en 10 min",
    severity: "critical",
    priority: "high",
    frequency: "immediate",
    channels: ["email"],
    recipients: ["admin"],
    enabled: false,
  },
];

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function cleanStringList(value, field, allowedSet) {
  if (!Array.isArray(value)) return [];
  const unique = [...new Set(value.map((item) => cleanString(item)).filter(Boolean))];
  if (allowedSet && unique.some((item) => !allowedSet.has(item))) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} contains an invalid value.`, details: { field } });
  }
  return unique;
}

function requireChoice(value, field, allowedSet, fallback) {
  const normalized = cleanString(value || fallback);
  if (!allowedSet.has(normalized)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is invalid.`, details: { field } });
  }
  return normalized;
}

function requireText(value, field, maxLength) {
  const normalized = cleanString(value);
  if (!normalized) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is required.`, details: { field } });
  }
  if (maxLength && normalized.length > maxLength) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is too long.`, details: { field, maxLength } });
  }
  return normalized;
}

function auditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
    details,
  };
}

function normalizeRulePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "Alert rule must be a valid object." });
  }

  return {
    name: requireText(payload.name, "name", 160),
    type: requireChoice(payload.type, "type", ALERT_TYPES, "system"),
    condition: requireText(payload.condition, "condition"),
    severity: requireChoice(payload.severity, "severity", SEVERITIES, "warning"),
    priority: requireChoice(payload.priority, "priority", PRIORITIES, "normal"),
    frequency: requireChoice(payload.frequency, "frequency", FREQUENCIES, "immediate"),
    channels: cleanStringList(payload.channels, "channels", CHANNEL_IDS),
    recipients: cleanStringList(payload.recipients, "recipients"),
    enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
  };
}

function shapeRule(row) {
  return {
    id: cleanString(row.id),
    name: cleanString(row.name),
    type: cleanString(row.type),
    condition: cleanString(row.condition),
    severity: cleanString(row.severity),
    priority: cleanString(row.priority),
    frequency: cleanString(row.frequency),
    channels: Array.isArray(row.channels) ? row.channels : [],
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    enabled: Boolean(row.enabled),
    triggeredCount: Number(row.triggered_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shapeHistory(row) {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  return {
    id: cleanString(row.id),
    ts: row.created_at,
    ruleId: cleanString(metadata.ruleId || metadata.alertRuleId),
    title: cleanString(row.title),
    channel: cleanString(metadata.channel || metadata.deliveryChannel || "inapp"),
    recipients: Number(row.recipients || 1),
    status: row.status === "archived" ? "archived" : "sent",
  };
}

async function seedDefaultRulesIfNeeded(client, actor) {
  const count = await client.query(
    `SELECT count(*)::int AS total FROM admin_alert_rules WHERE organization_id = $1`,
    [actor.organizationId],
  );
  if (count.rows[0]?.total > 0) return;

  for (const rule of DEFAULT_RULES) {
    await client.query(
      `
        INSERT INTO admin_alert_rules (
          organization_id, name, type, condition, severity, priority, frequency,
          channels, recipients, enabled, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::text[],$9::text[],$10,$11,$11)
      `,
      [
        actor.organizationId,
        rule.name,
        rule.type,
        rule.condition,
        rule.severity,
        rule.priority,
        rule.frequency,
        rule.channels,
        rule.recipients,
        rule.enabled !== false,
        actor.id,
      ],
    );
  }
}

export async function listAdminAlerts(actor) {
  return withTransaction(async (client) => {
    await seedDefaultRulesIfNeeded(client, actor);
    await runScheduledAdminAlertChecks(client, actor);
    const rulesResult = await client.query(
      `
        SELECT id, name, type, condition, severity, priority, frequency, channels, recipients,
               enabled, triggered_count, created_at, updated_at
        FROM admin_alert_rules
        WHERE organization_id = $1
        ORDER BY enabled DESC, severity DESC, updated_at DESC, name ASC
      `,
      [actor.organizationId],
    );

    const historyResult = await client.query(
      `
        SELECT n.id, n.title, n.status::text AS status, n.metadata, n.created_at,
               count(*) OVER (PARTITION BY n.title, date_trunc('minute', n.created_at))::int AS recipients
        FROM notifications n
        WHERE n.organization_id = $1
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT 100
      `,
      [actor.organizationId],
    );

    return {
      rules: rulesResult.rows.map(shapeRule),
      templates: TEMPLATES,
      history: historyResult.rows.map(shapeHistory),
      channels: CHANNELS,
    };
  });
}

export async function createAdminAlertRule(actor, payload, auditContext) {
  const rule = normalizeRulePayload(payload);
  if (rule.channels.length === 0) rule.channels = ["inapp"];

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO admin_alert_rules (
          organization_id, name, type, condition, severity, priority, frequency,
          channels, recipients, enabled, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::text[],$9::text[],$10,$11,$11)
        RETURNING id, name, type, condition, severity, priority, frequency, channels, recipients,
                  enabled, triggered_count, created_at, updated_at
      `,
      [
        actor.organizationId,
        rule.name,
        rule.type,
        rule.condition,
        rule.severity,
        rule.priority,
        rule.frequency,
        rule.channels,
        rule.recipients,
        rule.enabled,
        actor.id,
      ],
    );
    const created = shapeRule(result.rows[0]);
    await insertAuditEvent(client, {
      ...auditPayload(actor, auditContext, { name: created.name, type: created.type, enabled: created.enabled }),
      eventType: "admin_alerts.create",
      entityType: "admin_alert_rule",
      entityId: created.id,
    });
    return created;
  });
}

export async function updateAdminAlertRule(actor, ruleId, payload, auditContext) {
  const rule = normalizeRulePayload(payload);
  if (rule.channels.length === 0) rule.channels = ["inapp"];

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE admin_alert_rules
        SET name = $1,
            type = $2,
            condition = $3,
            severity = $4,
            priority = $5,
            frequency = $6,
            channels = $7::text[],
            recipients = $8::text[],
            enabled = $9,
            updated_by = $10,
            updated_at = now()
        WHERE id = $11
          AND organization_id = $12
        RETURNING id, name, type, condition, severity, priority, frequency, channels, recipients,
                  enabled, triggered_count, created_at, updated_at
      `,
      [
        rule.name,
        rule.type,
        rule.condition,
        rule.severity,
        rule.priority,
        rule.frequency,
        rule.channels,
        rule.recipients,
        rule.enabled,
        actor.id,
        ruleId,
        actor.organizationId,
      ],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Alert rule not found." });
    }
    const updated = shapeRule(result.rows[0]);
    await insertAuditEvent(client, {
      ...auditPayload(actor, auditContext, { name: updated.name, type: updated.type, enabled: updated.enabled }),
      eventType: "admin_alerts.update",
      entityType: "admin_alert_rule",
      entityId: updated.id,
    });
    return updated;
  });
}

export async function updateAdminAlertRuleStatus(actor, ruleId, enabled, auditContext) {
  if (typeof enabled !== "boolean") {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "enabled must be boolean.", details: { field: "enabled" } });
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE admin_alert_rules
        SET enabled = $1,
            updated_by = $2,
            updated_at = now()
        WHERE id = $3
          AND organization_id = $4
        RETURNING id, name, type, condition, severity, priority, frequency, channels, recipients,
                  enabled, triggered_count, created_at, updated_at
      `,
      [enabled, actor.id, ruleId, actor.organizationId],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Alert rule not found." });
    }
    const updated = shapeRule(result.rows[0]);
    await insertAuditEvent(client, {
      ...auditPayload(actor, auditContext, { name: updated.name, enabled: updated.enabled }),
      eventType: "admin_alerts.status_change",
      entityType: "admin_alert_rule",
      entityId: updated.id,
    });
    return updated;
  });
}

export async function getActiveAlertRulesForOrganization(organizationId, type) {
  const params = [organizationId];
  const typeFilter = type ? "AND type = $2" : "";
  if (type) params.push(type);
  const result = await query(
    `
      SELECT id, name, type, condition, severity, priority, frequency, channels, recipients,
             enabled, triggered_count, created_at, updated_at
      FROM admin_alert_rules
      WHERE organization_id = $1
        AND enabled = true
        ${typeFilter}
      ORDER BY priority DESC, severity DESC, name ASC
    `,
    params,
  );
  return result.rows.map(shapeRule);
}
