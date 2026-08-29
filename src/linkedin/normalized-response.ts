import { z } from "zod";

import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";

const normalizedEntitySchema = z
  .object({
    entityUrn: z.string().min(1).optional(),
    $type: z.string().min(1).optional(),
  })
  .passthrough();

export const linkedinNormalizedResponseSchema = z
  .object({
    data: z.unknown(),
    included: z.array(normalizedEntitySchema).default([]),
  })
  .passthrough();

export type LinkedinNormalizedEntity = z.infer<
  typeof normalizedEntitySchema
>;

export type LinkedinNormalizedResponse = z.infer<
  typeof linkedinNormalizedResponseSchema
>;

export type IncludedEntityIndex = Map<
  string,
  LinkedinNormalizedEntity
>;

function malformedLinkedinResponse(
  message: string,
  details?: unknown,
): AppError {
  return new AppError({
    statusCode: 502,
    code: ErrorCode.SCRAPING_FAILED,
    message,
    details,
  });
}

export function parseLinkedinNormalizedResponse(
  value: unknown,
): LinkedinNormalizedResponse {
  const parsedResponse =
    linkedinNormalizedResponseSchema.safeParse(value);

  if (!parsedResponse.success) {
    throw malformedLinkedinResponse(
      "LinkedIn returned an unexpected normalized response shape",
      parsedResponse.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return parsedResponse.data;
}

export function createIncludedEntityIndex(
  included: LinkedinNormalizedResponse["included"],
): IncludedEntityIndex {
  const index: IncludedEntityIndex = new Map();

  for (const entity of included) {
    if (!entity.entityUrn) {
      continue;
    }

    if (index.has(entity.entityUrn)) {
      throw malformedLinkedinResponse(
        "LinkedIn returned duplicate included entities",
        {
          entityUrn: entity.entityUrn,
        },
      );
    }

    index.set(entity.entityUrn, entity);
  }

  return index;
}

export function getIncludedEntity(
  index: IncludedEntityIndex,
  entityUrn: string | null | undefined,
): LinkedinNormalizedEntity | null {
  if (!entityUrn) {
    return null;
  }

  return index.get(entityUrn) ?? null;
}

export function asRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readString(
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = record?.[key];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export function readNumber(
  record: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = record?.[key];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function readBoolean(
  record: Record<string, unknown> | null | undefined,
  key: string,
): boolean | null {
  const value = record?.[key];

  return typeof value === "boolean" ? value : null;
}

export function readRecord(
  record: Record<string, unknown> | null | undefined,
  key: string,
): Record<string, unknown> | null {
  return asRecord(record?.[key]);
}

export function readArray(
  record: Record<string, unknown> | null | undefined,
  key: string,
): unknown[] {
  const value = record?.[key];

  return Array.isArray(value) ? value : [];
}

export function readUrnReference(
  value: unknown,
): string | null {
  if (typeof value === "string" && value.startsWith("urn:li:")) {
    return value;
  }

  const record = asRecord(value);
  const urn = readString(record, "entityUrn");

  return urn?.startsWith("urn:li:") ? urn : null;
}

export function readUrnReferences(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const urn = readUrnReference(item);

    return urn ? [urn] : [];
  });
}
