import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";

const API_KEY_HEADER = "x-api-key";
const API_KEY_DIGEST_DOMAIN = "linkedin-profile-api:x-api-key:";

function digestApiKey(value: string): Buffer {
  return createHash("sha256")
    .update(API_KEY_DIGEST_DOMAIN)
    .update(value)
    .digest();
}

export function isValidApiKey(
  providedApiKey: string | undefined,
  expectedApiKey = env.API_KEY,
): boolean {
  const providedDigest = digestApiKey(providedApiKey ?? "");
  const expectedDigest = digestApiKey(expectedApiKey);

  return timingSafeEqual(providedDigest, expectedDigest);
}

export function requireApiKey(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  if (isValidApiKey(request.get(API_KEY_HEADER))) {
    next();
    return;
  }

  next(
    new AppError({
      statusCode: 401,
      code: ErrorCode.UNAUTHORIZED,
      message: "A valid API key is required",
    }),
  );
}
