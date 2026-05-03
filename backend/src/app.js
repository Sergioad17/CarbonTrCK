import cors from "cors";
import express from "express";
import { registerRoutes } from "./routes/index.js";
import { env } from "./shared/config/env.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { notFoundHandler } from "./shared/middleware/not-found.js";
import { requestIdMiddleware } from "./shared/middleware/request-id.js";
import { requestLoggerMiddleware } from "./shared/middleware/request-logger.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.disable("etag");
  app.use(requestIdMiddleware);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLoggerMiddleware);

  registerRoutes(app, { env });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
