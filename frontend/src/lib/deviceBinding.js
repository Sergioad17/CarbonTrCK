import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const DEFAULT_BINDING = {
  campusCode: "CAMPUS-CT",
  areaCode: "LAB",
  defaults: {
    voltage: 127,
    powerFactor: 0.9,
    intervalSeconds: 900,
  },
};

function normalizeBinding(deviceId, value) {
  const defaults = value?.defaults || {};
  return {
    deviceId: String(deviceId || value?.deviceId || "").trim(),
    campusCode: String(value?.campusCode || DEFAULT_BINDING.campusCode).trim(),
    areaCode: String(value?.areaCode || DEFAULT_BINDING.areaCode).trim(),
    defaults: {
      voltage: Number(defaults.voltage) > 0 ? Number(defaults.voltage) : DEFAULT_BINDING.defaults.voltage,
      powerFactor:
        Number(defaults.powerFactor) > 0 ? Number(defaults.powerFactor) : DEFAULT_BINDING.defaults.powerFactor,
      intervalSeconds:
        Number(defaults.intervalSeconds) > 0
          ? Number(defaults.intervalSeconds)
          : DEFAULT_BINDING.defaults.intervalSeconds,
    },
    updatedAt: String(value?.updatedAt || new Date().toISOString()),
  };
}

export function getDefaultBinding(deviceId = "") {
  return normalizeBinding(deviceId, { deviceId, ...DEFAULT_BINDING });
}

export function getBindingsMap() {
  const stored = safeReadJson(STORAGE_KEYS.devices, {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.entries(stored).reduce((acc, [deviceId, value]) => {
    const normalized = normalizeBinding(deviceId, value);
    if (normalized.deviceId) acc[normalized.deviceId] = normalized;
    return acc;
  }, {});
}

export function getDeviceBinding(deviceId) {
  if (!deviceId) return null;
  const bindings = getBindingsMap();
  return bindings[String(deviceId).trim()] || null;
}

export function upsertDeviceBinding(bindingInput) {
  const binding = normalizeBinding(bindingInput?.deviceId, bindingInput);
  if (!binding.deviceId) return null;
  const bindings = getBindingsMap();
  bindings[binding.deviceId] = binding;
  safeWriteJson(STORAGE_KEYS.devices, bindings);
  return binding;
}

export function getLastTotalsMap() {
  const stored = safeReadJson(STORAGE_KEYS.deviceLastTotal, {});
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return stored;
}

export function getLastTotal(deviceId) {
  if (!deviceId) return null;
  const map = getLastTotalsMap();
  return map[String(deviceId).trim()] || null;
}

export function setLastTotal(deviceId, payload) {
  if (!deviceId) return null;
  const map = getLastTotalsMap();
  map[String(deviceId).trim()] = {
    lastTotalKWh: Number(payload?.lastTotalKWh) || 0,
    lastTimestamp: String(payload?.lastTimestamp || ""),
    updatedAt: new Date().toISOString(),
  };
  safeWriteJson(STORAGE_KEYS.deviceLastTotal, map);
  return map[String(deviceId).trim()];
}
