import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const ALLOWED_CHANNELS = new Set(["email", "inapp", "push", "sms", "webhook"]);

const DEFAULT_TEMPLATES = [
  {
    code: "device-offline",
    name: "Dispositivo desconectado",
    channel: "email",
    subject: "[CarbonTrack] Dispositivo {{deviceCode}} sin reporte",
    body: "El dispositivo {{deviceName}} ({{deviceCode}}) no ha enviado lectura desde {{lastReadingAt}}. Revísalo en el catálogo para descartar fallas.",
    variables: ["deviceName", "deviceCode", "lastReadingAt"],
  },
  {
    code: "anomaly-detected",
    name: "Lectura anómala",
    channel: "email",
    subject: "[CarbonTrack] Lectura anómala en {{areaCode}}",
    body: "Se detectó un valor {{value}} (promedio {{average}}). Validar el registro antes de aprobar.",
    variables: ["areaCode", "value", "average"],
  },
  {
    code: "factor-expired",
    name: "Factor de emisión vencido",
    channel: "email",
    subject: "[CarbonTrack] Factor vencido {{scope}}/{{category}}/{{metric}}",
    body: "El factor venció el {{validTo}}. Actualízalo para mantener los cálculos consistentes.",
    variables: ["scope", "category", "metric", "validTo"],
  },
  {
    code: "period-closing",
    name: "Cierre de periodo próximo",
    channel: "email",
    subject: "[CarbonTrack] Cierre próximo: {{periodName}}",
    body: "El periodo {{periodName}} cierra el {{endDate}}. Asegúrate de capturar y aprobar los registros pendientes.",
    variables: ["periodName", "endDate"],
  },
  {
    code: "goal-risk",
    name: "Meta en riesgo",
    channel: "email",
    subject: "[CarbonTrack] Meta en riesgo: {{title}}",
    body: "La meta {{title}} fue marcada en riesgo. Plazo objetivo: {{targetEnd}}. Revisa el plan de acción.",
    variables: ["title", "targetEnd"],
  },
  {
    code: "validation-overdue",
    name: "Registro pendiente vencido",
    channel: "inapp",
    subject: "Registro pendiente vencido",
    body: "El registro {{recordId}} lleva más de {{days}} días sin validar.",
    variables: ["recordId", "days"],
  },
  {
    code: "security-login-failed",
    name: "Intentos fallidos de login",
    channel: "email",
    subject: "[CarbonTrack] Intentos fallidos de login para {{email}}",
    body: "Se detectaron {{attempts}} intentos fallidos para {{email}} desde {{ipAddress}} en los últimos {{windowMinutes}} minutos.",
    variables: ["email", "attempts", "ipAddress", "windowMinutes"],
  },
];

function cleanString(value) { return String(value ?? "").trim(); }

function ensureChannel(value, fallback = "inapp") {
  const normalized = cleanString(value || fallback).toLowerCase();
  if (!ALLOWED_CHANNELS.has(normalized)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "channel is invalid.", details: { field: "channel" } });
  }
  return normalized;
}

function ensureNonEmpty(value, field, max = 200) {
  const normalized = cleanString(value);
  if (!normalized) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is required.`, details: { field } });
  }
  if (normalized.length > max) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is too long.`, details: { field, max } });
  }
  return normalized;
}

function normalizeVariables(variables) {
  if (!Array.isArray(variables)) return [];
  return [...new Set(variables.map((item) => cleanString(item)).filter(Boolean))];
}

function shapeTemplate(row) {
  return {
    id: cleanString(row.id),
    code: cleanString(row.code),
    name: cleanString(row.name),
    channel: cleanString(row.channel),
    subject: cleanString(row.subject),
    body: cleanString(row.body),
    variables: Array.isArray(row.variables) ? row.variables : [],
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function seedDefaultTemplatesIfNeeded(client, actor) {
  const count = await client.query(
    `SELECT count(*)::int AS total FROM admin_alert_templates WHERE organization_id = $1`,
    [actor.organizationId],
  );
  if (count.rows[0]?.total > 0) return;

  for (const template of DEFAULT_TEMPLATES) {
    await client.query(
      `
        INSERT INTO admin_alert_templates (
          organization_id, code, name, channel, subject, body, variables,
          enabled, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,true,$8,$8)
        ON CONFLICT (organization_id, code) DO NOTHING
      `,
      [
        actor.organizationId,
        template.code,
        template.name,
        template.channel,
        template.subject,
        template.body,
        JSON.stringify(template.variables),
        actor.id,
      ],
    );
  }
}

export async function listAdminAlertTemplates(actor) {
  return withTransaction(async (client) => {
    await seedDefaultTemplatesIfNeeded(client, actor);
    const result = await client.query(
      `
        SELECT id, code, name, channel, subject, body, variables, enabled, created_at, updated_at
        FROM admin_alert_templates
        WHERE organization_id = $1
        ORDER BY enabled DESC, name ASC
      `,
      [actor.organizationId],
    );
    return result.rows.map(shapeTemplate);
  });
}

export async function getAdminAlertTemplate(organizationId, templateId, client = { query }) {
  if (!templateId) return null;
  const result = await client.query(
    `
      SELECT id, code, name, channel, subject, body, variables, enabled
      FROM admin_alert_templates
      WHERE id = $1 AND organization_id = $2 AND enabled = true
      LIMIT 1
    `,
    [templateId, organizationId],
  );
  return result.rows[0] ? shapeTemplate(result.rows[0]) : null;
}

export async function getAdminAlertTemplateByCode(organizationId, code, client = { query }) {
  const result = await client.query(
    `
      SELECT id, code, name, channel, subject, body, variables, enabled
      FROM admin_alert_templates
      WHERE organization_id = $1 AND code = $2 AND enabled = true
      LIMIT 1
    `,
    [organizationId, code],
  );
  return result.rows[0] ? shapeTemplate(result.rows[0]) : null;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "Template payload must be an object." });
  }
  return {
    code: ensureNonEmpty(payload.code, "code", 80).toLowerCase().replace(/[^a-z0-9_\-:.]/g, "-"),
    name: ensureNonEmpty(payload.name, "name", 160),
    channel: ensureChannel(payload.channel),
    subject: payload.subject != null ? cleanString(payload.subject).slice(0, 200) : null,
    body: ensureNonEmpty(payload.body, "body", 5000),
    variables: normalizeVariables(payload.variables),
    enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
  };
}

export async function createAdminAlertTemplate(actor, payload, auditContext) {
  const template = normalizePayload(payload);
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id FROM admin_alert_templates WHERE organization_id = $1 AND code = $2 LIMIT 1`,
      [actor.organizationId, template.code],
    );
    if (existing.rowCount > 0) {
      throw new AppError({ statusCode: 409, code: "CONFLICT", message: "Template code already exists.", details: { field: "code" } });
    }

    const result = await client.query(
      `
        INSERT INTO admin_alert_templates (
          organization_id, code, name, channel, subject, body, variables,
          enabled, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$9)
        RETURNING id, code, name, channel, subject, body, variables, enabled, created_at, updated_at
      `,
      [
        actor.organizationId,
        template.code,
        template.name,
        template.channel,
        template.subject,
        template.body,
        JSON.stringify(template.variables),
        template.enabled,
        actor.id,
      ],
    );

    const created = shapeTemplate(result.rows[0]);
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
      eventType: "admin_alerts.template_create",
      entityType: "admin_alert_template",
      entityId: created.id,
      details: { code: created.code, channel: created.channel },
    });
    return created;
  });
}

export async function updateAdminAlertTemplate(actor, templateId, payload, auditContext) {
  const template = normalizePayload(payload);
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE admin_alert_templates
        SET name = $1, channel = $2, subject = $3, body = $4,
            variables = $5::jsonb, enabled = $6, updated_by = $7, updated_at = now()
        WHERE id = $8 AND organization_id = $9
        RETURNING id, code, name, channel, subject, body, variables, enabled, created_at, updated_at
      `,
      [
        template.name,
        template.channel,
        template.subject,
        template.body,
        JSON.stringify(template.variables),
        template.enabled,
        actor.id,
        templateId,
        actor.organizationId,
      ],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Template not found." });
    }
    const updated = shapeTemplate(result.rows[0]);
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
      eventType: "admin_alerts.template_update",
      entityType: "admin_alert_template",
      entityId: updated.id,
      details: { code: updated.code, channel: updated.channel, enabled: updated.enabled },
    });
    return updated;
  });
}

export async function deleteAdminAlertTemplate(actor, templateId, auditContext) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `DELETE FROM admin_alert_templates WHERE id = $1 AND organization_id = $2 RETURNING code, name`,
      [templateId, actor.organizationId],
    );
    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Template not found." });
    }
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
      eventType: "admin_alerts.template_delete",
      entityType: "admin_alert_template",
      entityId: templateId,
      details: { code: cleanString(result.rows[0]?.code), name: cleanString(result.rows[0]?.name) },
    });
    return { deleted: true };
  });
}

export function renderTemplate(template, context = {}) {
  const render = (input) => String(input || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const parts = key.split(".");
    let current = context;
    for (const part of parts) {
      if (current == null) return "";
      current = current[part];
    }
    return current == null ? "" : String(current);
  });
  return {
    subject: render(template?.subject || ""),
    body: render(template?.body || ""),
  };
}
