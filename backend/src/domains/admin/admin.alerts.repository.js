import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { runScheduledAdminAlertChecksForOrganization } from "./admin.alerts-engine.js";
import {
  listAdminAlertTemplates,
  seedDefaultTemplatesIfNeeded,
} from "./admin.alert-templates.repository.js";

const ALERT_TYPES = new Set(["device", "anomaly", "factor", "period", "goal", "validation", "security", "system", "custom"]);
const SEVERITIES = new Set(["info", "warning", "critical"]);
const PRIORITIES = new Set(["low", "normal", "high"]);
const FREQUENCIES = new Set(["immediate", "hourly", "daily", "weekly"]);
const CHANNELS = [
  { id: "email", label: "Correo", icon: "Mail" },
  { id: "push", label: "Push", icon: "Bell" },
  { id: "inapp", label: "En la app", icon: "MessageSquare" },
  { id: "sms", label: "SMS", icon: "Smartphone" },
  { id: "webhook", label: "Webhook", icon: "Webhook" },
];
const CHANNEL_IDS = new Set(CHANNELS.map((channel) => channel.id));

const DEFAULT_RULES = [
  {
    name: "Dispositivo desconectado",
    type: "device",
    condition: "sin lectura > 24h",
    conditionJson: { hours: 24 },
    severity: "critical",
    priority: "high",
    frequency: "immediate",
    channels: ["email", "inapp", "webhook"],
    recipients: ["admin", "Mantenimiento"],
    templateCode: "device-offline",
  },
  {
    name: "Lectura fuera de rango",
    type: "anomaly",
    condition: "delta > 30% vs media",
    conditionJson: { percent: 30 },
    severity: "warning",
    priority: "normal",
    frequency: "immediate",
    channels: ["email", "inapp"],
    recipients: ["Validadores"],
    templateCode: "anomaly-detected",
  },
  {
    name: "Factor de emisión vencido",
    type: "factor",
    condition: "validUntil < hoy",
    conditionJson: {},
    severity: "critical",
    priority: "high",
    frequency: "daily",
    channels: ["email", "inapp"],
    recipients: ["admin"],
    templateCode: "factor-expired",
  },
  {
    name: "Periodo próximo a cerrar",
    type: "period",
    condition: "endDate <= 7 días",
    conditionJson: { days: 7 },
    severity: "info",
    priority: "low",
    frequency: "daily",
    channels: ["email", "inapp"],
    recipients: ["directivo", "operativo"],
    templateCode: "period-closing",
  },
  {
    name: "Meta en riesgo",
    type: "goal",
    condition: "progreso < 50% al 75% del plazo",
    conditionJson: {},
    severity: "warning",
    priority: "high",
    frequency: "weekly",
    channels: ["email", "inapp"],
    recipients: ["directivo"],
    templateCode: "goal-risk",
  },
  {
    name: "Registro pendiente > 5 días",
    type: "validation",
    condition: "submittedAt > 5 días",
    conditionJson: { days: 5 },
    severity: "warning",
    priority: "normal",
    frequency: "daily",
    channels: ["inapp"],
    recipients: ["Validadores"],
    templateCode: "validation-overdue",
  },
  {
    name: "Login fallido reiterado",
    type: "security",
    condition: "5 intentos en 10 min",
    conditionJson: { attempts: 5, minutes: 10 },
    severity: "critical",
    priority: "high",
    frequency: "immediate",
    channels: ["email"],
    recipients: ["admin"],
    enabled: true,
    templateCode: "security-login-failed",
  },
];

function cleanString(value, fallback = "") { return String(value ?? fallback).trim(); }

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

function normalizeConditionJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    const cleanKey = String(key).trim().slice(0, 40);
    if (!cleanKey) continue;
    if (typeof raw === "number" && Number.isFinite(raw)) out[cleanKey] = raw;
    else if (typeof raw === "string") out[cleanKey] = raw.slice(0, 200);
    else if (typeof raw === "boolean") out[cleanKey] = raw;
  }
  return out;
}

function normalizeWebhookUrl(value) {
  const clean = cleanString(value);
  if (!clean) return null;
  if (!/^https?:\/\//i.test(clean)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "webhookUrl must start with http(s)://", details: { field: "webhookUrl" } });
  }
  if (clean.length > 500) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "webhookUrl is too long.", details: { field: "webhookUrl" } });
  }
  return clean;
}

function normalizeCooldown(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60 * 24 * 7) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "cooldownMinutes must be between 0 and 10080.", details: { field: "cooldownMinutes" } });
  }
  return Math.round(parsed);
}

function normalizeHour(value, field) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be an integer 0-23.`, details: { field } });
  }
  return parsed;
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

  const channels = cleanStringList(payload.channels, "channels", CHANNEL_IDS);
  const webhookUrl = normalizeWebhookUrl(payload.webhookUrl);
  if (channels.includes("webhook") && !webhookUrl) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "webhookUrl is required when channel webhook is selected.", details: { field: "webhookUrl" } });
  }

  return {
    name: requireText(payload.name, "name", 160),
    type: requireChoice(payload.type, "type", ALERT_TYPES, "system"),
    condition: requireText(payload.condition, "condition"),
    conditionJson: normalizeConditionJson(payload.conditionJson),
    severity: requireChoice(payload.severity, "severity", SEVERITIES, "warning"),
    priority: requireChoice(payload.priority, "priority", PRIORITIES, "normal"),
    frequency: requireChoice(payload.frequency, "frequency", FREQUENCIES, "immediate"),
    channels,
    recipients: cleanStringList(payload.recipients, "recipients"),
    enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
    templateId: cleanString(payload.templateId) || null,
    webhookUrl,
    cooldownMinutes: normalizeCooldown(payload.cooldownMinutes),
    quietHoursStart: normalizeHour(payload.quietHoursStart, "quietHoursStart"),
    quietHoursEnd: normalizeHour(payload.quietHoursEnd, "quietHoursEnd"),
  };
}

function shapeRule(row) {
  return {
    id: cleanString(row.id),
    name: cleanString(row.name),
    type: cleanString(row.type),
    condition: cleanString(row.condition),
    conditionJson: row.condition_json && typeof row.condition_json === "object" ? row.condition_json : {},
    severity: cleanString(row.severity),
    priority: cleanString(row.priority),
    frequency: cleanString(row.frequency),
    channels: Array.isArray(row.channels) ? row.channels : [],
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    enabled: Boolean(row.enabled),
    triggeredCount: Number(row.triggered_count || 0),
    templateId: cleanString(row.template_id),
    webhookUrl: cleanString(row.webhook_url),
    cooldownMinutes: row.cooldown_minutes,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    lastTriggeredAt: row.last_triggered_at,
    lastEvaluatedAt: row.last_evaluated_at,
    deliveryFailures: Number(row.delivery_failures || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function shapeHistory(row) {
  return {
    id: cleanString(row.id),
    ts: row.created_at,
    ruleId: cleanString(row.rule_id),
    title: cleanString(row.title || row.recipient),
    channel: cleanString(row.channel),
    recipients: Number(row.recipient_count || 1),
    status: cleanString(row.status) || "sent",
    error: cleanString(row.error),
    providerMessageId: cleanString(row.provider_message_id),
  };
}

async function seedDefaultRulesIfNeeded(client, actor) {
  const count = await client.query(
    `SELECT count(*)::int AS total FROM admin_alert_rules WHERE organization_id = $1`,
    [actor.organizationId],
  );
  if (count.rows[0]?.total > 0) return;

  await seedDefaultTemplatesIfNeeded(client, actor);

  const templates = await client.query(
    `SELECT id, code FROM admin_alert_templates WHERE organization_id = $1`,
    [actor.organizationId],
  );
  const templateByCode = new Map(templates.rows.map((row) => [row.code, row.id]));

  for (const rule of DEFAULT_RULES) {
    await client.query(
      `
        INSERT INTO admin_alert_rules (
          organization_id, name, type, condition, condition_json, severity, priority, frequency,
          channels, recipients, enabled, template_id, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::text[],$10::text[],$11,$12,$13,$13)
      `,
      [
        actor.organizationId,
        rule.name,
        rule.type,
        rule.condition,
        JSON.stringify(rule.conditionJson || {}),
        rule.severity,
        rule.priority,
        rule.frequency,
        rule.channels,
        rule.recipients,
        rule.enabled !== false,
        templateByCode.get(rule.templateCode) || null,
        actor.id,
      ],
    );
  }
}

export async function listAdminAlerts(actor) {
  return withTransaction(async (client) => {
    await seedDefaultRulesIfNeeded(client, actor);

    const rulesResult = await client.query(
      `
        SELECT id, name, type, condition, condition_json, severity, priority, frequency,
               channels, recipients, enabled, triggered_count, template_id, webhook_url,
               cooldown_minutes, quiet_hours_start, quiet_hours_end, last_triggered_at,
               last_evaluated_at, delivery_failures, created_at, updated_at
        FROM admin_alert_rules
        WHERE organization_id = $1
        ORDER BY enabled DESC, severity DESC, updated_at DESC, name ASC
      `,
      [actor.organizationId],
    );

    const historyResult = await client.query(
      `
        SELECT d.id, d.rule_id, d.channel, d.recipient, d.status, d.provider_message_id,
               d.error, d.created_at, COALESCE(n.title, d.event_key) AS title,
               (SELECT count(*) FROM admin_alert_deliveries d2
                WHERE d2.organization_id = d.organization_id
                  AND d2.event_key = d.event_key
                  AND d2.created_at = d.created_at)::int AS recipient_count
        FROM admin_alert_deliveries d
        LEFT JOIN notifications n ON n.id = d.notification_id
        WHERE d.organization_id = $1
        ORDER BY d.created_at DESC, d.id DESC
        LIMIT 100
      `,
      [actor.organizationId],
    );

    const metricsResult = await client.query(
      `
        SELECT
          count(*) FILTER (WHERE status = 'sent') ::int AS sent,
          count(*) FILTER (WHERE status = 'failed') ::int AS failed,
          count(*) FILTER (WHERE status = 'skipped') ::int AS skipped,
          count(*) FILTER (WHERE channel = 'email' AND status = 'sent') ::int AS email_sent,
          count(*) FILTER (WHERE channel = 'inapp' AND status = 'sent') ::int AS inapp_sent,
          count(*) FILTER (WHERE channel = 'webhook' AND status = 'sent') ::int AS webhook_sent,
          count(*) FILTER (WHERE created_at >= now() - interval '24 hours') ::int AS last_24h
        FROM admin_alert_deliveries
        WHERE organization_id = $1
      `,
      [actor.organizationId],
    );

    const templates = await listAdminAlertTemplates(actor);
    const metricsRow = metricsResult.rows[0] || {};

    return {
      rules: rulesResult.rows.map(shapeRule),
      templates,
      history: historyResult.rows.map(shapeHistory),
      channels: CHANNELS,
      metrics: {
        sent: Number(metricsRow.sent || 0),
        failed: Number(metricsRow.failed || 0),
        skipped: Number(metricsRow.skipped || 0),
        emailSent: Number(metricsRow.email_sent || 0),
        inappSent: Number(metricsRow.inapp_sent || 0),
        webhookSent: Number(metricsRow.webhook_sent || 0),
        last24h: Number(metricsRow.last_24h || 0),
      },
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
          organization_id, name, type, condition, condition_json, severity, priority, frequency,
          channels, recipients, enabled, template_id, webhook_url, cooldown_minutes,
          quiet_hours_start, quiet_hours_end, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::text[],$10::text[],$11,$12,$13,$14,$15,$16,$17,$17)
        RETURNING id, name, type, condition, condition_json, severity, priority, frequency,
                  channels, recipients, enabled, triggered_count, template_id, webhook_url,
                  cooldown_minutes, quiet_hours_start, quiet_hours_end, last_triggered_at,
                  last_evaluated_at, delivery_failures, created_at, updated_at
      `,
      [
        actor.organizationId,
        rule.name, rule.type, rule.condition, JSON.stringify(rule.conditionJson),
        rule.severity, rule.priority, rule.frequency,
        rule.channels, rule.recipients, rule.enabled,
        rule.templateId, rule.webhookUrl, rule.cooldownMinutes,
        rule.quietHoursStart, rule.quietHoursEnd,
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
        UPDATE admin_alert_rules SET
          name = $1, type = $2, condition = $3, condition_json = $4::jsonb,
          severity = $5, priority = $6, frequency = $7,
          channels = $8::text[], recipients = $9::text[], enabled = $10,
          template_id = $11, webhook_url = $12, cooldown_minutes = $13,
          quiet_hours_start = $14, quiet_hours_end = $15,
          updated_by = $16, updated_at = now()
        WHERE id = $17 AND organization_id = $18
        RETURNING id, name, type, condition, condition_json, severity, priority, frequency,
                  channels, recipients, enabled, triggered_count, template_id, webhook_url,
                  cooldown_minutes, quiet_hours_start, quiet_hours_end, last_triggered_at,
                  last_evaluated_at, delivery_failures, created_at, updated_at
      `,
      [
        rule.name, rule.type, rule.condition, JSON.stringify(rule.conditionJson),
        rule.severity, rule.priority, rule.frequency,
        rule.channels, rule.recipients, rule.enabled,
        rule.templateId, rule.webhookUrl, rule.cooldownMinutes,
        rule.quietHoursStart, rule.quietHoursEnd,
        actor.id, ruleId, actor.organizationId,
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
        UPDATE admin_alert_rules SET enabled = $1, updated_by = $2, updated_at = now()
        WHERE id = $3 AND organization_id = $4
        RETURNING id, name, type, condition, condition_json, severity, priority, frequency,
                  channels, recipients, enabled, triggered_count, template_id, webhook_url,
                  cooldown_minutes, quiet_hours_start, quiet_hours_end, last_triggered_at,
                  last_evaluated_at, delivery_failures, created_at, updated_at
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

export async function deleteAdminAlertRule(actor, ruleId, auditContext) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `DELETE FROM admin_alert_rules WHERE id = $1 AND organization_id = $2 RETURNING name`,
      [ruleId, actor.organizationId],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Alert rule not found." });
    }
    await insertAuditEvent(client, {
      ...auditPayload(actor, auditContext, { name: cleanString(result.rows[0]?.name) }),
      eventType: "admin_alerts.delete",
      entityType: "admin_alert_rule",
      entityId: ruleId,
    });
    return { deleted: true };
  });
}

export async function runAlertRuleManually(actor, ruleId) {
  return withTransaction(async (client) => {
    const rule = await client.query(
      `SELECT id, type FROM admin_alert_rules WHERE id = $1 AND organization_id = $2 AND enabled = true LIMIT 1`,
      [ruleId, actor.organizationId],
    );
    if (rule.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Alert rule not found or disabled." });
    }
    await runScheduledAdminAlertChecksForOrganization(client, actor.organizationId);
    return { triggered: true };
  });
}

export async function getActiveAlertRulesForOrganization(organizationId, type) {
  const params = [organizationId];
  const typeFilter = type ? "AND type = $2" : "";
  if (type) params.push(type);
  const result = await query(
    `
      SELECT id, name, type, condition, condition_json, severity, priority, frequency,
             channels, recipients, enabled, triggered_count, template_id, webhook_url,
             cooldown_minutes, quiet_hours_start, quiet_hours_end, last_triggered_at,
             last_evaluated_at, delivery_failures, created_at, updated_at
      FROM admin_alert_rules
      WHERE organization_id = $1 AND enabled = true ${typeFilter}
      ORDER BY priority DESC, severity DESC, name ASC
    `,
    params,
  );
  return result.rows.map(shapeRule);
}
