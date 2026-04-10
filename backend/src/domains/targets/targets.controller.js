import {
  createTargetService,
  deleteTargetService,
  listTargetsService,
  updateTargetService,
  updateTargetStatusService,
} from "./targets.service.js";

function auditContextFromRequest(request) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] || null };
}

export async function listTargetsController(request, response) {
  response.json({ targets: await listTargetsService(request.user) });
}

export async function createTargetController(request, response) {
  response.status(201).json({ target: await createTargetService(request.user, request.body, auditContextFromRequest(request)) });
}

export async function updateTargetController(request, response) {
  response.json({ target: await updateTargetService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function updateTargetStatusController(request, response) {
  response.json({ target: await updateTargetStatusService(request.user, request.params.id, request.body, auditContextFromRequest(request)) });
}

export async function deleteTargetController(request, response) {
  await deleteTargetService(request.user, request.params.id, auditContextFromRequest(request));
  response.status(204).send();
}
