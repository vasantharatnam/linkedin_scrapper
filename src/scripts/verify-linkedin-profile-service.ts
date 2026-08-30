import { readFile } from "node:fs/promises";
import path from "node:path";

import { LinkedinProfileRetrievalService } from "../services/linkedin-profile.service.js";
import { ErrorCode } from "../types/error.types.js";
import type {
  LinkedinHttpClient,
  LinkedinHttpRequestOptions,
  LinkedinHttpResponse,
} from "../types/linkedin-http.types.js";
import { AppError } from "../utils/app-error.js";

const profileFixturePath = path.resolve(
  "fixtures/synthetic/linkedin/profile-normalized-response.fixture.json",
);
const skillsFixturePath = path.resolve(
  "fixtures/synthetic/linkedin/skills-normalized-response.fixture.json",
);

const profileFixtureEnvelope = JSON.parse(
  await readFile(profileFixturePath, "utf8"),
) as { response?: unknown };
const skillsFixtureEnvelope = JSON.parse(
  await readFile(skillsFixturePath, "utf8"),
) as { response?: unknown };

const capturedRequests: LinkedinHttpRequestOptions[] = [];

const mockHttpClient: LinkedinHttpClient = {
  async request<T>(
    options: LinkedinHttpRequestOptions,
  ): Promise<LinkedinHttpResponse<T>> {
    capturedRequests.push(options);

    if (options.path.includes("/skills/")) {
      return {
        status: 200,
        headers: new Headers(),
        data: skillsFixtureEnvelope.response as T,
      };
    }

    return {
      status: 200,
      headers: new Headers(),
      data: profileFixtureEnvelope.response as T,
    };
  },
  async get<T>(
    requestPath: string,
    options = {},
  ): Promise<LinkedinHttpResponse<T>> {
    return this.request<T>({
      ...options,
      method: "GET",
      path: requestPath,
    });
  },
};

const service = new LinkedinProfileRetrievalService({
  httpClient: mockHttpClient,
  endpointConfigProvider: () => ({
    profile: {
      method: "GET",
      path: "/voyager/api/synthetic/profile/{encodedPublicIdentifier}",
      query: {
        identifier: "{publicIdentifier}",
      },
    },
    skills: {
      method: "GET",
      path: "/voyager/api/synthetic/skills/{encodedPublicIdentifier}",
    },
  }),
});

const profile = await service.retrieveProfile({
  linkedinUrl:
    "https://www.linkedin.com/in/example-profile/?trk=synthetic",
});

if (profile.profileUrl !== "https://www.linkedin.com/in/example-profile/") {
  throw new Error("Expected canonical profile URL");
}

if (profile.skills.length !== 2) {
  throw new Error("Expected skills response to be combined");
}

if (capturedRequests.length !== 2) {
  throw new Error("Expected profile and skills requests");
}

if (
  capturedRequests[0]?.path !==
  "/voyager/api/synthetic/profile/example-profile"
) {
  throw new Error("Expected profile endpoint path rendering");
}

if (capturedRequests[0]?.query?.identifier !== "example-profile") {
  throw new Error("Expected profile endpoint query rendering");
}

if (
  capturedRequests[1]?.path !==
  "/voyager/api/synthetic/skills/example-profile"
) {
  throw new Error("Expected skills endpoint path rendering");
}

const noSkillsService = new LinkedinProfileRetrievalService({
  httpClient: {
    ...mockHttpClient,
    async request<T>(
      options: LinkedinHttpRequestOptions,
    ): Promise<LinkedinHttpResponse<T>> {
      if (options.path.includes("/skills/")) {
        throw new AppError({
          statusCode: 404,
          code: ErrorCode.NOT_FOUND,
          message: "Synthetic skills endpoint was not found",
        });
      }

      return {
        status: 200,
        headers: new Headers(),
        data: profileFixtureEnvelope.response as T,
      };
    },
  },
  endpointConfigProvider: () => ({
    profile: {
      method: "GET",
      path: "/voyager/api/synthetic/profile/{encodedPublicIdentifier}",
    },
    skills: {
      method: "GET",
      path: "/voyager/api/synthetic/skills/{encodedPublicIdentifier}",
    },
  }),
});

const profileWithoutSkills = await noSkillsService.retrieveProfile({
  linkedinUrl: "https://www.linkedin.com/in/example-profile/",
});

if (profileWithoutSkills.skills.length !== 0) {
  throw new Error("Expected unavailable skills to remain an empty array");
}

const missingConfigService = new LinkedinProfileRetrievalService({
  httpClient: mockHttpClient,
  endpointConfigProvider: () => ({}),
});

try {
  await missingConfigService.retrieveProfile({
    linkedinUrl: "https://www.linkedin.com/in/example-profile/",
  });

  throw new Error("Expected missing profile endpoint config to fail");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }

  if (error.code !== ErrorCode.SCRAPING_FAILED) {
    throw new Error("Expected missing config to map to SCRAPING_FAILED");
  }
}

try {
  await service.retrieveProfile({
    linkedinUrl: "https://example.com/in/example-profile/",
  });

  throw new Error("Expected invalid profile URL to fail");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }

  if (error.code !== ErrorCode.INVALID_LINKEDIN_URL) {
    throw new Error("Expected invalid URL error code");
  }
}

console.log("LinkedIn profile retrieval service verification passed.");
