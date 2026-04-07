import { AppError } from "../errors/app-error.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function assertEmail(email) {
  if (!emailPattern.test(String(email || "").trim())) {
    throw new AppError({
      statusCode: 422,
      code: "INVALID_EMAIL",
      message: "A valid email address is required.",
    });
  }
}

export function assertRequiredString(value, field, message) {
  if (!String(value || "").trim()) {
    throw new AppError({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message: message || `${field} is required.`,
      details: { field },
    });
  }
}
