import type { NextFunction, Request, Response } from "express";

import { TtlCache } from "../cache/ttl-cache.js";
import { createScrapeProfileController } from "../controllers/profile.controller.js";
import {
  getApiKeyScope,
  isValidApiKey,
} from "../middleware/api-key.middleware.js";
import { createApiKeyRateLimiter } from "../middleware/rate-limit.middleware.js";
import { normalizeLinkedinBasicProfile } from "../linkedin/index.js";
import type { LinkedinProfile } from "../schemas/index.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

let now = 1_000;
const cache = new TtlCache<string, LinkedinProfile>({
  maxEntries: 2,
  ttlMs: 1_000,
  now: () => now,
});
const profile = normalizeLinkedinBasicProfile({
  profileUrl: parseLinkedinProfileUrl(
    "https://www.linkedin.com/in/example-profile/",
  ),
  response: {
    data: {
      publicIdentifier: "example-profile",
      firstName: "Example",
      lastName: "Person",
    },
    included: [],
  },
});

let serviceCalls = 0;
const controller = createScrapeProfileController({
  cache,
  service: {
    async retrieveProfile() {
      serviceCalls += 1;

      return profile;
    },
  },
});

function createResponse(apiKeyScope: string) {
  const state: {
    statusCode: number | null;
    body: unknown;
  } = {
    statusCode: null,
    body: null,
  };
  const response = {
    locals: {
      apiKeyScope,
    },
    status(statusCode: number) {
      state.statusCode = statusCode;

      return this;
    },
    json(body: unknown) {
      state.body = body;

      return this;
    },
  } as unknown as Response;

  return {
    response,
    state,
  };
}

async function callController(apiKeyScope: string) {
  const response = createResponse(apiKeyScope);
  let nextError: unknown = null;
  const next: NextFunction = (error?: unknown) => {
    nextError = error;
  };

  await controller(
    {
      body: {
        linkedinUrl:
          "https://www.linkedin.com/in/example-profile/?trk=synthetic",
      },
    } as unknown as Request,
    response.response,
    next,
  );

  if (nextError) {
    throw nextError;
  }

  return response.state.body as {
    meta?: {
      cached?: boolean;
    };
  };
}

const firstApiKeyScope = getApiKeyScope("synthetic-key-one");
const secondApiKeyScope = getApiKeyScope("synthetic-key-two");

const firstResponse = await callController(firstApiKeyScope);

if (firstResponse.meta?.cached !== false || serviceCalls !== 1) {
  throw new Error("Expected first request to miss cache");
}

const secondResponse = await callController(firstApiKeyScope);

if (secondResponse.meta?.cached !== true || serviceCalls !== 1) {
  throw new Error("Expected second request with same key to hit cache");
}

const isolatedResponse = await callController(secondApiKeyScope);

if (isolatedResponse.meta?.cached !== false || serviceCalls < 2) {
  throw new Error("Expected a different API key scope to miss cache");
}

now += 1_001;

const expiredResponse = await callController(firstApiKeyScope);

if (expiredResponse.meta?.cached !== false || serviceCalls < 3) {
  throw new Error("Expected expired cache entry to miss");
}

const failingController = createScrapeProfileController({
  cache,
  service: {
    async retrieveProfile() {
      serviceCalls += 1;
      throw new AppError({
        statusCode: 502,
        code: ErrorCode.SCRAPING_FAILED,
        message: "Synthetic upstream failure",
      });
    },
  },
});

let failureNextError: unknown = null;
await failingController(
  {
    body: {
      linkedinUrl: "https://www.linkedin.com/in/no-cache-failure/",
    },
  } as unknown as Request,
  createResponse(firstApiKeyScope).response,
  (error?: unknown) => {
    failureNextError = error;
  },
);

if (!(failureNextError instanceof AppError)) {
  throw new Error("Expected service failure to pass through");
}

const rateLimiter = createApiKeyRateLimiter({
  windowMs: 1_000,
  maxRequests: 2,
  now: () => now,
});

async function runRateLimit(apiKeyScope: string): Promise<unknown> {
  return new Promise((resolve) => {
    const response = {
      locals: {
        apiKeyScope,
      },
    } as unknown as Response;

    rateLimiter({} as unknown as Request, response, (error?: unknown) => {
      resolve(error ?? null);
    });
  });
}

if (!isValidApiKey("synthetic-key-one", "synthetic-key-one")) {
  throw new Error("Expected API key validation helper to remain usable");
}

if ((await runRateLimit(firstApiKeyScope)) !== null) {
  throw new Error("Expected first rate-limited request to pass");
}

if ((await runRateLimit(firstApiKeyScope)) !== null) {
  throw new Error("Expected second rate-limited request to pass");
}

const rateLimitError = await runRateLimit(firstApiKeyScope);

if (!(rateLimitError instanceof AppError)) {
  throw new Error("Expected third request to be rate limited");
}

if (rateLimitError.code !== ErrorCode.RATE_LIMIT_EXCEEDED) {
  throw new Error("Expected rate limit error code");
}

if ((await runRateLimit(secondApiKeyScope)) !== null) {
  throw new Error("Expected different API key scope to have separate limit");
}

console.log("Cache and rate-limit verification passed.");
