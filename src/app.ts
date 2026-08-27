import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  app.get("/", (_request: Request, response: Response) => {
    response.status(200).json({
      success: true,
      message: "LinkedIn Profile API is running",
    });
  });

  /*
   * Keep these two middleware registrations after all valid routes.
   */
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}