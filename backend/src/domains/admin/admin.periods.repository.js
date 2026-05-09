import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const PERIOD_TYPES = new Set(["monthly", "bimonthly", "quarterly", "semester", "annual"]);
const PERIOD_STATUSES = new Set(["open", "review", "closed"]);
const REOPEN_ROLES = new Set(["admin", "directivo", "operativo"]);

let schemaReady = false;

function cleanString(value) {
  return String(value ?? "").trim();
}

function toDateString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function normalizeRoles(value) {
  const roles = Array.isArray(value) ? value : [];
  const normalized = roles.map((role) => cleanString(role).toLowerCase()).filter((role) => REOPEN_ROLES.has(role));
  return normalized.length ? Array.from(new Set(normalized)) : ["admin"];
}

function buildAuditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
    details,
  };
}

export async function ensureAdminPeriodsSchema(client = { query }) {
  if (schemaReady) return;

  await client.query(`
    CREATE TABLE IF NOT EXISTS admin_periods (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      name varchar(80) NOT NULL,
      label varchar(160),
      period_type varchar(30) NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'open',
      is_default boolean NOT NULL DEFAULT false,
      capture_deadline date,
      validation_deadline date,
      report_deadline date,
      lock_capture_on_close boolean NOT NULL DEFAULT true,
      allow_special_reopen boolean NOT NULL DEFAULT false,
      special_reopen_roles text[] NOT NULL DEFAULT ARRAY['admin']::text[],
      special_reopen_note text,
      created_by uuid,
      updated_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT admin_periods_org_name_uq UNIQUE (organization_id, name),
      CONSTRAINT admin_periods_dates_chk CHECK (end_date >= start_date),
      CONSTRAINT admin_periods_type_chk CHECK (period_type IN ('monthly','bimonthly','quarterly','semester','annual')),
      CONSTRAINT admin_periods_status_chk CHECK (status IN ('open','review','closed'))
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_periods_default_uq
      ON admin_periods(organization_id)
      WHERE is_default
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_periods_org_dates
      ON admin_periods(organization_id, start_date, end_date)
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'admin_periods_set_updated_at'
      ) THEN
        CREATE TRIGGER admin_periods_set_updated_at
          BEFORE UPDATE ON admin_periods
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);

  schemaReady = true;
}

function shapePeriod(row) {
  return {
    id: row.id,
    name: row.name,
    label: row.label || "",
    type: row.period_type,
    startDate: toDateString(row.start_date),
    endDate: toDateString(row.end_date),
    status: row.status,
    isDefault: Boolean(row.is_default),
    captureDeadline: toDateString(row.capture_deadline) || "",
    validationDeadline: toDateString(row.validation_deadline) || "",
    reportDeadline: toDateString(row.report_deadline) || "",
    lockCaptureOnClose: Boolean(row.lock_capture_on_close),
    allowSpecialReopen: Boolean(row.allow_special_reopen),
    specialReopenRoles: Array.isArray(row.special_reopen_roles) && row.special_reopen_roles.length
      ? row.special_reopen_roles
      : ["admin"],
    specialReopenNote: row.special_reopen_note || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function validatePeriodPayload(payload = {}, { partial = false } = {}) {
  const next = {};

  if (!partial || payload.name !== undefined) {
    next.name = cleanString(payload.name);
    if (!next.name) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "El nombre del periodo es obligatorio.", details: { field: "name" } });
    }
  }

  if (!partial || payload.type !== undefined) {
    next.type = cleanString(payload.type || "quarterly");
    if (!PERIOD_TYPES.has(next.type)) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "El tipo de periodo no es válido.", details: { field: "type" } });
    }
  }

  if (!partial || payload.status !== undefined) {
    next.status = cleanString(payload.status || "open");
    if (!PERIOD_STATUSES.has(next.status)) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "El estado del periodo no es válido.", details: { field: "status" } });
    }
  }

  if (!partial || payload.startDate !== undefined) next.startDate = cleanString(payload.startDate);
  if (!partial || payload.endDate !== undefined) next.endDate = cleanString(payload.endDate);

  if ((!partial && (!next.startDate || !next.endDate)) || (next.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(next.startDate)) || (next.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(next.endDate))) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "Las fechas de inicio y fin deben ser válidas.", details: { field: "startDate" } });
  }

  if (next.startDate && next.endDate && next.endDate < next.startDate) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "La fecha de fin no puede ser menor que la fecha de inicio.", details: { field: "endDate" } });
  }

  if (payload.label !== undefined) next.label = cleanString(payload.label);
  if (payload.captureDeadline !== undefined) next.captureDeadline = cleanString(payload.captureDeadline) || null;
  if (payload.validationDeadline !== undefined) next.validationDeadline = cleanString(payload.validationDeadline) || null;
  if (payload.reportDeadline !== undefined) next.reportDeadline = cleanString(payload.reportDeadline) || null;
  if (payload.isDefault !== undefined) next.isDefault = toBoolean(payload.isDefault);
  if (payload.lockCaptureOnClose !== undefined) next.lockCaptureOnClose = toBoolean(payload.lockCaptureOnClose, true);
  if (payload.allowSpecialReopen !== undefined) next.allowSpecialReopen = toBoolean(payload.allowSpecialReopen);
  if (payload.specialReopenRoles !== undefined) next.specialReopenRoles = normalizeRoles(payload.specialReopenRoles);
  if (payload.specialReopenNote !== undefined) next.specialReopenNote = cleanString(payload.specialReopenNote);

  return next;
}

export async function listAdminPeriods(actor) {
  await ensureAdminPeriodsSchema();
  const result = await query(
    `
      SELECT *
      FROM admin_periods
      WHERE organization_id = $1
      ORDER BY start_date DESC, name ASC
    `,
    [actor.organizationId],
  );

  return result.rows.map(shapePeriod);
}

export async function createAdminPeriod(actor, payload, auditContext) {
  const next = validatePeriodPayload(payload);
  return withTransaction(async (client) => {
    await ensureAdminPeriodsSchema(client);

    if (next.isDefault) {
      await client.query(`UPDATE admin_periods SET is_default = false WHERE organization_id = $1`, [actor.organizationId]);
    }

    const result = await client.query(
      `
        INSERT INTO admin_periods (
          organization_id, name, label, period_type, start_date, end_date, status, is_default,
          capture_deadline, validation_deadline, report_deadline, lock_capture_on_close,
          allow_special_reopen, special_reopen_roles, special_reopen_note, created_by, updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text[],$15,$16,$16)
        RETURNING *
      `,
      [
        actor.organizationId,
        next.name,
        next.label || "",
        next.type,
        next.startDate,
        next.endDate,
        next.status,
        Boolean(next.isDefault),
        next.captureDeadline || null,
        next.validationDeadline || null,
        next.reportDeadline || null,
        next.lockCaptureOnClose !== false,
        Boolean(next.allowSpecialReopen),
        next.specialReopenRoles || ["admin"],
        next.specialReopenNote || null,
        actor.id,
      ],
    );

    const period = shapePeriod(result.rows[0]);
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { module: "Periodos", action: "crear", target: period.name }),
      eventType: "admin.periods.create",
      entityType: "admin_period",
      entityId: period.id,
    });

    return period;
  });
}

export async function updateAdminPeriod(actor, periodId, payload, auditContext) {
  const changes = validatePeriodPayload(payload, { partial: true });
  return withTransaction(async (client) => {
    await ensureAdminPeriodsSchema(client);

    const existing = await client.query(
      `SELECT * FROM admin_periods WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [periodId, actor.organizationId],
    );

    if (existing.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El periodo no existe." });
    }

    const merged = {
      ...shapePeriod(existing.rows[0]),
      ...changes,
      type: changes.type || existing.rows[0].period_type,
      startDate: changes.startDate || toDateString(existing.rows[0].start_date),
      endDate: changes.endDate || toDateString(existing.rows[0].end_date),
      status: changes.status || existing.rows[0].status,
      isDefault: changes.isDefault ?? existing.rows[0].is_default,
      lockCaptureOnClose: changes.lockCaptureOnClose ?? existing.rows[0].lock_capture_on_close,
      allowSpecialReopen: changes.allowSpecialReopen ?? existing.rows[0].allow_special_reopen,
      specialReopenRoles: changes.specialReopenRoles || existing.rows[0].special_reopen_roles || ["admin"],
    };

    if (merged.endDate < merged.startDate) {
      throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "La fecha de fin no puede ser menor que la fecha de inicio.", details: { field: "endDate" } });
    }

    if (merged.isDefault) {
      await client.query(`UPDATE admin_periods SET is_default = false WHERE organization_id = $1 AND id <> $2`, [actor.organizationId, periodId]);
    }

    const result = await client.query(
      `
        UPDATE admin_periods
        SET name = $3,
            label = $4,
            period_type = $5,
            start_date = $6,
            end_date = $7,
            status = $8,
            is_default = $9,
            capture_deadline = $10,
            validation_deadline = $11,
            report_deadline = $12,
            lock_capture_on_close = $13,
            allow_special_reopen = $14,
            special_reopen_roles = $15::text[],
            special_reopen_note = $16,
            updated_by = $17
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `,
      [
        periodId,
        actor.organizationId,
        merged.name,
        merged.label || "",
        merged.type,
        merged.startDate,
        merged.endDate,
        merged.status,
        Boolean(merged.isDefault),
        merged.captureDeadline || null,
        merged.validationDeadline || null,
        merged.reportDeadline || null,
        Boolean(merged.lockCaptureOnClose),
        Boolean(merged.allowSpecialReopen),
        merged.specialReopenRoles,
        merged.specialReopenNote || null,
        actor.id,
      ],
    );

    const period = shapePeriod(result.rows[0]);
    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, { module: "Periodos", action: "actualizar", target: period.name, status: period.status }),
      eventType: "admin.periods.update",
      entityType: "admin_period",
      entityId: period.id,
    });

    return period;
  });
}

export async function assertRecordCaptureAllowedForDate(actor, recordDate, client = { query }) {
  const tableResult = await client.query(`SELECT to_regclass('public.admin_periods') AS table_name`);
  if (!tableResult.rows[0]?.table_name) return;

  const result = await client.query(
    `
      SELECT id, name, status, lock_capture_on_close
      FROM admin_periods
      WHERE organization_id = $1
        AND $2::date BETWEEN start_date AND end_date
      ORDER BY is_default DESC, start_date DESC
      LIMIT 1
    `,
    [actor.organizationId, recordDate],
  );

  const period = result.rows[0];
  if (period?.status === "closed" && period.lock_capture_on_close) {
    throw new AppError({
      statusCode: 409,
      code: "PERIOD_CLOSED",
      message: `El periodo ${period.name} está cerrado y bloquea nuevas capturas.`,
      details: { periodId: period.id, periodName: period.name },
    });
  }
}
