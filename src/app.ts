import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import { apiRouter } from "./routes/index.js";

interface RootResponse {
    success: true;
    data: {
        name: string;
        version: string;
        documentation: string;
        health: string;
    }
}


export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get(
    "/",
    (_request: Request, response: Response<RootResponse>) => {
      response.status(200).json({
        success: true,
        data: {
          name: "LinkedIn Profile API",
          version: "1.0.0",
          documentation: "/api/docs",
          health: "/api/v1/health",
        },
      });
    },
  );

  app.use("/api", apiRouter);

  /*
   * Keep these two middleware registrations after all valid routes.
   */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}