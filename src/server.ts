import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info("HTTP server started", {
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

function shutdown(signal: string): void {
  logger.info("Shutdown signal received", { signal });

  server.close((error) => {
    if (error) {
      logger.error("Failed to close HTTP server", {
        message: error.message,
      });

      process.exit(1);
    }

    logger.info("HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });

  shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack,
  });

  shutdown("UNCAUGHT_EXCEPTION");
});