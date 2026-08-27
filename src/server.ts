import { createApp } from "./app.js";

const DEFAULT_PORT = 3000;

const parsedPort = Number.parseInt(
    process.env.PORT ?? String(DEFAULT_PORT),
    10,
)

const port = Number.isNaN(parsedPort) ? DEFAULT_PORT : parsedPort;

const app = createApp()

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})

function shutdown(signal : string): void {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close((error) => {
    if (error) {
      console.error("Failed to close the HTTP server:", error);
      process.exit(1);
    }

    console.log("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});