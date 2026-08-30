import { describe, expect, it } from "vitest";

import { TtlCache } from "../src/cache/ttl-cache.js";
import { getApiKeyScope } from "../src/middleware/api-key.middleware.js";
import { createApiKeyRateLimiter } from "../src/middleware/rate-limit.middleware.js";
import { ErrorCode } from "../src/types/error.types.js";
import { AppError } from "../src/utils/app-error.js";

describe("TTL cache", () => {
  it("expires entries and evicts the oldest entry when bounded", () => {
    let now = 1_000;
    const cache = new TtlCache<string, { value: string }>({
      maxEntries: 1,
      ttlMs: 100,
      now: () => now,
    });

    cache.set("a", { value: "one" });
    cache.set("b", { value: "two" });

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toEqual({ value: "two" });

    now += 101;

    expect(cache.get("b")).toBeUndefined();
  });

  it("returns clones so callers cannot mutate cached values", () => {
    const cache = new TtlCache<string, { nested: { value: string } }>({
      maxEntries: 2,
      ttlMs: 1_000,
    });

    cache.set("a", {
      nested: {
        value: "original",
      },
    });

    const cached = cache.get("a");

    if (!cached) {
      throw new Error("Expected cached value");
    }

    cached.nested.value = "mutated";

    expect(cache.get("a")?.nested.value).toBe("original");
  });
});

describe("API-key rate limiter", () => {
  it("limits requests per API key scope", () => {
    let now = 1_000;
    const limiter = createApiKeyRateLimiter({
      windowMs: 1_000,
      maxRequests: 1,
      now: () => now,
    });
    const firstScope = getApiKeyScope("synthetic-one");
    const secondScope = getApiKeyScope("synthetic-two");

    function run(scope: string): unknown {
      let nextError: unknown = null;

      limiter(
        {} as Parameters<typeof limiter>[0],
        {
          locals: {
            apiKeyScope: scope,
          },
        } as Parameters<typeof limiter>[1],
        (error?: unknown) => {
          nextError = error ?? null;
        },
      );

      return nextError;
    }

    expect(run(firstScope)).toBeNull();
    expect(run(firstScope)).toBeInstanceOf(AppError);
    expect(run(secondScope)).toBeNull();

    now += 1_001;

    expect(run(firstScope)).toBeNull();

    const error = run(firstScope);

    expect(error).toMatchObject({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
    });
  });
});
