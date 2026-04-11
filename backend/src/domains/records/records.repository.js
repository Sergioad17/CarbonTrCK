import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
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

export function buildNormalizedRecordShape(row) {
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
  const status = cleanString(row.status) === "est" || row.isEstimated ? "est" : "real";
  const evidenceText = cleanString(row.evidence);
  const factorId = cleanString(row.factorId || row.factor_id) || null;

  return {
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
        ds.code,
        v."by",
        v.note,
        v.evidence,
        v."createdAt"
      ORDER BY v."dateISO" DESC, v."createdAt" DESC, v.id DESC
    `,
    values,
  );

  return result.rows.map(buildNormalizedRecordShape);
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
