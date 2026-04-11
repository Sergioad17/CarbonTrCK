import {
  clearArchivedNotificationsService,
  createNotificationService,
  listNotificationsService,
  markAllNotificationsReadService,
  updateNotificationStatusService,
} from "./notifications.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function listNotificationsController(request, response) {
  response.json({ notifications: await listNotificationsService(request.user, auditContextFromRequest(request)) });
}

export async function createNotificationController(request, response) {
  response.status(201).json({ notification: await createNotificationService(request.user, request.body, auditContextFromRequest(request)) });
}

export async function updateNotificationStatusController(request, response) {
  response.json({ notification: await updateNotificationStatusService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function markAllNotificationsReadController(request, response) {
  response.json(await markAllNotificationsReadService(request.user, auditContextFromRequest(request)));
}

export async function clearArchivedNotificationsController(request, response) {
  response.json(await clearArchivedNotificationsService(request.user, auditContextFromRequest(request)));
}
