import { describe, expect, it } from "vitest";

import { DefaultLinkedinHttpClient } from "../src/clients/index.js";
import { ErrorCode } from "../src/types/error.types.js";
import type { LinkedinAuthHeadersProvider } from "../src/types/linkedin-auth.types.js";
import { AppError } from "../src/utils/app-error.js";

const authHeadersProvider: LinkedinAuthHeadersProvider = () => ({
  accept: "application/vnd.linkedin.normalized+json+2.1",
  cookie: "synthetic-cookie-header",
  "csrf-token": "ajax:synthetic",
  "x-restli-protocol-version": "2.0.0",
  "x-li-lang": "en_US",
  "user-agent": "Synthetic Test User Agent",
});

function createClient(fetchImplementation: typeof fetch) {
  return new DefaultLinkedinHttpClient({
    baseUrl: "https://www.linkedin.com",
    timeoutMs: 5_000,
    fetchImplementation,
    authHeadersProvider,
  });
}

describe("DefaultLinkedinHttpClient", () => {
  it("builds direct LinkedIn HTTP requests with auth headers", async () => {
    let capturedUrl = "";
    let capturedCookie = "";

    const client = createClient(async (input, init) => {
      capturedUrl =
        input instanceof URL ? input.toString() : String(input);
      capturedCookie = new Headers(init?.headers).get("cookie") ?? "";

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    });

    const response = await client.get<{ ok: boolean }>(
      "/voyager/api/synthetic",
      {
        query: {
          identifier: "example-profile",
          includeDetails: true,
        },
      },
    );

    expect(response.data.ok).toBe(true);
    expect(capturedUrl).toBe(
      "https://www.linkedin.com/voyager/api/synthetic?identifier=example-profile&includeDetails=true",
    );
    expect(capturedCookie).toBe("synthetic-cookie-header");
  });

  it.each([
    [401, ErrorCode.LINKEDIN_AUTH_REQUIRED, 502],
    [403, ErrorCode.FORBIDDEN, 502],
    [404, ErrorCode.NOT_FOUND, 404],
    [429, ErrorCode.RATE_LIMIT_EXCEEDED, 503],
    [500, ErrorCode.SCRAPING_FAILED, 502],
  ])(
    "maps upstream %s responses",
    async (upstreamStatus, errorCode, statusCode) => {
      const client = createClient(async () =>
        new Response(JSON.stringify({ message: "Synthetic failure" }), {
          status: upstreamStatus,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

      await expect(
        client.get("/voyager/api/synthetic"),
      ).rejects.toMatchObject({
        code: errorCode,
        statusCode,
      });
    },
  );

  it("rejects non-JSON and malformed JSON upstream responses", async () => {
    await expect(
      createClient(async () =>
        new Response("not json", {
          status: 200,
          headers: {
            "content-type": "text/html",
          },
        }),
      ).get("/voyager/api/synthetic"),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      createClient(async () =>
        new Response("{", {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ).get("/voyager/api/synthetic"),
    ).rejects.toMatchObject({
      code: ErrorCode.SCRAPING_FAILED,
    });
  });
});
