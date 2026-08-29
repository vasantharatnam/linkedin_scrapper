import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  LINKEDIN_SKILLS_LIMITATION,
  normalizeLinkedinBasicProfile,
  normalizeLinkedinSkills,
} from "../linkedin/index.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

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

const skills = normalizeLinkedinSkills(skillsFixtureEnvelope.response);

if (skills.length !== 2) {
  throw new Error("Expected two normalized skills");
}

if (skills[0]?.name !== "TypeScript") {
  throw new Error("Expected first skill name");
}

if (skills[0]?.endorsementCount !== 42) {
  throw new Error("Expected first skill endorsement count");
}

if (skills[1]?.name !== "API Design") {
  throw new Error("Expected second skill name");
}

if (skills[1]?.endorsementCount !== null) {
  throw new Error("Expected unavailable endorsement count to be null");
}

const profileWithSkills = normalizeLinkedinBasicProfile({
  profileUrl: parseLinkedinProfileUrl(
    "https://www.linkedin.com/in/example-profile/",
  ),
  response: profileFixtureEnvelope.response,
  skillsResponse: skillsFixtureEnvelope.response,
});

if (profileWithSkills.skills.length !== 2) {
  throw new Error("Expected profile skills to be normalized");
}

const profileWithoutSkills = normalizeLinkedinBasicProfile({
  profileUrl: parseLinkedinProfileUrl(
    "https://www.linkedin.com/in/example-profile/",
  ),
  response: profileFixtureEnvelope.response,
});

if (profileWithoutSkills.skills.length !== 0) {
  throw new Error("Expected missing skills response to yield an empty array");
}

if (!LINKEDIN_SKILLS_LIMITATION.includes("empty skills array")) {
  throw new Error("Expected skills limitation to be documented");
}

console.log("LinkedIn profile skills normalization passed.");
