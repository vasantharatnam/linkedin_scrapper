import { Router } from "express";

import { scrapeProfile } from "../controllers/profile.controller.js";
import { requireApiKey } from "../middleware/api-key.middleware.js";
import { apiKeyRateLimiter } from "../middleware/rate-limit.middleware.js";

export const profileRouter = Router();

profileRouter.post(
  "/scrape",
  requireApiKey,
  apiKeyRateLimiter,
  scrapeProfile,
);
