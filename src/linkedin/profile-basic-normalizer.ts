import {
  linkedinProfileSchema,
  type DateRange,
  type Education,
  type Experience,
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
  type LinkedinNormalizedEntity,
} from "./normalized-response.js";

interface BasicProfileNormalizerOptions {
  profileUrl: ParsedLinkedinProfileUrl;
  response: unknown;
  skillsResponse?: unknown;
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

function normalizeDateRange(
  value: unknown,
): DateRange {
  const dateRange = asRecord(value);
  const start = readRecord(dateRange, "start");
  const end = readRecord(dateRange, "end");

  return {
    startMonth: normalizeIntegerCount(readNumber(start, "month")),
    startYear: normalizeIntegerCount(readNumber(start, "year")),
    endMonth: normalizeIntegerCount(readNumber(end, "month")),
    endYear: normalizeIntegerCount(readNumber(end, "year")),
    isCurrent: Boolean(start) && !end,
  };
}

function normalizeLinkedinUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "https:" ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}

function getEntityByUrn(
  includedIndex: IncludedEntityIndex,
  entityUrn: string | null,
): Record<string, unknown> | null {
  return asRecord(getIncludedEntity(includedIndex, entityUrn));
}

function resolveCompany(
  position: Record<string, unknown> | null,
  includedIndex: IncludedEntityIndex,
): Record<string, unknown> | null {
  return getEntityByUrn(
    includedIndex,
    readString(position, "companyUrn") ??
      readUrnReference(readRecord(position, "company")),
  );
}

function resolveSchool(
  education: Record<string, unknown> | null,
  includedIndex: IncludedEntityIndex,
): Record<string, unknown> | null {
  return getEntityByUrn(
    includedIndex,
    readString(education, "schoolUrn") ??
      readUrnReference(readRecord(education, "school")),
  );
}

function normalizeExperience(
  position: LinkedinNormalizedEntity,
  includedIndex: IncludedEntityIndex,
): Experience {
  const positionRecord = asRecord(position);
  const company = resolveCompany(positionRecord, includedIndex);

  return {
    title: readString(positionRecord, "title"),
    companyName:
      readString(positionRecord, "companyName") ??
      readString(company, "name"),
    companyLinkedinUrl: normalizeLinkedinUrl(
      readString(company, "url"),
    ),
    companyLogoUrl: resolveVectorImageUrl(
      readRecord(company, "logo"),
      includedIndex,
    ),
    employmentType: readString(positionRecord, "employmentType"),
    location:
      readString(positionRecord, "locationName") ??
      readString(positionRecord, "location"),
    description: readString(positionRecord, "description"),
    dateRange: normalizeDateRange(
      readRecord(positionRecord, "dateRange"),
    ),
  };
}

function normalizeExperienceSection(
  profileRecord: Record<string, unknown> | null,
  includedIndex: IncludedEntityIndex,
): Experience[] {
  const positionGroupUrns = readUrnReferences(
    readArray(readRecord(profileRecord, "positionGroupView"), "elements"),
  );

  return positionGroupUrns.flatMap((positionGroupUrn) => {
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

    return positionUrns.flatMap((positionUrn) => {
      const position = getIncludedEntity(includedIndex, positionUrn);

      return position
        ? [normalizeExperience(position, includedIndex)]
        : [];
    });
  });
}

function normalizeEducation(
  education: LinkedinNormalizedEntity,
  includedIndex: IncludedEntityIndex,
): Education {
  const educationRecord = asRecord(education);
  const school = resolveSchool(educationRecord, includedIndex);

  return {
    collegeName:
      readString(educationRecord, "schoolName") ??
      readString(school, "name"),
    collegeLinkedinUrl: normalizeLinkedinUrl(
      readString(school, "url"),
    ),
    collegeLogoUrl: resolveVectorImageUrl(
      readRecord(school, "logo"),
      includedIndex,
    ),
    degreeName: readString(educationRecord, "degreeName"),
    fieldOfStudy: readString(educationRecord, "fieldOfStudy"),
    grade: readString(educationRecord, "grade"),
    description: readString(educationRecord, "description"),
    dateRange: normalizeDateRange(
      readRecord(educationRecord, "dateRange"),
    ),
  };
}

function normalizeEducationSection(
  profileRecord: Record<string, unknown> | null,
  includedIndex: IncludedEntityIndex,
): Education[] {
  const educationUrns = readUrnReferences(
    readArray(readRecord(profileRecord, "educationView"), "elements"),
  );

  return educationUrns.flatMap((educationUrn) => {
    const education = getIncludedEntity(includedIndex, educationUrn);

    return education
      ? [normalizeEducation(education, includedIndex)]
      : [];
  });
}

export function normalizeLinkedinSkills(
  response: unknown,
): LinkedinProfile["skills"] {
  const normalizedResponse =
    parseLinkedinNormalizedResponse(response);
  const includedIndex = createIncludedEntityIndex(
    normalizedResponse.included,
  );
  const collection = asRecord(normalizedResponse.data);
  const skillUrns = readUrnReferences(
    readArray(collection, "elements"),
  );

  return skillUrns.flatMap((skillUrn) => {
    const skill = asRecord(getIncludedEntity(includedIndex, skillUrn));
    const name = readString(skill, "name");

    if (!name) {
      return [];
    }

    return [
      {
        name,
        endorsementCount: normalizeIntegerCount(
          readNumber(skill, "endorsementCount"),
        ),
      },
    ];
  });
}

export function normalizeLinkedinBasicProfile({
  profileUrl,
  response,
  skillsResponse,
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

    experience: normalizeExperienceSection(
      profileRecord,
      includedIndex,
    ),
    education: normalizeEducationSection(
      profileRecord,
      includedIndex,
    ),
    skills:
      skillsResponse === undefined
        ? []
        : normalizeLinkedinSkills(skillsResponse),
  };

  return linkedinProfileSchema.parse(profile);
}
