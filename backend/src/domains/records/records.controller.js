import {
  archiveRecordService,
  createRecordService,
  decideRecordsService,
  getRecordService,
  listValidationDecisionsService,
  listValidationQueueService,
  listRecordRevisionsService,
  listRecordsService,
} from "./records.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function listRecordsController(request, response) {
  const items = await listRecordsService(request.user, request.query);
  response.json({ items });
}

export async function getRecordController(request, response) {
  const item = await getRecordService(request.user, request.params.id);
  response.json({ item });
}

export async function listRecordRevisionsController(request, response) {
  const items = await listRecordRevisionsService(request.user, request.params.id);
  response.json({ items });
}

export async function createRecordController(request, response) {
  const item = await createRecordService(request.user, request.body, auditContextFromRequest(request));
  response.status(201).json({ item });
}

export async function archiveRecordController(request, response) {
  const item = await archiveRecordService(request.user, request.params.id, request.body, auditContextFromRequest(request));
  response.json({ item });
}

export async function listValidationQueueController(request, response) {
  const items = await listValidationQueueService(request.user);
  response.json({ items });
}

export async function listValidationDecisionsController(request, response) {
  const items = await listValidationDecisionsService(request.user, request.query);
  response.json({ items });
}

export async function decideRecordsController(request, response) {
  const result = await decideRecordsService(request.user, request.body, auditContextFromRequest(request));
  response.json(result);
}
