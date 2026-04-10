import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureImpact(value) {
  const parsed = toNullableNumber(value);
  if (parsed === null || parsed < 0) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "impact_tco2e must be a valid number.", details: { field: "impact_tco2e" } });
  }
  return parsed;
}

function ensureIsoDate(value, field) {
  const normalized = cleanString(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T12:00:00`).getTime())) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid ISO date.`, details: { field } });
  }
  return normalized;
}

function ensureDateRange(start, end) {
  if (start && end && end < start) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "Action has an invalid date range.", details: { field: "endDate" } });
  }
}

function formatDateValue(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const raw = cleanString(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

function buildActionShape(row) {
  return {
    id: cleanString(row.id),
    targetId: cleanString(row.target_id),
    title: cleanString(row.title),
    owner: cleanString(row.owner_name),
    status: cleanString(row.status),
    startDate: formatDateValue(row.start_date),
    endDate: formatDateValue(row.end_date),
    impact_tco2e: Number(row.impact_tco2e),
    evidence: cleanString(row.evidence_text),
    notes: cleanString(row.notes),
  };
}

function ensureTargetAccess(actor, row) {
  if (!row) return;

  if (actor.campusCode && cleanString(actor.campusCode) && row.campus_code && cleanString(actor.campusCode) !== cleanString(row.campus_code)) {
    throw new AppError({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "You cannot operate on actions outside your assigned campus.",
    });
  }

  if (actor.areaAccess?.mode === "custom" && row.area_code) {
    const allowed = new Set((actor.areaAccess.areaCodes || []).map((code) => cleanString(code)));
    if (!allowed.has(cleanString(row.area_code))) {
      throw new AppError({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You cannot operate on actions outside your assigned areas.",
      });
    }
  }
}

async function getTargetForAction(actor, targetId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        t.id,
        c.code AS campus_code,
        a.code AS area_code
      FROM targets t
      LEFT JOIN campuses c ON c.id = t.campus_id
      LEFT JOIN areas a ON a.id = t.area_id
      WHERE t.id = $1
        AND t.organization_id = $2
      LIMIT 1
    `,
    [targetId, actor.organizationId],
  );

  const row = result.rows[0] || null;
  if (row) {
    ensureTargetAccess(actor, row);
  }

  return row;
}

async function getUserById(actor, userId, client = { query }) {
  if (!cleanString(userId)) return null;
  const result = await client.query(`SELECT id, full_name FROM users WHERE id = $1 AND organization_id = $2 LIMIT 1`, [userId, actor.organizationId]);
  return result.rows[0] || null;
}

async function getActionRow(actor, actionId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        ta.id,
        ta.target_id,
        ta.title,
        COALESCE(ta.owner_name, u.full_name, '') AS owner_name,
        ta.status::text AS status,
        ta.start_date,
        ta.end_date,
        ta.impact_tco2e,
        COALESCE(ta.evidence_text, '') AS evidence_text,
        COALESCE(ta.notes, '') AS notes
      FROM target_actions ta
      LEFT JOIN users u ON u.id = ta.owner_user_id
      WHERE ta.id = $1
        AND ta.organization_id = $2
      LIMIT 1
    `,
    [actionId, actor.organizationId],
  );
  return result.rows[0] || null;
}

export async function listActions(actor) {
  const clauses = ["ta.organization_id = $1"];
  const values = [actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    clauses.push(`(c.code = $${values.length} OR c.code IS NULL)`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const areaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    if (areaCodes.length < 1) {
      return [];
    }

    values.push(areaCodes);
    clauses.push(`(a.code = ANY($${values.length}::text[]) OR a.code IS NULL)`);
  }

  const result = await query(
    `
      SELECT
        ta.id,
        ta.target_id,
        ta.title,
        COALESCE(ta.owner_name, u.full_name, '') AS owner_name,
        ta.status::text AS status,
        ta.start_date,
        ta.end_date,
        ta.impact_tco2e,
        COALESCE(ta.evidence_text, '') AS evidence_text,
        COALESCE(ta.notes, '') AS notes
      FROM target_actions ta
      JOIN targets t ON t.id = ta.target_id
      LEFT JOIN campuses c ON c.id = t.campus_id
      LEFT JOIN areas a ON a.id = t.area_id
      LEFT JOIN users u ON u.id = ta.owner_user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY ta.created_at DESC, ta.title ASC
    `,
    values,
  );
  return result.rows.map(buildActionShape);
}

export async function createAction(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const target = await getTargetForAction(actor, payload.targetId, client);
    if (!target) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "targetId is invalid.", details: { field: "targetId" } });

    const ownerUser = await getUserById(actor, payload.ownerId || "", client);
    const startDate = ensureIsoDate(payload.startDate, "startDate");
    const endDate = ensureIsoDate(payload.endDate, "endDate");
    ensureDateRange(startDate, endDate);

    const inserted = await client.query(
      `
        INSERT INTO target_actions (
          organization_id, target_id, title, owner_user_id, owner_name, status,
          start_date, end_date, impact_tco2e, evidence_text, notes, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id
      `,
      [
        actor.organizationId,
        target.id,
        cleanString(payload.title),
        ownerUser?.id || null,
        cleanString(payload.owner) || ownerUser?.full_name || null,
        cleanString(payload.status || "planned"),
        startDate,
        endDate,
        ensureImpact(payload.impact_tco2e ?? 0),
        cleanString(payload.evidence) || null,
        cleanString(payload.notes) || null,
        actor.id,
      ],
    );

    const action = buildActionShape(await getActionRow(actor, inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "actions.create",
      entityType: "action",
      entityId: action.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { targetId: target.id },
    });
    return action;
  });
}

export async function updateAction(actor, actionId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existingRow = await getActionRow(actor, actionId, client);
    if (!existingRow) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Action not found." });
    const existing = buildActionShape(existingRow);

    const nextTargetId = payload.targetId ?? existing.targetId;
    const target = await getTargetForAction(actor, nextTargetId, client);
    if (!target) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "targetId is invalid.", details: { field: "targetId" } });

    const ownerUser = await getUserById(actor, payload.ownerId || "", client);
    const startDate = ensureIsoDate(payload.startDate ?? existing.startDate, "startDate");
    const endDate = ensureIsoDate(payload.endDate ?? existing.endDate, "endDate");
    ensureDateRange(startDate, endDate);

    await client.query(
      `
        UPDATE target_actions
        SET
          target_id = $1,
          title = $2,
          owner_user_id = $3,
          owner_name = $4,
          status = $5,
          start_date = $6,
          end_date = $7,
          impact_tco2e = $8,
          evidence_text = $9,
          notes = $10
        WHERE id = $11
          AND organization_id = $12
      `,
      [
        target.id,
        cleanString(payload.title ?? existing.title),
        ownerUser?.id || null,
        cleanString(payload.owner ?? existing.owner) || ownerUser?.full_name || null,
        cleanString(payload.status ?? existing.status),
        startDate,
        endDate,
        ensureImpact("impact_tco2e" in payload ? payload.impact_tco2e : existing.impact_tco2e),
        cleanString(payload.evidence ?? existing.evidence) || null,
        cleanString(payload.notes ?? existing.notes) || null,
        actionId,
        actor.organizationId,
      ],
    );

    const action = buildActionShape(await getActionRow(actor, actionId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "actions.update",
      entityType: "action",
      entityId: action.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { targetId: target.id },
    });
    return action;
  });
}
