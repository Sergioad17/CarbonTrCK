import { AppError } from "../errors/app-error.js";

const postgresErrorMap = {
  "22P02": { statusCode: 400, code: "INVALID_INPUT", message: "Invalid input syntax." },
  "23502": { statusCode: 422, code: "REQUIRED_FIELD", message: "A required field is missing." },
  "23503": { statusCode: 409, code: "REFERENCE_CONFLICT", message: "Referenced resource does not exist or cannot be linked." },
  "23505": { statusCode: 409, code: "CONFLICT", message: "Resource already exists." },
  "23514": { statusCode: 422, code: "CONSTRAINT_VIOLATION", message: "The submitted data violates a business rule." },
};

export function mapDatabaseError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (!error?.code || !postgresErrorMap[error.code]) {
    return error;
  }

  const mapped = postgresErrorMap[error.code];
  return new AppError({
    statusCode: mapped.statusCode,
    code: mapped.code,
    message: mapped.message,
    details: {
      constraint: error.constraint,
      detail: error.detail,
    },
  });
}
