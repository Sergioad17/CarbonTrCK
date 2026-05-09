import {
  activateTrainingRunService,
  cancelTrainingRunService,
  createTrainingRunService,
  deactivateTrainingRunService,
  deleteTrainingRunService,
  getTrainingRunService,
  getTrainingSummaryService,
  listTrainingRunsService,
  retryTrainingRunService,
  startTrainingRunService,
} from "./ai-training.service.js";

function buildAuditContext(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function listTrainingRunsController(request, response) {
  const items = await listTrainingRunsService(request.user);
  response.json({ items });
}

export async function getTrainingSummaryController(request, response) {
  const summary = await getTrainingSummaryService(request.user);
  response.json({ summary });
}

export async function getTrainingRunController(request, response) {
  const item = await getTrainingRunService(request.user, request.params.id);
  response.json({ item });
}

export async function createTrainingRunController(request, response) {
  const item = await createTrainingRunService(request.user, request.body, buildAuditContext(request));
  response.status(201).json({ item });
}

export async function startTrainingRunController(request, response) {
  const item = await startTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.json({ item });
}

export async function cancelTrainingRunController(request, response) {
  const item = await cancelTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.json({ item });
}

export async function retryTrainingRunController(request, response) {
  const item = await retryTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.json({ item });
}

export async function activateTrainingRunController(request, response) {
  const item = await activateTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.json({ item });
}

export async function deactivateTrainingRunController(request, response) {
  const item = await deactivateTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.json({ item });
}

export async function deleteTrainingRunController(request, response) {
  await deleteTrainingRunService(request.user, request.params.id, buildAuditContext(request));
  response.status(204).send();
}
