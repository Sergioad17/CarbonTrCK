import { createActionService, deleteActionService, listActionsService, updateActionService } from "./actions.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function listActionsController(request, response) {
  response.json({ actions: await listActionsService(request.user) });
}

export async function createActionController(request, response) {
  response.status(201).json({ action: await createActionService(request.user, request.body, auditContextFromRequest(request)) });
}

export async function updateActionController(request, response) {
  response.json({ action: await updateActionService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function deleteActionController(request, response) {
  await deleteActionService(request.user, request.params.id, auditContextFromRequest(request));
  response.status(204).send();
}
