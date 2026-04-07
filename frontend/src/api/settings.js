import {
  applySettings,
  getSettings as readLocalSettings,
  normalizeSettings,
  resetSettings as resetLocalSettings,
  resolveTheme,
  saveSettings as saveLocalSettings,
  startSettingsSync as startLocalSettingsSync,
} from "../lib/settingsStore";
import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";

const DEFAULT_CACHE = normalizeSettings({});
let settingsCache = isLocalMode() ? readLocalSettings() : DEFAULT_CACHE;

function ensureModeAvailable() {
  if (isBackendConfigured() || isLocalMode()) return;
  const error = new Error("backend_not_configured");
  error.code = "backend_not_configured";
  throw error;
}

function emitSettingsChanged(nextSettings) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carbontrack:settings-changed", { detail: nextSettings }));
}

function extractSettings(payload) {
  return payload?.settings || payload?.item || payload?.data?.settings || payload?.data?.item || payload?.data || payload;
}

function syncLocalCache(nextSettings) {
  settingsCache = saveLocalSettings(normalizeSettings(nextSettings));
  emitSettingsChanged(settingsCache);
  return settingsCache;
}

function syncMemoryCache(nextSettings) {
  settingsCache = normalizeSettings(nextSettings);
  emitSettingsChanged(settingsCache);
  return settingsCache;
}

function syncSettingsCache(nextSettings) {
  return isLocalMode() ? syncLocalCache(nextSettings) : syncMemoryCache(nextSettings);
}

export function fetchSettings() {
  ensureModeAvailable();
  return settingsCache;
}

export async function refreshSettings() {
  ensureModeAvailable();

  if (isLocalMode()) {
    settingsCache = readLocalSettings();
    return settingsCache;
  }

  const payload = await apiRequest("/settings", {
    method: "GET",
  });
  return syncSettingsCache(extractSettings(payload));
}

export async function persistSettings(settings) {
  ensureModeAvailable();

  const nextSettings = normalizeSettings({
    ...settingsCache,
    ...settings,
  });

  if (isLocalMode()) {
    return syncSettingsCache(nextSettings);
  }

  const payload = await apiRequest("/settings", {
    method: "PUT",
    body: JSON.stringify(nextSettings),
  });
  return syncSettingsCache(extractSettings(payload));
}

export async function resetSettings() {
  ensureModeAvailable();

  if (isLocalMode()) {
    settingsCache = resetLocalSettings();
    emitSettingsChanged(settingsCache);
    return settingsCache;
  }

  const nextSettings = normalizeSettings({});
  const payload = await apiRequest("/settings", {
    method: "PUT",
    body: JSON.stringify(nextSettings),
  });
  return syncSettingsCache(extractSettings(payload));
}

export function startSettingsSync() {
  if (isLocalMode()) {
    return startLocalSettingsSync();
  }

  refreshSettings().catch((error) => {
    console.error("settings_sync_failed", error);
  });
  return () => {};
}

export {
  applySettings,
  normalizeSettings,
  resolveTheme,
};
