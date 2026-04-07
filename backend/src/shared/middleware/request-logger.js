import { logger } from "../logger/index.js";

export function requestLoggerMiddleware(request, response, next) {
  const startedAt = process.hrtime.bigint();

  logger.info(
    {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
    },
    "request_started",
  );

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(
      {
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      "request_completed",
    );
  });

  next();
}
