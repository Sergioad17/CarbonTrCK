import { query, withTransaction } from "../../shared/db/pool.js";
import { AppError } from "../../shared/errors/app-error.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

let schemaReady = false;

export async function ensureAiTrainingSchema(client = { query }) {
  if (schemaReady) return;

  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_training_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      name varchar(160) NOT NULL,
      description text,
      model_type varchar(40) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'pending',
      date_from date,
      date_to date,
      train_ratio numeric(5,2) NOT NULL DEFAULT 70,
      validation_ratio numeric(5,2) NOT NULL DEFAULT 20,
      max_readings integer,
      readings_count integer NOT NULL DEFAULT 0,
      devices_count integer NOT NULL DEFAULT 0,
      metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
      parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
      error_message text,
      started_at timestamptz,
      finished_at timestamptz,
      created_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ai_training_runs_status_chk CHECK (status IN ('pending','running','completed','failed','cancelled')),
      CONSTRAINT ai_training_runs_model_type_chk CHECK (model_type IN ('consumption_prediction','anomaly_detection','pattern_classification')),
      CONSTRAINT ai_training_runs_train_ratio_chk CHECK (train_ratio >= 0 AND train_ratio <= 100),
      CONSTRAINT ai_training_runs_validation_ratio_chk CHECK (validation_ratio >= 0 AND validation_ratio <= 100),
      CONSTRAINT ai_training_runs_split_chk CHECK (train_ratio + validation_ratio <= 100),
      CONSTRAINT ai_training_runs_dates_chk CHECK (date_from IS NULL OR date_to IS NULL OR date_to >= date_from),
      CONSTRAINT ai_training_runs_max_readings_chk CHECK (max_readings IS NULL OR max_readings > 0)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_training_runs_org_created
      ON ai_training_runs(organization_id, created_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_training_runs_status
      ON ai_training_runs(organization_id, status)
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'ai_training_runs_set_updated_at'
      ) THEN
        CREATE TRIGGER ai_training_runs_set_updated_at
          BEFORE UPDATE ON ai_training_runs
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_training_run_devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      training_run_id uuid NOT NULL REFERENCES ai_training_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
      device_id uuid NOT NULL,
      device_code varchar(120) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ai_training_run_devices_uq UNIQUE (training_run_id, device_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_training_run_devices_run
      ON ai_training_run_devices(training_run_id)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_model_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
      training_run_id uuid NOT NULL REFERENCES ai_training_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
      model_type varchar(40) NOT NULL,
      version varchar(40) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'inactive',
      metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
      artifact_path text,
      activated_at timestamptz,
      activated_by uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ai_model_versions_status_chk CHECK (status IN ('inactive','active')),
      CONSTRAINT ai_model_versions_run_uq UNIQUE (training_run_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_model_versions_org_type_status
      ON ai_model_versions(organization_id, model_type, status)
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_versions_active_uq
      ON ai_model_versions(organization_id, model_type)
      WHERE status = 'active'
  `);

  schemaReady = true;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function shapeRun(row, devices = [], modelVersion = null) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    modelType: row.model_type,
    status: row.status,
    dateFrom: toIsoDate(row.date_from),
    dateTo: toIsoDate(row.date_to),
    trainRatio: toNumber(row.train_ratio),
    validationRatio: toNumber(row.validation_ratio),
    maxReadings: row.max_readings === null || row.max_readings === undefined ? null : Number(row.max_readings),
    readingsCount: Number(row.readings_count || 0),
    devicesCount: Number(row.devices_count || 0),
    metrics: row.metrics && typeof row.metrics === "object" ? row.metrics : {},
    parameters: row.parameters && typeof row.parameters === "object" ? row.parameters : {},
    errorMessage: row.error_message || "",
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    devices,
    modelVersion,
  };
}

function shapeModelVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    trainingRunId: row.training_run_id,
    modelType: row.model_type,
    version: row.version,
    status: row.status,
    metrics: row.metrics && typeof row.metrics === "object" ? row.metrics : {},
    artifactPath: row.artifact_path || "",
    activatedAt: row.activated_at || null,
    activatedBy: row.activated_by || null,
    createdAt: row.created_at || null,
  };
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

async function loadDevicesForRun(client, runId) {
  const result = await client.query(
    `
      SELECT device_id, device_code
      FROM ai_training_run_devices
      WHERE training_run_id = $1
      ORDER BY device_code ASC
    `,
    [runId],
  );
  return result.rows.map((row) => ({ deviceId: row.device_id, deviceCode: row.device_code }));
}

async function loadModelVersion(client, runId) {
  const result = await client.query(
    `
      SELECT id, training_run_id, model_type, version, status, metrics, artifact_path, activated_at, activated_by, created_at
      FROM ai_model_versions
      WHERE training_run_id = $1
      LIMIT 1
    `,
    [runId],
  );
  return shapeModelVersion(result.rows[0] || null);
}

export async function listTrainingRuns(actor) {
  await ensureAiTrainingSchema();
  const result = await query(
    `
      SELECT
        r.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('deviceId', d.device_id, 'deviceCode', d.device_code))
          FILTER (WHERE d.id IS NOT NULL), '[]'::json) AS devices,
        (
          SELECT jsonb_build_object(
            'id', mv.id,
            'trainingRunId', mv.training_run_id,
            'modelType', mv.model_type,
            'version', mv.version,
            'status', mv.status,
            'metrics', mv.metrics,
            'artifactPath', mv.artifact_path,
            'activatedAt', mv.activated_at,
            'activatedBy', mv.activated_by,
            'createdAt', mv.created_at
          )
          FROM ai_model_versions mv
          WHERE mv.training_run_id = r.id
          LIMIT 1
        ) AS model_version
      FROM ai_training_runs r
      LEFT JOIN ai_training_run_devices d ON d.training_run_id = r.id
      WHERE r.organization_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC, r.name ASC
    `,
    [actor.organizationId],
  );

  return result.rows.map((row) => {
    const devices = Array.isArray(row.devices)
      ? row.devices.filter((entry) => entry && entry.deviceId).map((entry) => ({ deviceId: entry.deviceId, deviceCode: entry.deviceCode }))
      : [];
    const modelVersion = row.model_version
      ? {
          id: row.model_version.id,
          trainingRunId: row.model_version.trainingRunId,
          modelType: row.model_version.modelType,
          version: row.model_version.version,
          status: row.model_version.status,
          metrics: row.model_version.metrics || {},
          artifactPath: row.model_version.artifactPath || "",
          activatedAt: row.model_version.activatedAt || null,
          activatedBy: row.model_version.activatedBy || null,
          createdAt: row.model_version.createdAt || null,
        }
      : null;
    return shapeRun(row, devices, modelVersion);
  });
}

export async function getTrainingRunById(actor, runId) {
  await ensureAiTrainingSchema();
  return withTransaction(async (client) => {
    const result = await client.query(
      `
        SELECT *
        FROM ai_training_runs
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [runId, actor.organizationId],
    );

    if (result.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El entrenamiento no existe." });
    }

    const devices = await loadDevicesForRun(client, runId);
    const modelVersion = await loadModelVersion(client, runId);
    return shapeRun(result.rows[0], devices, modelVersion);
  });
}

export async function getTrainingSummary(actor) {
  await ensureAiTrainingSchema();
  const summary = await query(
    `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END)::int AS running,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int AS completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::int AS cancelled
      FROM ai_training_runs
      WHERE organization_id = $1
    `,
    [actor.organizationId],
  );

  const lastCompleted = await query(
    `
      SELECT id, name, model_type, finished_at, metrics
      FROM ai_training_runs
      WHERE organization_id = $1
        AND status = 'completed'
      ORDER BY finished_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `,
    [actor.organizationId],
  );

  const activeModel = await query(
    `
      SELECT mv.id, mv.training_run_id, mv.model_type, mv.version, mv.status, mv.metrics, mv.activated_at, r.name AS training_name
      FROM ai_model_versions mv
      JOIN ai_training_runs r ON r.id = mv.training_run_id
      WHERE mv.organization_id = $1
        AND mv.status = 'active'
      ORDER BY mv.activated_at DESC NULLS LAST, mv.created_at DESC
      LIMIT 1
    `,
    [actor.organizationId],
  );

  const readingsAvailable = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM device_readings dr
      WHERE dr.organization_id = $1
        AND ${READY_READINGS_WHERE}
    `,
    [actor.organizationId],
  );

  const lastCompletedRow = lastCompleted.rows[0] || null;
  const activeModelRow = activeModel.rows[0] || null;

  return {
    totals: {
      total: summary.rows[0]?.total || 0,
      running: summary.rows[0]?.running || 0,
      pending: summary.rows[0]?.pending || 0,
      completed: summary.rows[0]?.completed || 0,
      failed: summary.rows[0]?.failed || 0,
      cancelled: summary.rows[0]?.cancelled || 0,
    },
    lastCompletedRun: lastCompletedRow
      ? {
          id: lastCompletedRow.id,
          name: lastCompletedRow.name,
          modelType: lastCompletedRow.model_type,
          finishedAt: lastCompletedRow.finished_at || null,
          metrics: lastCompletedRow.metrics && typeof lastCompletedRow.metrics === "object" ? lastCompletedRow.metrics : {},
        }
      : null,
    activeModel: activeModelRow
      ? {
          id: activeModelRow.id,
          trainingRunId: activeModelRow.training_run_id,
          trainingName: activeModelRow.training_name,
          modelType: activeModelRow.model_type,
          version: activeModelRow.version,
          status: activeModelRow.status,
          metrics: activeModelRow.metrics && typeof activeModelRow.metrics === "object" ? activeModelRow.metrics : {},
          activatedAt: activeModelRow.activated_at || null,
        }
      : null,
    readingsAvailable: readingsAvailable.rows[0]?.total || 0,
  };
}

export async function findReadyDevicesByIds(client, organizationId, deviceIds) {
  if (!Array.isArray(deviceIds) || deviceIds.length === 0) return [];
  const result = await client.query(
    `
      SELECT id, code, name
      FROM iot_devices
      WHERE organization_id = $1
        AND id = ANY($2::uuid[])
    `,
    [organizationId, deviceIds],
  );
  return result.rows;
}

// Una lectura cuenta como "lista" cuando no fue marcada como excluida por el
// admin Y no presenta condiciones de revisión (datos completos y batería sana).
// Si no hay metadatos de training, el valor por defecto es "lista" si los
// datos crudos están completos, replicando la lógica de buildTrainingReadingShape
// del dominio devices.
export const READY_READINGS_WHERE = `
  (
    dr.payload->'training'->>'included' IS NULL
    OR dr.payload->'training'->>'included' = 'true'
  )
  AND (
    dr.payload->'training'->>'status' IS NULL
    OR dr.payload->'training'->>'status' = 'ready'
  )
  AND dr.total_kwh IS NOT NULL
  AND dr.delta_kwh IS NOT NULL
  AND dr.voltage IS NOT NULL
  AND dr.current_amp IS NOT NULL
  AND dr.power_factor IS NOT NULL
  AND (
    COALESCE(dr.payload->>'batteryLevel', dr.payload->>'batteryPercent', dr.payload->>'battery') IS NULL
    OR (COALESCE(dr.payload->>'batteryLevel', dr.payload->>'batteryPercent', dr.payload->>'battery'))::numeric > 15
  )
`;

export async function countReadyReadings(client, organizationId, deviceIds, dateFrom, dateTo) {
  const params = [organizationId, deviceIds];
  let where = `dr.organization_id = $1 AND dr.device_id = ANY($2::uuid[]) AND ${READY_READINGS_WHERE}`;

  if (dateFrom) {
    params.push(dateFrom);
    where += ` AND dr.recorded_at >= $${params.length}::timestamptz`;
  }
  if (dateTo) {
    params.push(dateTo);
    where += ` AND dr.recorded_at < ($${params.length}::date + interval '1 day')`;
  }

  const result = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM device_readings dr
      WHERE ${where}
    `,
    params,
  );
  return result.rows[0]?.total || 0;
}

export async function createTrainingRun(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    await ensureAiTrainingSchema(client);

    const devices = await findReadyDevicesByIds(client, actor.organizationId, payload.deviceIds);
    if (devices.length !== payload.deviceIds.length) {
      throw new AppError({
        statusCode: 422,
        code: "INVALID_DEVICES",
        message: "Algunos dispositivos seleccionados no existen o no pertenecen a la organización.",
        details: { field: "deviceIds" },
      });
    }

    const readingsCount = await countReadyReadings(
      client,
      actor.organizationId,
      payload.deviceIds,
      payload.dateFrom,
      payload.dateTo,
    );

    if (readingsCount === 0) {
      throw new AppError({
        statusCode: 422,
        code: "NO_READY_READINGS",
        message: "No hay lecturas listas e incluidas en el rango y dispositivos seleccionados. Marca lecturas en Preparación IA antes de entrenar.",
      });
    }

    const cappedCount = payload.maxReadings ? Math.min(readingsCount, payload.maxReadings) : readingsCount;

    const inserted = await client.query(
      `
        INSERT INTO ai_training_runs (
          organization_id, name, description, model_type, status,
          date_from, date_to, train_ratio, validation_ratio, max_readings,
          readings_count, devices_count, parameters, created_by
        )
        VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
        RETURNING *
      `,
      [
        actor.organizationId,
        payload.name,
        payload.description || null,
        payload.modelType,
        payload.dateFrom || null,
        payload.dateTo || null,
        payload.trainRatio,
        payload.validationRatio,
        payload.maxReadings || null,
        cappedCount,
        devices.length,
        JSON.stringify(payload.parameters || {}),
        actor.id,
      ],
    );

    const runId = inserted.rows[0].id;

    for (const device of devices) {
      await client.query(
        `
          INSERT INTO ai_training_run_devices (training_run_id, device_id, device_code)
          VALUES ($1,$2,$3)
          ON CONFLICT (training_run_id, device_id) DO NOTHING
        `,
        [runId, device.id, device.code],
      );
    }

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        target: payload.name,
        modelType: payload.modelType,
        status: "pending",
        devicesCount: devices.length,
        readingsCount: cappedCount,
        dateFrom: payload.dateFrom || null,
        dateTo: payload.dateTo || null,
      }),
      eventType: "ai_training.create",
      entityType: "ai_training_run",
      entityId: runId,
    });

    const deviceList = devices.map((device) => ({ deviceId: device.id, deviceCode: device.code }));
    return shapeRun(inserted.rows[0], deviceList, null);
  });
}

export async function transitionStatus(actor, runId, eventType, transition, auditContext) {
  return withTransaction(async (client) => {
    await ensureAiTrainingSchema(client);

    const existing = await client.query(
      `
        SELECT *
        FROM ai_training_runs
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [runId, actor.organizationId],
    );

    if (existing.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El entrenamiento no existe." });
    }

    const current = existing.rows[0];
    if (!transition.allowedFrom.includes(current.status)) {
      throw new AppError({
        statusCode: 409,
        code: "INVALID_TRANSITION",
        message: transition.invalidMessage || "El entrenamiento no permite esta acción en su estado actual.",
        details: { status: current.status },
      });
    }

    const updateFields = ["status = $3"];
    const updateValues = [runId, actor.organizationId, transition.nextStatus];

    if (transition.touchStartedAt === "set") {
      updateValues.push(new Date().toISOString());
      updateFields.push(`started_at = $${updateValues.length}::timestamptz`);
    } else if (transition.touchStartedAt === "clear") {
      updateFields.push("started_at = NULL");
    }

    if (transition.touchFinishedAt === "set") {
      updateValues.push(new Date().toISOString());
      updateFields.push(`finished_at = $${updateValues.length}::timestamptz`);
    } else if (transition.touchFinishedAt === "clear") {
      updateFields.push("finished_at = NULL");
    }

    if (transition.clearError) {
      updateFields.push("error_message = NULL");
    }

    if (transition.errorMessage !== undefined) {
      updateValues.push(transition.errorMessage || null);
      updateFields.push(`error_message = $${updateValues.length}`);
    }

    const updated = await client.query(
      `
        UPDATE ai_training_runs
        SET ${updateFields.join(", ")}
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `,
      updateValues,
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        target: current.name,
        modelType: current.model_type,
        previousStatus: current.status,
        status: transition.nextStatus,
        devicesCount: current.devices_count,
        readingsCount: current.readings_count,
      }),
      eventType,
      entityType: "ai_training_run",
      entityId: runId,
    });

    const devices = await loadDevicesForRun(client, runId);
    const modelVersion = await loadModelVersion(client, runId);
    return shapeRun(updated.rows[0], devices, modelVersion);
  });
}

export async function activateModelForRun(actor, runId, auditContext) {
  return withTransaction(async (client) => {
    await ensureAiTrainingSchema(client);

    const existing = await client.query(
      `
        SELECT *
        FROM ai_training_runs
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [runId, actor.organizationId],
    );

    if (existing.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El entrenamiento no existe." });
    }

    const run = existing.rows[0];
    if (run.status !== "completed") {
      throw new AppError({
        statusCode: 409,
        code: "RUN_NOT_COMPLETED",
        message: "Solo se puede activar el modelo de un entrenamiento completado.",
        details: { status: run.status },
      });
    }

    const versionResult = await client.query(
      `
        SELECT *
        FROM ai_model_versions
        WHERE training_run_id = $1
        LIMIT 1
      `,
      [runId],
    );

    if (versionResult.rowCount < 1) {
      throw new AppError({
        statusCode: 409,
        code: "MODEL_VERSION_MISSING",
        message: "El entrenamiento aún no tiene una versión de modelo registrada.",
      });
    }

    await client.query(
      `
        UPDATE ai_model_versions
        SET status = 'inactive'
        WHERE organization_id = $1
          AND model_type = $2
          AND status = 'active'
      `,
      [actor.organizationId, run.model_type],
    );

    const activated = await client.query(
      `
        UPDATE ai_model_versions
        SET status = 'active', activated_at = now(), activated_by = $3
        WHERE id = $1
          AND organization_id = $2
        RETURNING *
      `,
      [versionResult.rows[0].id, actor.organizationId, actor.id],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        target: run.name,
        modelType: run.model_type,
        status: "active",
        version: activated.rows[0].version,
        devicesCount: run.devices_count,
        readingsCount: run.readings_count,
      }),
      eventType: "ai_training.activate",
      entityType: "ai_training_run",
      entityId: runId,
    });

    const devices = await loadDevicesForRun(client, runId);
    return shapeRun(run, devices, shapeModelVersion(activated.rows[0]));
  });
}

export async function deleteTrainingRun(actor, runId, auditContext) {
  return withTransaction(async (client) => {
    await ensureAiTrainingSchema(client);

    const existing = await client.query(
      `
        SELECT *
        FROM ai_training_runs
        WHERE id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [runId, actor.organizationId],
    );

    if (existing.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El entrenamiento no existe." });
    }

    const run = existing.rows[0];
    if (run.status === "running") {
      throw new AppError({
        statusCode: 409,
        code: "RUN_IS_RUNNING",
        message: "No es posible eliminar un entrenamiento en ejecución. Cancélalo primero.",
      });
    }

    const activeVersion = await client.query(
      `
        SELECT id
        FROM ai_model_versions
        WHERE training_run_id = $1
          AND status = 'active'
        LIMIT 1
      `,
      [runId],
    );

    if (activeVersion.rowCount > 0) {
      throw new AppError({
        statusCode: 409,
        code: "MODEL_ACTIVE",
        message: "No es posible eliminar un entrenamiento cuyo modelo está activo. Desactívalo antes.",
      });
    }

    await client.query(`DELETE FROM ai_training_runs WHERE id = $1 AND organization_id = $2`, [runId, actor.organizationId]);

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        target: run.name,
        modelType: run.model_type,
        status: run.status,
        devicesCount: run.devices_count,
        readingsCount: run.readings_count,
      }),
      eventType: "ai_training.delete",
      entityType: "ai_training_run",
      entityId: runId,
    });

    return { ok: true, id: runId };
  });
}

export async function deactivateModelForRun(actor, runId, auditContext) {
  return withTransaction(async (client) => {
    await ensureAiTrainingSchema(client);

    const versionResult = await client.query(
      `
        SELECT mv.*, r.name AS run_name, r.devices_count, r.readings_count
        FROM ai_model_versions mv
        JOIN ai_training_runs r ON r.id = mv.training_run_id
        WHERE mv.training_run_id = $1
          AND mv.organization_id = $2
        LIMIT 1
      `,
      [runId, actor.organizationId],
    );

    if (versionResult.rowCount < 1) {
      throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "El modelo asociado no existe." });
    }

    const version = versionResult.rows[0];
    if (version.status !== "active") {
      throw new AppError({
        statusCode: 409,
        code: "MODEL_NOT_ACTIVE",
        message: "El modelo no se encuentra activo.",
      });
    }

    const updated = await client.query(
      `
        UPDATE ai_model_versions
        SET status = 'inactive', activated_at = NULL, activated_by = NULL
        WHERE id = $1
        RETURNING *
      `,
      [version.id],
    );

    await insertAuditEvent(client, {
      ...buildAuditPayload(actor, auditContext, {
        target: version.run_name,
        modelType: version.model_type,
        status: "inactive",
        version: version.version,
        devicesCount: version.devices_count,
        readingsCount: version.readings_count,
      }),
      eventType: "ai_training.deactivate",
      entityType: "ai_training_run",
      entityId: runId,
    });

    const runResult = await client.query(
      `SELECT * FROM ai_training_runs WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [runId, actor.organizationId],
    );
    const devices = await loadDevicesForRun(client, runId);
    return shapeRun(runResult.rows[0], devices, shapeModelVersion(updated.rows[0]));
  });
}
