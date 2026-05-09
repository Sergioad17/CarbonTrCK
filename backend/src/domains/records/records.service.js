import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import {
  archiveRecord,
  createRecord,
  decideRecords,
  getRecordByIdForActor,
  listValidationDecisions,
  listValidationQueue,
  listRecordRevisionsForActor,
  listRecords,
} from "./records.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "A valid request body is required.",
    });
  }
}

export async function listRecordsService(actor, filters) {
  return listRecords(actor, filters);
}

export async function getRecordService(actor, recordId) {
  assertRequiredString(recordId, "recordId");
  const record = await getRecordByIdForActor(actor, recordId);
  if (!record) {
    throw new AppError({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Record not found.",
    });
  }
  return record;
}

export async function listRecordRevisionsService(actor, recordId) {
  assertRequiredString(recordId, "recordId");
  const revisions = await listRecordRevisionsForActor(actor, recordId);
  if (revisions === null) {
    throw new AppError({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Record not found.",
    });
  }
  return revisions;
}

export async function createRecordService(actor, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(payload.dateISO, "dateISO");
  assertRequiredString(payload.campusCode, "campusCode");
  assertRequiredString(payload.scope, "scope");
  assertRequiredString(payload.category, "category");
  assertRequiredString(payload.metric, "metric");
  assertRequiredString(payload.unit, "unit");
  assertRequiredString(payload.source, "source");

  if (!String(payload.areaCode || payload.area || "").trim()) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "areaCode or area is required.",
      details: { field: "areaCode" },
    });
  }

  if (!String(payload.activity || payload.activityText || "").trim()) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "activity or activityText is required.",
      details: { field: "activityText" },
    });
  }

  return createRecord(actor, payload, auditContext);
}

export async function archiveRecordService(actor, recordId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(recordId, "recordId");
  assertRequiredString(payload.reason, "reason");

  if (String(payload.reason || "").trim().length < 12) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "reason must contain at least 12 characters.",
      details: { field: "reason" },
    });
  }

  return archiveRecord(actor, recordId, payload, auditContext);
}

const REQUIRED_VALIDATION_CRITERIA = ["evidence", "period", "factor", "area"];

function criteriaById(criteria = []) {
  return new Map(
    (Array.isArray(criteria) ? criteria : [])
      .filter((criterion) => criterion && typeof criterion === "object")
      .map((criterion) => [String(criterion.id || "").trim(), criterion]),
  );
}

export async function listValidationQueueService(actor) {
  return listValidationQueue(actor);
}

export async function listValidationDecisionsService(actor, filters) {
  return listValidationDecisions(actor, filters);
}

export async function decideRecordsService(actor, payload, auditContext) {
  ensureObject(payload);

  const decision = String(payload.decision || "").trim();
  if (!["approved", "rejected", "returned"].includes(decision)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "decision must be approved, rejected or returned.",
      details: { field: "decision" },
    });
  }

  if (!Array.isArray(payload.ids) || payload.ids.length < 1) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "ids must include at least one record id.",
      details: { field: "ids" },
    });
  }

  if (decision !== "approved" && String(payload.comment || "").trim().length < 8) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "comment must contain at least 8 characters when returning or rejecting records.",
      details: { field: "comment" },
    });
  }

  const criteriaMap = criteriaById(payload.criteria);
  const missingOrFailedRequired = REQUIRED_VALIDATION_CRITERIA.filter((id) => criteriaMap.get(id)?.passed !== true);

  if (decision === "approved" && missingOrFailedRequired.length > 0) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "required validation criteria must be passed before approving records.",
      details: { field: "criteria", missing: missingOrFailedRequired },
    });
  }

  if (decision === "returned" && missingOrFailedRequired.length < 1) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "at least one required validation criterion must be marked as failed when returning records.",
      details: { field: "criteria" },
    });
  }

  return decideRecords(actor, payload, auditContext);
}
