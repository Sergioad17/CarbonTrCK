import { AppError } from "../../shared/errors/app-error.js";
import { attachFilesToRecord, createStoredFile, getStoredFileForDownload } from "./files.repository.js";

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function validateUploadedFile(file) {
  if (!file) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "A file is required.",
      details: { field: "file" },
    });
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "The uploaded file type is not allowed.",
      details: { field: "file", mimeType: file.mimetype || null },
    });
  }

  if (Number(file.size || 0) > MAX_UPLOAD_SIZE_BYTES) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "The uploaded file exceeds the size limit.",
      details: { field: "file", maxBytes: MAX_UPLOAD_SIZE_BYTES },
    });
  }
}

export async function createStoredFileService(actor, file, kind, auditContext) {
  validateUploadedFile(file);
  return createStoredFile(actor, file, kind, auditContext);
}

export async function getStoredFileForDownloadService(actor, fileId) {
  return getStoredFileForDownload(actor, fileId);
}

export async function attachFilesToRecordService(actor, recordId, payload, auditContext) {
  return attachFilesToRecord(actor, recordId, payload?.fileIds, auditContext);
}
