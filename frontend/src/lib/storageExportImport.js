import { STORAGE_KEYS } from "./storageKeys";
import { DEFAULT_SETTINGS, applySettings, saveSettings } from "./settingsStore";

const EXPORT_KEYS = [
  STORAGE_KEYS.records,
  STORAGE_KEYS.notifications,
  STORAGE_KEYS.activity,
  STORAGE_KEYS.devices,
  STORAGE_KEYS.deviceLastTotal,
  STORAGE_KEYS.factors,
  STORAGE_KEYS.equipment,
  STORAGE_KEYS.users,
  STORAGE_KEYS.roles,
  STORAGE_KEYS.targets,
  STORAGE_KEYS.actions,
  STORAGE_KEYS.settings,
];

function readStorageSnapshot() {
  if (typeof window === "undefined") return {};
  return EXPORT_KEYS.reduce((acc, key) => {
    const value = window.localStorage.getItem(key);
    if (value !== null) acc[key] = value;
    return acc;
  }, {});
}

function dispatchStorageRestore() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carbontrack:storage-restored"));
}

export function getManagedStorageKeys() {
  return [...EXPORT_KEYS];
}

export function getStorageUsageEstimate() {
  if (typeof window === "undefined") return { bytes: 0, kilobytes: 0, items: 0 };
  const snapshot = readStorageSnapshot();
  const bytes = Object.entries(snapshot).reduce((total, [key, value]) => total + key.length + value.length, 0) * 2;
  return {
    bytes,
    kilobytes: Number((bytes / 1024).toFixed(2)),
    items: Object.keys(snapshot).length,
  };
}

export function exportAll() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "CarbonTrack",
    keys: EXPORT_KEYS,
    data: readStorageSnapshot(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `carbontrack-local-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return payload;
}

export function importAll(rawPayload) {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };

  let payload = rawPayload;
  if (typeof rawPayload === "string") {
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return { ok: false, reason: "invalid_json" };
    }
  }

  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }

  EXPORT_KEYS.forEach((key) => {
    const value = payload.data[key];
    if (typeof value === "string") window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  });

  const settingsRaw = window.localStorage.getItem(STORAGE_KEYS.settings);
  if (settingsRaw) {
    try {
      applySettings(normalizeSettings(JSON.parse(settingsRaw)));
    } catch {
      saveSettings(DEFAULT_SETTINGS);
    }
  } else {
    saveSettings(DEFAULT_SETTINGS);
  }

  dispatchStorageRestore();
  return { ok: true, restoredKeys: EXPORT_KEYS };
}

export function resetAll() {
  if (typeof window === "undefined") return { ok: false, reason: "unavailable" };
  EXPORT_KEYS.forEach((key) => window.localStorage.removeItem(key));
  saveSettings(DEFAULT_SETTINGS);
  dispatchStorageRestore();
  return { ok: true, clearedKeys: EXPORT_KEYS };
}
