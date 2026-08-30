import { Router } from "express";

import { docsRouter } from "./docs.routes.js";
import { v1Router } from "./v1.routes.js";

export const apiRouter = Router()

apiRouter.use("/docs" , docsRouter)
apiRouter.use("/v1" , v1Router)
