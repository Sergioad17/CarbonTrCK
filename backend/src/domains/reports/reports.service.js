import { AppError } from "../../shared/errors/app-error.js";
import { generateReport } from "./reports.repository.js";

function ensureObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: "A valid request body is required.",
    });
  }
}

export async function generateReportService(actor, payload) {
  ensureObject(payload);
  return generateReport(actor, payload.filters || payload);
}
