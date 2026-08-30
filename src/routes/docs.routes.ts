import { Router } from "express";

import { getOpenApiDocument } from "../controllers/docs.controller.js";

export const docsRouter = Router();

docsRouter.get("/", getOpenApiDocument);
docsRouter.get("/openapi.json", getOpenApiDocument);
