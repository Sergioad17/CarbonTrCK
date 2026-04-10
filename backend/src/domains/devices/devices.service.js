import { AppError } from "../../shared/errors/app-error.js";
import { generateDeviceCredential } from "../../shared/utils/device-credentials.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import {
  createDevice,
  createDeviceReading,
  duplicateDevice,
  listDevices,
  removeDevice,
  updateDevice,
  updateDeviceStatus,
} from "./devices.repository.js";

const ALLOWED_PROTOCOLS = new Set(["https", "mqtt"]);
const ALLOWED_STREAM_MODES = new Set(["scheduled", "realtime"]);
const ALLOWED_DEVICE_TYPES = new Set(["ESP32", "ESP8266", "EDGE_GATEWAY", "CUSTOM"]);

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parsePositiveNumber(value, field, { allowZero = false, fallback = null, max = null } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || (!allowZero && parsed <= 0) || (allowZero && parsed < 0) || (max !== null && parsed > max)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid number.`,
      details: { field },
    });
  }

  return parsed;
}

function parsePositiveInteger(value, field, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid positive integer.`,
      details: { field },
    });
  }

  return parsed;
}

function normalizeUrlByProtocol(url, protocol) {
  const normalized = cleanString(url);
  if (!normalized) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "backendUrl is required.",
      details: { field: "backendUrl" },
    });
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "backendUrl must be an absolute URL.",
      details: { field: "backendUrl" },
    });
  }

  const expectedProtocol = protocol === "mqtt" ? "mqtts:" : "https:";
  if (parsed.protocol !== expectedProtocol) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: `backendUrl must use ${expectedProtocol.replace(":", "").toUpperCase()}.`,
      details: { field: "backendUrl" },
    });
  }

  return parsed.toString().replace(/\/$/, "");
}

function normalizeEndpointPath(value, protocol) {
  const normalized = cleanString(value || (protocol === "mqtt" ? "/telemetry/carbontrack/device" : "/iot/readings"));
  if (!normalized) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "endpointPath is required.",
      details: { field: "endpointPath" },
    });
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeProtocol(value) {
  const protocol = cleanString(value || "https").toLowerCase();
  if (!ALLOWED_PROTOCOLS.has(protocol)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "protocol must be https or mqtt.",
      details: { field: "protocol" },
    });
  }

  return protocol;
}

function normalizeStreamMode(value) {
  const streamMode = cleanString(value || "scheduled").toLowerCase();
  if (!ALLOWED_STREAM_MODES.has(streamMode)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "streamMode must be scheduled or realtime.",
      details: { field: "streamMode" },
    });
  }

  return streamMode;
}

function normalizeDeviceType(value) {
  const deviceType = cleanString(value || "ESP32").toUpperCase();
  return ALLOWED_DEVICE_TYPES.has(deviceType) ? deviceType : "CUSTOM";
}

function normalizeDevicePayload(payload, { partial = false } = {}) {
  const protocol = normalizeProtocol(payload.protocol);
  const streamMode = normalizeStreamMode(payload.streamMode);

  if (!partial) {
    assertRequiredString(payload.name, "name");
    assertRequiredString(payload.code, "code");
    assertRequiredString(payload.campusCode, "campusCode");
    assertRequiredString(payload.areaCode, "areaCode");
  }

  return {
    name: cleanString(payload.name),
    code: cleanString(payload.code).toUpperCase(),
    campusCode: cleanString(payload.campusCode).toUpperCase(),
    areaCode: cleanString(payload.areaCode).toUpperCase(),
    protocol,
    streamMode,
    intervalSeconds: parsePositiveInteger(payload.intervalSeconds, "intervalSeconds", 60),
    metric: cleanString(payload.metric || "electricity_consumption"),
    unit: cleanString(payload.unit || "kWh"),
    backendUrl: normalizeUrlByProtocol(payload.backendUrl, protocol),
    endpointPath: normalizeEndpointPath(payload.endpointPath, protocol),
    wifiProfile: cleanString(payload.wifiProfile || "Campus-IoT"),
    deviceType: normalizeDeviceType(payload.deviceType),
    notes: cleanString(payload.notes || ""),
    tlsRequired: parseBoolean(payload.tlsRequired, true),
    verifyServerCert: parseBoolean(payload.verifyServerCert, true),
    offlineBuffer: parseBoolean(payload.offlineBuffer, true),
    enabled: parseBoolean(payload.enabled, true),
    voltage: parsePositiveNumber(payload.voltage, "voltage", { fallback: 127 }),
    powerFactor: parsePositiveNumber(payload.powerFactor, "powerFactor", { fallback: 0.9, max: 1 }),
  };
}

function normalizeReadingPayload(payload) {
  assertRequiredString(payload.deviceCode, "deviceCode");
  assertRequiredString(payload.recordedAt, "recordedAt");

  const recordedAt = new Date(payload.recordedAt);
  if (Number.isNaN(recordedAt.getTime())) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "recordedAt must be a valid ISO date.",
      details: { field: "recordedAt" },
    });
  }

  return {
    deviceCode: cleanString(payload.deviceCode).toUpperCase(),
    recordedAt: recordedAt.toISOString(),
    schemaVersion: cleanString(payload.schemaVersion || "1.0"),
    totalKwh: parsePositiveNumber(payload.totalKwh, "totalKwh", { allowZero: true }),
    deltaKwh: parsePositiveNumber(payload.deltaKwh, "deltaKwh", { allowZero: true }),
    voltage: parsePositiveNumber(payload.voltage, "voltage"),
    currentAmp: parsePositiveNumber(payload.currentAmp, "currentAmp", { allowZero: true }),
    powerFactor: parsePositiveNumber(payload.powerFactor, "powerFactor", { max: 1 }),
    intervalSeconds: parsePositiveInteger(payload.intervalSeconds, "intervalSeconds"),
    payload: typeof payload.payload === "object" && payload.payload !== null ? payload.payload : {},
  };
}

export async function listDevicesService(actor) {
  return listDevices(actor);
}

export async function createDeviceService(actor, payload, auditContext) {
  const normalized = normalizeDevicePayload(payload);
  return createDevice(
    actor,
    {
      ...normalized,
      credential: generateDeviceCredential(),
    },
    auditContext,
  );
}

export async function updateDeviceService(actor, deviceId, payload, auditContext) {
  const normalized = normalizeDevicePayload(payload, { partial: true });
  return updateDevice(actor, deviceId, normalized, auditContext);
}

export async function updateDeviceStatusService(actor, deviceId, payload, auditContext) {
  if (typeof payload.enabled !== "boolean") {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "enabled must be provided as a boolean.",
      details: { field: "enabled" },
    });
  }

  return updateDeviceStatus(actor, deviceId, payload.enabled, auditContext);
}

export async function duplicateDeviceService(actor, deviceId, auditContext) {
  return duplicateDevice(
    actor,
    deviceId,
    {
      credential: generateDeviceCredential(),
    },
    auditContext,
  );
}

export async function removeDeviceService(actor, deviceId, auditContext) {
  return removeDevice(actor, deviceId, auditContext);
}

export async function createDeviceReadingService(device, payload, auditContext) {
  const normalized = normalizeReadingPayload(payload);

  if (normalized.deviceCode !== cleanString(device.code).toUpperCase()) {
    throw new AppError({
      statusCode: 403,
      code: "DEVICE_MISMATCH",
      message: "deviceCode does not match the authenticated device.",
    });
  }

  if (!device.campus_code || !device.area_code) {
    throw new AppError({
      statusCode: 409,
      code: "DEVICE_NOT_BOUND",
      message: "The authenticated device is not yet bound to a campus and area.",
    });
  }

  return createDeviceReading(device, normalized, auditContext);
}
