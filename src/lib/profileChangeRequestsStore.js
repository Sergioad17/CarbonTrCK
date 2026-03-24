import { STORAGE_KEYS, safeReadJson, safeWriteJson } from "./storageKeys";

const REQUESTS_KEY = STORAGE_KEYS.profileChangeRequests;
const CHANGE_EVENT = "carbontrack:profile-change-requests";

const nowIso = () => new Date().toISOString();

function buildId(prefix = "req") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeHistoryEntry(entry = {}, fallbackId) {
  return {
    id: cleanString(entry.id) || fallbackId || buildId("reqh"),
    action: cleanString(entry.action, "created"),
    actorUserId: cleanString(entry.actorUserId) || null,
    actorName: cleanString(entry.actorName, "Sistema"),
    detail: cleanString(entry.detail),
    createdAt: cleanString(entry.createdAt) || nowIso(),
  };
}

function normalizeRequest(input = {}, fallbackId) {
  const type = input.type === "password" ? "password" : "email";
  const status = ["pending", "approved", "rejected"].includes(input.status) ? input.status : "pending";
  const history = Array.isArray(input.history) ? input.history : [];

  return {
    id: cleanString(input.id) || fallbackId || buildId(),
    userId: cleanString(input.userId),
    userName: cleanString(input.userName, "Usuario"),
    requesterRole: cleanString(input.requesterRole, "operativo"),
    type,
    status,
    currentValue: cleanString(input.currentValue),
    requestedValue: cleanString(input.requestedValue),
    reason: cleanString(input.reason),
    detail: cleanString(input.detail),
    resolutionDetail: cleanString(input.resolutionDetail),
    createdAt: cleanString(input.createdAt) || nowIso(),
    updatedAt: cleanString(input.updatedAt) || cleanString(input.createdAt) || nowIso(),
    resolvedAt: cleanString(input.resolvedAt) || null,
    resolvedByUserId: cleanString(input.resolvedByUserId) || null,
    resolvedByName: cleanString(input.resolvedByName) || null,
    history: history.map((entry, index) => normalizeHistoryEntry(entry, `${fallbackId || "req"}-h${index + 1}`)),
  };
}

function sortRequests(items) {
  return [...items].sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));
}

function emitChange(items) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: items }));
}

function readRequests() {
  const stored = safeReadJson(REQUESTS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return sortRequests(stored.map((item, index) => normalizeRequest(item, `req-${index + 1}`)));
}

function writeRequests(items) {
  const normalized = sortRequests(items.map((item, index) => normalizeRequest(item, `req-${index + 1}`)));
  safeWriteJson(REQUESTS_KEY, normalized);
  emitChange(normalized);
  return normalized;
}

export function listChangeRequests() {
  return readRequests();
}

export function createChangeRequest(input) {
  const createdAt = nowIso();
  const request = normalizeRequest(
    {
      ...input,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      history: [
        {
          action: "created",
          actorUserId: input?.userId,
          actorName: input?.userName || "Usuario",
          detail: input?.detail || "Solicitud registrada.",
          createdAt,
        },
      ],
    },
    buildId()
  );
  writeRequests([request, ...readRequests()]);
  return request;
}

export function updateChangeRequest(id, updater) {
  const current = readRequests();
  let updatedRequest = null;
  const next = current.map((item) => {
    if (item.id !== id) return item;
    const draft = typeof updater === "function" ? updater(item) : { ...item, ...updater };
    updatedRequest = normalizeRequest(
      {
        ...item,
        ...draft,
        updatedAt: draft?.updatedAt || nowIso(),
      },
      item.id
    );
    return updatedRequest;
  });
  writeRequests(next);
  return updatedRequest;
}

export function subscribeChangeRequests(listener) {
  if (typeof window === "undefined") return () => {};
  const notify = () => listener(listChangeRequests());
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
