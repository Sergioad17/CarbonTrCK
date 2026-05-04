import { AppError } from "../../shared/errors/app-error.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { hashDeviceCredential } from "../../shared/utils/device-credentials.js";
import { insertAuditEvent } from "../audit/audit.repository.js";

const DEFAULT_BACKEND_URL = "https://api.example.edu";
const DEFAULT_ENDPOINT_PATH = "/iot/readings";
const DEFAULT_WIFI_PROFILE = "Campus-IoT";
const DEFAULT_METRIC = "electricity_consumption";
const DEFAULT_UNIT = "kWh";

function cleanString(value) {
  return String(value ?? "").trim();
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

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function buildDeviceMetadata(payload = {}) {
  return {
    protocol: cleanString(payload.protocol || "https").toLowerCase(),
    streamMode: cleanString(payload.streamMode || "scheduled").toLowerCase(),
    metric: cleanString(payload.metric || DEFAULT_METRIC),
    unit: cleanString(payload.unit || DEFAULT_UNIT),
    backendUrl: cleanString(payload.backendUrl || DEFAULT_BACKEND_URL),
    endpointPath: cleanString(payload.endpointPath || DEFAULT_ENDPOINT_PATH),
    wifiProfile: cleanString(payload.wifiProfile || DEFAULT_WIFI_PROFILE),
    notes: cleanString(payload.notes || ""),
    tlsRequired: parseBoolean(payload.tlsRequired, true),
    verifyServerCert: parseBoolean(payload.verifyServerCert, true),
    offlineBuffer: parseBoolean(payload.offlineBuffer, true),
    firmwareVersion: cleanString(payload.firmwareVersion || ""),
  };
}

function buildDeviceShape(row, credential = "") {
  const metadata = row.metadata || {};
  return {
    id: row.id,
    name: cleanString(row.name),
    code: cleanString(row.code),
    campusCode: cleanString(row.campus_code),
    areaCode: cleanString(row.area_code),
    protocol: cleanString(metadata.protocol || "https"),
    streamMode: cleanString(metadata.streamMode || "scheduled"),
    intervalSeconds: String(row.interval_seconds || 60),
    metric: cleanString(metadata.metric || DEFAULT_METRIC),
    unit: cleanString(metadata.unit || DEFAULT_UNIT),
    backendUrl: cleanString(metadata.backendUrl || DEFAULT_BACKEND_URL),
    endpointPath: cleanString(metadata.endpointPath || DEFAULT_ENDPOINT_PATH),
    wifiProfile: cleanString(metadata.wifiProfile || DEFAULT_WIFI_PROFILE),
    deviceType: cleanString(row.device_type || "ESP32"),
    notes: cleanString(metadata.notes || ""),
    token: credential,
    tlsRequired: parseBoolean(metadata.tlsRequired, true),
    verifyServerCert: parseBoolean(metadata.verifyServerCert, true),
    offlineBuffer: parseBoolean(metadata.offlineBuffer, true),
    enabled: Boolean(row.is_active),
    status: cleanString(row.status || "provisioning"),
    lastSeenAt: row.last_seen_at || null,
    firmwareVersion: cleanString(row.firmware_version || metadata.firmwareVersion || ""),
    readingsToday: Number.parseInt(row.readings_today || 0, 10) || 0,
  };
}

function buildDeviceListQuery() {
  return `
    SELECT
      d.id,
      d.name,
      d.code,
      d.device_type,
      d.is_active,
      d.metadata,
      c.code AS campus_code,
      a.code AS area_code,
      b.interval_seconds,
      latest.recorded_at AS last_seen_at,
      COALESCE(latest.payload->>'firmwareVersion', d.metadata->>'firmwareVersion', '') AS firmware_version,
      COALESCE(today.readings_today, 0) AS readings_today,
      CASE
        WHEN d.is_active = false THEN 'offline'
        WHEN latest.recorded_at IS NULL THEN 'provisioning'
        WHEN latest.recorded_at >= now() - make_interval(secs => GREATEST(COALESCE(b.interval_seconds, 300) * 2, 300)) THEN 'online'
        ELSE 'offline'
      END AS status
    FROM iot_devices d
    LEFT JOIN device_bindings b
      ON b.device_id = d.id
     AND b.organization_id = d.organization_id
    LEFT JOIN campuses c
      ON c.id = b.campus_id
     AND c.organization_id = d.organization_id
    LEFT JOIN areas a
      ON a.id = b.area_id
     AND a.campus_id = b.campus_id
    LEFT JOIN LATERAL (
      SELECT recorded_at, payload
      FROM device_readings dr
      WHERE dr.device_id = d.id
      ORDER BY dr.recorded_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS readings_today
      FROM device_readings dr
      WHERE dr.device_id = d.id
        AND dr.recorded_at >= date_trunc('day', now())
    ) today ON true
  `;
}

async function getCampusAreaByCodes(client, organizationId, campusCode, areaCode) {
  const result = await client.query(
    `
      SELECT
        c.id AS campus_id,
        c.code AS campus_code,
        a.id AS area_id,
        a.code AS area_code
      FROM campuses c
      JOIN areas a ON a.campus_id = c.id
      WHERE c.organization_id = $1
        AND c.code = $2
        AND a.code = $3
      LIMIT 1
    `,
    [organizationId, campusCode, areaCode],
  );

  return result.rows[0] || null;
}

async function getStoredDevice(client, organizationId, deviceId) {
  const result = await client.query(
    `
      ${buildDeviceListQuery()}
      WHERE d.organization_id = $1
        AND d.id = $2
      LIMIT 1
    `,
    [organizationId, deviceId],
  );

  return result.rows[0] || null;
}

async function getDeviceRowForDuplicate(client, organizationId, deviceId) {
  const result = await client.query(
    `
      SELECT
        d.id,
        d.code,
        d.name,
        d.device_type,
        d.is_active,
        d.metadata,
        b.campus_id,
        b.area_id,
        b.voltage,
        b.power_factor,
        b.interval_seconds
      FROM iot_devices d
      LEFT JOIN device_bindings b
        ON b.device_id = d.id
       AND b.organization_id = d.organization_id
      WHERE d.organization_id = $1
        AND d.id = $2
      LIMIT 1
    `,
    [organizationId, deviceId],
  );

  return result.rows[0] || null;
}

async function buildDuplicateCode(client, organizationId, baseCode) {
  const normalizedBase = cleanString(baseCode).slice(0, 84) || "DEVICE";
  const pattern = `${normalizedBase}-COPY%`;
  const result = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM iot_devices
      WHERE organization_id = $1
        AND code LIKE $2
    `,
    [organizationId, pattern],
  );

  const sequence = (result.rows[0]?.total || 0) + 1;
  return `${normalizedBase}-COPY-${sequence}`;
}

function buildAuditPayload(actor, auditContext, details = {}) {
  return {
    organizationId: actor.organizationId,
    userId: actor.id,
    ipAddress: auditContext.ipAddress,
    userAgent: auditContext.userAgent,
    details,
  };
}

function mapPostgresConstraintError(error) {
  if (!error || error.code !== "23505") return null;

  if (error.constraint === "iot_devices_code_uq") {
    return new AppError({
      statusCode: 409,
      code: "DEVICE_CODE_ALREADY_EXISTS",
      message: "A device with this code already exists.",
    });
  }

  if (error.constraint === "idx_iot_devices_credential_hash_uq") {
    return new AppError({
      statusCode: 409,
      code: "DEVICE_CREDENTIAL_CONFLICT",
      message: "The generated device credential conflicted. Please try again.",
    });
  }

  if (error.constraint === "idx_device_readings_device_recorded_at_uq") {
    return new AppError({
      statusCode: 409,
      code: "DUPLICATE_DEVICE_READING",
      message: "A reading for this device and timestamp already exists.",
    });
  }

  return null;
}

export async function listDevices(actor) {
  const result = await query(
    `
      ${buildDeviceListQuery()}
      WHERE d.organization_id = $1
      ORDER BY d.created_at DESC, d.code ASC
    `,
    [actor.organizationId],
  );

  return result.rows.map((row) => buildDeviceShape(row));
}

export async function createDevice(actor, payload, auditContext) {
  return withTransaction(async (client) => {
    const binding = await getCampusAreaByCodes(client, actor.organizationId, payload.campusCode, payload.areaCode);

    if (!binding) {
      throw new AppError({
        statusCode: 422,
        code: "INVALID_BINDING",
        message: "campusCode and areaCode must reference an existing area inside the organization.",
      });
    }

    const credential = payload.credential;
    const metadata = buildDeviceMetadata(payload);

    let created;
    try {
      created = await client.query(
        `
        INSERT INTO iot_devices (
          organization_id,
          campus_id,
          code,
          name,
          device_type,
          is_active,
          metadata,
          credential_hash,
          credential_issued_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
        RETURNING id
      `,
        [
          actor.organizationId,
          binding.campus_id,
          payload.code,
          payload.name,
          payload.deviceType,
          payload.enabled,
          JSON.stringify(metadata),
          hashDeviceCredential(credential),
          new Date().toISOString(),
        ],
      );
    } catch (error) {
      throw mapPostgresConstraintError(error) || error;
    }

    const deviceId = created.rows[0].id;

    await client.query(
      `
        INSERT INTO device_bindings (
          organization_id,
          device_id,
          campus_id,
          area_id,
          voltage,
          power_factor,
          interval_seconds,
          updated_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        actor.organizationId,
        deviceId,
        binding.campus_id,
        binding.area_id,
        payload.voltage,
        payload.powerFactor,
        payload.intervalSeconds,
        actor.id,
      ],
    );

    await insertAuditEvent(
      client,
      {
        ...buildAuditPayload(actor, auditContext, {
          code: payload.code,
          campusCode: payload.campusCode,
          areaCode: payload.areaCode,
          protocol: payload.protocol,
        }),
        eventType: "devices.create",
        entityType: "device",
        entityId: deviceId,
      },
    );

    const stored = await getStoredDevice(client, actor.organizationId, deviceId);
    return buildDeviceShape(stored, credential);
  });
}

export async function updateDevice(actor, deviceId, payload, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getStoredDevice(client, actor.organizationId, deviceId);
    if (!existing) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Device not found.",
      });
    }

    const binding = await getCampusAreaByCodes(client, actor.organizationId, payload.campusCode, payload.areaCode);

    if (!binding) {
      throw new AppError({
        statusCode: 422,
        code: "INVALID_BINDING",
        message: "campusCode and areaCode must reference an existing area inside the organization.",
      });
    }

    const metadata = buildDeviceMetadata(payload);

    try {
      await client.query(
        `
        UPDATE iot_devices
        SET
          campus_id = $1,
          code = $2,
          name = $3,
          device_type = $4,
          is_active = $5,
          metadata = $6::jsonb
        WHERE id = $7
          AND organization_id = $8
      `,
        [
          binding.campus_id,
          payload.code,
          payload.name,
          payload.deviceType,
          payload.enabled,
          JSON.stringify(metadata),
          deviceId,
          actor.organizationId,
        ],
      );
    } catch (error) {
      throw mapPostgresConstraintError(error) || error;
    }

    await client.query(
      `
        UPDATE device_bindings
        SET
          campus_id = $1,
          area_id = $2,
          voltage = $3,
          power_factor = $4,
          interval_seconds = $5,
          updated_by = $6
        WHERE device_id = $7
          AND organization_id = $8
      `,
      [
        binding.campus_id,
        binding.area_id,
        payload.voltage,
        payload.powerFactor,
        payload.intervalSeconds,
        actor.id,
        deviceId,
        actor.organizationId,
      ],
    );

    const stored = await getStoredDevice(client, actor.organizationId, deviceId);
    const before = buildDeviceShape(existing);
    const after = buildDeviceShape(stored);
    await insertAuditEvent(
      client,
      {
        ...buildAuditPayload(actor, auditContext, {
          target: after.code || after.name,
          code: payload.code,
          campusCode: payload.campusCode,
          areaCode: payload.areaCode,
          enabled: payload.enabled,
          before,
          after,
          changes: changedFields(before, after),
        }),
        eventType: "devices.update",
        entityType: "device",
        entityId: deviceId,
      },
    );

    return buildDeviceShape(stored);
  });
}

export async function updateDeviceStatus(actor, deviceId, enabled, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getStoredDevice(client, actor.organizationId, deviceId);
    if (!existing) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Device not found.",
      });
    }

    const result = await client.query(
      `
        UPDATE iot_devices
        SET is_active = $1
        WHERE id = $2
          AND organization_id = $3
        RETURNING id
      `,
      [enabled, deviceId, actor.organizationId],
    );

    if (result.rowCount < 1) throw new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Device not found." });

    const stored = await getStoredDevice(client, actor.organizationId, deviceId);
    const before = buildDeviceShape(existing);
    const after = buildDeviceShape(stored);
    await insertAuditEvent(
      client,
      {
        ...buildAuditPayload(actor, auditContext, {
          target: after.code || after.name,
          enabled,
          before: { enabled: before.enabled },
          after: { enabled: after.enabled },
          changes: { enabled: { before: before.enabled, after: after.enabled } },
        }),
        eventType: "devices.status_change",
        entityType: "device",
        entityId: deviceId,
      },
    );

    return buildDeviceShape(stored);
  });
}

export async function duplicateDevice(actor, deviceId, payload, auditContext) {
  return withTransaction(async (client) => {
    const source = await getDeviceRowForDuplicate(client, actor.organizationId, deviceId);

    if (!source) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Device not found.",
      });
    }

    const nextCode = await buildDuplicateCode(client, actor.organizationId, source.code);
    const nextName = `${cleanString(source.name) || source.code} copia`;
    const credential = payload.credential;
    const metadata = {
      ...(source.metadata || {}),
      firmwareVersion: "",
    };

    let created;
    try {
      created = await client.query(
        `
        INSERT INTO iot_devices (
          organization_id,
          campus_id,
          code,
          name,
          device_type,
          is_active,
          metadata,
          credential_hash,
          credential_issued_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
        RETURNING id
      `,
        [
          actor.organizationId,
          source.campus_id,
          nextCode,
          nextName,
          source.device_type,
          Boolean(source.is_active),
          JSON.stringify(metadata),
          hashDeviceCredential(credential),
          new Date().toISOString(),
        ],
      );
    } catch (error) {
      throw mapPostgresConstraintError(error) || error;
    }

    const duplicateId = created.rows[0].id;

    if (source.campus_id && source.area_id) {
      await client.query(
        `
          INSERT INTO device_bindings (
            organization_id,
            device_id,
            campus_id,
            area_id,
            voltage,
            power_factor,
            interval_seconds,
            updated_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          actor.organizationId,
          duplicateId,
          source.campus_id,
          source.area_id,
          source.voltage,
          source.power_factor,
          source.interval_seconds,
          actor.id,
        ],
      );
    }

    await insertAuditEvent(
      client,
      {
        ...buildAuditPayload(actor, auditContext, {
          sourceDeviceId: deviceId,
          sourceCode: source.code,
          code: nextCode,
        }),
        eventType: "devices.duplicate",
        entityType: "device",
        entityId: duplicateId,
      },
    );

    const stored = await getStoredDevice(client, actor.organizationId, duplicateId);
    return buildDeviceShape(stored, credential);
  });
}

export async function removeDevice(actor, deviceId, auditContext) {
  return withTransaction(async (client) => {
    const existing = await getStoredDevice(client, actor.organizationId, deviceId);

    if (!existing) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Device not found.",
      });
    }

    await client.query(
      `
        DELETE FROM iot_devices
        WHERE id = $1
          AND organization_id = $2
      `,
      [deviceId, actor.organizationId],
    );

    await insertAuditEvent(
      client,
      {
        ...buildAuditPayload(actor, auditContext, {
          code: existing.code,
          name: existing.name,
        }),
        eventType: "devices.remove",
        entityType: "device",
        entityId: deviceId,
      },
    );

    return { ok: true };
  });
}

export async function getDeviceAuthContext(credential) {
  const credentialHash = hashDeviceCredential(credential);
  const result = await query(
    `
      SELECT
        d.id,
        d.organization_id,
        d.code,
        d.name,
        d.device_type,
        d.is_active,
        d.metadata,
        b.campus_id,
        b.area_id,
        c.code AS campus_code,
        a.code AS area_code,
        b.interval_seconds,
        b.voltage,
        b.power_factor
      FROM iot_devices d
      LEFT JOIN device_bindings b
        ON b.device_id = d.id
       AND b.organization_id = d.organization_id
      LEFT JOIN campuses c
        ON c.id = b.campus_id
       AND c.organization_id = d.organization_id
      LEFT JOIN areas a
        ON a.id = b.area_id
       AND a.campus_id = b.campus_id
      WHERE d.credential_hash = $1
      LIMIT 1
    `,
    [credentialHash],
  );

  return result.rows[0] || null;
}

export async function createDeviceReading(device, reading, auditContext) {
  return withTransaction(async (client) => {
    let inserted;
    try {
      inserted = await client.query(
        `
        INSERT INTO device_readings (
          organization_id,
          device_id,
          recorded_at,
          schema_version,
          total_kwh,
          delta_kwh,
          voltage,
          current_amp,
          power_factor,
          interval_seconds,
          payload
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
        RETURNING id, recorded_at
      `,
        [
          device.organization_id,
          device.id,
          reading.recordedAt,
          reading.schemaVersion,
          reading.totalKwh,
          reading.deltaKwh,
          reading.voltage,
          reading.currentAmp,
          reading.powerFactor,
          reading.intervalSeconds,
          JSON.stringify(reading.payload || {}),
        ],
      );
    } catch (error) {
      throw mapPostgresConstraintError(error) || error;
    }

    if (reading.totalKwh !== null) {
      await client.query(
        `
          INSERT INTO device_last_totals (
            organization_id,
            device_id,
            last_total_kwh,
            last_timestamp
          )
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (device_id)
          DO UPDATE
          SET
            last_total_kwh = EXCLUDED.last_total_kwh,
            last_timestamp = EXCLUDED.last_timestamp,
            updated_at = now()
        `,
        [
          device.organization_id,
          device.id,
          reading.totalKwh,
          reading.recordedAt,
        ],
      );
    }

    const firmwareVersion = cleanString(reading.payload?.firmwareVersion || "");
    if (firmwareVersion) {
      await client.query(
        `
          UPDATE iot_devices
          SET metadata = jsonb_set(metadata, '{firmwareVersion}', to_jsonb($1::text), true)
          WHERE id = $2
            AND organization_id = $3
        `,
        [firmwareVersion, device.id, device.organization_id],
      );
    }

    await insertAuditEvent(
      client,
      {
        organizationId: device.organization_id,
        userId: null,
        eventType: "iot.readings.ingest",
        entityType: "device",
        entityId: device.id,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: {
          deviceCode: device.code,
          recordedAt: reading.recordedAt,
          schemaVersion: reading.schemaVersion,
          intervalSeconds: reading.intervalSeconds,
        },
      },
    );

    return {
      ok: true,
      deviceCode: device.code,
      receivedAt: inserted.rows[0].recorded_at,
      readingId: inserted.rows[0].id,
    };
  });
}
