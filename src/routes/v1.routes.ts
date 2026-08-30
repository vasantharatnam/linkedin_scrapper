import { Router } from "express";

import { healthRouter } from "./health.routes.js";
import { profileRouter } from "./profile.routes.js";

export const v1Router = Router()

v1Router.use("/health" , healthRouter);
v1Router.use("/profiles", profileRouter);
