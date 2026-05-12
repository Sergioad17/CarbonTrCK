import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { assertRecordCaptureAllowedForDate } from "../admin/admin.periods.repository.js";
import { evaluateRecordCreatedAlerts } from "../admin/admin.alerts-engine.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const sourceCodeAliases = new Map([
  ["recibo", "invoice"],
  ["invoice", "invoice"],
  ["factura", "invoice"],
  ["medicion", "metered"],
  ["medición", "metered"],
  ["metered", "metered"],
  ["manual", "survey"],
  ["encuesta", "survey"],
  ["survey", "survey"],
  ["inventario", "inventory"],
  ["inventory", "inventory"],
  ["estimacion", "estimation"],
  ["estimación", "estimation"],
  ["estimation", "estimation"],
]);

const sourceOutputLabels = new Map([
  ["invoice", "Recibo"],
  ["metered", "Medicion"],
  ["survey", "Encuesta"],
  ["inventory", "Inventario"],
  ["estimation", "Estimacion"],
]);

function cleanString(value) {
  return String(value ?? "").trim();
}

function triggerTransactionalFailpoint(options, failpoint) {
  if (options?.failpoint === failpoint) {
    throw new AppError({
      statusCode: 500,
      code: "TEST_FAILPOINT",
      message: `Triggered transactional failpoint: ${failpoint}`,
    });
  }
}

function normalizeLooseText(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCategoryCode(value) {
  return normalizeLooseText(value);
}

function normalizeMetricCode(value) {
  return normalizeLooseText(value);
}

function normalizeUnitCode(value) {
  const normalized = normalizeLooseText(value).replace(/\s+/g, "");

  if (normalized === "kwh") return "kwh";
  if (normalized === "l" || normalized === "lt" || normalized === "litro" || normalized === "litros") return "l";
  if (normalized === "kg") return "kg";
  if (normalized === "km") return "km";
  if (normalized === "u" || normalized === "unit" || normalized === "unidad" || normalized === "unidades") return "unit";
  if (normalized === "kgco2e") return "kgco2e";
  if (normalized === "tco2e") return "tco2e";

  return normalized;
}

function normalizeSourceCode(value) {
  const normalized = normalizeLooseText(value);
  return sourceCodeAliases.get(normalized) || normalized;
}

function formatSourceLabel(value) {
  const normalized = normalizeSourceCode(value);
  return sourceOutputLabels.get(normalized) || cleanString(value) || "Medicion";
}

function formatUnitLabel(value) {
  const normalized = normalizeUnitCode(value);
  if (normalized === "kwh") return "kWh";
  if (normalized === "l") return "L";
  if (normalized === "kgco2e") return "kgCO2e";
  if (normalized === "tco2e") return "tCO2e";
  if (normalized === "unit") return "unit";
  return cleanString(value);
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureFiniteNumber(value, field, { allowZero = true } = {}) {
  const parsed = toNullableNumber(value);

  if (parsed === null || (!allowZero && parsed <= 0) || parsed < 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid number.`,
      details: { field },
    });
  }

  return parsed;
}

function ensureAllowedRecordAccess(actor, { campusCode, areaCode }) {
  if (actor.campusCode && cleanString(actor.campusCode) && cleanString(actor.campusCode) !== cleanString(campusCode)) {
    throw new AppError({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "You cannot operate on records outside your assigned campus.",
    });
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = new Set((actor.areaAccess.areaCodes || []).map((code) => cleanString(code)));
    if (!allowedAreaCodes.has(cleanString(areaCode))) {
      throw new AppError({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You cannot operate on records outside your assigned areas.",
      });
    }
  }
}

async function getCampusByCode(organizationId, campusCode, client) {
  const result = await client.query(
    `
      SELECT id, code
      FROM campuses
      WHERE organization_id = $1
        AND lower(code) = lower($2)
      LIMIT 1
    `,
    [organizationId, cleanString(campusCode)],
  );

  return result.rows[0] || null;
}

async function getAreaByCodeOrName(campusId, areaCode, areaName, client) {
  const normalizedAreaCode = cleanString(areaCode);
  const normalizedAreaName = cleanString(areaName);

  const result = await client.query(
    `
      SELECT id, code, name
      FROM areas
      WHERE campus_id = $1
        AND is_active = true
        AND (
          ($2 <> '' AND lower(code) = lower($2))
          OR ($3 <> '' AND lower(name) = lower($3))
        )
      ORDER BY CASE WHEN lower(code) = lower($2) THEN 0 ELSE 1 END, name ASC
      LIMIT 1
    `,
    [campusId, normalizedAreaCode, normalizedAreaName],
  );

  return result.rows[0] || null;
}

async function getScopeByCode(scopeCode, client) {
  const result = await client.query(
    `
      SELECT id, code
      FROM emission_scopes
      WHERE code::text = $1
      LIMIT 1
    `,
    [cleanString(scopeCode)],
  );

  return result.rows[0] || null;
}

async function getCategoryByCode(scopeId, categoryCode, client) {
  const result = await client.query(
    `
      SELECT id, code, default_metric_id, default_unit_id
      FROM emission_categories
      WHERE scope_id = $1
        AND lower(code) = lower($2)
        AND is_active = true
      LIMIT 1
    `,
    [scopeId, normalizeCategoryCode(categoryCode)],
  );

  return result.rows[0] || null;
}

async function getMetricByCode(metricCode, client) {
  const result = await client.query(
    `
      SELECT id, code, dimension
      FROM metrics
      WHERE lower(code) = lower($1)
        AND is_active = true
      LIMIT 1
    `,
    [normalizeMetricCode(metricCode)],
  );

  return result.rows[0] || null;
}

async function getMetricById(metricId, client) {
  const result = await client.query(
    `
      SELECT id, code, dimension
      FROM metrics
      WHERE id = $1
        AND is_active = true
      LIMIT 1
    `,
    [cleanString(metricId)],
  );

  return result.rows[0] || null;
}

async function getUnitByCode(unitCode, client) {
  const result = await client.query(
    `
      SELECT id, code, symbol, dimension
      FROM units
      WHERE lower(code) = lower($1)
      LIMIT 1
    `,
    [normalizeUnitCode(unitCode)],
  );

  return result.rows[0] || null;
}

async function getUnitById(unitId, client) {
  const result = await client.query(
    `
      SELECT id, code, symbol, dimension
      FROM units
      WHERE id = $1
      LIMIT 1
    `,
    [cleanString(unitId)],
  );

  return result.rows[0] || null;
}

async function getDataSourceByCode(sourceCode, client) {
  const result = await client.query(
    `
      SELECT id, code, name
      FROM data_sources
      WHERE lower(code) = lower($1)
        AND is_active = true
      LIMIT 1
    `,
    [normalizeSourceCode(sourceCode)],
  );

  return result.rows[0] || null;
}

async function getEstimationMethodByCode(methodCode, client) {
  const result = await client.query(
    `
      SELECT id, code
      FROM estimation_methods
      WHERE lower(code) = lower($1)
        AND is_active = true
      LIMIT 1
    `,
    [cleanString(methodCode)],
  );

  return result.rows[0] || null;
}

async function getFactorById(factorId, client) {
  const result = await client.query(
    `
      SELECT id, scope_id, category_id, metric_id, denominator_unit_id, value
      FROM emission_factors
      WHERE id = $1
      LIMIT 1
    `,
    [cleanString(factorId)],
  );

  return result.rows[0] || null;
}

export function buildNormalizedRecordShape(row, options = {}) {
  const evidenceFiles = Array.isArray(row.evidence_files)
    ? row.evidence_files
    : typeof row.evidence_files === "string"
    ? JSON.parse(row.evidence_files)
    : [];

  const normalizedEvidenceFiles = evidenceFiles
    .map((file) => ({
      id: cleanString(file.id),
      fileName: cleanString(file.fileName || file.file_name || file.name),
      name: cleanString(file.name || file.fileName || file.file_name),
      mimeType: cleanString(file.mimeType || file.mime_type),
      sizeBytes: Number(file.sizeBytes || file.size_bytes || 0) || 0,
      url: cleanString(file.url),
      purpose: cleanString(file.purpose || "evidence") || "evidence",
    }))
    .filter((file) => file.id);

  const firstEvidenceFile = normalizedEvidenceFiles[0] || null;
  const factorValue = toNullableNumber(row.factor);
  const value = toNullableNumber(row.value);
  const co2eKg = toNullableNumber(row.co2e_kg);
  const co2eT = toNullableNumber(row.co2e_t);
  const validationStatus = cleanString(row.status) || "pending";
  const status = validationStatus === "est" || row.isEstimated ? "est" : "real";
  const evidenceText = cleanString(row.evidence);
  const factorId = cleanString(row.factorId || row.factor_id) || null;

  const record = {
    id: cleanString(row.id),
    dateISO: cleanString(row.dateISO || row.record_date),
    scope: cleanString(row.scope),
    metric: cleanString(row.metric),
    area: cleanString(row.area),
    areaCode: cleanString(row.areaCode || row.area_code),
    campusCode: cleanString(row.campusCode || row.campus_code),
    category: cleanString(row.category),
    activity: cleanString(row.activity || row.activityText),
    activityText: cleanString(row.activityText || row.activity),
    value: value ?? 0,
    unit: formatUnitLabel(row.unit),
    factor: factorValue ?? 0,
    factorId,
    co2e_kg: co2eKg ?? 0,
    co2e_t: co2eT ?? 0,
    status,
    isEstimated: status === "est",
    source: formatSourceLabel(row.source),
    by: cleanString(row.by),
    note: cleanString(row.note),
    hasEvidence: normalizedEvidenceFiles.length > 0 || Boolean(evidenceText),
    evidence: evidenceText,
    evidenceUrl: firstEvidenceFile?.url || evidenceText,
    evidenceFileId: firstEvidenceFile?.id || null,
    evidenceFiles: normalizedEvidenceFiles,
    createdAt: row.createdAt || row.created_at || null,
  };

  if (options.includeValidation) {
    record.validationStatus = validationStatus;
    record.isApproved = validationStatus === "approved";
    record.approvedAt = row.approvedAt || row.approved_at || null;
    record.approvedBy = row.approvedBy || row.approved_by || null;
    record.latestValidationDecision = cleanString(row.latestValidationDecision || row.latest_validation_decision);
    record.latestValidationComment = cleanString(row.latestValidationComment || row.latest_validation_comment);
    record.latestValidationAt = row.latestValidationAt || row.latest_validation_at || null;
    record.latestValidationActor = cleanString(row.latestValidationActor || row.latest_validation_actor);
  }

  return record;
}

function buildListFilters(filters = {}) {
  return {
    from: cleanString(filters.from),
    to: cleanString(filters.to),
    category: normalizeCategoryCode(filters.category),
    scope: cleanString(filters.scope),
    areaCode: cleanString(filters.areaCode),
    campusCode: cleanString(filters.campusCode),
    status: cleanString(filters.status),
    source: normalizeSourceCode(filters.source),
    includeValidation: ["1", "true", "yes"].includes(cleanString(filters.includeValidation).toLowerCase()),
  };
}

export async function listRecords(actor, filters = {}) {
  const normalizedFilters = buildListFilters(filters);
  const conditions = ["v.organization_id = $1", "r.deleted_at IS NULL"];
  const values = [actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    conditions.push(`v."campusCode" = $${values.length}`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    if (allowedAreaCodes.length < 1) {
      return [];
    }

    values.push(allowedAreaCodes);
    conditions.push(`v."areaCode" = ANY($${values.length}::text[])`);
  }

  if (normalizedFilters.from) {
    values.push(normalizedFilters.from);
    conditions.push(`v."dateISO" >= $${values.length}::date`);
  }

  if (normalizedFilters.to) {
    values.push(normalizedFilters.to);
    conditions.push(`v."dateISO" <= $${values.length}::date`);
  }

  if (normalizedFilters.category) {
    values.push(normalizedFilters.category);
    conditions.push(`lower(v.category) = lower($${values.length})`);
  }

  if (normalizedFilters.scope) {
    values.push(normalizedFilters.scope);
    conditions.push(`v.scope = $${values.length}`);
  }

  if (normalizedFilters.areaCode) {
    values.push(normalizedFilters.areaCode);
    conditions.push(`lower(v."areaCode") = lower($${values.length})`);
  }

  if (normalizedFilters.campusCode) {
    values.push(normalizedFilters.campusCode);
    conditions.push(`lower(v."campusCode") = lower($${values.length})`);
  }

  if (normalizedFilters.status) {
    values.push(normalizedFilters.status);
    conditions.push(`v.status = $${values.length}`);
  }

  if (normalizedFilters.source) {
    values.push(normalizedFilters.source);
    conditions.push(`lower(ds.code) = lower($${values.length})`);
  }

  const result = await query(
    `
      SELECT
        v.id,
        v."dateISO",
        v.scope,
        v.metric,
        v.area,
        v."areaCode",
        v."campusCode",
        v.category,
        v.activity,
        v."activityText",
        v.value,
        v.unit,
        v.factor,
        v."factorId",
        v.co2e_kg,
        v.co2e_t,
        v.status,
        v."isEstimated",
        r.approved_at,
        approver.full_name AS approved_by,
        latest_decision.decision AS latest_validation_decision,
        latest_decision.comment AS latest_validation_comment,
        latest_decision.created_at AS latest_validation_at,
        latest_decision.actor_name AS latest_validation_actor,
        ds.code AS source,
        v."by",
        v.note,
        v.evidence,
        v."createdAt",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', f.id,
              'fileName', f.file_name,
              'name', f.file_name,
              'mimeType', f.mime_type,
              'sizeBytes', f.size_bytes,
              'url', f.storage_url,
              'purpose', rf.purpose
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::jsonb
        ) AS evidence_files
      FROM v_frontend_records v
      JOIN records r ON r.id = v.id
      JOIN data_sources ds ON ds.id = r.data_source_id
      LEFT JOIN users approver ON approver.id = r.approved_by
      LEFT JOIN LATERAL (
        SELECT
          vd.decision,
          vd.comment,
          vd.created_at,
          u.full_name AS actor_name
        FROM validation_decisions vd
        LEFT JOIN users u ON u.id = vd.actor_id
        WHERE vd.record_id = r.id
          AND vd.organization_id = r.organization_id
        ORDER BY vd.created_at DESC
        LIMIT 1
      ) latest_decision ON true
      LEFT JOIN record_files rf ON rf.record_id = v.id
      LEFT JOIN files f ON f.id = rf.file_id
      WHERE ${conditions.join("\n        AND ")}
      GROUP BY
        v.id,
        v."dateISO",
        v.scope,
        v.metric,
        v.area,
        v."areaCode",
        v."campusCode",
        v.category,
        v.activity,
        v."activityText",
        v.value,
        v.unit,
        v.factor,
        v."factorId",
        v.co2e_kg,
        v.co2e_t,
        v.status,
        v."isEstimated",
        r.approved_at,
        approver.full_name,
        latest_decision.decision,
        latest_decision.comment,
        latest_decision.created_at,
        latest_decision.actor_name,
        ds.code,
        v."by",
        v.note,
        v.evidence,
        v."createdAt"
      ORDER BY v."dateISO" DESC, v."createdAt" DESC, v.id DESC
    `,
    values,
  );

  return result.rows.map((row) => buildNormalizedRecordShape(row, { includeValidation: normalizedFilters.includeValidation }));
}

function validationReason(row) {
  if (cleanString(row.latest_validation_decision) === "returned") {
    return cleanString(row.latest_validation_comment) || "Registro devuelto para corrección.";
  }
  if (!row.has_evidence) return "Registro pendiente sin evidencia adjunta.";
  if (cleanString(row.note)) return cleanString(row.note);
  if (row.is_estimated) return "Registro estimado pendiente de revisión.";
  return "Registro pendiente de validación administrativa.";
}

function validationPriority(row) {
  const submittedAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const ageDays = (Date.now() - submittedAt) / 86400000;
  if (!row.has_evidence || ageDays > 5) return "high";
  if (row.is_estimated) return "normal";
  return "low";
}

function buildValidationQueueItem(row) {
  const record = buildNormalizedRecordShape({
    ...row,
    dateISO: row.date_iso,
    areaCode: row.area_code,
    campusCode: row.campus_code,
    activityText: row.activity_text,
    factorId: row.factor_id,
    isEstimated: row.is_estimated,
    by: row.captured_by,
    createdAt: row.created_at,
    evidence_files: row.evidence_files,
  });

  return {
    id: cleanString(row.id),
    recordId: cleanString(row.id),
    priority: validationPriority(row),
    reason: validationReason(row),
    submittedAt: row.created_at,
    assignedTo: "Administracion",
    latestValidationDecision: cleanString(row.latest_validation_decision),
    latestValidationComment: cleanString(row.latest_validation_comment),
    latestValidationAt: row.latest_validation_at,
    latestValidationActor: cleanString(row.latest_validation_actor),
    record,
  };
}

function buildValidationDecision(row) {
  return {
    id: cleanString(row.id),
    recordId: cleanString(row.record_id),
    decision: cleanString(row.decision),
    actor: cleanString(row.actor_name || row.actor_email) || "Sistema",
    actorId: cleanString(row.actor_id),
    ts: row.created_at,
    comment: cleanString(row.comment),
    criteria: Array.isArray(row.criteria) ? row.criteria : [],
  };
}

export async function listValidationQueue(actor, client = { query }) {
  const conditions = [
    "r.organization_id = $1",
    "r.deleted_at IS NULL",
    "r.approved_at IS NULL",
    "r.status <> 'rejected'",
  ];
  const values = [actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    conditions.push(`c.code = $${values.length}`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    if (allowedAreaCodes.length < 1) return [];
    values.push(allowedAreaCodes);
    conditions.push(`a.code = ANY($${values.length}::text[])`);
  }

  const result = await client.query(
    `
      SELECT
        r.id,
        r.record_date AS date_iso,
        es.code AS scope,
        ec.code AS category,
        m.code AS metric,
        a.name AS area,
        a.code AS area_code,
        c.code AS campus_code,
        r.activity_text AS activity,
        r.activity_text AS activity_text,
        r.quantity_value AS value,
        u.code AS unit,
        r.factor_value_used AS factor,
        r.emission_factor_id AS factor_id,
        r.co2e_kg,
        r.co2e_t,
        r.status,
        r.is_estimated,
        ds.code AS source,
        cu.full_name AS captured_by,
        r.note,
        r.evidence_text AS evidence,
        r.created_at,
        latest_decision.decision AS latest_validation_decision,
        latest_decision.comment AS latest_validation_comment,
        latest_decision.created_at AS latest_validation_at,
        latest_decision.actor_name AS latest_validation_actor,
        EXISTS (
          SELECT 1
          FROM record_files rf
          WHERE rf.record_id = r.id
        ) OR r.evidence_text IS NOT NULL AS has_evidence,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', f.id,
              'fileName', f.file_name,
              'name', f.file_name,
              'mimeType', f.mime_type,
              'sizeBytes', f.size_bytes,
              'url', f.storage_url,
              'purpose', rf.purpose
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::jsonb
        ) AS evidence_files
      FROM records r
      JOIN campuses c ON c.id = r.campus_id
      JOIN areas a ON a.id = r.area_id
      JOIN emission_scopes es ON es.id = r.scope_id
      JOIN emission_categories ec ON ec.id = r.category_id
      JOIN metrics m ON m.id = r.metric_id
      JOIN units u ON u.id = r.unit_id
      JOIN data_sources ds ON ds.id = r.data_source_id
      JOIN users cu ON cu.id = r.created_by
      LEFT JOIN LATERAL (
        SELECT
          vd.decision,
          vd.comment,
          vd.created_at,
          u.full_name AS actor_name
        FROM validation_decisions vd
        LEFT JOIN users u ON u.id = vd.actor_id
        WHERE vd.record_id = r.id
          AND vd.organization_id = r.organization_id
        ORDER BY vd.created_at DESC
        LIMIT 1
      ) latest_decision ON true
      LEFT JOIN record_files rf ON rf.record_id = r.id
      LEFT JOIN files f ON f.id = rf.file_id
      WHERE ${conditions.join("\n        AND ")}
      GROUP BY
        r.id, es.code, ec.code, m.code, a.name, a.code, c.code, u.code, ds.code, cu.full_name,
        latest_decision.decision, latest_decision.comment, latest_decision.created_at, latest_decision.actor_name
      ORDER BY
        CASE WHEN NOT (EXISTS (SELECT 1 FROM record_files rf2 WHERE rf2.record_id = r.id) OR r.evidence_text IS NOT NULL) THEN 0 ELSE 1 END,
        r.created_at ASC
    `,
    values,
  );

  return result.rows.map(buildValidationQueueItem);
}

export async function listValidationDecisions(actor, filters = {}, client = { query }) {
  const recordId = cleanString(filters.recordId);
  const values = [actor.organizationId];
  const conditions = ["vd.organization_id = $1"];

  if (recordId) {
    values.push(recordId);
    conditions.push(`vd.record_id = $${values.length}`);
  }

  const result = await client.query(
    `
      SELECT
        vd.id,
        vd.record_id,
        vd.decision,
        vd.actor_id,
        vd.comment,
        vd.criteria,
        vd.created_at,
        u.full_name AS actor_name,
        u.email AS actor_email
      FROM validation_decisions vd
      LEFT JOIN users u ON u.id = vd.actor_id
      WHERE ${conditions.join("\n        AND ")}
      ORDER BY vd.created_at DESC
      LIMIT 200
    `,
    values,
  );

  return result.rows.map(buildValidationDecision);
}

export async function decideRecords(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const ids = Array.from(new Set((payload.ids || []).map((id) => cleanString(id)).filter(Boolean)));
    const decision = cleanString(payload.decision);
    const comment = cleanString(payload.comment);
    const criteria = Array.isArray(payload.criteria) ? payload.criteria : [];

    const decisionToStatus = {
      approved: "approved",
      rejected: "rejected",
      returned: "pending",
    };
    const nextStatus = decisionToStatus[decision];

    if (!nextStatus || ids.length < 1) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "A valid decision and at least one record id are required.",
      });
    }

    const recordsResult = await client.query(
      `
        SELECT
          r.id,
          r.status,
          r.approved_at,
          c.code AS campus_code,
          a.code AS area_code
        FROM records r
        JOIN campuses c ON c.id = r.campus_id
        JOIN areas a ON a.id = r.area_id
        WHERE r.organization_id = $1
          AND r.id = ANY($2::uuid[])
          AND r.deleted_at IS NULL
        FOR UPDATE
      `,
      [actor.organizationId, ids],
    );

    if (recordsResult.rowCount !== ids.length) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "One or more records were not found.",
      });
    }

    for (const record of recordsResult.rows) {
      ensureAllowedRecordAccess(actor, { campusCode: record.campus_code, areaCode: record.area_code });
      if (record.approved_at) {
        throw new AppError({
          statusCode: 409,
          code: "CONFLICT",
          message: "One or more records were already approved.",
        });
      }
    }

    const decided = [];
    for (const recordId of ids) {
      const now = new Date().toISOString();
      await client.query(
        `
          UPDATE records
          SET status = $3::record_status,
              approved_by = CASE WHEN $3 = 'approved' THEN $4::uuid ELSE NULL::uuid END,
              approved_at = CASE WHEN $3 = 'approved' THEN $5::timestamptz ELSE NULL END,
              updated_by = $4,
              updated_at = $5::timestamptz
          WHERE id = $1
            AND organization_id = $2
        `,
        [recordId, actor.organizationId, nextStatus, actor.id, now],
      );

      const decisionResult = await client.query(
        `
          INSERT INTO validation_decisions (
            organization_id,
            record_id,
            decision,
            actor_id,
            comment,
            criteria
          )
          VALUES ($1,$2,$3,$4,$5,$6::jsonb)
          RETURNING id, record_id, decision, actor_id, comment, criteria, created_at
        `,
        [actor.organizationId, recordId, decision, actor.id, comment || null, JSON.stringify(criteria)],
      );

      const updatedRecord = await getRecordByIdForActor(actor, recordId, client);
      await insertRecordRevision(client, {
        recordId,
        changedBy: actor.id,
        changeReason: decision === "approved" ? "approve" : decision,
        snapshot: {
          ...updatedRecord,
          validationDecision: decision,
          validationComment: comment,
          validationCriteria: criteria,
        },
      });

      await insertAuditEvent(client, {
        organizationId: actor.organizationId,
        userId: actor.id,
        eventType: `records.validation.${decision}`,
        entityType: "record",
        entityId: recordId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: { decision, comment, criteria },
      });

      decided.push(buildValidationDecision({
        ...decisionResult.rows[0],
        actor_name: actor.fullName,
        actor_email: actor.email,
      }));
    }

    return {
      decisions: decided,
      queue: await listValidationQueue(actor, client),
    };
  });
}

async function resolveRecordCreateReferences(actor, payload, client) {
  const campusCode = cleanString(payload.campusCode);
  const areaCode = cleanString(payload.areaCode);
  const areaName = cleanString(payload.area);
  const scopeCode = cleanString(payload.scope);
  const categoryCode = normalizeCategoryCode(payload.category);
  const metricCode = normalizeMetricCode(payload.metric);
  const unitCode = normalizeUnitCode(payload.unit);
  const sourceCode = normalizeSourceCode(payload.source);

  const campus = await getCampusByCode(actor.organizationId, campusCode, client);
  if (!campus) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "campusCode is invalid.",
      details: { field: "campusCode" },
    });
  }

  const area = await getAreaByCodeOrName(campus.id, areaCode, areaName, client);
  if (!area) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "areaCode or area is invalid for the selected campus.",
      details: { field: "areaCode" },
    });
  }

  ensureAllowedRecordAccess(actor, { campusCode: campus.code, areaCode: area.code });

  const scope = await getScopeByCode(scopeCode, client);
  if (!scope) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "scope is invalid.",
      details: { field: "scope" },
    });
  }

  const category = await getCategoryByCode(scope.id, categoryCode, client);
  if (!category) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "category is invalid for the selected scope.",
      details: { field: "category" },
    });
  }

  const metric = metricCode
    ? await getMetricByCode(metricCode, client)
    : await getMetricById(category.default_metric_id, client);
  if (!metric) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "metric is invalid.",
      details: { field: "metric" },
    });
  }

  const unit = unitCode
    ? await getUnitByCode(unitCode, client)
    : await getUnitById(category.default_unit_id, client);
  if (!unit) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "unit is invalid.",
      details: { field: "unit" },
    });
  }

  if (metric.dimension !== unit.dimension) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "unit is incompatible with metric.",
      details: { field: "unit" },
    });
  }

  const dataSource = await getDataSourceByCode(sourceCode, client);
  if (!dataSource) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "source is invalid.",
      details: { field: "source" },
    });
  }

  let factorRecord = null;
  const factorId = cleanString(payload.factorId);
  if (factorId) {
    factorRecord = await getFactorById(factorId, client);
    if (
      !factorRecord ||
      factorRecord.scope_id !== scope.id ||
      factorRecord.category_id !== category.id ||
      factorRecord.metric_id !== metric.id ||
      factorRecord.denominator_unit_id !== unit.id
    ) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "factorId is invalid for the selected scope/category/metric/unit.",
        details: { field: "factorId" },
      });
    }
  }

  const requestedStatus = cleanString(payload.status) === "est" || payload.isEstimated ? "est" : "real";
  const status = dataSource.code === "estimation" ? "est" : requestedStatus;

  let estimationMethod = null;
  if (status === "est") {
    const estimationMethodCode =
      ["invoice", "metered", "survey", "inventory"].includes(dataSource.code) ? dataSource.code : "manual_rule";
    estimationMethod = await getEstimationMethodByCode(estimationMethodCode, client);
  }

  const manualFactor = toNullableNumber(payload.factor);
  if (factorRecord && manualFactor !== null && Math.abs(Number(factorRecord.value) - manualFactor) > 0.000001) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "factor does not match the selected factorId.",
      details: { field: "factor" },
    });
  }

  const factorValueUsed = factorRecord ? Number(factorRecord.value) : ensureFiniteNumber(payload.factor, "factor");
  const quantityValue = ensureFiniteNumber(payload.value, "value");
  const co2eKg = toNullableNumber(payload.co2e_kg) ?? Number((quantityValue * factorValueUsed).toFixed(6));

  return {
    campus,
    area,
    scope,
    category,
    metric,
    unit,
    dataSource,
    estimationMethod,
    factorRecord,
    factorValueUsed,
    quantityValue,
    co2eKg,
    status,
  };
}

async function validateFilesForRecord(actor, fileIds, client) {
  const normalizedFileIds = Array.from(new Set((fileIds || []).map((fileId) => cleanString(fileId)).filter(Boolean)));
  if (normalizedFileIds.length < 1) {
    return [];
  }

  const result = await client.query(
    `
      SELECT id, organization_id
      FROM files
      WHERE id = ANY($1::uuid[])
    `,
    [normalizedFileIds],
  );

  if (result.rowCount !== normalizedFileIds.length) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "One or more fileIds are invalid.",
      details: { field: "fileIds" },
    });
  }

  const invalidOrganizationFile = result.rows.find((row) => row.organization_id !== actor.organizationId);
  if (invalidOrganizationFile) {
    throw new AppError({
      statusCode: 409,
      code: "REFERENCE_CONFLICT",
      message: "All files must belong to the same organization as the record.",
      details: { field: "fileIds" },
    });
  }

  return normalizedFileIds;
}

export async function listRecordRevisionsForActor(actor, recordId, client = { query }) {
  const cleanedRecordId = cleanString(recordId);
  if (!cleanedRecordId) return [];

  const guardResult = await client.query(
    `
      SELECT id
      FROM records
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [cleanedRecordId, actor.organizationId],
  );

  if (guardResult.rowCount < 1) {
    return null;
  }

  const result = await client.query(
    `
      SELECT
        rev.id,
        rev.revision_no,
        rev.changed_at,
        rev.change_reason,
        rev.snapshot,
        u.full_name AS changed_by_name,
        u.email AS changed_by_email
      FROM record_revisions rev
      LEFT JOIN users u ON u.id = rev.changed_by
      WHERE rev.record_id = $1
      ORDER BY rev.revision_no ASC, rev.changed_at ASC
    `,
    [cleanedRecordId],
  );

  return result.rows.map((row) => ({
    id: cleanString(row.id),
    revisionNo: Number(row.revision_no),
    changedAt: row.changed_at,
    changeReason: cleanString(row.change_reason),
    changedByName: cleanString(row.changed_by_name),
    changedByEmail: cleanString(row.changed_by_email),
    snapshot: row.snapshot || null,
  }));
}

export async function getNextRecordRevisionNumber(recordId, client = { query }) {
  const result = await client.query(
    `
      SELECT COALESCE(MAX(revision_no), 0) + 1 AS next_revision_no
      FROM record_revisions
      WHERE record_id = $1
    `,
    [recordId],
  );

  return Number(result.rows[0]?.next_revision_no || 1);
}

export async function insertRecordRevision(client, { recordId, changedBy, changeReason, snapshot, revisionNo }) {
  const nextRevisionNo = revisionNo || (await getNextRecordRevisionNumber(recordId, client));
  await client.query(
    `
      INSERT INTO record_revisions (
        record_id,
        revision_no,
        changed_by,
        change_reason,
        snapshot
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [recordId, nextRevisionNo, changedBy, changeReason, JSON.stringify(snapshot)],
  );
}

export async function getRecordByIdForActor(actor, recordId, client = { query }) {
  const conditions = ["v.id = $1", "v.organization_id = $2", "r.deleted_at IS NULL"];
  const values = [recordId, actor.organizationId];

  if (actor.campusCode && cleanString(actor.campusCode)) {
    values.push(cleanString(actor.campusCode));
    conditions.push(`v."campusCode" = $${values.length}`);
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = (actor.areaAccess.areaCodes || []).map((code) => cleanString(code)).filter(Boolean);
    if (allowedAreaCodes.length < 1) {
      return null;
    }

    values.push(allowedAreaCodes);
    conditions.push(`v."areaCode" = ANY($${values.length}::text[])`);
  }

  const result = await client.query(
    `
      SELECT
        v.id,
        v."dateISO",
        v.scope,
        v.metric,
        v.area,
        v."areaCode",
        v."campusCode",
        v.category,
        v.activity,
        v."activityText",
        v.value,
        v.unit,
        v.factor,
        v."factorId",
        v.co2e_kg,
        v.co2e_t,
        v.status,
        v."isEstimated",
        r.approved_at,
        approver.full_name AS approved_by,
        latest_decision.decision AS latest_validation_decision,
        latest_decision.comment AS latest_validation_comment,
        latest_decision.created_at AS latest_validation_at,
        latest_decision.actor_name AS latest_validation_actor,
        ds.code AS source,
        v."by",
        v.note,
        v.evidence,
        v."createdAt",
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', f.id,
              'fileName', f.file_name,
              'name', f.file_name,
              'mimeType', f.mime_type,
              'sizeBytes', f.size_bytes,
              'url', f.storage_url,
              'purpose', rf.purpose
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::jsonb
        ) AS evidence_files
      FROM v_frontend_records v
      JOIN records r ON r.id = v.id
      JOIN data_sources ds ON ds.id = r.data_source_id
      LEFT JOIN users approver ON approver.id = r.approved_by
      LEFT JOIN LATERAL (
        SELECT
          vd.decision,
          vd.comment,
          vd.created_at,
          u.full_name AS actor_name
        FROM validation_decisions vd
        LEFT JOIN users u ON u.id = vd.actor_id
        WHERE vd.record_id = r.id
          AND vd.organization_id = r.organization_id
        ORDER BY vd.created_at DESC
        LIMIT 1
      ) latest_decision ON true
      LEFT JOIN record_files rf ON rf.record_id = v.id
      LEFT JOIN files f ON f.id = rf.file_id
      WHERE ${conditions.join("\n        AND ")}
      GROUP BY
        v.id,
        v."dateISO",
        v.scope,
        v.metric,
        v.area,
        v."areaCode",
        v."campusCode",
        v.category,
        v.activity,
        v."activityText",
        v.value,
        v.unit,
        v.factor,
        v."factorId",
        v.co2e_kg,
        v.co2e_t,
        v.status,
        v."isEstimated",
        r.approved_at,
        approver.full_name,
        latest_decision.decision,
        latest_decision.comment,
        latest_decision.created_at,
        latest_decision.actor_name,
        ds.code,
        v."by",
        v.note,
        v.evidence,
        v."createdAt"
    `,
    values,
  );

  return result.rows[0] ? buildNormalizedRecordShape(result.rows[0]) : null;
}

export async function createRecord(actor, payload, auditContext, options = {}) {
  return withTransaction(async (client) => {
    const references = await resolveRecordCreateReferences(actor, payload, client);
    const fileIds = await validateFilesForRecord(actor, payload.fileIds, client);
    const activityText = cleanString(payload.activityText || payload.activity);
    const recordDate = cleanString(payload.dateISO);

    if (!recordDate) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "dateISO is required.",
        details: { field: "dateISO" },
      });
    }

    if (!activityText) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "activity or activityText is required.",
        details: { field: "activityText" },
      });
    }

    await assertRecordCaptureAllowedForDate(actor, recordDate, client);

    const insertResult = await client.query(
      `
        INSERT INTO records (
          organization_id,
          campus_id,
          area_id,
          scope_id,
          category_id,
          metric_id,
          unit_id,
          record_date,
          activity_text,
          quantity_value,
          emission_factor_id,
          factor_value_used,
          co2e_kg,
          status,
          data_source_id,
          estimation_method_id,
          note,
          evidence_text,
          created_by,
          updated_by
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19
        )
        RETURNING id
      `,
      [
        actor.organizationId,
        references.campus.id,
        references.area.id,
        references.scope.id,
        references.category.id,
        references.metric.id,
        references.unit.id,
        recordDate,
        activityText,
        references.quantityValue,
        references.factorRecord?.id || null,
        references.factorValueUsed,
        references.co2eKg,
        references.status,
        references.dataSource.id,
        references.estimationMethod?.id || null,
        cleanString(payload.note) || null,
        cleanString(payload.evidence) || null,
        actor.id,
      ],
    );

    const recordId = insertResult.rows[0].id;
    triggerTransactionalFailpoint(options, "after_record_insert");

    for (const [index, fileId] of fileIds.entries()) {
      await client.query(
        `
          INSERT INTO record_files (
            record_id,
            file_id,
            purpose,
            is_primary
          )
          VALUES ($1, $2, 'evidence', $3)
        `,
        [recordId, fileId, index === 0],
      );
    }
    triggerTransactionalFailpoint(options, "after_files_attach");

    const createdRecord = await getRecordByIdForActor(actor, recordId, client);
    await insertRecordRevision(client, {
      recordId,
      changedBy: actor.id,
      changeReason: "create",
      snapshot: createdRecord,
      revisionNo: 1,
    });
    triggerTransactionalFailpoint(options, "before_audit_insert");

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "records.create",
      entityType: "record",
      entityId: recordId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        campusCode: references.campus.code,
        areaCode: references.area.code,
        scope: references.scope.code,
        category: references.category.code,
        metric: references.metric.code,
        unit: references.unit.code,
        source: references.dataSource.code,
        attachedFileCount: fileIds.length,
      },
    });

    await evaluateRecordCreatedAlerts(client, actor, createdRecord);

    return createdRecord;
  });
}

export async function archiveRecord(actor, recordId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existingRecord = await getRecordByIdForActor(actor, recordId, client);

    if (!existingRecord) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Record not found.",
      });
    }

    const archivedAt = new Date().toISOString();
    const archiveReason = cleanString(payload.reason);
    const requestedBy = payload?.requestedBy && typeof payload.requestedBy === "object" ? payload.requestedBy : null;

    const updateResult = await client.query(
      `
        UPDATE records
        SET deleted_at = $3::timestamptz,
            updated_at = $3::timestamptz,
            updated_by = $4
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        RETURNING id
      `,
      [recordId, actor.organizationId, archivedAt, actor.id],
    );

    if (updateResult.rowCount !== 1) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Record not found.",
      });
    }

    const archivedRecord = {
      ...existingRecord,
      deletedAt: archivedAt,
      archivedAt,
      archiveReason,
      archiveRequestedBy: requestedBy || {
        id: actor.id,
        name: actor.fullName || actor.email || null,
        email: actor.email || null,
        role: actor.roleKey || null,
      },
      persisted: true,
    };

    await insertRecordRevision(client, {
      recordId,
      changedBy: actor.id,
      changeReason: "archive",
      snapshot: archivedRecord,
    });

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "records.archive",
      entityType: "record",
      entityId: recordId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        reason: archiveReason,
        campusCode: existingRecord.campusCode,
        areaCode: existingRecord.areaCode,
        scope: existingRecord.scope,
        category: existingRecord.category,
        activity: existingRecord.activity,
        permission: cleanString(payload.permission || "records:update"),
        requestedBy: archivedRecord.archiveRequestedBy,
      },
    });

    return archivedRecord;
  });
}
