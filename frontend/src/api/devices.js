import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { fetchSession } from "./session";

const STORAGE_KEY = "carbontrack.devices.v1";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
  backendUrl: "https://api.institucion.edu.mx",
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

const DEMO_DEVICES = [
  {
    id: "dev-01",
    name: "Medidor Laboratorio 01",
    code: "ESP32-LAB-01",
    campusCode: "CAMPUS-CT",
    areaCode: "LAB",
    protocol: "https",
    streamMode: "scheduled",
    intervalSeconds: "60",
    metric: "electricity_consumption",
    unit: "kWh",
    backendUrl: "https://api.institucion.edu.mx",
    endpointPath: "/iot/readings",
    wifiProfile: "Campus-IoT",
    deviceType: "ESP32",
    notes: "Equipo piloto del tablero eléctrico principal.",
    token: "Q7P4X2K-L9W6M3R-T8H5J2N-C4V7B9D-F3G8K2P-R6S4T9Y-W2Z8X5C-N7M3Q6L-P5R2T8V",
    tlsRequired: true,
    verifyServerCert: true,
    offlineBuffer: true,
    enabled: true,
    status: "online",
    lastSeenAt: "2026-04-09T10:24:00",
    firmwareVersion: "1.2.1",
    readingsToday: 1440,
  },
  {
    id: "dev-02",
    name: "Medidor Centro de Cómputo",
    code: "ESP32-CC-02",
    campusCode: "CAMPUS-CT",
    areaCode: "CC",
    protocol: "mqtt",
    streamMode: "realtime",
    intervalSeconds: "30",
    metric: "electricity_consumption",
    unit: "kWh",
    backendUrl: "mqtts://broker.institucion.edu.mx",
    endpointPath: "/telemetry/carbontrack/cc",
    wifiProfile: "Campus-IoT",
    deviceType: "ESP32",
    notes: "Preparado para migración a broker seguro en fase 2.",
    token: "L8R3T6V-Q2M7X4K-P9H5J2N-T6W3Y8C-F4G7K2P-R5S8T3Y-W9Z2X6C-N4M7Q5L-P3R8T2V",
    tlsRequired: true,
    verifyServerCert: true,
    offlineBuffer: true,
    enabled: true,
    status: "provisioning",
    lastSeenAt: "2026-04-09T08:02:00",
    firmwareVersion: "1.0.0-rc2",
    readingsToday: 320,
  },
];

function authHeaders() {
  const session = fetchSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function randomIndex(max) {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % max;
}

function generateCredential() {
  const parts = [];
  for (let block = 0; block < 9; block += 1) {
    let segment = "";
    for (let charIndex = 0; charIndex < 7; charIndex += 1) {
      segment += ALPHABET[randomIndex(ALPHABET.length)];
    }
    parts.push(segment);
  }
  return parts.join("-");
}

function createDeviceId() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLocalDevices() {
  if (typeof window === "undefined") return DEMO_DEVICES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_DEVICES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEMO_DEVICES;
  } catch {
    return DEMO_DEVICES;
  }
}

function saveLocalDevices(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
  if (isBackendConfigured()) {
    return normalizeDeviceList(await apiRequest(DEVICE_API_CONTRACT.list, { method: "GET", headers: authHeaders() }));
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  return loadLocalDevices();
}

export async function createDevice(payload) {
  if (isBackendConfigured()) {
    const response = await apiRequest(DEVICE_API_CONTRACT.create, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const items = loadLocalDevices();
  const nextDevice = normalizeDevice({
    ...payload,
    id: createDeviceId(),
    token: generateCredential(),
    status: payload?.enabled === false ? "offline" : "provisioning",
    firmwareVersion: "1.0.0",
    readingsToday: 0,
    lastSeenAt: null,
  });
  saveLocalDevices([nextDevice, ...items]);
  return nextDevice;
}

export async function updateDevice(payload) {
  if (isBackendConfigured()) {
    const response = await apiRequest(DEVICE_API_CONTRACT.update(payload.id), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const items = loadLocalDevices();
  const nextDevice = normalizeDevice(payload);
  const nextItems = items.map((item) => (item.id === payload.id ? { ...nextDevice, token: item.token || nextDevice.token } : item));
  saveLocalDevices(nextItems);
  return nextItems.find((item) => item.id === payload.id) || nextDevice;
}

export async function updateDeviceStatus(deviceId, enabled) {
  if (isBackendConfigured()) {
    const response = await apiRequest(DEVICE_API_CONTRACT.status(deviceId), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ enabled }),
    });
    return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const items = loadLocalDevices();
  const nextItems = items.map((item) =>
    item.id === deviceId
      ? { ...item, enabled, status: enabled ? "provisioning" : "offline" }
      : item
  );
  saveLocalDevices(nextItems);
  return nextItems.find((item) => item.id === deviceId) || null;
}

export async function duplicateDevice(deviceId) {
  if (isBackendConfigured()) {
    const response = await apiRequest(DEVICE_API_CONTRACT.duplicate(deviceId), {
      method: "POST",
      headers: authHeaders(),
    });
    return normalizeDevice(response?.device || response?.item || response?.data?.device || response?.data?.item || response?.data || response);
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const items = loadLocalDevices();
  const source = items.find((item) => item.id === deviceId);
  if (!source) throw new Error("device_not_found");
  const duplicate = normalizeDevice({
    ...source,
    id: createDeviceId(),
    code: `${source.code}-COPIA`,
    name: `${source.name} copia`,
    token: generateCredential(),
    status: "provisioning",
    lastSeenAt: null,
    readingsToday: 0,
  });
  saveLocalDevices([duplicate, ...items]);
  return duplicate;
}

export async function removeDevice(deviceId) {
  if (isBackendConfigured()) {
    await apiRequest(DEVICE_API_CONTRACT.remove(deviceId), {
      method: "DELETE",
      headers: authHeaders(),
    });
    return { ok: true };
  }

  if (!isLocalMode()) {
    const error = new Error("backend_not_configured");
    error.code = "backend_not_configured";
    throw error;
  }

  const items = loadLocalDevices().filter((item) => item.id !== deviceId);
  saveLocalDevices(items);
  return { ok: true };
}

