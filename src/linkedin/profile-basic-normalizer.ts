import {
  linkedinProfileSchema,
  type LinkedinProfile,
} from "../schemas/index.js";
import type { ParsedLinkedinProfileUrl } from "../types/linkedin-url.types.js";
import {
  asRecord,
  createIncludedEntityIndex,
  getIncludedEntity,
  parseLinkedinNormalizedResponse,
  readArray,
  readNumber,
  readRecord,
  readString,
  readUrnReference,
  readUrnReferences,
  type IncludedEntityIndex,
} from "./normalized-response.js";

interface BasicProfileNormalizerOptions {
  profileUrl: ParsedLinkedinProfileUrl;
  response: unknown;
}

function normalizeFullName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || null;
}

function normalizeIntegerCount(
  value: number | null,
): number | null {
  return value !== null && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function joinUrl(rootUrl: string, pathSegment: string): string | null {
  try {
    return new URL(pathSegment, rootUrl).toString();
  } catch {
    return null;
  }
}

function resolveVectorImageUrl(
  value: unknown,
  includedIndex: IncludedEntityIndex,
): string | null {
  const imageRecord = asRecord(value);
  const displayImageReference = readRecord(
    imageRecord,
    "displayImageReference",
  );
  const imageUrn =
    readString(displayImageReference, "vectorImage") ??
    readUrnReference(displayImageReference) ??
    readUrnReference(imageRecord);

  const vectorImage = asRecord(
    getIncludedEntity(includedIndex, imageUrn),
  );

  const rootUrl = readString(vectorImage, "rootUrl");
  const artifacts = readArray(vectorImage, "artifacts")
    .map(asRecord)
    .filter((artifact): artifact is Record<string, unknown> =>
      Boolean(artifact),
    );

  if (!rootUrl || artifacts.length === 0) {
    return null;
  }

  const selectedArtifact = artifacts
    .map((artifact) => ({
      artifact,
      area:
        (readNumber(artifact, "width") ?? 0) *
        (readNumber(artifact, "height") ?? 0),
    }))
    .sort((left, right) => right.area - left.area)[0]?.artifact;

  const pathSegment = readString(
    selectedArtifact,
    "fileIdentifyingUrlPathSegment",
  );

  return pathSegment ? joinUrl(rootUrl, pathSegment) : null;
}

function getCurrentCompany(
  profileRecord: Record<string, unknown> | null,
  includedIndex: IncludedEntityIndex,
): string | null {
  const positionGroupUrns = readUrnReferences(
    readArray(readRecord(profileRecord, "positionGroupView"), "elements"),
  );

  for (const positionGroupUrn of positionGroupUrns) {
    const positionGroup = asRecord(
      getIncludedEntity(includedIndex, positionGroupUrn),
    );
    const positionUrns = readUrnReferences(
      readArray(
        readRecord(
          positionGroup,
          "profilePositionInPositionGroup",
        ),
        "elements",
      ),
    );

    for (const positionUrn of positionUrns) {
      const position = asRecord(
        getIncludedEntity(includedIndex, positionUrn),
      );
      const companyName = readString(position, "companyName");

      if (companyName) {
        return companyName;
      }
    }
  }

  return null;
}

export function normalizeLinkedinBasicProfile({
  profileUrl,
  response,
}: BasicProfileNormalizerOptions): LinkedinProfile {
  const normalizedResponse =
    parseLinkedinNormalizedResponse(response);
  const includedIndex = createIncludedEntityIndex(
    normalizedResponse.included,
  );
  const profileRecord = asRecord(normalizedResponse.data);

  const firstName = readString(profileRecord, "firstName");
  const lastName = readString(profileRecord, "lastName");
  const followingState = readRecord(profileRecord, "followingState");
  const connections = readRecord(profileRecord, "connections");

  const profile = {
    profileUrl: profileUrl.canonicalUrl,
    publicIdentifier:
      readString(profileRecord, "publicIdentifier") ??
      profileUrl.publicIdentifier,

    firstName,
    lastName,
    fullName: normalizeFullName(firstName, lastName),

    headline: readString(profileRecord, "headline"),
    about: readString(profileRecord, "summary"),
    location:
      readString(profileRecord, "geoLocationName") ??
      readString(profileRecord, "locationName"),

    profilePictureUrl: resolveVectorImageUrl(
      readRecord(profileRecord, "profilePicture"),
      includedIndex,
    ),
    backgroundPictureUrl: resolveVectorImageUrl(
      readRecord(profileRecord, "backgroundPicture"),
      includedIndex,
    ),

    followerCount: normalizeIntegerCount(
      readNumber(followingState, "followerCount") ??
        readNumber(profileRecord, "followerCount"),
    ),
    connectionCount: normalizeIntegerCount(
      readNumber(connections, "count") ??
        readNumber(profileRecord, "connectionCount"),
    ),

    currentCompany: getCurrentCompany(
      profileRecord,
      includedIndex,
    ),

    experience: [],
    education: [],
    skills: [],
  };

  return linkedinProfileSchema.parse(profile);
}
