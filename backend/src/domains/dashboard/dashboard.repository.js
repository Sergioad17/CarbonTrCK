import crypto from "node:crypto";
import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

function cleanString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeIsoDate(value) {
  const text = cleanString(value);
  if (!text) {
    return new Date().toISOString().slice(0, 10);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "dateISO must be a valid date.",
      details: { field: "dateISO" },
    });
  }

  return date.toISOString().slice(0, 10);
}

function normalizeTimestamp(value, fallback = "") {
  const text = cleanString(value);
  if (!text) {
    return fallback;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeActivityItem(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `items[${index}] must be an object.`,
      details: { field: `items[${index}]` },
    });
  }

  const status = cleanString(item.status).toLowerCase() === "est" ? "est" : "real";
  const createdAt = normalizeTimestamp(item.createdAt, new Date().toISOString());
  const updatedAt = normalizeTimestamp(item.updatedAt, createdAt);

  return {
    id: cleanString(item.id, crypto.randomUUID()),
    status,
    area: cleanString(item.area, "Sin area"),
    dateISO: normalizeIsoDate(item.dateISO),
    co2e_t: normalizeNumber(item.co2e_t, 0),
    time: cleanString(item.time, "Justo ahora"),
    by: cleanString(item.by, "Sistema"),
    activity: cleanString(item.activity || item.activityText),
    category: cleanString(item.category),
    unit: cleanString(item.unit),
    source: cleanString(item.source),
    note: cleanString(item.note || item.notes),
    evidence: cleanString(item.evidence),
    evidenceUrl: cleanString(item.evidenceUrl || item.evidence),
    period: cleanString(item.period),
    scope: cleanString(item.scope),
    state: cleanString(item.state || item.recordState),
    targetTitle: cleanString(item.targetTitle || item.goalTitle),
    updatedAt,
    createdAt,
    value: normalizeNumber(item.value),
    factor: normalizeNumber(item.factor),
    co2e_kg: normalizeNumber(item.co2e_kg),
  };
}

function normalizeActivityItems(items = []) {
  return items.map((item, index) => normalizeActivityItem(item, index)).slice(0, 20);
}

export async function listDashboardActivity(actor) {
  const result = await query(
    `
      SELECT items
      FROM dashboard_activity_feeds
      WHERE organization_id = $1
    `,
    [actor.organizationId],
  );

  if (result.rowCount < 1) {
    return [];
  }

  return normalizeActivityItems(result.rows[0].items || []);
}

export async function persistDashboardActivity(actor, items, auditContext = {}) {
  const normalizedItems = normalizeActivityItems(items);

  return withTransaction(async (client) => {
    const result = await client.query(
      `
        INSERT INTO dashboard_activity_feeds (
          organization_id,
          items,
          updated_by
        )
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (organization_id)
        DO UPDATE SET
          items = EXCLUDED.items,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING id, items, created_at, updated_at
      `,
      [actor.organizationId, JSON.stringify(normalizedItems), actor.id],
    );

    const feed = result.rows[0];

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "dashboard.activity.update",
      entityType: "dashboard_activity_feed",
      entityId: feed.id,
      ipAddress: auditContext.ipAddress || null,
      userAgent: auditContext.userAgent || null,
      details: {
        itemCount: normalizedItems.length,
        itemIds: normalizedItems.map((item) => item.id),
      },
    });

    return normalizeActivityItems(feed.items || []);
  });
}
