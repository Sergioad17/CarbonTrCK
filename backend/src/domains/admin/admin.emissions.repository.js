import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { insertRecordRevision } from "../records/records.repository.js";
import { ensureAdminPeriodsSchema } from "./admin.periods.repository.js";

function cleanString(value) {
  return String(value ?? "").trim();
}

function toDateString(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function scopeNumber(scopeCode) {
  const match = cleanString(scopeCode).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function shapePeriod(row) {
  if (!row) return null;
  return {
    id: cleanString(row.id),
    name: cleanString(row.name),
    label: cleanString(row.label),
    type: cleanString(row.period_type),
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    status: cleanString(row.status || "open"),
    isDefault: Boolean(row.is_default),
  };
}

function shapeCalculation(row, periodName) {
  const previousEmissions = Number(row.previous_emissions);
  const emissions = Number(row.emissions || 0);
  const trend = Number.isFinite(previousEmissions) && previousEmissions > 0
    ? ((emissions - previousEmissions) / previousEmissions) * 100
    : 0;

  return {
    id: cleanString(row.id),
    scope: scopeNumber(row.scope),
    scopeCode: cleanString(row.scope),
    source: cleanString(row.source),
    area: cleanString(row.area),
    areaCode: cleanString(row.area_code),
    campusCode: cleanString(row.campus_code),
    category: cleanString(row.category),
    metric: cleanString(row.metric),
    period: periodName,
    dateISO: toDateString(row.record_date),
    consumption: Number(row.consumption || 0),
    unit: cleanString(row.unit),
    factor: Number(row.factor || 0),
    factorId: cleanString(row.factor_id) || null,
    emissions,
    trend: `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`,
    activity: cleanString(row.activity),
    status: cleanString(row.status),
    isApproved: Boolean(row.approved_at),
  };
}

function shapeHistory(row) {
  const details = row.details && typeof row.details === "object" ? row.details : {};
  return {
    id: cleanString(row.id),
    ts: row.created_at,
    by: cleanString(row.actor_name || row.actor_email || "Sistema"),
    trigger: cleanString(details.trigger || "Recálculo administrativo"),
    recordsAffected: Number(details.recordsAffected || 0),
    deltaEmissions: Number(details.deltaEmissions || 0),
    periodName: cleanString(details.periodName),
    recordId: cleanString(details.recordId) || null,
  };
}

async function resolveCurrentPeriod(actor, client = { query }) {
  await ensureAdminPeriodsSchema(client);
  const result = await client.query(
    `
      SELECT *
      FROM admin_periods
      WHERE organization_id = $1
      ORDER BY
        is_default DESC,
        CASE WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 0 ELSE 1 END,
        start_date DESC
      LIMIT 1
    `,
    [actor.organizationId],
  );

  if (result.rows[0]) return shapePeriod(result.rows[0]);

  const recordsRange = await client.query(
    `
      SELECT min(record_date) AS start_date, max(record_date) AS end_date
      FROM records
      WHERE organization_id = $1
        AND deleted_at IS NULL
    `,
    [actor.organizationId],
  );

  const startDate = toDateString(recordsRange.rows[0]?.start_date) || new Date().toISOString().slice(0, 10);
  const endDate = toDateString(recordsRange.rows[0]?.end_date) || startDate;
  return {
    id: "",
    name: "Periodo actual",
    label: "Periodo calculado desde registros",
    type: "custom",
    startDate,
    endDate,
    status: "open",
    isDefault: false,
  };
}

async function listCalculationsForPeriod(actor, period, client = { query }) {
  const result = await client.query(
    `
      SELECT
        r.id,
        r.record_date,
        es.code AS scope,
        ec.code AS category,
        m.code AS metric,
        a.name AS area,
        a.code AS area_code,
        c.code AS campus_code,
        r.activity_text AS activity,
        r.quantity_value AS consumption,
        u.code AS unit,
        r.factor_value_used AS factor,
        r.emission_factor_id AS factor_id,
        r.co2e_kg AS emissions,
        r.status,
        r.approved_at,
        ds.name AS source,
        previous.co2e_kg AS previous_emissions
      FROM records r
      JOIN campuses c ON c.id = r.campus_id
      JOIN areas a ON a.id = r.area_id
      JOIN emission_scopes es ON es.id = r.scope_id
      JOIN emission_categories ec ON ec.id = r.category_id
      JOIN metrics m ON m.id = r.metric_id
      JOIN units u ON u.id = r.unit_id
      JOIN data_sources ds ON ds.id = r.data_source_id
      LEFT JOIN LATERAL (
        SELECT pr.co2e_kg
        FROM records pr
        WHERE pr.organization_id = r.organization_id
          AND pr.deleted_at IS NULL
          AND pr.id <> r.id
          AND pr.area_id = r.area_id
          AND pr.category_id = r.category_id
          AND pr.record_date < r.record_date
        ORDER BY pr.record_date DESC, pr.created_at DESC
        LIMIT 1
      ) previous ON true
      WHERE r.organization_id = $1
        AND r.deleted_at IS NULL
        AND r.record_date BETWEEN $2::date AND $3::date
      ORDER BY r.record_date DESC, r.created_at DESC, r.id DESC
    `,
    [actor.organizationId, period.startDate, period.endDate],
  );

  return result.rows.map((row) => shapeCalculation(row, period.name));
}

function buildSummary(calculations, period) {
  const totalScope1 = calculations
    .filter((item) => item.scope === 1)
    .reduce((sum, item) => sum + item.emissions, 0);
  const totalScope2 = calculations
    .filter((item) => item.scope === 2)
    .reduce((sum, item) => sum + item.emissions, 0);
  const totalScope3 = calculations
    .filter((item) => item.scope === 3)
    .reduce((sum, item) => sum + item.emissions, 0);
  const total = totalScope1 + totalScope2 + totalScope3;

  return {
    totalScope1,
    totalScope2,
    totalScope3,
    total,
    unit: "kgCO2e",
    period: period.name,
    vsLastPeriod: 0,
    records: calculations.length,
  };
}

async function listRecalculationHistory(actor, client = { query }) {
  const result = await client.query(
    `
      SELECT
        e.id,
        e.created_at,
        e.details,
        u.full_name AS actor_name,
        u.email AS actor_email
      FROM audit_events e
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.organization_id = $1
        AND e.event_type = 'admin.emissions.recalculate'
      ORDER BY e.created_at DESC
      LIMIT 25
    `,
    [actor.organizationId],
  );

  return result.rows.map(shapeHistory);
}

export async function getAdminEmissionCalculation(actor) {
  const period = await resolveCurrentPeriod(actor);
  const calculations = await listCalculationsForPeriod(actor, period);
  const history = await listRecalculationHistory(actor);
  return {
    period,
    summary: buildSummary(calculations, period),
    calculations,
    history,
  };
}

function buildTrigger(period, recordId) {
  return recordId
    ? `Recálculo manual del registro ${recordId}`
    : `Recálculo global del periodo ${period.name}`;
}

export async function recalculateAdminEmissions(actor, payload = {}, auditContext = {}) {
  return withTransaction(async (client) => {
    const period = await resolveCurrentPeriod(actor, client);
    if (period.status === "closed") {
      throw new AppError({
        statusCode: 409,
        code: "PERIOD_CLOSED",
        message: `El periodo ${period.name} está cerrado y bloquea el recálculo.`,
      });
    }

    const recordId = cleanString(payload.recordId);
    const values = [actor.organizationId, period.startDate, period.endDate];
    const recordCondition = recordId ? "AND r.id = $4" : "";
    if (recordId) values.push(recordId);

    const result = await client.query(
      `
        WITH candidates AS (
          SELECT
            r.id,
            r.quantity_value,
            r.factor_value_used AS old_factor,
            r.co2e_kg AS old_co2e_kg,
            ef.id AS new_factor_id,
            ef.value AS new_factor,
            round((r.quantity_value * ef.value)::numeric, 6) AS new_co2e_kg
          FROM records r
          JOIN LATERAL (
            SELECT ef_inner.id, ef_inner.value
            FROM emission_factors ef_inner
            WHERE ef_inner.scope_id = r.scope_id
              AND ef_inner.category_id = r.category_id
              AND ef_inner.metric_id = r.metric_id
              AND ef_inner.denominator_unit_id = r.unit_id
              AND ef_inner.valid_from <= r.record_date
              AND (ef_inner.valid_to IS NULL OR ef_inner.valid_to >= r.record_date)
            ORDER BY ef_inner.is_default DESC, ef_inner.valid_from DESC, ef_inner.created_at DESC
            LIMIT 1
          ) ef ON true
          WHERE r.organization_id = $1
            AND r.deleted_at IS NULL
            AND r.record_date BETWEEN $2::date AND $3::date
            ${recordCondition}
        ),
        updated AS (
          UPDATE records r
          SET emission_factor_id = c.new_factor_id,
              factor_value_used = c.new_factor,
              co2e_kg = c.new_co2e_kg,
              updated_by = $${values.length + 1},
              updated_at = now()
          FROM candidates c
          WHERE r.id = c.id
            AND (
              r.emission_factor_id IS DISTINCT FROM c.new_factor_id
              OR r.factor_value_used IS DISTINCT FROM c.new_factor
              OR r.co2e_kg IS DISTINCT FROM c.new_co2e_kg
            )
          RETURNING
            r.id,
            c.old_factor,
            c.old_co2e_kg,
            r.factor_value_used AS new_factor,
            r.co2e_kg AS new_co2e_kg
        )
        SELECT * FROM updated
      `,
      [...values, actor.id],
    );

    const trigger = cleanString(payload.trigger) || buildTrigger(period, recordId);
    const deltaEmissions = result.rows.reduce(
      (sum, row) => sum + (Number(row.new_co2e_kg || 0) - Number(row.old_co2e_kg || 0)),
      0,
    );

    for (const row of result.rows) {
      await insertRecordRevision(client, {
        recordId: row.id,
        changedBy: actor.id,
        changeReason: "admin_recalculate",
        snapshot: {
          recordId: row.id,
          oldFactor: Number(row.old_factor || 0),
          newFactor: Number(row.new_factor || 0),
          oldCo2eKg: Number(row.old_co2e_kg || 0),
          newCo2eKg: Number(row.new_co2e_kg || 0),
          periodName: period.name,
          trigger,
        },
      });
    }

    await insertAuditEvent(client, {
      organizationId: actor.organizationId,
      userId: actor.id,
      eventType: "admin.emissions.recalculate",
      entityType: recordId ? "record" : "admin_period",
      entityId: recordId || period.id || null,
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      details: {
        module: "Emisiones y cálculo",
        action: "recalcular",
        trigger,
        periodName: period.name,
        recordId: recordId || null,
        recordsAffected: result.rowCount,
        deltaEmissions: Number(deltaEmissions.toFixed(6)),
      },
    });

    const calculations = await listCalculationsForPeriod(actor, period, client);
    const history = await listRecalculationHistory(actor, client);
    return {
      period,
      summary: buildSummary(calculations, period),
      calculations,
      history,
      result: {
        id: `recalc-${Date.now()}`,
        ts: new Date().toISOString(),
        by: actor.fullName || actor.email || "Usuario actual",
        trigger,
        recordsAffected: result.rowCount,
        deltaEmissions: Number(deltaEmissions.toFixed(6)),
        periodName: period.name,
        recordId: recordId || null,
      },
    };
  });
}
