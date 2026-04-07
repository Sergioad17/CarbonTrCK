import { AppError } from "../errors/app-error.js";
import { logger } from "../logger/index.js";

export function errorHandler(error, request, response, _next) {
  const appError =
    error instanceof AppError
      ? error
      : new AppError({
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        });

  if (appError.statusCode >= 500) {
    logger.error(
      {
        requestId: request.requestId,
        err: error,
      },
      "request_failed",
    );
  }

  response.status(appError.statusCode).json({
    code: appError.code,
    message: appError.message,
    details: appError.details || undefined,
    requestId: request.requestId,
  });
}
