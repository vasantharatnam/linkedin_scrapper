import { Router, type RequestHandler } from "express";

import {
  createScrapeProfileController,
  type ScrapeProfileControllerOptions,
} from "../controllers/profile.controller.js";
import { requireApiKey } from "../middleware/api-key.middleware.js";
import { apiKeyRateLimiter } from "../middleware/rate-limit.middleware.js";

export function createProfileRouter({
  controllerOptions,
  rateLimiter = apiKeyRateLimiter,
}: {
  controllerOptions?: ScrapeProfileControllerOptions;
  rateLimiter?: RequestHandler;
} = {}) {
  const router = Router();

  router.post(
    "/scrape",
    requireApiKey,
    rateLimiter,
    createScrapeProfileController(controllerOptions),
  );

  return router;
}

export const profileRouter = createProfileRouter();
