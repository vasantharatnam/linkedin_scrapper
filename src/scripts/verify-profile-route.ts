import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { createScrapeProfileController } from "../controllers/profile.controller.js";
import { normalizeLinkedinBasicProfile } from "../linkedin/index.js";
import type { ScrapeProfileResponse } from "../schemas/index.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

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

function createMockResponse() {
  const state: {
    statusCode: number | null;
    body: ScrapeProfileResponse | null;
  } = {
    statusCode: null,
    body: null,
  };

  const response = {
    status(statusCode: number) {
      state.statusCode = statusCode;

      return this;
    },
    json(body: ScrapeProfileResponse) {
      state.body = body;

      return this;
    },
  } as Response<ScrapeProfileResponse>;

  return {
    response,
    state,
  };
}

let requestedUrl: string | null = null;

const controller = createScrapeProfileController({
  async retrieveProfile({ linkedinUrl }) {
    requestedUrl = linkedinUrl;

    return profile;
  },
});

const successResponse = createMockResponse();
let nextError: unknown = null;
const next: NextFunction = (error?: unknown) => {
  nextError = error;
};

await controller(
  {
    body: {
      linkedinUrl: "https://www.linkedin.com/in/example-profile/",
    },
  } as Request,
  successResponse.response,
  next,
);

if (nextError) {
  throw nextError;
}

if (requestedUrl !== "https://www.linkedin.com/in/example-profile/") {
  throw new Error("Expected request URL to be passed to service");
}

if (successResponse.state.statusCode !== 200) {
  throw new Error("Expected successful status code");
}

if (successResponse.state.body?.success !== true) {
  throw new Error("Expected successful response body");
}

if (successResponse.state.body.meta.cached !== false) {
  throw new Error("Expected uncached response metadata");
}

if (!Date.parse(successResponse.state.body.meta.scrapedAt)) {
  throw new Error("Expected ISO scrapedAt metadata");
}

nextError = null;

await controller(
  {
    body: {
      linkedinUrl: "",
    },
  } as Request,
  createMockResponse().response,
  next,
);

if (!(nextError instanceof ZodError)) {
  throw new Error("Expected validation errors to be passed to next");
}

const upstreamError = new AppError({
  statusCode: 404,
  code: ErrorCode.NOT_FOUND,
  message: "Synthetic upstream miss",
});

const failingController = createScrapeProfileController({
  async retrieveProfile() {
    throw upstreamError;
  },
});

nextError = null;

await failingController(
  {
    body: {
      linkedinUrl: "https://www.linkedin.com/in/example-profile/",
    },
  } as Request,
  createMockResponse().response,
  next,
);

if (nextError !== upstreamError) {
  throw new Error("Expected upstream errors to be passed to next");
}

console.log("Profile route controller verification passed.");
