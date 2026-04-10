import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import { createTarget, deleteTarget, listTargets, updateTarget, updateTargetStatus } from "./targets.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

export async function listTargetsService(actor) {
  return listTargets(actor);
}

export async function createTargetService(actor, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(payload.title, "title");
  assertRequiredString(payload.type, "type");
  assertRequiredString(payload.metric, "metric");
  assertRequiredString(payload.unit, "unit");
  return createTarget(actor, payload, auditContext);
}

export async function updateTargetService(actor, targetId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(targetId, "targetId");
  return updateTarget(actor, targetId, payload, auditContext);
}

export async function updateTargetStatusService(actor, targetId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(targetId, "targetId");
  return updateTargetStatus(actor, targetId, payload, auditContext);
}

export async function deleteTargetService(actor, targetId, auditContext) {
  assertRequiredString(targetId, "targetId");
  return deleteTarget(actor, targetId, auditContext);
}
