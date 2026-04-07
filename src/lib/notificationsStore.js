import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const NOTIFICATIONS_KEY = STORAGE_KEYS.notifications;
const CHANGE_EVENT = "carbontrack:notifications-changed";

function nowIso() {
  return new Date().toISOString();
}

function buildId(prefix = "ntf") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNotification(input, fallbackId) {
  const status = ["unread", "read", "archived"].includes(input?.status) ? input.status : "unread";
  const type = [
    "record_created",
    "record_imported",
    "export_done",
    "factor_updated",
    "goal_risk",
    "system",
  ].includes(input?.type)
    ? input.type
    : "system";

  return {
    id: String(input?.id || fallbackId || buildId()),
    type,
    title: String(input?.title || "Notificación"),
    message: String(input?.message || ""),
    status,
    createdAt: String(input?.createdAt || nowIso()),
    link: input?.link ? String(input.link) : null,
    meta: input?.meta && typeof input.meta === "object" && !Array.isArray(input.meta) ? input.meta : null,
  };
}

function seedNotifications() {
  return [];
}

function sortNotifications(items) {
  return [...items].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

function emitChange(items) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: items }));
}

function readNotifications() {
  const stored = safeReadJson(NOTIFICATIONS_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    safeWriteJson(NOTIFICATIONS_KEY, []);
    return [];
  }
  return sortNotifications(stored.map((item, index) => normalizeNotification(item, `ntf-${index + 1}`)));
}

function writeNotifications(items) {
  const normalized = sortNotifications(items.map((item, index) => normalizeNotification(item, `ntf-${index + 1}`)));
  safeWriteJson(NOTIFICATIONS_KEY, normalized);
  emitChange(normalized);
  return normalized;
}

export function list() {
  return readNotifications();
}

export function replaceAll(notifications = []) {
  return writeNotifications(Array.isArray(notifications) ? notifications : []);
}

export function add(notification) {
  const nextItem = normalizeNotification(
    {
      ...notification,
      status: notification?.status || "unread",
      createdAt: notification?.createdAt || nowIso(),
    },
    buildId()
  );
  writeNotifications([nextItem, ...readNotifications()]);
  return nextItem;
}

export function markRead(id) {
  return writeNotifications(
    readNotifications().map((item) => (item.id === id ? { ...item, status: "read" } : item))
  );
}

export function markUnread(id) {
  return writeNotifications(
    readNotifications().map((item) => (item.id === id ? { ...item, status: "unread" } : item))
  );
}

export function markAllRead() {
  return writeNotifications(
    readNotifications().map((item) => (item.status === "archived" ? item : { ...item, status: "read" }))
  );
}

export function archive(id) {
  return writeNotifications(
    readNotifications().map((item) => (item.id === id ? { ...item, status: "archived" } : item))
  );
}

export function clearArchived() {
  return writeNotifications(readNotifications().filter((item) => item.status !== "archived"));
}

export function countUnread() {
  return readNotifications().filter((item) => item.status === "unread").length;
}

export function subscribe(listener) {
  if (typeof window === "undefined") return () => {};
  const notify = () => listener(list());
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
