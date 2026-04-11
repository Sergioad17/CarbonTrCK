import { query } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";

const ALLOWED_STATUSES = new Set(["unread", "read", "archived"]);

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function ensurePlainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid object.`, details: { field } });
  }
  return value;
}

function validateStatus(status) {
  const normalized = cleanString(status || "unread");
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "status is invalid.", details: { field: "status" } });
  }
  return normalized;
}

function buildMetadata(meta, link) {
  const source = meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : {};
  if (link) source.link = link;
  return source;
}

function buildNotificationShape(row) {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? { ...row.metadata } : {};
  const link = typeof metadata.link === "string" ? metadata.link : "";
  if ("link" in metadata) delete metadata.link;
  return {
    id: cleanString(row.id),
    type: cleanString(row.type, "system") || "system",
    title: cleanString(row.title),
    message: cleanString(row.message),
    link,
    status: cleanString(row.status, "unread") || "unread",
    createdAt: row.created_at,
    meta: metadata,
  };
}

async function getNotificationRow(actor, notificationId) {
  const result = await query(
    `
      SELECT id, type, title, message, status::text AS status, metadata, created_at, read_at
      FROM notifications
      WHERE id = $1
        AND user_id = $2
        AND organization_id = $3
      LIMIT 1
    `,
    [notificationId, actor.id, actor.organizationId],
  );
  return result.rows[0] || null;
}

export async function listNotifications(actor) {
  const result = await query(
    `
      SELECT id, type, title, message, status::text AS status, metadata, created_at, read_at
      FROM notifications
      WHERE user_id = $1
        AND organization_id = $2
      ORDER BY created_at DESC, id DESC
    `,
    [actor.id, actor.organizationId],
  );
  return result.rows.map(buildNotificationShape);
}

export async function createNotification(actor, payload) {
  ensurePlainObject(payload, "notification");
  const title = cleanString(payload.title);
  if (!title) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "title is required.", details: { field: "title" } });
  }

  const status = validateStatus(payload.status);
  const link = cleanString(payload.link);
  const result = await query(
    `
      INSERT INTO notifications (
        organization_id, user_id, status, type, title, message, metadata, read_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
      RETURNING id, type, title, message, status::text AS status, metadata, created_at, read_at
    `,
    [
      actor.organizationId,
      actor.id,
      status,
      cleanString(payload.type, "system") || "system",
      title,
      cleanString(payload.message) || null,
      JSON.stringify(buildMetadata(payload.meta, link)),
      status === "unread" ? null : new Date().toISOString(),
    ],
  );
  return buildNotificationShape(result.rows[0]);
}

export async function updateNotificationStatus(actor, notificationId, payload) {
  ensurePlainObject(payload, "notification");
  const existing = await getNotificationRow(actor, notificationId);
  if (!existing) {
    throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Notification not found." });
  }

  const status = validateStatus(payload.status);
  await query(
    `
      UPDATE notifications
      SET
        status = $1::notif_status,
        read_at = CASE
          WHEN $2 = 'unread' THEN NULL
          WHEN read_at IS NULL THEN now()
          ELSE read_at
        END
      WHERE id = $3
        AND user_id = $4
        AND organization_id = $5
    `,
    [status, status, notificationId, actor.id, actor.organizationId],
  );

  return buildNotificationShape(await getNotificationRow(actor, notificationId));
}

export async function markAllNotificationsRead(actor) {
  await query(
    `
      UPDATE notifications
      SET
        status = CASE WHEN status = 'archived' THEN status ELSE 'read'::notif_status END,
        read_at = CASE
          WHEN status = 'archived' THEN read_at
          WHEN read_at IS NULL THEN now()
          ELSE read_at
        END
      WHERE user_id = $1
        AND organization_id = $2
    `,
    [actor.id, actor.organizationId],
  );
  return { ok: true };
}

export async function clearArchivedNotifications(actor) {
  const result = await query(
    `
      DELETE FROM notifications
      WHERE user_id = $1
        AND organization_id = $2
        AND status = 'archived'
    `,
    [actor.id, actor.organizationId],
  );
  return { deletedCount: result.rowCount };
}
