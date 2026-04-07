import { fetchEmissionRecords } from "./records";
import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "../lib/storageKeys";

const ACTIVITY_KEY = STORAGE_KEYS.activity;
let activityCache = [];

function ensureModeAvailable() {
  if (isBackendConfigured() || isLocalMode()) return;
  const error = new Error("backend_not_configured");
  error.code = "backend_not_configured";
  throw error;
}

function dedupeBy(items, getKey) {
  return items.filter((item, index, list) => list.findIndex((current) => getKey(current) === getKey(item)) === index);
}

export async function fetchDashboardRecords() {
  return fetchEmissionRecords([]);
}

export async function fetchDashboardActivity(seedItems = [], normalizeItem, getKey) {
  ensureModeAvailable();

  if (isBackendConfigured()) {
    const payload = await apiRequest("/dashboard/activity", {
      method: "GET",
    });
    const rawItems = payload?.activity || payload?.items || payload?.data?.activity || payload?.data?.items || payload?.data || payload;
    const remoteItems = Array.isArray(rawItems) ? rawItems : [];
    const normalized = remoteItems.map(normalizeItem).filter(Boolean);
    activityCache = dedupeBy(normalized, getKey).slice(0, 20);
    return activityCache;
  }

  const stored = safeReadJson(ACTIVITY_KEY, []);
  const parsed = Array.isArray(stored) ? stored : Array.isArray(seedItems) ? seedItems : [];
  const normalized = parsed.map(normalizeItem).filter(Boolean);
  const merged = dedupeBy(normalized, getKey).slice(0, 20);
  activityCache = merged;
  return merged;
}

export async function persistDashboardActivity(items = []) {
  ensureModeAvailable();

  const nextItems = Array.isArray(items) ? items.slice(0, 20) : [];

  if (isBackendConfigured()) {
    const payload = await apiRequest("/dashboard/activity", {
      method: "PUT",
      body: JSON.stringify({ items: nextItems }),
    });
    const rawItems = payload?.activity || payload?.items || payload?.data?.activity || payload?.data?.items || payload?.data || nextItems;
    activityCache = Array.isArray(rawItems) ? rawItems.slice(0, 20) : nextItems;
    return activityCache;
  }

  safeWriteJson(ACTIVITY_KEY, nextItems);
  activityCache = nextItems;
  return nextItems;
}
