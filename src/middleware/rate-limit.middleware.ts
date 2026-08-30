import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";

interface RateLimitEntry {
  resetAt: number;
  count: number;
}

interface ApiKeyRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  now?: () => number;
}

export function createApiKeyRateLimiter({
  windowMs,
  maxRequests,
  now = Date.now,
}: ApiKeyRateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return function apiKeyRateLimiter(
    _request: Request,
    _response: Response,
    next: NextFunction,
  ): void {
    const apiKeyScope =
      typeof _response.locals.apiKeyScope === "string"
        ? _response.locals.apiKeyScope
        : "anonymous";
    const currentTime = now();
    const entry = entries.get(apiKeyScope);

    if (!entry || entry.resetAt <= currentTime) {
      entries.set(apiKeyScope, {
        resetAt: currentTime + windowMs,
        count: 1,
      });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count <= maxRequests) {
      next();
      return;
    }

    next(
      new AppError({
        statusCode: 429,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: "API rate limit exceeded",
        details: {
          retryAfterSeconds: Math.ceil(
            (entry.resetAt - currentTime) / 1_000,
          ),
        },
      }),
    );
  };
}

export const apiKeyRateLimiter = createApiKeyRateLimiter({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS,
});
