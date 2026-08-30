import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  normalizeLinkedinBasicProfile,
  normalizeLinkedinSkills,
  parseLinkedinNormalizedResponse,
} from "../src/linkedin/index.js";
import { ErrorCode } from "../src/types/error.types.js";
import { parseLinkedinProfileUrl } from "../src/utils/linkedin-url.js";

async function readFixture(fileName: string): Promise<unknown> {
  const fixture = JSON.parse(
    await readFile(
      path.resolve("fixtures/synthetic/linkedin", fileName),
      "utf8",
    ),
  ) as { response?: unknown };

  return fixture.response;
}

describe("LinkedIn profile normalization", () => {
  it("normalizes successful synthetic profile and skills responses", async () => {
    const profileResponse = await readFixture(
      "profile-normalized-response.fixture.json",
    );
    const skillsResponse = await readFixture(
      "skills-normalized-response.fixture.json",
    );

    const profile = normalizeLinkedinBasicProfile({
      profileUrl: parseLinkedinProfileUrl(
        "https://www.linkedin.com/in/example-profile/",
      ),
      response: profileResponse,
      skillsResponse,
    });

    expect(profile).toMatchObject({
      publicIdentifier: "example-profile",
      fullName: "Example Person",
      headline: "Synthetic Product Engineering Lead",
      currentCompany: "Example Systems",
      followerCount: 1234,
      connectionCount: 500,
    });
    expect(profile.experience).toHaveLength(1);
    expect(profile.education).toHaveLength(1);
    expect(profile.skills).toEqual([
      {
        name: "TypeScript",
        endorsementCount: 42,
      },
      {
        name: "API Design",
        endorsementCount: null,
      },
    ]);
  });

  it("returns an empty skills array when no skills response is available", async () => {
    const profileResponse = await readFixture(
      "profile-normalized-response.fixture.json",
    );

    const profile = normalizeLinkedinBasicProfile({
      profileUrl: parseLinkedinProfileUrl(
        "https://www.linkedin.com/in/example-profile/",
      ),
      response: profileResponse,
    });

    expect(profile.skills).toEqual([]);
  });

  it("rejects malformed normalized responses", () => {
    expect(() =>
      parseLinkedinNormalizedResponse({
        data: {},
        included: ["not-an-object"],
      }),
    ).toThrow(expect.objectContaining({
      code: ErrorCode.SCRAPING_FAILED,
    }));
  });

  it("drops malformed skill entities instead of inventing names", () => {
    const skills = normalizeLinkedinSkills({
      data: {
        elements: ["urn:li:fsd_skill:missing-name"],
      },
      included: [
        {
          entityUrn: "urn:li:fsd_skill:missing-name",
        },
      ],
    });

    expect(skills).toEqual([]);
  });
});
