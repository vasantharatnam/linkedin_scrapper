import { Router } from "express";

import { scrapeProfile } from "../controllers/profile.controller.js";

export const profileRouter = Router();

profileRouter.post("/scrape", scrapeProfile);
