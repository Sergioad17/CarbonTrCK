import { AppError } from "../../shared/errors/app-error.js";
import {
  createProfileChangeRequest,
  listProfileChangeRequests,
  updateProfileChangeRequest,
} from "./profile-change-requests.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

function assertRequiredString(value, field) {
  if (!String(value ?? "").trim()) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: `${field} is required.`, details: { field } });
  }
}

export async function listProfileChangeRequestsService(actor) {
  return listProfileChangeRequests(actor);
}

export async function createProfileChangeRequestService(actor, payload) {
  ensureObject(payload);
  assertRequiredString(payload.type, "type");
  assertRequiredString(payload.reason, "reason");
  return createProfileChangeRequest(actor, payload);
}

export async function updateProfileChangeRequestService(actor, requestId, payload) {
  ensureObject(payload);
  assertRequiredString(requestId, "requestId");
  return updateProfileChangeRequest(actor, requestId, payload);
}
