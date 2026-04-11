import { AppError } from "../../shared/errors/app-error.js";
import { getSettings, upsertSettings } from "./settings.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({ statusCode: 422, code: "VALIDATION_ERROR", message: "A valid request body is required." });
  }
}

export async function getSettingsService(actor) {
  return getSettings(actor);
}

export async function upsertSettingsService(actor, payload) {
  ensureObject(payload);
  return upsertSettings(actor, payload);
}
