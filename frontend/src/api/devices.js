import { apiRequest } from "./httpClient";
import { API_URL, assertBackendConfigured } from "./config";
import { fetchSession } from "./session";

export const DEVICE_API_CONTRACT = {
  list: "/devices",
  create: "/devices",
  update: (id) => `/devices/${id}`,
  status: (id) => `/devices/${id}/status`,
  duplicate: (id) => `/devices/${id}/duplicate`,
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
};

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
    status: String(input.status || "provisioning"),
    lastSeenAt: input.lastSeenAt || null,
    firmwareVersion: String(input.firmwareVersion || ""),
    readingsToday: Number.isFinite(Number(input.readingsToday)) ? Number(input.readingsToday) : 0,
  };
}

function normalizeDeviceList(payload) {
  const rawItems = payload?.devices || payload?.items || payload?.data?.devices || payload?.data?.items || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeDevice) : [];
}

export function createDeviceDraft() {
  return normalizeDevice(DEFAULT_FORM);
}

export async function fetchDevices() {
  assertBackendConfigured();
  return normalizeDeviceList(await apiRequest(DEVICE_API_CONTRACT.list, { method: "GET", headers: authHeaders() }));
}

export async function createDevice(payload) {
  assertBackendConfigured();
  const response = await apiRequest(DEVICE_API_CONTRACT.create, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
}

export async function updateDevice(payload) {
  assertBackendConfigured();
  const response = await apiRequest(DEVICE_API_CONTRACT.update(payload.id), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
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
