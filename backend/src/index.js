import { createApp } from "./app.js";
import { env } from "./shared/config/env.js";
import { closePool } from "./shared/db/pool.js";
import { logger } from "./shared/logger/index.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "backend_started");
});

async function shutdown(signal) {
  logger.info({ signal }, "backend_shutdown_started");
  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "backend_shutdown_http_close_failed");
      process.exitCode = 1;
    }

    try {
      await closePool();
      logger.info("backend_shutdown_completed");
    } catch (closeError) {
      logger.error({ err: closeError }, "backend_shutdown_pool_close_failed");
      process.exitCode = 1;
    } finally {
      process.exit();
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled_rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught_exception");
  process.exit(1);
});
