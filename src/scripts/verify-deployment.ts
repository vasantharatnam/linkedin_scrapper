import { readFileSync } from "node:fs";

const dockerfile = readFileSync("Dockerfile", "utf8");
const dockerignore = readFileSync(".dockerignore", "utf8");
const renderYaml = readFileSync("render.yaml", "utf8");

function assertContains(source: string, expected: string, label: string): void {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing ${expected}`);
  }
}

function assertMatches(source: string, pattern: RegExp, label: string): void {
  if (!pattern.test(source)) {
    throw new Error(`${label} does not match ${pattern}`);
  }
}

assertMatches(dockerfile, /^FROM node:22-alpine AS dependencies$/m, "Dockerfile");
assertMatches(dockerfile, /^FROM node:22-alpine AS build$/m, "Dockerfile");
assertMatches(dockerfile, /^FROM node:22-alpine AS production-dependencies$/m, "Dockerfile");
assertMatches(dockerfile, /^FROM node:22-alpine AS runtime$/m, "Dockerfile");
assertContains(dockerfile, "npm ci --omit=dev", "Dockerfile");
assertContains(dockerfile, "adduser -S app -G app", "Dockerfile");
assertMatches(dockerfile, /^USER app$/m, "Dockerfile");
assertContains(dockerfile, "/api/v1/health", "Dockerfile health check");
assertMatches(dockerfile, /^HEALTHCHECK /m, "Dockerfile");

for (const ignoredPath of [
  ".env",
  ".env.*",
  "node_modules",
  "dist",
  "coverage",
  "fixtures/raw",
  "fixtures/local",
]) {
  assertMatches(
    dockerignore,
    new RegExp(`^${ignoredPath.replace(".", "\\.")}$`, "m"),
    ".dockerignore",
  );
}

assertMatches(renderYaml, /^\s+runtime: docker$/m, "render.yaml");
assertMatches(renderYaml, /^\s+dockerfilePath: \.\/Dockerfile$/m, "render.yaml");
assertMatches(renderYaml, /^\s+healthCheckPath: \/api\/v1\/health$/m, "render.yaml");

for (const secretKey of [
  "API_KEY",
  "LINKEDIN_LI_AT",
  "LINKEDIN_JSESSIONID",
  "LINKEDIN_PROFILE_ENDPOINT_CONFIG_JSON",
  "LINKEDIN_SKILLS_ENDPOINT_CONFIG_JSON",
]) {
  assertMatches(
    renderYaml,
    new RegExp(`- key: ${secretKey}\\n\\s+sync: false`),
    "render.yaml secret placeholders",
  );
}

console.log("Deployment configuration verified.");
