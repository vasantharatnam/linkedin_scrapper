import { z } from "zod";

import { env } from "../config/env.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";
import type {
  LinkedinEndpointTemplateValue,
  LinkedinInternalEndpointConfig,
  LinkedinInternalEndpointDefinition,
} from "./internal-endpoint.types.js";

const endpointTemplateValueSchema: z.ZodType<
  LinkedinEndpointTemplateValue
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(endpointTemplateValueSchema),
    z.record(
      z.string(),
      endpointTemplateValueSchema.optional(),
    ),
  ]),
);

const endpointDefinitionSchema = z
  .object({
    method: z.enum(["GET", "POST"]),
    path: z.string().min(1),
    query: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean()]).optional(),
    ).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: endpointTemplateValueSchema.optional(),
  })
  .strict();

function parseEndpointDefinition(
  name: string,
  rawValue: string | undefined,
): LinkedinInternalEndpointDefinition | undefined {
  if (!rawValue) {
    return undefined;
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(rawValue);
  } catch (error) {
    throw new AppError({
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: `LinkedIn ${name} endpoint config must be valid JSON`,
      cause: error,
    });
  }

  const validationResult =
    endpointDefinitionSchema.safeParse(parsedJson);

  if (!validationResult.success) {
    throw new AppError({
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: `LinkedIn ${name} endpoint config is invalid`,
      details: validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return validationResult.data;
}

export function getLinkedinInternalEndpointConfig():
  LinkedinInternalEndpointConfig {
  return {
    profile: parseEndpointDefinition(
      "profile",
      env.LINKEDIN_PROFILE_ENDPOINT_CONFIG_JSON,
    ),
    skills: parseEndpointDefinition(
      "skills",
      env.LINKEDIN_SKILLS_ENDPOINT_CONFIG_JSON,
    ),
  };
}
