import type { NextFunction, Request, Response } from "express";

import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";

export function notFoundHandler(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(
    new AppError({
      statusCode: 404,
      code: ErrorCode.NOT_FOUND,
      message: `Route ${request.method} ${request.originalUrl} was not found`,
    }),
  );
}