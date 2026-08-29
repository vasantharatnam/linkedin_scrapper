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

if (profile.experience.length !== 1) {
  throw new Error("Expected one normalized experience item");
}

const [experience] = profile.experience;

if (!experience) {
  throw new Error("Expected normalized experience item");
}

if (experience.title !== "Engineering Lead") {
  throw new Error("Expected experience title");
}

if (experience.companyName !== "Example Systems") {
  throw new Error("Expected experience company name");
}

if (
  experience.companyLinkedinUrl !==
  "https://www.linkedin.com/company/example-systems/"
) {
  throw new Error("Expected experience company URL");
}

if (
  experience.companyLogoUrl !==
  "https://media.licdn.com/dms/image/synthetic-company-logo/company-100_100/example-image.jpg"
) {
  throw new Error("Expected experience company logo URL");
}

if (experience.employmentType !== "Full-time") {
  throw new Error("Expected experience employment type");
}

if (experience.location !== "Example City") {
  throw new Error("Expected experience location");
}

if (
  experience.description !==
  "Synthetic role description for fixture coverage."
) {
  throw new Error("Expected experience description");
}

if (
  experience.dateRange.startMonth !== 1 ||
  experience.dateRange.startYear !== 2020 ||
  experience.dateRange.endMonth !== null ||
  experience.dateRange.endYear !== null ||
  experience.dateRange.isCurrent !== true
) {
  throw new Error("Expected current experience date range");
}

if (profile.education.length !== 1) {
  throw new Error("Expected one normalized education item");
}

const [education] = profile.education;

if (!education) {
  throw new Error("Expected normalized education item");
}

if (education.collegeName !== "Example University") {
  throw new Error("Expected education school name");
}

if (
  education.collegeLinkedinUrl !==
  "https://www.linkedin.com/school/example-university/"
) {
  throw new Error("Expected education school URL");
}

if (
  education.collegeLogoUrl !==
  "https://media.licdn.com/dms/image/synthetic-school-logo/school-100_100/example-image.jpg"
) {
  throw new Error("Expected education school logo URL");
}

if (education.degreeName !== "Bachelor of Example Studies") {
  throw new Error("Expected education degree");
}

if (education.fieldOfStudy !== "Synthetic Systems") {
  throw new Error("Expected education field of study");
}

if (education.grade !== "Example Honors") {
  throw new Error("Expected education grade");
}

if (
  education.description !==
  "Synthetic education description for fixture coverage."
) {
  throw new Error("Expected education description");
}

if (
  education.dateRange.startMonth !== null ||
  education.dateRange.startYear !== 2014 ||
  education.dateRange.endMonth !== null ||
  education.dateRange.endYear !== 2018 ||
  education.dateRange.isCurrent !== false
) {
  throw new Error("Expected education date range");
}

console.log("LinkedIn profile section normalization passed.");
