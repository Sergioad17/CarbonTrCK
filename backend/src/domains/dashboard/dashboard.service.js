import { AppError } from "../../shared/errors/app-error.js";
import { listDashboardActivity, persistDashboardActivity } from "./dashboard.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "A valid request body is required.",
    });
  }
}

export async function getDashboardActivityService(actor) {
  return listDashboardActivity(actor);
}

export async function putDashboardActivityService(actor, payload, auditContext) {
  ensureObject(payload);

  if (!Array.isArray(payload.items)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "items must be an array.",
      details: { field: "items" },
    });
  }

  return persistDashboardActivity(actor, payload.items, auditContext);
}
