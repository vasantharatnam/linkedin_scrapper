import { readFile } from "node:fs/promises";
import path from "node:path";

import { normalizeLinkedinBasicProfile } from "../linkedin/profile-basic-normalizer.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

const fixturePath = path.resolve(
  "fixtures/synthetic/linkedin/profile-normalized-response.fixture.json",
);

const fixtureEnvelope = JSON.parse(
  await readFile(fixturePath, "utf8"),
) as { response?: unknown };

const profile = normalizeLinkedinBasicProfile({
  profileUrl: parseLinkedinProfileUrl(
    "https://www.linkedin.com/in/example-profile/",
  ),
  response: fixtureEnvelope.response,
});

if (profile.publicIdentifier !== "example-profile") {
  throw new Error("Expected public identifier to be normalized");
}

if (profile.fullName !== "Example Person") {
  throw new Error("Expected full name to be normalized");
}

if (profile.headline !== "Synthetic Product Engineering Lead") {
  throw new Error("Expected headline to be normalized");
}

if (profile.about !== "Synthetic profile summary for fixture coverage.") {
  throw new Error("Expected about text to be normalized");
}

if (profile.location !== "Example City, Example Region") {
  throw new Error("Expected location to be normalized");
}

if (
  profile.profilePictureUrl !==
  "https://media.licdn.com/dms/image/synthetic-profile-photo/profile-200_200/example-image.jpg"
) {
  throw new Error("Expected profile image URL to be resolved");
}

if (
  profile.backgroundPictureUrl !==
  "https://media.licdn.com/dms/image/synthetic-background-photo/background-800_200/example-image.jpg"
) {
  throw new Error("Expected background image URL to be resolved");
}

if (profile.followerCount !== 1234) {
  throw new Error("Expected follower count to be normalized");
}

if (profile.connectionCount !== 500) {
  throw new Error("Expected connection count to be normalized");
}

if (profile.currentCompany !== "Example Systems") {
  throw new Error("Expected current company to be normalized");
}

if (
  profile.experience.length !== 0 ||
  profile.education.length !== 0 ||
  profile.skills.length !== 0
) {
  throw new Error("Expected deferred sections to remain empty arrays");
}

console.log("LinkedIn basic profile normalization passed.");
