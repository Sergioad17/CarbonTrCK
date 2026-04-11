import { archiveRecordService, createRecordService, listRecordsService } from "./records.service.js";

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

export async function createRecordController(request, response) {
  const item = await createRecordService(request.user, request.body, auditContextFromRequest(request));
  response.status(201).json({ item });
}

export async function archiveRecordController(request, response) {
  const item = await archiveRecordService(request.user, request.params.id, request.body, auditContextFromRequest(request));
  response.json({ item });
}
