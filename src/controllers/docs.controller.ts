import type { Request, Response } from "express";

import { openApiDocument } from "../docs/openapi.js";

export function getOpenApiDocument(
  _request: Request,
  response: Response,
): void {
  response.status(200).json(openApiDocument);
}
