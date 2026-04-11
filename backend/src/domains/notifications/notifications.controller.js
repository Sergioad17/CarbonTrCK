import {
  clearArchivedNotificationsService,
  createNotificationService,
  listNotificationsService,
  markAllNotificationsReadService,
  updateNotificationStatusService,
} from "./notifications.service.js";

export async function listNotificationsController(request, response) {
  response.json({ notifications: await listNotificationsService(request.user) });
}

export async function createNotificationController(request, response) {
  response.status(201).json({ notification: await createNotificationService(request.user, request.body) });
}

export async function updateNotificationStatusController(request, response) {
  response.json({ notification: await updateNotificationStatusService(request.user, request.params.id, request.body) });
}

export async function markAllNotificationsReadController(request, response) {
  response.json(await markAllNotificationsReadService(request.user));
}

export async function clearArchivedNotificationsController(request, response) {
  response.json(await clearArchivedNotificationsService(request.user));
}
