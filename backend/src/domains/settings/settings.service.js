import { AppError } from "../../shared/errors/app-error.js";
import { getSettings, upsertSettings } from "./settings.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

export async function getSettingsService(actor, auditContext) {
  return getSettings(actor, auditContext);
}

export async function upsertSettingsService(actor, payload, auditContext) {
  ensureObject(payload);
  return upsertSettings(actor, payload, auditContext);
}
