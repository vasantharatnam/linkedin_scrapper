import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import {
  ErrorCode,
  type ErrorResponse,
} from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";



interface BodyParserError extends Error {
  status: number;
  type: string;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Partial<BodyParserError>;

  return (
    candidate.status === 400 &&
    candidate.type === "entity.parse.failed"
  );
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response<ErrorResponse>,
  _next: NextFunction,
): void {

  if (isBodyParserError(error)) {
  response.status(400).json({
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: "Request body contains invalid JSON",
    },
  });

  return;
}


  if (error instanceof ZodError) {
    const responseBody: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Request validation failed",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    };

    response.status(400).json(responseBody);
    return;
  }

  if (error instanceof AppError) {
    logger.warn("Operational request error", {
      method: request.method,
      path: request.originalUrl,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    });

    const responseBody: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined
          ? { details: error.details }
          : {}),
      },
    };

    response.status(error.statusCode).json(responseBody);
    return;
  }

  const normalizedError =
    error instanceof Error ? error : new Error("Unknown error");

  logger.error("Unexpected request error", {
    method: request.method,
    path: request.originalUrl,
    message: normalizedError.message,
    ...(env.NODE_ENV !== "production"
      ? { stack: normalizedError.stack }
      : {}),
  });

  const responseBody: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      ...(env.NODE_ENV !== "production"
        ? {
            details: {
              message: normalizedError.message,
            },
          }
        : {}),
    },
  };

  response.status(500).json(responseBody);
}
