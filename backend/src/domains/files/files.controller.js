import { attachFilesToRecordService, createStoredFileService, getStoredFileForDownloadService } from "./files.service.js";

function auditContextFromRequest(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"] || null,
  };
}

export async function createStoredFileController(request, response) {
  const file = await createStoredFileService(request.user, request.file, request.body.kind, auditContextFromRequest(request));
  response.status(201).json({ file });
}

export async function getStoredFileController(request, response) {
  const result = await getStoredFileForDownloadService(request.user, request.params.id);

  for (const [headerName, headerValue] of Object.entries(result.headers)) {
    response.setHeader(headerName, headerValue);
  }

  response.status(200).send(result.buffer);
}

export async function attachFilesToRecordController(request, response) {
  const item = await attachFilesToRecordService(
    request.user,
    request.params.id,
    request.body,
    auditContextFromRequest(request),
  );
  response.json({ item });
}
