import { Router } from "express";

import { scrapeProfile } from "../controllers/profile.controller.js";
import { requireApiKey } from "../middleware/api-key.middleware.js";

export const profileRouter = Router();

profileRouter.post("/scrape", requireApiKey, scrapeProfile);
