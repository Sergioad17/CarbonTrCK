import { apiRequest } from "./httpClient";
import { API_URL, assertBackendConfigured } from "./config";
import { fetchSession } from "./session";

export const DEVICE_API_CONTRACT = {
  list: "/devices",
  create: "/devices",
  update: (id) => `/devices/${id}`,
  status: (id) => `/devices/${id}/status`,
  duplicate: (id) => `/devices/${id}/duplicate`,
  readings: (id) => `/devices/${id}/readings`,
  trainingReadings: (id) => `/devices/${id}/readings/training`,
  updateReadingTraining: (id, readingId) => `/devices/${id}/readings/${readingId}/training`,
  removeReading: (id, readingId) => `/devices/${id}/readings/${readingId}`,
  remove: (id) => `/devices/${id}`,
};

const DEFAULT_FORM = {
  id: "",
  name: "",
  code: "",
  campusCode: "CAMPUS-CT",
  areaCode: "LAB",
  protocol: "https",
  streamMode: "scheduled",
  intervalSeconds: "60",
  metric: "electricity_consumption",
  unit: "kWh",
  backendUrl: API_URL || "",
  endpointPath: "/iot/readings",
  wifiProfile: "Campus-IoT",
  deviceType: "ESP32",
  notes: "",
  token: "",
  tlsRequired: true,
  verifyServerCert: true,
  offlineBuffer: true,
  enabled: true,
  voltage: "127",
  powerFactor: "0.9",
  batteryLevel: null,
  batteryVoltage: null,
  batteryStatus: "unknown",
};

function normalizeBackendUrlForProtocol(value, protocol) {
  const raw = String(value || API_URL || "").trim();
  if (!raw) return "";

  const expectedProtocol = protocol === "mqtt" ? "mqtts:" : "https:";

  try {
    const parsed = new URL(raw);
    parsed.protocol = expectedProtocol;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function normalizeEndpointPathForProtocol(value, protocol) {
  const fallback = protocol === "mqtt" ? "/telemetry/carbontrack/device" : "/iot/readings";
  const normalized = String(value || fallback).trim();
  if (!normalized) return fallback;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeDevicePayloadForRequest(payload = {}) {
  const protocol = String(payload.protocol || DEFAULT_FORM.protocol).trim().toLowerCase() || DEFAULT_FORM.protocol;
  return {
    ...payload,
    protocol,
    code: String(payload.code || "").trim().toUpperCase(),
    campusCode: String(payload.campusCode || DEFAULT_FORM.campusCode).trim().toUpperCase(),
    areaCode: String(payload.areaCode || DEFAULT_FORM.areaCode).trim().toUpperCase(),
    backendUrl: normalizeBackendUrlForProtocol(payload.backendUrl, protocol),
    endpointPath: normalizeEndpointPathForProtocol(payload.endpointPath, protocol),
  };
}

function authHeaders() {
  const session = fetchSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function normalizeDevice(input = {}) {
  return {
    ...DEFAULT_FORM,
    ...input,
    id: String(input.id || ""),
    name: String(input.name || "").trim(),
    code: String(input.code || "").trim().toUpperCase(),
    campusCode: String(input.campusCode || DEFAULT_FORM.campusCode),
    areaCode: String(input.areaCode || DEFAULT_FORM.areaCode),
    protocol: String(input.protocol || DEFAULT_FORM.protocol),
    streamMode: String(input.streamMode || DEFAULT_FORM.streamMode),
    intervalSeconds: String(input.intervalSeconds || DEFAULT_FORM.intervalSeconds),
    metric: String(input.metric || DEFAULT_FORM.metric),
    unit: String(input.unit || DEFAULT_FORM.unit),
    backendUrl: String(input.backendUrl || DEFAULT_FORM.backendUrl),
    endpointPath: String(input.endpointPath || DEFAULT_FORM.endpointPath),
    wifiProfile: String(input.wifiProfile || DEFAULT_FORM.wifiProfile),
    deviceType: String(input.deviceType || DEFAULT_FORM.deviceType),
    notes: String(input.notes || ""),
    token: String(input.token || ""),
    tlsRequired: typeof input.tlsRequired === "boolean" ? input.tlsRequired : DEFAULT_FORM.tlsRequired,
    verifyServerCert: typeof input.verifyServerCert === "boolean" ? input.verifyServerCert : DEFAULT_FORM.verifyServerCert,
    offlineBuffer: typeof input.offlineBuffer === "boolean" ? input.offlineBuffer : DEFAULT_FORM.offlineBuffer,
    enabled: typeof input.enabled === "boolean" ? input.enabled : true,
    voltage: input.voltage !== undefined && input.voltage !== null ? String(input.voltage) : DEFAULT_FORM.voltage,
    powerFactor: input.powerFactor !== undefined && input.powerFactor !== null ? String(input.powerFactor) : DEFAULT_FORM.powerFactor,
    status: String(input.status || "provisioning"),
    lastSeenAt: input.lastSeenAt || null,
    firmwareVersion: String(input.firmwareVersion || ""),
    readingsToday: Number.isFinite(Number(input.readingsToday)) ? Number(input.readingsToday) : 0,
    batteryLevel: Number.isFinite(Number(input.batteryLevel)) ? Number(input.batteryLevel) : null,
    batteryVoltage: Number.isFinite(Number(input.batteryVoltage)) ? Number(input.batteryVoltage) : null,
    batteryStatus: String(input.batteryStatus || "unknown"),
  };
}

function normalizeDeviceList(payload) {
  const rawItems = payload?.devices || payload?.items || payload?.data?.devices || payload?.data?.items || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeDevice) : [];
}

function normalizeReading(input = {}) {
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  return {
    id: String(input.id || ""),
    deviceId: String(input.deviceId || input.device_id || ""),
    deviceCode: String(input.deviceCode || input.device_code || ""),
    deviceName: String(input.deviceName || input.device_name || ""),
    recordedAt: input.recordedAt || input.recorded_at || null,
    schemaVersion: String(input.schemaVersion || input.schema_version || ""),
    totalKwh: Number.isFinite(Number(input.totalKwh ?? input.total_kwh)) ? Number(input.totalKwh ?? input.total_kwh) : null,
    deltaKwh: Number.isFinite(Number(input.deltaKwh ?? input.delta_kwh)) ? Number(input.deltaKwh ?? input.delta_kwh) : null,
    voltage: Number.isFinite(Number(input.voltage)) ? Number(input.voltage) : null,
    currentAmp: Number.isFinite(Number(input.currentAmp ?? input.current_amp)) ? Number(input.currentAmp ?? input.current_amp) : null,
    powerFactor: Number.isFinite(Number(input.powerFactor ?? input.power_factor)) ? Number(input.powerFactor ?? input.power_factor) : null,
    intervalSeconds: Number.isFinite(Number(input.intervalSeconds ?? input.interval_seconds)) ? Number(input.intervalSeconds ?? input.interval_seconds) : null,
    batteryLevel: Number.isFinite(Number(input.batteryLevel ?? payload.batteryLevel)) ? Number(input.batteryLevel ?? payload.batteryLevel) : null,
    batteryVoltage: Number.isFinite(Number(input.batteryVoltage ?? payload.batteryVoltage)) ? Number(input.batteryVoltage ?? payload.batteryVoltage) : null,
    firmwareVersion: String(input.firmwareVersion || payload.firmwareVersion || ""),
    createdRecordId: input.createdRecordId || input.created_record_id || null,
    payload,
    createdAt: input.createdAt || input.created_at || null,
  };
}

function normalizeReadingList(payload) {
  const rawItems = payload?.readings || payload?.items || payload?.data?.readings || payload?.data?.items || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeReading) : [];
}

function normalizeTrainingReading(input = {}) {
  return {
    ...normalizeReading(input),
    trainingIncluded: typeof input.trainingIncluded === "boolean" ? input.trainingIncluded : false,
    trainingStatus: String(input.trainingStatus || "review"),
    trainingNote: String(input.trainingNote || ""),
    trainingUpdatedAt: input.trainingUpdatedAt || null,
    qualityIssues: Array.isArray(input.qualityIssues) ? input.qualityIssues.map(String) : [],
    features: input.features && typeof input.features === "object" ? input.features : {},
  };
}

function normalizeTrainingReadingList(payload) {
  const rawItems = payload?.readings || payload?.items || payload?.data?.readings || payload?.data?.items || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeTrainingReading) : [];
}

export function createDeviceDraft() {
  return normalizeDevice({
    ...DEFAULT_FORM,
    backendUrl: normalizeBackendUrlForProtocol(DEFAULT_FORM.backendUrl, DEFAULT_FORM.protocol),
    endpointPath: normalizeEndpointPathForProtocol(DEFAULT_FORM.endpointPath, DEFAULT_FORM.protocol),
  });
}

export async function fetchDevices() {
  assertBackendConfigured();
  return normalizeDeviceList(await apiRequest(DEVICE_API_CONTRACT.list, { method: "GET", headers: authHeaders() }));
}

export async function createDevice(payload) {
  assertBackendConfigured();
  const normalizedPayload = normalizeDevicePayloadForRequest(payload);
  const response = await apiRequest(DEVICE_API_CONTRACT.create, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(normalizedPayload),
  });
  return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
}

export async function updateDevice(payload) {
  assertBackendConfigured();
  const normalizedPayload = normalizeDevicePayloadForRequest(payload);
  const response = await apiRequest(DEVICE_API_CONTRACT.update(normalizedPayload.id), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(normalizedPayload),
  });
  return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
}

export async function updateDeviceStatus(deviceId, enabled) {
  assertBackendConfigured();
  const response = await apiRequest(DEVICE_API_CONTRACT.status(deviceId), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
}

export async function duplicateDevice(deviceId) {
  assertBackendConfigured();
  const response = await apiRequest(DEVICE_API_CONTRACT.duplicate(deviceId), {
    method: "POST",
    headers: authHeaders(),
  });
  return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
}

export async function removeDevice(deviceId) {
  assertBackendConfigured();
  await apiRequest(DEVICE_API_CONTRACT.remove(deviceId), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return { ok: true };
}

export async function fetchDeviceReadings(deviceId, filters = {}) {
  assertBackendConfigured();
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.limit) params.set("limit", String(filters.limit));
  const suffix = params.toString() ? `?${params}` : "";
  return normalizeReadingList(await apiRequest(`${DEVICE_API_CONTRACT.readings(deviceId)}${suffix}`, {
    method: "GET",
    headers: authHeaders(),
  }));
}

export async function fetchDeviceTrainingReadings(deviceId, filters = {}) {
  assertBackendConfigured();
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.limit) params.set("limit", String(filters.limit));
  const suffix = params.toString() ? `?${params}` : "";
  return normalizeTrainingReadingList(await apiRequest(`${DEVICE_API_CONTRACT.trainingReadings(deviceId)}${suffix}`, {
    method: "GET",
    headers: authHeaders(),
  }));
}

export async function updateDeviceReadingTraining(deviceId, readingId, payload) {
  assertBackendConfigured();
  const response = await apiRequest(DEVICE_API_CONTRACT.updateReadingTraining(deviceId, readingId), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return normalizeTrainingReading(response?.item || response?.data?.item || response?.data || response);
}

export async function removeDeviceReading(deviceId, readingId) {
  assertBackendConfigured();
  await apiRequest(DEVICE_API_CONTRACT.removeReading(deviceId, readingId), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return { ok: true };
}
