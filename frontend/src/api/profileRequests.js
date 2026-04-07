import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import {
  createChangeRequest,
  listChangeRequests,
  subscribeChangeRequests,
  updateChangeRequest,
} from "../lib/profileChangeRequestsStore";

let requestsCache = [];
const listeners = new Set();

function ensureModeAvailable() {
  if (isBackendConfigured() || isLocalMode()) return;
  const error = new Error("backend_not_configured");
  error.code = "backend_not_configured";
  throw error;
}

function emitRequests(items = requestsCache) {
  listeners.forEach((listener) => listener(items));
}

function normalizeRequest(input = {}) {
  return {
    ...input,
    id: String(input.id || input.requestId || ""),
    type: String(input.type || "profile_update"),
    status: String(input.status || "pending"),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || input.createdAt || new Date().toISOString(),
    requestedBy: input.requestedBy || input.user || null,
    payload: typeof input.payload === "object" && input.payload ? input.payload : input,
    notes: String(input.notes || ""),
  };
}

function extractRequests(payload) {
  const rawItems =
    payload?.requests ||
    payload?.profileChangeRequests ||
    payload?.items ||
    payload?.data?.requests ||
    payload?.data?.items ||
    payload?.data ||
    payload;
  return Array.isArray(rawItems) ? rawItems : [];
}

function syncRemoteCache(items) {
  requestsCache = Array.isArray(items) ? items.map(normalizeRequest) : [];
  emitRequests(requestsCache);
  return requestsCache;
}

async function refreshProfileChangeRequests() {
  ensureModeAvailable();

  if (isLocalMode()) {
    return listChangeRequests();
  }

  const payload = await apiRequest("/profile-change-requests", {
    method: "GET",
  });
  return syncRemoteCache(extractRequests(payload));
}

export function fetchProfileChangeRequests() {
  ensureModeAvailable();
  return isLocalMode() ? listChangeRequests() : requestsCache;
}

export async function createProfileChangeRequest(input) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return createChangeRequest(input);
  }

  const payload = await apiRequest("/profile-change-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const created = normalizeRequest(payload?.item || payload?.request || payload?.data?.item || payload?.data || input);
  requestsCache = [created, ...requestsCache.filter((item) => item.id !== created.id)];
  emitRequests(requestsCache);
  return created;
}

export async function updateProfileChangeRequest(id, updater) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return updateChangeRequest(id, updater);
  }

  const current = requestsCache.find((item) => item.id === id) || null;
  const draft = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  const payload = await apiRequest(`/profile-change-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
  const updated = normalizeRequest(payload?.item || payload?.request || payload?.data?.item || payload?.data || draft);
  requestsCache = requestsCache.map((item) => (item.id === id ? updated : item));
  emitRequests(requestsCache);
  return updated;
}

export function subscribeProfileChangeRequests(listener) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return subscribeChangeRequests(listener);
  }

  listeners.add(listener);
  listener(requestsCache);
  refreshProfileChangeRequests().catch((error) => {
    console.error("profile_change_requests_refresh_failed", error);
  });
  return () => {
    listeners.delete(listener);
  };
}
