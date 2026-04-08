import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import { createRecord, listRecords } from "./records.repository.js";

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
