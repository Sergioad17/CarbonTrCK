import { apiRequest } from "./httpClient";
import { isBackendConfigured, isLocalMode } from "./config";
import {
  add,
  archive,
  clearArchived,
  countUnread,
  list,
  markAllRead,
  markRead,
  markUnread,
  replaceAll,
  subscribe,
} from "../lib/notificationsStore";

let notificationsCache = [];
const listeners = new Set();

function ensureModeAvailable() {
  if (isBackendConfigured() || isLocalMode()) return;
  const error = new Error("backend_not_configured");
  error.code = "backend_not_configured";
  throw error;
}

function emitNotifications(items = notificationsCache) {
  listeners.forEach((listener) => listener(items));
}

function extractNotifications(payload) {
  const rawItems =
    payload?.notifications ||
    payload?.items ||
    payload?.data?.notifications ||
    payload?.data?.items ||
    payload?.data ||
    payload;
  return Array.isArray(rawItems) ? rawItems : [];
}

function normalizeNotification(input = {}) {
  return {
    ...input,
    id: String(input.id || input.notificationId || ""),
    type: String(input.type || "system"),
    title: String(input.title || ""),
    message: String(input.message || ""),
    link: String(input.link || ""),
    status: String(input.status || input.state || "unread"),
    createdAt: input.createdAt || new Date().toISOString(),
    meta: typeof input.meta === "object" && input.meta ? input.meta : {},
  };
}

function syncRemoteCache(items) {
  notificationsCache = Array.isArray(items) ? items.map(normalizeNotification) : [];
  emitNotifications(notificationsCache);
  return notificationsCache;
}

async function refreshNotifications() {
  ensureModeAvailable();

  if (isLocalMode()) {
    return replaceAll(list());
  }

  const payload = await apiRequest("/notifications", {
    method: "GET",
  });
  return syncRemoteCache(extractNotifications(payload));
}

function updateRemoteCache(updater) {
  notificationsCache = typeof updater === "function" ? updater(notificationsCache) : notificationsCache;
  emitNotifications(notificationsCache);
  return notificationsCache;
}

export function fetchNotifications() {
  ensureModeAvailable();
  return isLocalMode() ? list() : notificationsCache;
}

export async function createNotification(notification) {
  ensureModeAvailable();

  const normalizedNotification = normalizeNotification({
    ...notification,
    status: notification?.status || "unread",
  });

  if (isLocalMode()) {
    return add(normalizedNotification);
  }

  const payload = await apiRequest("/notifications", {
    method: "POST",
    body: JSON.stringify(normalizedNotification),
  });
  const created = normalizeNotification(payload?.item || payload?.notification || payload?.data?.item || payload?.data || normalizedNotification);
  updateRemoteCache((current) => [created, ...current.filter((item) => item.id !== created.id)]);
  return created;
}

export function fetchUnreadNotificationsCount() {
  ensureModeAvailable();
  return isLocalMode()
    ? countUnread()
    : notificationsCache.filter((item) => item.status === "unread").length;
}

export async function markNotificationRead(id) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return markRead(id);
  }

  await apiRequest(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "read" }),
  });
  return updateRemoteCache((current) => current.map((item) => (item.id === id ? { ...item, status: "read" } : item)));
}

export async function markNotificationUnread(id) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return markUnread(id);
  }

  await apiRequest(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "unread" }),
  });
  return updateRemoteCache((current) => current.map((item) => (item.id === id ? { ...item, status: "unread" } : item)));
}

export async function markAllNotificationsRead() {
  ensureModeAvailable();

  if (isLocalMode()) {
    return markAllRead();
  }

  await apiRequest("/notifications/mark-all-read", {
    method: "POST",
  });
  return updateRemoteCache((current) => current.map((item) => ({ ...item, status: "read" })));
}

export async function archiveNotification(id) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return archive(id);
  }

  await apiRequest(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived" }),
  });
  return updateRemoteCache((current) => current.map((item) => (item.id === id ? { ...item, status: "archived" } : item)));
}

export async function clearArchivedNotifications() {
  ensureModeAvailable();

  if (isLocalMode()) {
    return clearArchived();
  }

  await apiRequest("/notifications/archived", {
    method: "DELETE",
  });
  return updateRemoteCache((current) => current.filter((item) => item.status !== "archived"));
}

export function subscribeNotifications(listener) {
  ensureModeAvailable();

  if (isLocalMode()) {
    return subscribe(listener);
  }

  listeners.add(listener);
  listener(notificationsCache);
  refreshNotifications().catch((error) => {
    console.error("notifications_refresh_failed", error);
  });
  return () => {
    listeners.delete(listener);
  };
}
