import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  asRecord,
  createIncludedEntityIndex,
  getIncludedEntity,
  parseLinkedinNormalizedResponse,
  readArray,
  readRecord,
  readString,
  readUrnReferences,
} from "../linkedin/normalized-response.js";
import { AppError } from "../utils/app-error.js";

const fixturePath = path.resolve(
  "fixtures/synthetic/linkedin/profile-normalized-response.fixture.json",
);

const fixtureEnvelope = JSON.parse(
  await readFile(fixturePath, "utf8"),
) as { response?: unknown };

const normalizedResponse = parseLinkedinNormalizedResponse(
  fixtureEnvelope.response,
);

const includedIndex = createIncludedEntityIndex(
  normalizedResponse.included,
);

const profileRecord = asRecord(normalizedResponse.data);

if (readString(profileRecord, "publicIdentifier") !== "example-profile") {
  throw new Error("Expected profile public identifier");
}

const positionGroupUrns = readUrnReferences(
  readArray(readRecord(profileRecord, "positionGroupView"), "elements"),
);

if (positionGroupUrns.length !== 1) {
  throw new Error("Expected one position group URN");
}

const positionGroup = getIncludedEntity(
  includedIndex,
  positionGroupUrns[0],
);

if (
  positionGroup?.entityUrn !==
  "urn:li:fsd_profilePositionGroup:synthetic-position-group"
) {
  throw new Error("Expected position group lookup to succeed");
}

try {
  createIncludedEntityIndex([
    {
      entityUrn: "urn:li:fsd_profile:duplicate",
    },
    {
      entityUrn: "urn:li:fsd_profile:duplicate",
    },
  ]);

  throw new Error("Expected duplicate entity URNs to be rejected");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }
}

try {
  parseLinkedinNormalizedResponse({
    data: {},
    included: ["not-an-entity"],
  });

  throw new Error("Expected malformed included entities to be rejected");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }
}

console.log("LinkedIn normalized response verification passed.");
