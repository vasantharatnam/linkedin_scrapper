import type { NextFunction, Request, Response } from "express";

import {
  isValidApiKey,
  requireApiKey,
} from "../middleware/api-key.middleware.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";

const expectedKey = "synthetic-api-key";

if (!isValidApiKey(expectedKey, expectedKey)) {
  throw new Error("Expected matching API key to be accepted");
}

if (isValidApiKey("wrong-synthetic-api-key", expectedKey)) {
  throw new Error("Expected mismatched API key to be rejected");
}

if (isValidApiKey(undefined, expectedKey)) {
  throw new Error("Expected missing API key to be rejected");
}

async function runMiddleware(
  apiKey: string | undefined,
): Promise<unknown> {
  return new Promise((resolve) => {
    const request = {
      get(headerName: string) {
        return headerName.toLowerCase() === "x-api-key"
          ? apiKey
          : undefined;
      },
    } as Request;
    const response = {} as Response;
    const next: NextFunction = (error?: unknown) => {
      resolve(error ?? null);
    };

    requireApiKey(request, response, next);
  });
}

const acceptedError = await runMiddleware(process.env.API_KEY);

if (acceptedError !== null) {
  throw new Error("Expected configured API key to be accepted");
}

const rejectedError = await runMiddleware("incorrect-synthetic-key");

if (!(rejectedError instanceof AppError)) {
  throw new Error("Expected rejected API key to produce AppError");
}

if (rejectedError.code !== ErrorCode.UNAUTHORIZED) {
  throw new Error("Expected rejected API key to produce UNAUTHORIZED");
}

if (
  rejectedError.message.includes("incorrect-synthetic-key") ||
  rejectedError.details !== undefined
) {
  throw new Error("Rejected API key must not be exposed");
}

console.log("API key authentication verification passed.");
