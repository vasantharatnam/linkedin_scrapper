import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { TtlCache } from "../src/cache/ttl-cache.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { createProfileRouter } from "../src/routes/profile.routes.js";
import type { LinkedinProfile } from "../src/schemas/index.js";
import { ErrorCode } from "../src/types/error.types.js";
import { AppError } from "../src/utils/app-error.js";
import { createApp } from "../src/app.js";
import { normalizeLinkedinBasicProfile } from "../src/linkedin/index.js";
import { parseLinkedinProfileUrl } from "../src/utils/linkedin-url.js";

const apiKey = process.env.API_KEY ?? "synthetic-test-api-key";

function createProfile(): LinkedinProfile {
  return normalizeLinkedinBasicProfile({
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
}

function createTestApp({
  service,
}: {
  service: {
    retrieveProfile(options: {
      linkedinUrl: string;
    }): Promise<LinkedinProfile>;
  };
}) {
  const app = express();

  app.use(express.json());
  app.use(
    "/api/v1/profiles",
    createProfileRouter({
      controllerOptions: {
        cache: new TtlCache<string, LinkedinProfile>({
          maxEntries: 10,
          ttlMs: 60_000,
        }),
        service,
      },
      rateLimiter: (_request, _response, next) => {
        next();
      },
    }),
  );
  app.use(errorHandler);

  return app;
}

describe("profile API integration", () => {
  it("keeps the health endpoint public", async () => {
    await request(createApp())
      .get("/api/v1/health")
      .expect(200)
      .expect((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe("healthy");
      });
  });

  it("requires X-API-Key for profile scraping", async () => {
    await request(
      createTestApp({
        service: {
          async retrieveProfile() {
            return createProfile();
          },
        },
      }),
    )
      .post("/api/v1/profiles/scrape")
      .send({
        linkedinUrl: "https://www.linkedin.com/in/example-profile/",
      })
      .expect(401)
      .expect((response) => {
        expect(response.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
      });
  });

  it("normalizes successful profile responses and caches by API key scope", async () => {
    let serviceCalls = 0;
    const app = createTestApp({
      service: {
        async retrieveProfile() {
          serviceCalls += 1;

          return createProfile();
        },
      },
    });

    await request(app)
      .post("/api/v1/profiles/scrape")
      .set("X-API-Key", apiKey)
      .send({
        linkedinUrl:
          "https://www.linkedin.com/in/example-profile/?trk=synthetic",
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.meta.cached).toBe(false);
        expect(response.body.data.profileUrl).toBe(
          "https://www.linkedin.com/in/example-profile/",
        );
      });

    await request(app)
      .post("/api/v1/profiles/scrape")
      .set("X-API-Key", apiKey)
      .send({
        linkedinUrl: "https://www.linkedin.com/in/example-profile/",
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.meta.cached).toBe(true);
      });

    expect(serviceCalls).toBe(1);
  });

  it("returns validation errors for invalid LinkedIn URLs", async () => {
    await request(
      createTestApp({
        service: {
          async retrieveProfile() {
            return createProfile();
          },
        },
      }),
    )
      .post("/api/v1/profiles/scrape")
      .set("X-API-Key", apiKey)
      .send({
        linkedinUrl: "https://example.com/in/example-profile/",
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe(
          ErrorCode.INVALID_LINKEDIN_URL,
        );
      });
  });

  it("does not cache failed profile retrievals", async () => {
    let serviceCalls = 0;
    const app = createTestApp({
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

    for (const _attempt of [1, 2]) {
      await request(app)
        .post("/api/v1/profiles/scrape")
        .set("X-API-Key", apiKey)
        .send({
          linkedinUrl: "https://www.linkedin.com/in/example-profile/",
        })
        .expect(502);
    }

    expect(serviceCalls).toBe(2);
  });
});
