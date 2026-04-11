import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";

const ALLOWED_TYPES = new Set(["email", "password"]);
const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function isAdminActor(actor) {
  return actor.roleKey === "admin" || new Set(actor.permissions || []).has("users:manage");
}

function ensurePlainObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid object.`, details: { field } });
  }
  return value;
}

function ensureType(value) {
  const normalized = cleanString(value);
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "type is invalid.", details: { field: "type" } });
  }
  return normalized;
}

function ensureStatus(value) {
  const normalized = cleanString(value);
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "status is invalid.", details: { field: "status" } });
  }
  return normalized;
}

function mapRequestedBy(row) {
  return {
    id: cleanString(row.user_id),
    name: cleanString(row.user_name),
    role: cleanString(row.requester_role),
  };
}

function mapHistoryEntry(row) {
  return {
    id: cleanString(row.event_id),
    action: cleanString(row.event_action),
    actorUserId: cleanString(row.event_actor_user_id) || null,
    actorName: cleanString(row.event_actor_name, "Sistema") || "Sistema",
    detail: cleanString(row.event_detail),
    createdAt: row.event_created_at,
  };
}

function buildRequestShape(row, history = []) {
  return {
    id: cleanString(row.id),
    userId: cleanString(row.user_id),
    userName: cleanString(row.user_name),
    requesterRole: cleanString(row.requester_role),
    type: cleanString(row.type),
    status: cleanString(row.status),
    currentValue: cleanString(row.current_value),
    requestedValue: cleanString(row.requested_value),
    reason: cleanString(row.reason),
    detail: cleanString(row.detail),
    resolutionDetail: cleanString(row.resolution_detail),
    resolvedAt: row.resolved_at || null,
    resolvedByUserId: cleanString(row.resolved_by_user_id) || null,
    resolvedByName: cleanString(row.resolved_by_name) || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requestedBy: mapRequestedBy(row),
    payload: {
      userId: cleanString(row.user_id),
      userName: cleanString(row.user_name),
      requesterRole: cleanString(row.requester_role),
      currentValue: cleanString(row.current_value),
      requestedValue: cleanString(row.requested_value),
      reason: cleanString(row.reason),
      detail: cleanString(row.detail),
      resolutionDetail: cleanString(row.resolution_detail),
      resolvedAt: row.resolved_at || null,
      resolvedByUserId: cleanString(row.resolved_by_user_id) || null,
      resolvedByName: cleanString(row.resolved_by_name) || null,
      history,
    },
    notes: cleanString(row.reason),
    history,
  };
}

function baseSelect(whereClause) {
  return `
    SELECT
      pcr.id,
      pcr.user_id,
      pcr.requester_role,
      pcr.type::text AS type,
      pcr.status::text AS status,
      COALESCE(pcr.current_value, '') AS current_value,
      COALESCE(pcr.requested_value, '') AS requested_value,
      COALESCE(pcr.reason, '') AS reason,
      COALESCE(pcr.detail, '') AS detail,
      COALESCE(pcr.resolution_detail, '') AS resolution_detail,
      pcr.created_at,
      pcr.updated_at,
      pcr.resolved_at,
      pcr.resolved_by_user_id,
      COALESCE(resolver.full_name, '') AS resolved_by_name,
      COALESCE(requester.full_name, '') AS user_name
    FROM profile_change_requests pcr
    JOIN users requester ON requester.id = pcr.user_id
    LEFT JOIN users resolver ON resolver.id = pcr.resolved_by_user_id
    WHERE ${whereClause}
  `;
}

async function getHistoryMap(requestIds, client = { query }) {
  if (!Array.isArray(requestIds) || requestIds.length < 1) return new Map();
  const result = await client.query(
    `
      SELECT
        request_id,
        id AS event_id,
        action AS event_action,
        actor_user_id AS event_actor_user_id,
        actor_name AS event_actor_name,
        detail AS event_detail,
        created_at AS event_created_at
      FROM profile_change_request_events
      WHERE request_id = ANY($1::uuid[])
      ORDER BY created_at ASC, id ASC
    `,
    [requestIds],
  );

  const historyMap = new Map();
  for (const row of result.rows) {
    const current = historyMap.get(row.request_id) || [];
    current.push(mapHistoryEntry(row));
    historyMap.set(row.request_id, current);
  }
  return historyMap;
}

async function getRequestRow(actor, requestId, client = { query }) {
  const clauses = ["pcr.id = $1", "pcr.organization_id = $2"];
  const values = [requestId, actor.organizationId];
  if (!isAdminActor(actor)) {
    clauses.push("pcr.user_id = $3");
    values.push(actor.id);
  }

  const result = await client.query(`${baseSelect(clauses.join(" AND "))} LIMIT 1`, values);
  return result.rows[0] || null;
}

async function insertEvent(client, actor, requestId, action, detail) {
  await client.query(
    `
      INSERT INTO profile_change_request_events (
        request_id, action, actor_user_id, actor_organization_id, actor_name, detail
      )
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
    [requestId, action, actor.id, actor.organizationId, actor.fullName || "Sistema", cleanString(detail) || null],
  );
}

export async function listProfileChangeRequests(actor) {
  const clauses = ["pcr.organization_id = $1"];
  const values = [actor.organizationId];
  if (!isAdminActor(actor)) {
    clauses.push("pcr.user_id = $2");
    values.push(actor.id);
  }

  const result = await query(`${baseSelect(clauses.join(" AND "))} ORDER BY pcr.updated_at DESC, pcr.created_at DESC`, values);
  const historyMap = await getHistoryMap(result.rows.map((row) => row.id));
  return result.rows.map((row) => buildRequestShape(row, historyMap.get(row.id) || []));
}

export async function createProfileChangeRequest(actor, payload) {
  ensurePlainObject(payload, "request");
  const type = ensureType(payload.type);
  const reason = cleanString(payload.reason);
  if (!reason) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "reason is required.", details: { field: "reason" } });
  }

  return withTransaction(async (client) => {
    const inserted = await client.query(
      `
        INSERT INTO profile_change_requests (
          organization_id, user_id, requester_role, type, status, current_value, requested_value, reason, detail
        )
        VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8)
        RETURNING id
      `,
      [
        actor.organizationId,
        actor.id,
        cleanString(payload.requesterRole || actor.roleKey || actor.role || "operativo"),
        type,
        cleanString(payload.currentValue) || null,
        cleanString(payload.requestedValue) || null,
        reason,
        cleanString(payload.detail) || null,
      ],
    );

    await insertEvent(client, actor, inserted.rows[0].id, "created", cleanString(payload.detail) || "Solicitud registrada.");
    const row = await getRequestRow(actor, inserted.rows[0].id, client);
    const historyMap = await getHistoryMap([inserted.rows[0].id], client);
    return buildRequestShape(row, historyMap.get(inserted.rows[0].id) || []);
  });
}

export async function updateProfileChangeRequest(actor, requestId, payload) {
  ensurePlainObject(payload, "request");
  if (!isAdminActor(actor)) {
    throw new AppError({ statusCode: 403, code: "FORBIDDEN", message: "You do not have the required permission." });
  }

  return withTransaction(async (client) => {
    const existing = await getRequestRow(actor, requestId, client);
    if (!existing) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Profile change request not found." });
    }

    const nextStatus = ensureStatus(payload.status ?? existing.status);
    if (nextStatus === "pending") {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "Only approved or rejected are allowed for resolution.", details: { field: "status" } });
    }

    const resolutionDetail = cleanString(payload.resolutionDetail || payload.detail);
    if (!resolutionDetail) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "resolutionDetail is required when resolving a request.", details: { field: "resolutionDetail" } });
    }

    const action = nextStatus === "approved" ? "approved" : "rejected";
    await client.query(
      `
        UPDATE profile_change_requests
        SET
          status = $1,
          resolution_detail = $2,
          resolved_at = now(),
          resolved_by_user_id = $3
        WHERE id = $4
          AND organization_id = $5
      `,
      [nextStatus, resolutionDetail, actor.id, requestId, actor.organizationId],
    );

    await insertEvent(client, actor, requestId, action, resolutionDetail);
    const row = await getRequestRow(actor, requestId, client);
    const historyMap = await getHistoryMap([requestId], client);
    return buildRequestShape(row, historyMap.get(requestId) || []);
  });
}
