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

function ensureNonNegative(value, field) {
  const parsed = toNullableNumber(value);
  if (parsed === null || parsed < 0) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid number.`, details: { field } });
  }
  return parsed;
}

function ensureIsoDate(value, field, { required = false } = {}) {
  const normalized = cleanString(value);
  if (!normalized) {
    if (required) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is required.`, details: { field } });
    }
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T12:00:00`).getTime())) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} must be a valid ISO date.`, details: { field } });
  }

  return normalized;
}

function ensureDateRange(start, end, field) {
  if (start && end && end < start) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} has an invalid date range.`, details: { field } });
  }
}

function ensureActorAccess(actor, campusCode, areaCode) {
  if (actor.campusCode && cleanString(actor.campusCode) && campusCode && cleanString(actor.campusCode) !== cleanString(campusCode)) {
    throw new AppError({ statusCode: 403, code: "FORBIDDEN", message: "You cannot operate on targets outside your assigned campus." });
  }
  if (actor.areaAccess?.mode === "custom" && areaCode) {
    const allowed = new Set((actor.areaAccess.areaCodes || []).map((code) => cleanString(code)));
    if (!allowed.has(cleanString(areaCode))) {
      throw new AppError({ statusCode: 403, code: "FORBIDDEN", message: "You cannot operate on targets outside your assigned areas." });
    }
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

function buildTargetShape(row) {
  return {
    id: cleanString(row.id),
    title: cleanString(row.title),
    scope: cleanString(row.scope) || "all",
    category: cleanString(row.category) || "all",
    metric: cleanString(row.metric),
    unit: cleanString(row.unit),
    areaId: cleanString(row.area_code) || "all",
    type: cleanString(row.type),
    baselineStart: formatDateValue(row.baseline_start),
    baselineEnd: formatDateValue(row.baseline_end),
    baselineValue: row.baseline_value === null ? 0 : Number(row.baseline_value),
    targetStart: formatDateValue(row.target_start),
    targetEnd: formatDateValue(row.target_end),
    targetValue: Number(row.target_value),
    description: cleanString(row.description),
    status: cleanString(row.status),
    createdBy: cleanString(row.created_by_name),
    createdById: cleanString(row.created_by),
    pauseReason: cleanString(row.pause_reason),
    createdAt: row.created_at,
  };
}

async function getCampusByCode(organizationId, campusCode, client = { query }) {
  if (!cleanString(campusCode) || cleanString(campusCode) === "all") return null;
  const result = await client.query(`SELECT id, code FROM campuses WHERE organization_id = $1 AND lower(code) = lower($2) LIMIT 1`, [
    organizationId,
    cleanString(campusCode),
  ]);
  return result.rows[0] || null;
}

async function getAreaByCode(campusId, areaCode, client = { query }) {
  if (!campusId || !cleanString(areaCode) || cleanString(areaCode) === "all") return null;
  const result = await client.query(`SELECT id, code FROM areas WHERE campus_id = $1 AND lower(code) = lower($2) LIMIT 1`, [
    campusId,
    cleanString(areaCode),
  ]);
  return result.rows[0] || null;
}

async function getScopeByCode(scopeCode, client = { query }) {
  if (!cleanString(scopeCode) || cleanString(scopeCode) === "all") return null;
  const result = await client.query(`SELECT id, code::text AS code FROM emission_scopes WHERE code::text = $1 LIMIT 1`, [cleanString(scopeCode)]);
  return result.rows[0] || null;
}

async function getCategoryByCode(scopeId, categoryCode, client = { query }) {
  if (!scopeId || !cleanString(categoryCode) || cleanString(categoryCode) === "all") return null;
  const result = await client.query(`SELECT id, code FROM emission_categories WHERE scope_id = $1 AND lower(code) = lower($2) LIMIT 1`, [
    scopeId,
    cleanString(categoryCode),
  ]);
  return result.rows[0] || null;
}

async function getMetricByCode(metricCode, client = { query }) {
  const result = await client.query(`SELECT id, code FROM metrics WHERE lower(code) = lower($1) LIMIT 1`, [cleanString(metricCode)]);
  return result.rows[0] || null;
}

async function getUnitByCode(unitCode, client = { query }) {
  const normalized = cleanString(unitCode).toLowerCase().replace(/\s+/g, "");
  const code = normalized === "kwh" ? "kwh" : normalized === "kgco2e" ? "kgco2e" : normalized === "tco2e" ? "tco2e" : normalized;
  const result = await client.query(`SELECT id, code FROM units WHERE lower(code) = lower($1) LIMIT 1`, [code]);
  return result.rows[0] || null;
}

async function resolveTargetReferences(actor, payload, client) {
  const campus = await getCampusByCode(actor.organizationId, payload.campus, client);
  const area = await getAreaByCode(campus?.id || null, payload.area, client);
  const scope = await getScopeByCode(payload.scope, client);
  const category = await getCategoryByCode(scope?.id || null, payload.category, client);
  const metric = await getMetricByCode(payload.metric, client);
  const unit = await getUnitByCode(payload.unit, client);

  if (cleanString(payload.campus) && cleanString(payload.campus) !== "all" && !campus) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "campus is invalid.", details: { field: "campus" } });
  if (cleanString(payload.area) && cleanString(payload.area) !== "all" && !area) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "area is invalid for the selected campus.", details: { field: "area" } });
  if (cleanString(payload.scope) && cleanString(payload.scope) !== "all" && !scope) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "scope is invalid.", details: { field: "scope" } });
  if (cleanString(payload.category) && cleanString(payload.category) !== "all" && !category) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "category is invalid for the selected scope.", details: { field: "category" } });
  if (!metric) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "metric is invalid.", details: { field: "metric" } });
  if (!unit) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "unit is invalid.", details: { field: "unit" } });

  ensureActorAccess(actor, campus?.code || null, area?.code || null);
  return { campus, area, scope, category, metric, unit };
}

async function getTargetRow(actor, targetId, client = { query }) {
  const result = await client.query(
    `
      SELECT
        t.id,
        t.title,
        COALESCE(es.code::text, 'all') AS scope,
        COALESCE(ec.code, 'all') AS category,
        COALESCE(m.code, '') AS metric,
        COALESCE(u2.code, '') AS unit,
        COALESCE(a.code, 'all') AS area_code,
        t.type::text AS type,
        t.baseline_start,
        t.baseline_end,
        t.baseline_value,
        t.target_start,
        t.target_end,
        t.target_value,
        COALESCE(t.description, '') AS description,
        t.status::text AS status,
        t.created_by,
        COALESCE(u.full_name, '') AS created_by_name,
        COALESCE(t.pause_reason, '') AS pause_reason,
        t.created_at,
        c.code AS campus_code
      FROM targets t
      LEFT JOIN campuses c ON c.id = t.campus_id
      LEFT JOIN areas a ON a.id = t.area_id
      LEFT JOIN emission_scopes es ON es.id = t.scope_id
      LEFT JOIN emission_categories ec ON ec.id = t.category_id
      LEFT JOIN metrics m ON m.id = t.metric_id
      LEFT JOIN units u2 ON u2.id = t.unit_id
      LEFT JOIN users u ON u.id = t.created_by
      WHERE t.id = $1
        AND t.organization_id = $2
      LIMIT 1
    `,
    [targetId, actor.organizationId],
  );
  const row = result.rows[0] || null;
  if (row) ensureActorAccess(actor, row.campus_code, row.area_code === "all" ? null : row.area_code);
  return row;
}

export async function listTargets(actor) {
  const clauses = ["t.organization_id = $1"];
  const values = [actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    clauses.push(`(c.code = $${values.length} OR c.code IS NULL)`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const areaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    values.push(areaCodes);
    clauses.push(`(a.code = ANY($${values.length}::text[]) OR a.code IS NULL)`);
  }

  const result = await query(
    `
      SELECT
        t.id,
        t.title,
        COALESCE(es.code::text, 'all') AS scope,
        COALESCE(ec.code, 'all') AS category,
        COALESCE(m.code, '') AS metric,
        COALESCE(u2.code, '') AS unit,
        COALESCE(a.code, 'all') AS area_code,
        t.type::text AS type,
        t.baseline_start,
        t.baseline_end,
        t.baseline_value,
        t.target_start,
        t.target_end,
        t.target_value,
        COALESCE(t.description, '') AS description,
        t.status::text AS status,
        t.created_by,
        COALESCE(u.full_name, '') AS created_by_name,
        COALESCE(t.pause_reason, '') AS pause_reason,
        t.created_at
      FROM targets t
      LEFT JOIN campuses c ON c.id = t.campus_id
      LEFT JOIN areas a ON a.id = t.area_id
      LEFT JOIN emission_scopes es ON es.id = t.scope_id
      LEFT JOIN emission_categories ec ON ec.id = t.category_id
      LEFT JOIN metrics m ON m.id = t.metric_id
      LEFT JOIN units u2 ON u2.id = t.unit_id
      LEFT JOIN users u ON u.id = t.created_by
      WHERE ${clauses.join(" AND ")}
      ORDER BY t.created_at DESC, t.title ASC
    `,
    values,
  );
  return result.rows.map(buildTargetShape);
}

export async function createTarget(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const refs = await resolveTargetReferences(actor, payload, client);
    const baselineStart = ensureIsoDate(payload.baselineStart, "baselineStart");
    const baselineEnd = ensureIsoDate(payload.baselineEnd, "baselineEnd");
    const targetStart = ensureIsoDate(payload.targetStart, "targetStart", { required: true });
    const targetEnd = ensureIsoDate(payload.targetEnd, "targetEnd", { required: true });
    ensureDateRange(baselineStart, baselineEnd, "baseline");
    ensureDateRange(targetStart, targetEnd, "target");

    const targetValue = ensureNonNegative(payload.targetValue, "targetValue");
    if (cleanString(payload.type) === "reduction_percent" && targetValue > 100) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "targetValue must be between 0 and 100 for reduction_percent targets.", details: { field: "targetValue" } });
    }

    const baselineValue =
      payload.baselineValue === null || payload.baselineValue === "" || typeof payload.baselineValue === "undefined"
        ? null
        : ensureNonNegative(payload.baselineValue, "baselineValue");

    const inserted = await client.query(
      `
        INSERT INTO targets (
          organization_id, campus_id, area_id, scope_id, category_id, metric_id, unit_id,
          type, baseline_start, baseline_end, target_start, target_end, baseline_value, target_value,
          title, description, status, pause_reason, is_active, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING id
      `,
      [
        actor.organizationId,
        refs.campus?.id || null,
        refs.area?.id || null,
        refs.scope?.id || null,
        refs.category?.id || null,
        refs.metric.id,
        refs.unit.id,
        cleanString(payload.type || "reduction_percent"),
        baselineStart,
        baselineEnd,
        targetStart,
        targetEnd,
        baselineValue,
        targetValue,
        cleanString(payload.title),
        cleanString(payload.description) || null,
        cleanString(payload.status || "active"),
        cleanString(payload.pauseReason) || null,
        cleanString(payload.status || "active") !== "paused",
        actor.id,
      ],
    );

    const target = buildTargetShape(await getTargetRow(actor, inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "targets.create",
      entityType: "target",
      entityId: target.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });
    return target;
  });
}

export async function updateTarget(actor, targetId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existingRow = await getTargetRow(actor, targetId, client);
    if (!existingRow) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Target not found." });
    const existing = buildTargetShape(existingRow);

    const merged = {
      title: payload.title ?? existing.title,
      description: payload.description ?? existing.description,
      type: payload.type ?? existing.type,
      metric: payload.metric ?? existing.metric,
      unit: payload.unit ?? existing.unit,
      scope: payload.scope ?? existing.scope,
      category: payload.category ?? existing.category,
      campus: payload.campus ?? existingRow.campus_code ?? "all",
      area: payload.area ?? existing.areaId,
      baselineStart: payload.baselineStart ?? existing.baselineStart,
      baselineEnd: payload.baselineEnd ?? existing.baselineEnd,
      targetStart: payload.targetStart ?? existing.targetStart,
      targetEnd: payload.targetEnd ?? existing.targetEnd,
      baselineValue: "baselineValue" in payload ? payload.baselineValue : existing.baselineValue,
      targetValue: "targetValue" in payload ? payload.targetValue : existing.targetValue,
      status: payload.status ?? existing.status,
      pauseReason: payload.pauseReason ?? existing.pauseReason,
    };

    const refs = await resolveTargetReferences(actor, merged, client);
    const baselineStart = ensureIsoDate(merged.baselineStart, "baselineStart");
    const baselineEnd = ensureIsoDate(merged.baselineEnd, "baselineEnd");
    const targetStart = ensureIsoDate(merged.targetStart, "targetStart", { required: true });
    const targetEnd = ensureIsoDate(merged.targetEnd, "targetEnd", { required: true });
    ensureDateRange(baselineStart, baselineEnd, "baseline");
    ensureDateRange(targetStart, targetEnd, "target");

    const targetValue = ensureNonNegative(merged.targetValue, "targetValue");
    if (cleanString(merged.type) === "reduction_percent" && targetValue > 100) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "targetValue must be between 0 and 100 for reduction_percent targets.", details: { field: "targetValue" } });
    }

    await client.query(
      `
        UPDATE targets
        SET
          campus_id = $1,
          area_id = $2,
          scope_id = $3,
          category_id = $4,
          metric_id = $5,
          unit_id = $6,
          type = $7,
          baseline_start = $8,
          baseline_end = $9,
          target_start = $10,
          target_end = $11,
          baseline_value = $12,
          target_value = $13,
          title = $14,
          description = $15,
          status = $16,
          pause_reason = $17,
          is_active = $18
        WHERE id = $19
          AND organization_id = $20
      `,
      [
        refs.campus?.id || null,
        refs.area?.id || null,
        refs.scope?.id || null,
        refs.category?.id || null,
        refs.metric.id,
        refs.unit.id,
        cleanString(merged.type),
        baselineStart,
        baselineEnd,
        targetStart,
        targetEnd,
        merged.baselineValue === null || merged.baselineValue === "" ? null : ensureNonNegative(merged.baselineValue, "baselineValue"),
        targetValue,
        cleanString(merged.title),
        cleanString(merged.description) || null,
        cleanString(merged.status || "active"),
        cleanString(merged.pauseReason) || null,
        cleanString(merged.status || "active") !== "paused",
        targetId,
        actor.organizationId,
      ],
    );

    const target = buildTargetShape(await getTargetRow(actor, targetId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "targets.update",
      entityType: "target",
      entityId: target.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });
    return target;
  });
}

export async function updateTargetStatus(actor, targetId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getTargetRow(actor, targetId, client);
    if (!existing) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Target not found." });

    const status = cleanString(payload.status);
    if (!["active", "paused", "completed"].includes(status)) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "status is invalid.", details: { field: "status" } });
    }

    const pauseReason = cleanString(payload.pauseReason);
    if (status === "paused" && !pauseReason) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "pauseReason is required when pausing a target.", details: { field: "pauseReason" } });
    }

    await client.query(`UPDATE targets SET status = $1, pause_reason = $2, is_active = $3 WHERE id = $4 AND organization_id = $5`, [
      status,
      pauseReason || null,
      status !== "paused",
      targetId,
      actor.organizationId,
    ]);

    const target = buildTargetShape(await getTargetRow(actor, targetId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "targets.status_change",
      entityType: "target",
      entityId: target.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { status },
    });
    return target;
  });
}

export async function deleteTarget(actor, targetId, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getTargetRow(actor, targetId, client);
    if (!existing) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Target not found." });

    await client.query(`DELETE FROM targets WHERE id = $1 AND organization_id = $2`, [targetId, actor.organizationId]);
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "targets.delete",
      entityType: "target",
      entityId: targetId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {},
    });
    return { ok: true };
  });
}
