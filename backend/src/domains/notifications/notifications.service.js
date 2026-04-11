import { AppError } from "../../shared/errors/app-error.js";
import {
  clearArchivedNotifications,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  updateNotificationStatus,
} from "./notifications.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

function assertRequiredString(value, field) {
  if (!String(value ?? "").trim()) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is required.`, details: { field } });
  }
}

export async function listNotificationsService(actor) {
  return listNotifications(actor);
}

export async function createNotificationService(actor, payload) {
  ensureObject(payload);
  assertRequiredString(payload.title, "title");
  return createNotification(actor, payload);
}

export async function updateNotificationStatusService(actor, notificationId, payload) {
  ensureObject(payload);
  assertRequiredString(notificationId, "notificationId");
  return updateNotificationStatus(actor, notificationId, payload);
}

export async function markAllNotificationsReadService(actor) {
  return markAllNotificationsRead(actor);
}

export async function clearArchivedNotificationsService(actor) {
  return clearArchivedNotifications(actor);
}
