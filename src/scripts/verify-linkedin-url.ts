import { AppError } from "../utils/app-error.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

interface ValidTestCase {
  input: string;
  expectedIdentifier: string;
  expectedCanonicalUrl: string;
}

const validCases: ValidTestCase[] = [
  {
    input: "https://www.linkedin.com/in/example-profile/",
    expectedIdentifier: "example-profile",
    expectedCanonicalUrl:
      "https://www.linkedin.com/in/example-profile/",
  },
  {
    input: "https://linkedin.com/in/example_profile",
    expectedIdentifier: "example_profile",
    expectedCanonicalUrl:
      "https://www.linkedin.com/in/example_profile/",
  },
  {
    input:
      "  https://www.linkedin.com/in/example-profile/?trk=public_profile  ",
    expectedIdentifier: "example-profile",
    expectedCanonicalUrl:
      "https://www.linkedin.com/in/example-profile/",
  },
  {
    input:
      "https://www.linkedin.com/in/example-profile/#experience",
    expectedIdentifier: "example-profile",
    expectedCanonicalUrl:
      "https://www.linkedin.com/in/example-profile/",
  },
];

const invalidCases: string[] = [
  "",
  "not-a-url",
  "http://www.linkedin.com/in/example-profile/",
  "https://example.com/in/example-profile/",
  "https://linkedin.example.com/in/example-profile/",
  "https://www.linkedin.com/company/example-company/",
  "https://www.linkedin.com/jobs/",
  "https://www.linkedin.com/in/example-profile/details/experience/",
  "https://user:password@www.linkedin.com/in/example-profile/",
  "https://www.linkedin.com:8443/in/example-profile/",
  "https://www.linkedin.com/in/a/",
  "https://www.linkedin.com/in/example.profile/",
];

let failureCount = 0;

for (const testCase of validCases) {
  try {
    const result = parseLinkedinProfileUrl(testCase.input);

    if (
      result.publicIdentifier !== testCase.expectedIdentifier ||
      result.canonicalUrl !== testCase.expectedCanonicalUrl
    ) {
      failureCount += 1;

      console.error("Valid case produced an unexpected result:", {
        input: testCase.input,
        expectedIdentifier: testCase.expectedIdentifier,
        actualIdentifier: result.publicIdentifier,
        expectedCanonicalUrl: testCase.expectedCanonicalUrl,
        actualCanonicalUrl: result.canonicalUrl,
      });
    }
  } catch (error) {
    failureCount += 1;

    console.error(
      "Expected URL to be valid:",
      testCase.input,
      error,
    );
  }
}

for (const input of invalidCases) {
  try {
    parseLinkedinProfileUrl(input);

    failureCount += 1;
    console.error("Expected URL to be rejected:", input);
  } catch (error) {
    if (!(error instanceof AppError)) {
      failureCount += 1;

      console.error(
        "Invalid URL produced an unexpected error type:",
        input,
        error,
      );
    }
  }
}

if (failureCount > 0) {
  console.error(
    `LinkedIn URL verification failed: ${failureCount} case(s) failed.`,
  );

  process.exit(1);
}

console.log(
  `LinkedIn URL verification passed: ${
    validCases.length + invalidCases.length
  } cases checked.`,
);