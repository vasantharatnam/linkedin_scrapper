import { openApiDocument } from "../docs/openapi.js";

const profileOperation =
  openApiDocument.paths["/api/v1/profiles/scrape"].post;
const healthOperation =
  openApiDocument.paths["/api/v1/health"].get;

if (openApiDocument.openapi !== "3.1.0") {
  throw new Error("Expected OpenAPI 3.1.0 document");
}

if (healthOperation.security.length !== 0) {
  throw new Error("Expected health endpoint to remain public");
}

if (
  profileOperation.security[0]?.ApiKeyAuth === undefined ||
  openApiDocument.components.securitySchemes.ApiKeyAuth.name !==
    "X-API-Key"
) {
  throw new Error("Expected profile endpoint API-key documentation");
}

const requestExample =
  profileOperation.requestBody.content["application/json"].example;

if (
  requestExample.linkedinUrl !==
  "https://www.linkedin.com/in/example-profile/"
) {
  throw new Error("Expected synthetic profile request example");
}

const successExample =
  profileOperation.responses["200"].content["application/json"].example;

if (
  successExample.data.publicIdentifier !== "example-profile" ||
  successExample.meta.cached !== false
) {
  throw new Error("Expected synthetic success response example");
}

const documentedErrorStatusCodes = [
  "400",
  "401",
  "404",
  "429",
  "502",
  "503",
] as const;

for (const statusCode of documentedErrorStatusCodes) {
  if (!profileOperation.responses[statusCode]) {
    throw new Error(`Expected ${statusCode} response documentation`);
  }
}

console.log("OpenAPI verification passed.");
