import { fetchEmissionRecords } from "./records";
import { apiRequest } from "./httpClient";
import { assertBackendConfigured } from "./config";

let activityCache = [];

function dedupeBy(items, getKey) {
  return items.filter((item, index, list) => list.findIndex((current) => getKey(current) === getKey(item)) === index);
}

export async function fetchDashboardRecords() {
  return fetchEmissionRecords();
}

export async function fetchDashboardActivity(seedItems = [], normalizeItem, getKey) {
  void seedItems;
  assertBackendConfigured();

  const payload = await apiRequest("/dashboard/activity", {
    method: "GET",
  });
  const rawItems = payload?.activity || payload?.items || payload?.data?.activity || payload?.data?.items || payload?.data || payload;
  const remoteItems = Array.isArray(rawItems) ? rawItems : [];
  const normalized = remoteItems.map(normalizeItem).filter(Boolean);
  activityCache = dedupeBy(normalized, getKey).slice(0, 20);
  return activityCache;
}

export async function persistDashboardActivity(items = []) {
  assertBackendConfigured();
  const nextItems = Array.isArray(items) ? items.slice(0, 20) : [];

  const payload = await apiRequest("/dashboard/activity", {
    method: "PUT",
    body: JSON.stringify({ items: nextItems }),
  });
  const rawItems = payload?.activity || payload?.items || payload?.data?.activity || payload?.data?.items || payload?.data || nextItems;
  activityCache = Array.isArray(rawItems) ? rawItems.slice(0, 20) : nextItems;
  return activityCache;
}
