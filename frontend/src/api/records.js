import { apiRequest } from "./httpClient";
import { assertBackendConfigured, buildApiUrl } from "./config";
import { getSession } from "../lib/sessionStore";

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

function cleanString(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function normalizeDateISO(value) {
  const raw = cleanString(value);
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCategory(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === "combustible") return "combustible";
  if (normalized === "otros") return "otros";
  return "electricidad";
}

function normalizeStatus(input = {}) {
  if (input?.status === "est" || input?.isEstimated) return "est";
  return "real";
}

function normalizeValidationStatus(input = {}) {
  const raw = cleanString(input.validationStatus || input.validation_status || input.recordStatus || input.status).toLowerCase();
  if (["approved", "pending", "rejected", "draft"].includes(raw)) return raw;
  if (cleanString(input.approvedAt || input.approved_at)) return "approved";
  return "pending";
}

export function normalizeRecord(input = {}, fallbackId) {
  const evidenceFiles = Array.isArray(input.evidenceFiles)
    ? input.evidenceFiles
    : Array.isArray(input.files)
    ? input.files
    : [];
  const category = normalizeCategory(input.category);
  const value = Number(input.value);
  const factor = Number(input.factor);
  const co2eKgInput = Number(input.co2e_kg);
  const co2eKg = Number.isFinite(co2eKgInput)
    ? co2eKgInput
    : Number.isFinite(value) && Number.isFinite(factor)
    ? value * factor
    : 0;
  const co2eTInput = Number(input.co2e_t);

  return {
    id: cleanString(input.id) || fallbackId || `rec-${Date.now()}`,
    dateISO: normalizeDateISO(input.dateISO),
    scope: cleanString(input.scope, category === "combustible" ? "scope1" : "scope2") || "scope2",
    metric: cleanString(input.metric, category === "combustible" ? "fuel_volume" : "electricity_consumption"),
    area: cleanString(input.area, "Sin area") || "Sin area",
    areaCode: cleanString(input.areaCode, input.area || ""),
    campusCode: cleanString(input.campusCode),
    category,
    activity: cleanString(input.activity || input.activityText, "Sin actividad") || "Sin actividad",
    activityText: cleanString(input.activityText || input.activity || "Sin actividad"),
    value: Number.isFinite(value) ? value : 0,
    unit: cleanString(input.unit, category === "combustible" ? "L" : "kWh") || (category === "combustible" ? "L" : "kWh"),
    factor: Number.isFinite(factor) ? factor : 0,
    factorId: cleanString(input.factorId) || null,
    co2e_kg: co2eKg,
    co2e_t: Number.isFinite(co2eTInput) ? co2eTInput : co2eKg / 1000,
    status: normalizeStatus(input),
    isEstimated: normalizeStatus(input) === "est",
    validationStatus: normalizeValidationStatus(input),
    isApproved: normalizeValidationStatus(input) === "approved",
    approvedAt: cleanString(input.approvedAt || input.approved_at) || null,
    approvedBy: cleanString(input.approvedBy || input.approved_by),
    latestValidationDecision: cleanString(input.latestValidationDecision || input.latest_validation_decision),
    latestValidationComment: cleanString(input.latestValidationComment || input.latest_validation_comment),
    latestValidationAt: cleanString(input.latestValidationAt || input.latest_validation_at),
    latestValidationActor: cleanString(input.latestValidationActor || input.latest_validation_actor),
    source: cleanString(input.source, "Medicion") || "Medicion",
    by: cleanString(input.by, "Tu") || "Tu",
    note: cleanString(input.note || input.notes),
    hasEvidence: Boolean(input.hasEvidence || input.evidence || input.evidenceUrl || evidenceFiles.length > 0),
    evidence: cleanString(input.evidence),
    evidenceUrl: cleanString(input.evidenceUrl || input.evidence),
    evidenceFileId: cleanString(input.evidenceFileId || input.fileId) || null,
    evidenceFiles: evidenceFiles
      .map((file, index) => ({
        id: cleanString(file?.id || file?.fileId) || `file-${index + 1}`,
        fileName: cleanString(file?.fileName || file?.name || file?.originalName),
        name: cleanString(file?.name || file?.fileName || file?.originalName),
        mimeType: cleanString(file?.mimeType || file?.contentType),
        sizeBytes: Number(file?.sizeBytes || file?.size || 0) || 0,
        url: cleanString(file?.url || file?.downloadUrl),
        purpose: cleanString(file?.purpose, "evidence") || "evidence",
      }))
      .filter((file) => file.fileName),
    createdAt: cleanString(input.createdAt) || new Date().toISOString(),
    deletedAt: cleanString(input.deletedAt || input.deleted_at) || null,
    archivedAt: cleanString(input.archivedAt || input.archived_at || input.deletedAt || input.deleted_at) || null,
    archiveReason: cleanString(input.archiveReason || input.archive_reason || input.deleteReason || input.delete_reason),
    archiveRequestedBy: input.archiveRequestedBy || input.archive_requested_by || input.deletedBy || input.deleted_by || null,
    persisted: Boolean(input.persisted),
  };
}

function sortRecords(records) {
  return [...records].sort((left, right) => String(right.dateISO || "").localeCompare(String(left.dateISO || "")));
}

function emitRecord(record) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carbontrack:newrecord", { detail: record }));
}

function emitRecordArchived(recordId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("carbontrack:record-archived", { detail: { recordId } }));
}

async function uploadEvidenceFile(file, kind = "other") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const headers = authHeaders();
  const response = await fetch(buildApiUrl("/files"), {
    method: "POST",
    headers,
    body: formData,
  });

  let payload = null;
  try {
    const contentType = response.headers.get("content-type") || "";
    payload = contentType.includes("application/json") ? await response.json() : await response.text();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || "file_upload_failed");
    error.status = response.status;
    throw error;
  }

  return payload?.file || payload?.data?.file || payload?.data || payload;
}

async function attachEvidenceFileToRecord(recordId, fileId) {
  if (!recordId || !fileId) return;

  await apiRequest(`/records/${recordId}/files`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ fileIds: [fileId] }),
  });
}

function buildRecordPayload(record) {
  const fileIds = record.evidenceFiles.map((file) => file.id).filter(Boolean);
  return {
    id: record.id,
    dateISO: record.dateISO,
    scope: record.scope,
    metric: record.metric,
    area: record.area,
    areaCode: record.areaCode,
    campusCode: record.campusCode,
    category: record.category,
    activity: record.activity,
    activityText: record.activityText,
    value: record.value,
    unit: record.unit,
    factor: record.factor,
    factorId: record.factorId,
    co2e_kg: record.co2e_kg,
    co2e_t: record.co2e_t,
    status: record.status,
    isEstimated: record.isEstimated,
    source: record.source,
    by: record.by,
    note: record.note,
    hasEvidence: record.hasEvidence,
    evidenceFileId: record.evidenceFileId,
    fileIds,
  };
}

export async function fetchEmissionRecords(filters = {}) {
  assertBackendConfigured();
  const params = new URLSearchParams();
  params.set("includeValidation", "1");
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) params.set(key, String(value).trim());
  });
  const query = params.toString() ? `?${params.toString()}` : "";
  const payload = await apiRequest(`/records${query}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const rawItems = payload?.records || payload?.items || payload?.data?.records || payload?.data?.items || payload?.data || payload;
  return sortRecords(Array.isArray(rawItems) ? rawItems.map((item, index) => normalizeRecord(item, `record-${index + 1}`)) : []);
}

export async function fetchEmissionRecord(recordId) {
  assertBackendConfigured();
  if (!recordId) return null;
  const payload = await apiRequest(`/records/${recordId}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const raw = payload?.item || payload?.record || payload?.data?.item || payload?.data?.record || payload?.data || payload;
  return raw ? normalizeRecord(raw, recordId) : null;
}

export async function fetchEmissionRecordRevisions(recordId) {
  assertBackendConfigured();
  if (!recordId) return [];
  const payload = await apiRequest(`/records/${recordId}/revisions`, {
    method: "GET",
    headers: authHeaders(),
  });
  const rawItems = payload?.items || payload?.revisions || payload?.data?.items || payload?.data?.revisions || payload?.data || payload;
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item) => ({
    id: cleanString(item?.id),
    revisionNo: Number(item?.revisionNo || item?.revision_no || 0),
    changedAt: cleanString(item?.changedAt || item?.changed_at),
    changeReason: cleanString(item?.changeReason || item?.change_reason),
    changedByName: cleanString(item?.changedByName || item?.changed_by_name),
    changedByEmail: cleanString(item?.changedByEmail || item?.changed_by_email),
    snapshot: item?.snapshot || null,
  }));
}

function normalizeValidationDecision(input = {}) {
  return {
    id: cleanString(input.id),
    recordId: cleanString(input.recordId || input.record_id),
    decision: cleanString(input.decision),
    actor: cleanString(input.actor || input.actorName || input.actor_name || "Sistema"),
    actorId: cleanString(input.actorId || input.actor_id),
    ts: cleanString(input.ts || input.createdAt || input.created_at) || new Date().toISOString(),
    comment: cleanString(input.comment),
    criteria: Array.isArray(input.criteria) ? input.criteria : [],
  };
}

function normalizeValidationQueueItem(input = {}, index = 0) {
  const record = normalizeRecord(input.record || {}, input.recordId || input.record_id || input.id || `validation-record-${index + 1}`);
  return {
    id: cleanString(input.id) || record.id,
    recordId: cleanString(input.recordId || input.record_id) || record.id,
    priority: cleanString(input.priority, "normal") || "normal",
    reason: cleanString(input.reason, "Registro pendiente de validación administrativa."),
    submittedAt: cleanString(input.submittedAt || input.submitted_at || record.createdAt) || record.createdAt,
    assignedTo: cleanString(input.assignedTo || input.assigned_to || "Administración"),
    latestValidationDecision: cleanString(input.latestValidationDecision || input.latest_validation_decision),
    latestValidationComment: cleanString(input.latestValidationComment || input.latest_validation_comment),
    latestValidationAt: cleanString(input.latestValidationAt || input.latest_validation_at),
    latestValidationActor: cleanString(input.latestValidationActor || input.latest_validation_actor),
    record,
  };
}

export async function fetchRecordValidationQueue() {
  assertBackendConfigured();
  const payload = await apiRequest("/records/validation/queue", {
    method: "GET",
    headers: authHeaders(),
  });
  const rawItems = payload?.items || payload?.queue || payload?.data?.items || payload?.data?.queue || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeValidationQueueItem) : [];
}

export async function fetchRecordValidationDecisions(recordId = "") {
  assertBackendConfigured();
  const query = recordId ? `?recordId=${encodeURIComponent(recordId)}` : "";
  const payload = await apiRequest(`/records/validation/decisions${query}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const rawItems = payload?.items || payload?.decisions || payload?.data?.items || payload?.data?.decisions || payload?.data || payload;
  return Array.isArray(rawItems) ? rawItems.map(normalizeValidationDecision) : [];
}

export async function decideRecordValidation({ ids, decision, comment = "", criteria = [] }) {
  assertBackendConfigured();
  const payload = await apiRequest("/records/validation/decisions", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids, decision, comment, criteria }),
  });
  const decisions = payload?.decisions || payload?.data?.decisions || [];
  const queue = payload?.queue || payload?.items || payload?.data?.queue || payload?.data?.items || [];
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("carbontrack:records-validation-updated", { detail: { ids, decision } }));
  }
  return {
    ok: true,
    decisions: Array.isArray(decisions) ? decisions.map(normalizeValidationDecision) : [],
    queue: Array.isArray(queue) ? queue.map(normalizeValidationQueueItem) : [],
  };
}

export async function createEmissionRecord(input) {
  assertBackendConfigured();
  const evidenceUpload = input?.evidenceUpload || null;
  let uploadedFile = null;
  if (evidenceUpload?.file) {
    uploadedFile = await uploadEvidenceFile(evidenceUpload.file, evidenceUpload.kind || "other");
  }

  const payload = normalizeRecord(
    {
      ...input,
      evidenceFileId: uploadedFile?.id || input?.evidenceFileId || null,
      evidenceFiles:
        uploadedFile && uploadedFile.id
          ? [
              {
                id: uploadedFile.id,
                fileName: uploadedFile.file_name || uploadedFile.fileName || evidenceUpload?.file?.name,
                mimeType: uploadedFile.mime_type || uploadedFile.mimeType || evidenceUpload?.file?.type,
                sizeBytes: uploadedFile.size_bytes || uploadedFile.sizeBytes || evidenceUpload?.file?.size,
                url: uploadedFile.url || uploadedFile.downloadUrl || "",
                purpose: "evidence",
              },
            ]
          : input?.evidenceFiles || [],
      hasEvidence: Boolean(uploadedFile?.id || input?.hasEvidence),
      evidence: uploadedFile?.file_name || uploadedFile?.fileName || input?.evidence || "",
      evidenceUrl: uploadedFile?.url || uploadedFile?.downloadUrl || input?.evidenceUrl || input?.evidence || "",
    },
    input?.id || `rec-${Date.now()}`
  );

  const recordPayload = buildRecordPayload(payload);
  const response = await apiRequest("/records", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(recordPayload),
  });
  const record = normalizeRecord(
    response?.record || response?.item || response?.data?.record || response?.data?.item || response?.data || response,
    payload.id
  );
  if (uploadedFile?.id) {
    await attachEvidenceFileToRecord(record.id, uploadedFile.id).catch(() => {});
  }
  emitRecord(record);
  return { ok: true, record: { ...record, persisted: true } };
}

export async function archiveEmissionRecord(recordId, input = {}) {
  assertBackendConfigured();
  const response = await apiRequest(`/records/${recordId}/archive`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({
      reason: cleanString(input.reason),
      requestedAt: cleanString(input.requestedAt) || new Date().toISOString(),
      requestedBy: input.requestedBy || null,
      permission: cleanString(input.permission, "records:archive") || "records:archive",
    }),
  });

  const record = normalizeRecord(
    response?.record || response?.item || response?.data?.record || response?.data?.item || response?.data || response,
    recordId
  );
  emitRecordArchived(recordId);
  return { ok: true, record };
}
