import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "../../shared/errors/app-error.js";
import { env } from "../../shared/config/env.js";
import { query, withTransaction } from "../../shared/db/pool.js";
import { insertAuditEvent } from "../audit/audit.repository.js";
import { getRecordByIdForActor, insertRecordRevision } from "../records/records.repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../../..");
const uploadRoot = path.join(backendDir, "storage", "uploads");

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeKind(value) {
  const normalized = cleanString(value).toLowerCase();
  if (["receipt", "photo", "survey", "inventory", "report", "other"].includes(normalized)) {
    return normalized;
  }

  return "other";
}

function sanitizeFileName(fileName) {
  const baseName = path.basename(cleanString(fileName) || "upload.bin");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildContentDisposition(fileName) {
  const safeName = sanitizeFileName(fileName);
  return `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function ensureRecordAccess(actor, recordRow) {
  if (actor.campusCode && cleanString(actor.campusCode) && cleanString(actor.campusCode) !== cleanString(recordRow.campus_code)) {
    throw new AppError({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "You cannot modify records outside your assigned campus.",
    });
  }

  if (actor.areaAccess?.mode === "custom") {
    const allowedAreaCodes = new Set((actor.areaAccess.areaCodes || []).map((code) => cleanString(code)));
    if (!allowedAreaCodes.has(cleanString(recordRow.area_code))) {
      throw new AppError({
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You cannot modify records outside your assigned areas.",
      });
    }
  }
}

async function ensureUploadDir(relativeDir) {
  const absoluteDir = path.join(uploadRoot, relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });
  return absoluteDir;
}

function buildStoredFileShape(row) {
  return {
    id: cleanString(row.id),
    fileName: cleanString(row.file_name),
    name: cleanString(row.file_name),
    url: cleanString(row.storage_url),
    mimeType: cleanString(row.mime_type),
    sizeBytes: Number(row.size_bytes || 0) || 0,
    kind: cleanString(row.kind),
    createdAt: row.created_at || null,
  };
}

async function getFileRowForActor(actor, fileId, client = { query }) {
  const result = await client.query(
    `
      SELECT id, organization_id, uploaded_by, kind, file_name, mime_type, size_bytes, storage_url, checksum_sha256, metadata, created_at
      FROM files
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [cleanString(fileId), actor.organizationId],
  );

  return result.rows[0] || null;
}

async function getRecordRowForActor(actor, recordId, client) {
  const result = await client.query(
    `
      SELECT
        r.id,
        r.organization_id,
        c.code AS campus_code,
        a.code AS area_code
      FROM records r
      JOIN campuses c ON c.id = r.campus_id
      JOIN areas a ON a.id = r.area_id
      WHERE r.id = $1
        AND r.organization_id = $2
        AND r.deleted_at IS NULL
      LIMIT 1
    `,
    [cleanString(recordId), actor.organizationId],
  );

  return result.rows[0] || null;
}

export async function createStoredFile(actor, uploadedFile, kind, auditContext) {
  return withTransaction(async (client) => {
    const fileId = crypto.randomUUID();
    const normalizedKind = normalizeKind(kind);
    const originalName = sanitizeFileName(uploadedFile.originalname);
    const checksum = crypto.createHash("sha256").update(uploadedFile.buffer).digest("hex");
    const relativeDir = path.join(actor.organizationId, new Date().toISOString().slice(0, 10));
    const absoluteDir = await ensureUploadDir(relativeDir);
    const diskFileName = `${fileId}-${originalName}`;
    const absolutePath = path.join(absoluteDir, diskFileName);
    const relativePath = path.relative(backendDir, absolutePath).replace(/\\/g, "/");

    await fs.writeFile(absolutePath, uploadedFile.buffer);

    try {
      const storageUrl = `${env.APP_BASE_URL}/files/${fileId}`;
      const insertResult = await client.query(
        `
          INSERT INTO files (
            id,
            organization_id,
            uploaded_by,
            kind,
            file_name,
            mime_type,
            size_bytes,
            storage_url,
            checksum_sha256,
            metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
          RETURNING id, kind, file_name, mime_type, size_bytes, storage_url, created_at
        `,
        [
          fileId,
          actor.organizationId,
          actor.id,
          normalizedKind,
          originalName,
          cleanString(uploadedFile.mimetype) || "application/octet-stream",
          Number(uploadedFile.size || uploadedFile.buffer.length || 0),
          storageUrl,
          checksum,
          JSON.stringify({
            storage: "local",
            diskPath: relativePath,
            originalName,
          }),
        ],
      );

      await insertAuditEvent(client, {
        organizationId: actor.organizationId,
        userId: actor.id,
        eventType: "files.upload",
        entityType: "file",
        entityId: fileId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: {
          kind: normalizedKind,
          fileName: originalName,
          mimeType: cleanString(uploadedFile.mimetype),
          sizeBytes: Number(uploadedFile.size || uploadedFile.buffer.length || 0),
        },
      });

      return buildStoredFileShape(insertResult.rows[0]);
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => {});
      throw error;
    }
  });
}

export async function getStoredFileForDownload(actor, fileId) {
  const row = await getFileRowForActor(actor, fileId);
  if (!row) {
    throw new AppError({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "File not found.",
    });
  }

  const metadata = row.metadata || {};
  const relativeDiskPath = cleanString(metadata.diskPath);
  if (!relativeDiskPath) {
    throw new AppError({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "File storage metadata is incomplete.",
    });
  }

  const absolutePath = path.resolve(backendDir, relativeDiskPath);
  const normalizedRoot = path.resolve(uploadRoot);
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new AppError({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid file storage path.",
    });
  }

  const fileBuffer = await fs.readFile(absolutePath).catch(() => null);
  if (!fileBuffer) {
    throw new AppError({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Stored file is missing.",
    });
  }

  return {
    file: buildStoredFileShape(row),
    buffer: fileBuffer,
    headers: {
      "Content-Type": cleanString(row.mime_type) || "application/octet-stream",
      "Content-Length": String(fileBuffer.byteLength),
      "Content-Disposition": buildContentDisposition(row.file_name),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  };
}

export async function attachFilesToRecord(actor, recordId, fileIds, auditContext) {
  const normalizedFileIds = Array.from(new Set((fileIds || []).map((fileId) => cleanString(fileId)).filter(Boolean)));
  if (normalizedFileIds.length < 1) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "fileIds is required.",
      details: { field: "fileIds" },
    });
  }

  return withTransaction(async (client) => {
    const recordRow = await getRecordRowForActor(actor, recordId, client);
    if (!recordRow) {
      throw new AppError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Record not found.",
      });
    }

    ensureRecordAccess(actor, recordRow);

    const filesResult = await client.query(
      `
        SELECT id, organization_id
        FROM files
        WHERE id = ANY($1::uuid[])
      `,
      [normalizedFileIds],
    );

    if (filesResult.rowCount !== normalizedFileIds.length) {
      throw new AppError({
        statusCode: 422,
        code: "VALIDATION_ERROR",
        message: "One or more fileIds are invalid.",
        details: { field: "fileIds" },
      });
    }

    const foreignOrgFile = filesResult.rows.find((row) => row.organization_id !== actor.organizationId);
    if (foreignOrgFile) {
      throw new AppError({
        statusCode: 409,
        code: "REFERENCE_CONFLICT",
        message: "Files must belong to the same organization as the record.",
        details: { field: "fileIds" },
      });
    }

    const primaryResult = await client.query(
      `
        SELECT 1
        FROM record_files
        WHERE record_id = $1
          AND is_primary = true
        LIMIT 1
      `,
      [cleanString(recordId)],
    );
    let shouldSetPrimary = primaryResult.rowCount < 1;
    const existingLinksResult = await client.query(
      `
        SELECT file_id
        FROM record_files
        WHERE record_id = $1
          AND file_id = ANY($2::uuid[])
      `,
      [cleanString(recordId), normalizedFileIds],
    );
    const existingFileIds = new Set(existingLinksResult.rows.map((row) => cleanString(row.file_id)));
    const newFileIds = normalizedFileIds.filter((fileId) => !existingFileIds.has(fileId));

    for (const fileId of newFileIds) {
      await client.query(
        `
          INSERT INTO record_files (
            record_id,
            file_id,
            purpose,
            is_primary
          )
          VALUES ($1, $2, 'evidence', $3)
        `,
        [cleanString(recordId), fileId, shouldSetPrimary],
      );
      shouldSetPrimary = false;
    }

    const updatedRecord = await getRecordByIdForActor(actor, recordId, client);
    if (newFileIds.length > 0) {
      await insertRecordRevision(client, {
        recordId: cleanString(recordId),
        changedBy: actor.id,
        changeReason: "attach_files",
        snapshot: updatedRecord,
      });

      await insertAuditEvent(client, {
        organizationId: actor.organizationId,
        userId: actor.id,
        eventType: "records.files_attached",
        entityType: "record",
        entityId: cleanString(recordId),
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        details: {
          fileIds: newFileIds,
          attachedCount: newFileIds.length,
          skippedFileIds: normalizedFileIds.filter((fileId) => existingFileIds.has(fileId)),
        },
      });
    }

    return updatedRecord;
  });
}
