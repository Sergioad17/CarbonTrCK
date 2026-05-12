import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { evaluateFactorAlerts } from "../admin/admin.alerts-engine.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeLooseText(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeUnitCode(value) {
  const normalized = normalizeLooseText(value).replace(/\s+/g, "");
  if (normalized === "kwh") return "kwh";
  if (normalized === "kgco2e") return "kgco2e";
  if (normalized === "tco2e") return "tco2e";
  if (normalized === "l" || normalized === "lt" || normalized === "litro" || normalized === "litros") return "l";
  if (normalized === "u" || normalized === "unit" || normalized === "unidad" || normalized === "unidades") return "unit";
  return normalized;
}

function formatUnitCode(value) {
  const normalized = normalizeUnitCode(value);
  if (normalized === "kwh") return "kWh";
  if (normalized === "kgco2e") return "kgCO2e";
  if (normalized === "tco2e") return "tCO2e";
  if (normalized === "l") return "L";
  return cleanString(value || normalized);
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

function changedFields(before = {}, after = {}) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys.reduce((acc, key) => {
    const previousValue = before[key] ?? null;
    const nextValue = after[key] ?? null;
    if (JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      acc[key] = { before: previousValue, after: nextValue };
    }
    return acc;
  }, {});
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ensureFiniteNumber(value, field, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = toNullableNumber(value);
  if (parsed === null || parsed < min || parsed > max) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid number.`,
      details: { field },
    });
  }
  return parsed;
}

function ensureIsoDate(value, field, { required = false } = {}) {
  const normalized = cleanString(value);
  if (!normalized) {
    if (required) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: `${field} is required.`,
        details: { field },
      });
    }
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T12:00:00`).getTime())) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid ISO date.`,
      details: { field },
    });
  }

  return normalized;
}

function buildFactorShape(row) {
  const today = new Date().toISOString().slice(0, 10);
  const validTo = formatDateValue(row.valid_to);
  return {
    id: cleanString(row.id),
    scope: cleanString(row.scope),
    category: cleanString(row.category),
    metric: cleanString(row.metric),
    numeratorUnit: formatUnitCode(row.numerator_unit),
    denominatorUnit: formatUnitCode(row.denominator_unit),
    value: Number(row.value),
    region: cleanString(row.region, "MX") || "MX",
    provider: cleanString(row.provider),
    sourceUrl: cleanString(row.source_url),
    validFrom: formatDateValue(row.valid_from),
    validTo: validTo || null,
    isDefault: Boolean(row.is_default),
    isActive: validTo ? validTo > today : true,
    uncertaintyPct: row.uncertainty_pct === null ? null : Number(row.uncertainty_pct),
    notes: cleanString(row.notes),
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

function baseFactorSelect(whereClause) {
  return `
    SELECT
      ef.id,
      es.code::text AS scope,
      ec.code AS category,
      m.code AS metric,
      nu.code AS numerator_unit,
      du.code AS denominator_unit,
      ef.value,
      COALESCE(ef.region, 'MX') AS region,
      COALESCE(ef.provider, '') AS provider,
      COALESCE(ef.source_url, '') AS source_url,
      ef.valid_from,
      ef.valid_to,
      ef.is_default,
      ef.uncertainty_pct,
      COALESCE(ef.notes, '') AS notes,
      ef.created_at
    FROM emission_factors ef
    JOIN emission_scopes es ON es.id = ef.scope_id
    JOIN emission_categories ec ON ec.id = ef.category_id
    JOIN metrics m ON m.id = ef.metric_id
    JOIN units nu ON nu.id = ef.numerator_unit_id
    JOIN units du ON du.id = ef.denominator_unit_id
    WHERE ${whereClause}
  `;
}

async function getScopeByCode(scopeCode, client = { query }) {
  const result = await client.query(`SELECT id, code::text AS code FROM emission_scopes WHERE code::text = $1 LIMIT 1`, [
    cleanString(scopeCode),
  ]);
  return result.rows[0] || null;
}

async function getCategoryByCode(scopeId, categoryCode, client = { query }) {
  const result = await client.query(
    `SELECT id, code FROM emission_categories WHERE scope_id = $1 AND lower(code) = lower($2) AND is_active = true LIMIT 1`,
    [scopeId, normalizeLooseText(categoryCode)],
  );
  return result.rows[0] || null;
}

async function getMetricByCode(metricCode, client = { query }) {
  const result = await client.query(`SELECT id, code FROM metrics WHERE lower(code) = lower($1) AND is_active = true LIMIT 1`, [
    normalizeLooseText(metricCode),
  ]);
  return result.rows[0] || null;
}

async function getUnitByCode(unitCode, client = { query }) {
  const result = await client.query(`SELECT id, code FROM units WHERE lower(code) = lower($1) LIMIT 1`, [
    normalizeUnitCode(unitCode),
  ]);
  return result.rows[0] || null;
}

async function getFactorRecordById(factorId, client = { query }) {
  const result = await client.query(`${baseFactorSelect("ef.id = $1")} LIMIT 1`, [factorId]);
  return result.rows[0] || null;
}

async function resolveFactorReferences(payload, client) {
  const scope = await getScopeByCode(payload.scope, client);
  if (!scope) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "scope is invalid.", details: { field: "scope" } });

  const category = await getCategoryByCode(scope.id, payload.category, client);
  if (!category) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "category is invalid for the selected scope.", details: { field: "category" } });

  const metric = await getMetricByCode(payload.metric, client);
  if (!metric) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "metric is invalid.", details: { field: "metric" } });

  const numeratorUnit = await getUnitByCode(payload.numeratorUnit || "kgCO2e", client);
  if (!numeratorUnit) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "numeratorUnit is invalid.", details: { field: "numeratorUnit" } });

  const denominatorUnit = await getUnitByCode(payload.denominatorUnit, client);
  if (!denominatorUnit) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "denominatorUnit is invalid.", details: { field: "denominatorUnit" } });

  return { scope, category, metric, numeratorUnit, denominatorUnit };
}

async function findDefaultConflict(client, refs, payload, ignoreId = null) {
  const result = await client.query(
    `${baseFactorSelect(`
      ef.scope_id = $1
      AND ef.category_id = $2
      AND ef.metric_id = $3
      AND ef.denominator_unit_id = $4
      AND COALESCE(ef.region, 'GLOBAL') = COALESCE($5, 'GLOBAL')
      AND COALESCE(ef.provider, 'UNSPECIFIED') = COALESCE($6, 'UNSPECIFIED')
      AND ef.is_default = true
      AND ef.valid_to IS NULL
      AND ($7::uuid IS NULL OR ef.id <> $7)
    `)} LIMIT 1`,
    [refs.scope.id, refs.category.id, refs.metric.id, refs.denominatorUnit.id, cleanString(payload.region) || null, cleanString(payload.provider) || null, ignoreId],
  );
  return result.rows[0] || null;
}

async function clearDefaultConflict(client, refs, payload, ignoreId = null) {
  await client.query(
    `
      UPDATE emission_factors
      SET is_default = false
      WHERE scope_id = $1
        AND category_id = $2
        AND metric_id = $3
        AND denominator_unit_id = $4
        AND COALESCE(region, 'GLOBAL') = COALESCE($5, 'GLOBAL')
        AND COALESCE(provider, 'UNSPECIFIED') = COALESCE($6, 'UNSPECIFIED')
        AND ($7::uuid IS NULL OR id <> $7)
        AND is_default = true
    `,
    [refs.scope.id, refs.category.id, refs.metric.id, refs.denominatorUnit.id, cleanString(payload.region) || null, cleanString(payload.provider) || null, ignoreId],
  );
}

function validateFactorPayload(payload) {
  const validFrom = ensureIsoDate(payload.validFrom, "validFrom", { required: true });
  const validTo = ensureIsoDate(payload.validTo, "validTo");
  if (validTo && validTo < validFrom) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "validTo must be greater than or equal to validFrom.", details: { field: "validTo" } });
  }
  ensureFiniteNumber(payload.value, "value", { min: 0 });
  if (payload.uncertaintyPct !== null && payload.uncertaintyPct !== "" && typeof payload.uncertaintyPct !== "undefined") {
    ensureFiniteNumber(payload.uncertaintyPct, "uncertaintyPct", { min: 0, max: 100 });
  }
  return { validFrom, validTo };
}

export async function listFactors() {
  const result = await query(`${baseFactorSelect("1=1")} ORDER BY ef.valid_from DESC, ef.created_at DESC, ef.id DESC`);
  return result.rows.map(buildFactorShape);
}

export async function getDefaultFactor(scopeCode, categoryCode) {
  const scope = await getScopeByCode(scopeCode);
  if (!scope) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "scope is invalid.", details: { field: "scope" } });
  const category = await getCategoryByCode(scope.id, categoryCode);
  if (!category) throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "category is invalid for the selected scope.", details: { field: "category" } });

  const result = await query(
    `${baseFactorSelect("ef.scope_id = $1 AND ef.category_id = $2 AND (ef.valid_to IS NULL OR ef.valid_to > CURRENT_DATE)")} ORDER BY ef.is_default DESC, ef.valid_from DESC, ef.created_at DESC LIMIT 1`,
    [scope.id, category.id],
  );
  return result.rows[0] ? buildFactorShape(result.rows[0]) : null;
}

export async function getFactorUsageCount(actor, factorId) {
  const result = await query(`SELECT COUNT(*)::int AS total FROM records WHERE organization_id = $1 AND emission_factor_id = $2 AND deleted_at IS NULL`, [
    actor.organizationId,
    factorId,
  ]);
  return Number(result.rows[0]?.total || 0);
}

export async function createFactor(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const refs = await resolveFactorReferences(payload, client);
    const { validFrom, validTo } = validateFactorPayload(payload);
    const isActive = "isActive" in payload ? Boolean(payload.isActive) : true;
    const isDefault = Boolean(payload.isDefault) && isActive;

    if (isDefault) {
      const conflict = await findDefaultConflict(client, refs, payload);
      if (conflict && !payload.forceDefaultOverride) {
        throw new AppError({
          statusCode: 409,
          code: "DEFAULT_FACTOR_CONFLICT",
          message: "Another default factor already exists for this combination.",
          details: { conflict: buildFactorShape(conflict) },
        });
      }
      if (conflict && payload.forceDefaultOverride) {
        await clearDefaultConflict(client, refs, payload);
      }
    }

    const inserted = await client.query(
      `
        INSERT INTO emission_factors (
          scope_id, category_id, metric_id, numerator_unit_id, denominator_unit_id,
          value, region, provider, source_url, valid_from, valid_to, is_default, uncertainty_pct, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        refs.scope.id,
        refs.category.id,
        refs.metric.id,
        refs.numeratorUnit.id,
        refs.denominatorUnit.id,
        ensureFiniteNumber(payload.value, "value", { min: 0 }),
        cleanString(payload.region) || null,
        cleanString(payload.provider) || null,
        cleanString(payload.sourceUrl) || null,
        validFrom,
        isActive ? validTo : validTo || validFrom,
        isDefault,
        payload.uncertaintyPct === null || payload.uncertaintyPct === "" || typeof payload.uncertaintyPct === "undefined"
          ? null
          : ensureFiniteNumber(payload.uncertaintyPct, "uncertaintyPct", { min: 0, max: 100 }),
        cleanString(payload.notes) || null,
      ],
    );

    const factor = buildFactorShape(await getFactorRecordById(inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "factors.create",
      entityType: "factor",
      entityId: factor.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { scope: factor.scope, category: factor.category, metric: factor.metric },
    });
    await evaluateFactorAlerts(client, actor, factor, "created");
    return factor;
  });
}

export async function updateFactor(actor, factorId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existingRow = await getFactorRecordById(factorId, client);
    if (!existingRow) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Factor not found." });
    }
    const existing = buildFactorShape(existingRow);

    const merged = {
      scope: payload.scope ?? existing.scope,
      category: payload.category ?? existing.category,
      metric: payload.metric ?? existing.metric,
      numeratorUnit: payload.numeratorUnit ?? existing.numeratorUnit,
      denominatorUnit: payload.denominatorUnit ?? existing.denominatorUnit,
      value: "value" in payload ? payload.value : existing.value,
      region: "region" in payload ? payload.region : existing.region,
      provider: "provider" in payload ? payload.provider : existing.provider,
      sourceUrl: "sourceUrl" in payload ? payload.sourceUrl : existing.sourceUrl,
      validFrom: payload.validFrom ?? existing.validFrom,
      validTo: "validTo" in payload ? payload.validTo : existing.validTo,
      isDefault: "isDefault" in payload ? payload.isDefault : existing.isDefault,
      isActive: "isActive" in payload ? payload.isActive : existing.isActive,
      uncertaintyPct: "uncertaintyPct" in payload ? payload.uncertaintyPct : existing.uncertaintyPct,
      notes: "notes" in payload ? payload.notes : existing.notes,
      forceDefaultOverride: payload.forceDefaultOverride,
    };

    const refs = await resolveFactorReferences(merged, client);
    const { validFrom, validTo } = validateFactorPayload(merged);
    const isActive = Boolean(merged.isActive);
    const isDefault = Boolean(merged.isDefault) && isActive;

    if (isDefault) {
      const conflict = await findDefaultConflict(client, refs, merged, factorId);
      if (conflict && !merged.forceDefaultOverride) {
        throw new AppError({
          statusCode: 409,
          code: "DEFAULT_FACTOR_CONFLICT",
          message: "Another default factor already exists for this combination.",
          details: { conflict: buildFactorShape(conflict) },
        });
      }
      if (conflict && merged.forceDefaultOverride) {
        await clearDefaultConflict(client, refs, merged, factorId);
      }
    }

    await client.query(
      `
        UPDATE emission_factors
        SET
          scope_id = $1,
          category_id = $2,
          metric_id = $3,
          numerator_unit_id = $4,
          denominator_unit_id = $5,
          value = $6,
          region = $7,
          provider = $8,
          source_url = $9,
          valid_from = $10,
          valid_to = $11,
          is_default = $12,
          uncertainty_pct = $13,
          notes = $14
        WHERE id = $15
      `,
      [
        refs.scope.id,
        refs.category.id,
        refs.metric.id,
        refs.numeratorUnit.id,
        refs.denominatorUnit.id,
        ensureFiniteNumber(merged.value, "value", { min: 0 }),
        cleanString(merged.region) || null,
        cleanString(merged.provider) || null,
        cleanString(merged.sourceUrl) || null,
        validFrom,
        isActive ? validTo : validTo || validFrom,
        isDefault,
        merged.uncertaintyPct === null || merged.uncertaintyPct === "" ? null : ensureFiniteNumber(merged.uncertaintyPct, "uncertaintyPct", { min: 0, max: 100 }),
        cleanString(merged.notes) || null,
        factorId,
      ],
    );

    const factor = buildFactorShape(await getFactorRecordById(factorId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "factors.update",
      entityType: "factor",
      entityId: factor.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        target: `${factor.scope}/${factor.category}/${factor.metric}`,
        before: existing,
        after: factor,
        changes: changedFields(existing, factor),
      },
    });
    await evaluateFactorAlerts(client, actor, factor, "updated");
    return factor;
  });
}

function subtractOneDay(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function createFactorNewVersion(actor, factorId, payload, auditContext) {
  return withTransaction(async (client) => {
    const sourceRow = await getFactorRecordById(factorId, client);
    if (!sourceRow) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Factor not found." });
    }
    const source = buildFactorShape(sourceRow);

    const merged = {
      scope: payload.scope ?? source.scope,
      category: payload.category ?? source.category,
      metric: payload.metric ?? source.metric,
      numeratorUnit: payload.numeratorUnit ?? source.numeratorUnit,
      denominatorUnit: payload.denominatorUnit ?? source.denominatorUnit,
      value: "value" in payload ? payload.value : source.value,
      region: "region" in payload ? payload.region : source.region,
      provider: "provider" in payload ? payload.provider : source.provider,
      sourceUrl: "sourceUrl" in payload ? payload.sourceUrl : source.sourceUrl,
      validFrom: payload.validFrom,
      validTo: "validTo" in payload ? payload.validTo : null,
      isDefault: "isDefault" in payload ? payload.isDefault : source.isDefault,
      isActive: "isActive" in payload ? payload.isActive : true,
      uncertaintyPct: "uncertaintyPct" in payload ? payload.uncertaintyPct : source.uncertaintyPct,
      notes: "notes" in payload ? payload.notes : source.notes,
      forceDefaultOverride: payload.forceDefaultOverride,
    };

    const refs = await resolveFactorReferences(merged, client);
    const { validFrom, validTo } = validateFactorPayload(merged);
    const isActive = Boolean(merged.isActive);
    const isDefault = Boolean(merged.isDefault) && isActive;

    if (!source.validTo && validFrom <= source.validFrom) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "validFrom for the new version must be after the current validFrom.",
        details: { field: "validFrom" },
      });
    }

    if (isDefault) {
      const conflict = await findDefaultConflict(client, refs, merged, factorId);
      if (conflict && !merged.forceDefaultOverride) {
        throw new AppError({
          statusCode: 409,
          code: "DEFAULT_FACTOR_CONFLICT",
          message: "Another default factor already exists for this combination.",
          details: { conflict: buildFactorShape(conflict) },
        });
      }
      if (conflict && merged.forceDefaultOverride) {
        await clearDefaultConflict(client, refs, merged, factorId);
      }
    }

    await client.query(
      `UPDATE emission_factors SET valid_to = $1, is_default = false WHERE id = $2`,
      [source.validTo || subtractOneDay(validFrom), factorId],
    );

    const inserted = await client.query(
      `
        INSERT INTO emission_factors (
          scope_id, category_id, metric_id, numerator_unit_id, denominator_unit_id,
          value, region, provider, source_url, valid_from, valid_to, is_default, uncertainty_pct, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id
      `,
      [
        refs.scope.id,
        refs.category.id,
        refs.metric.id,
        refs.numeratorUnit.id,
        refs.denominatorUnit.id,
        ensureFiniteNumber(merged.value, "value", { min: 0 }),
        cleanString(merged.region) || null,
        cleanString(merged.provider) || null,
        cleanString(merged.sourceUrl) || null,
        validFrom,
        isActive ? validTo : validTo || validFrom,
        isDefault,
        merged.uncertaintyPct === null || merged.uncertaintyPct === "" ? null : ensureFiniteNumber(merged.uncertaintyPct, "uncertaintyPct", { min: 0, max: 100 }),
        cleanString(merged.notes) || null,
      ],
    );

    const factor = buildFactorShape(await getFactorRecordById(inserted.rows[0].id, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "factors.new_version",
      entityType: "factor",
      entityId: factor.id,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { previousFactorId: factorId },
    });
    await evaluateFactorAlerts(client, actor, factor, "new_version");
    return factor;
  });
}

export async function updateFactorDefault(actor, factorId, force, auditContext) {
  return withTransaction(async (client) => {
    const factorRow = await getFactorRecordById(factorId, client);
    if (!factorRow) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Factor not found." });
    }
    const factor = buildFactorShape(factorRow);
    if (!factor.isActive) {
      throw new AppError({ statusCode: 409, code: "INACTIVE_FACTOR_CONFLICT", message: "Inactive factors cannot be set as default." });
    }

    const refs = await resolveFactorReferences(factor, client);
    const conflict = await findDefaultConflict(client, refs, factor, factorId);
    if (conflict && !force) {
      throw new AppError({
        statusCode: 409,
        code: "DEFAULT_FACTOR_CONFLICT",
        message: "Another default factor already exists for this combination.",
        details: { conflict: buildFactorShape(conflict) },
      });
    }
    if (conflict && force) {
      await clearDefaultConflict(client, refs, factor, factorId);
    }

    await client.query(`UPDATE emission_factors SET is_default = true WHERE id = $1`, [factorId]);
    const updated = buildFactorShape(await getFactorRecordById(factorId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "factors.default_change",
      entityType: "factor",
      entityId: factorId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { force: Boolean(force) },
    });
    await evaluateFactorAlerts(client, actor, updated, "default_change");
    return updated;
  });
}

export async function updateFactorStatus(actor, factorId, isActive, auditContext) {
  return withTransaction(async (client) => {
    const factor = await getFactorRecordById(factorId, client);
    if (!factor) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Factor not found." });
    }

    await client.query(
      `UPDATE emission_factors SET is_default = CASE WHEN $1 THEN is_default ELSE false END, valid_to = CASE WHEN $1 THEN valid_to ELSE COALESCE(valid_to, CURRENT_DATE) END WHERE id = $2`,
      [Boolean(isActive), factorId],
    );

    const updated = buildFactorShape(await getFactorRecordById(factorId, client));
    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "factors.status_change",
      entityType: "factor",
      entityId: factorId,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: { isActive: Boolean(isActive) },
    });
    await evaluateFactorAlerts(client, actor, updated, "status_change");
    return updated;
  });
}
