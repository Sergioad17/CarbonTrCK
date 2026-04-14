import { applySettings, getSettings, normalizeSettings, resolveTheme, saveSettings } from "../lib/settingsStore";
import { apiRequest } from "./httpClient";
import { isBackendConfigured } from "./config";
import { fetchSession } from "./session";

const DEFAULT_CACHE = normalizeSettings({});
let settingsCache = (typeof window !== "undefined" ? getSettings() : DEFAULT_CACHE);

function extractSettings(payload) {
  return payload?.settings || payload?.item || payload?.data?.settings || payload?.data?.item || payload?.data || payload;
}

function syncMemoryCache(nextSettings) {
  settingsCache = saveSettings(nextSettings);
  return settingsCache;
}

function canUseRemoteSettings() {
  return isBackendConfigured() && Boolean(fetchSession()?.token);
}

export function fetchSettings() {
  return settingsCache;
}

export async function refreshSettings() {
  if (!canUseRemoteSettings()) {
    return settingsCache;
  }

  const payload = await apiRequest("/settings", {
    method: "GET",
  });
  return syncMemoryCache(extractSettings(payload));
}

export async function persistSettings(settings) {
  const nextSettings = normalizeSettings({
    ...settingsCache,
    ...settings,
  });

  if (!canUseRemoteSettings()) {
    return syncMemoryCache(nextSettings);
  }

  const payload = await apiRequest("/settings", {
    method: "PUT",
    body: JSON.stringify(nextSettings),
  });
  return syncMemoryCache(extractSettings(payload));
}

export async function resetSettings() {
  if (!canUseRemoteSettings()) {
    return syncMemoryCache(DEFAULT_CACHE);
  }

  const payload = await apiRequest("/settings", {
    method: "PUT",
    body: JSON.stringify(normalizeSettings({})),
  });
  return syncMemoryCache(extractSettings(payload));
}

export function startSettingsSync() {
  if (canUseRemoteSettings()) {
    refreshSettings().catch((error) => {
      console.error("settings_sync_failed", error);
    });
  }
  return () => {};
}

export {
  applySettings,
  normalizeSettings,
  resolveTheme,
};
