import { AppError } from "../../shared/errors/app-error.js";
import { assertRequiredString } from "../../shared/utils/validation.js";
import { createAction, listActions, updateAction } from "./actions.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

export async function listActionsService(actor) {
  return listActions(actor);
}

export async function createActionService(actor, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(payload.targetId, "targetId");
  assertRequiredString(payload.title, "title");
  return createAction(actor, payload, auditContext);
}

export async function updateActionService(actor, actionId, payload, auditContext) {
  ensureObject(payload);
  assertRequiredString(actionId, "actionId");
  return updateAction(actor, actionId, payload, auditContext);
}
