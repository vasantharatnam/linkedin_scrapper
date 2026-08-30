import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const forbiddenDependencyNames = new Set([
  "playwright",
  "@playwright/test",
  "puppeteer",
  "puppeteer-core",
  "selenium-webdriver",
]);

const trackedFiles = execFileSync("git", ["ls-files"], {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

function fail(message: string): never {
  throw new Error(message);
}

function assertNoForbiddenTrackedPaths(): void {
  for (const trackedFile of trackedFiles) {
    if (trackedFile === ".env" || trackedFile.startsWith(".env.")) {
      if (trackedFile !== ".env.example") {
        fail(`Tracked environment file is not allowed: ${trackedFile}`);
      }
    }

    if (
      trackedFile.startsWith("fixtures/raw/") ||
      trackedFile.startsWith("fixtures/local/")
    ) {
      fail(`Tracked local/raw fixture is not allowed: ${trackedFile}`);
    }
  }
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function assertPackageJsonHasNoBrowserAutomationDeps(): void {
  const packageJson = readJsonFile<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  }>("package.json");

  for (const dependencySection of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const dependencyName of Object.keys(
      dependencySection ?? {},
    )) {
      if (forbiddenDependencyNames.has(dependencyName)) {
        fail(`Forbidden browser automation dependency: ${dependencyName}`);
      }
    }
  }
}

function assertPackageLockHasNoInstalledBrowserAutomationDeps(): void {
  const packageLock = readJsonFile<{
    packages?: Record<string, unknown>;
  }>("package-lock.json");

  for (const packagePath of Object.keys(packageLock.packages ?? {})) {
    if (!packagePath.startsWith("node_modules/")) {
      continue;
    }

    const packageName = packagePath.slice("node_modules/".length);

    if (forbiddenDependencyNames.has(packageName)) {
      fail(
        `Forbidden browser automation package is installed: ${packageName}`,
      );
    }
  }
}

function assertNoTrackedSecretValues(): void {
  const sensitivePatterns = [
    {
      label: "OpenAI-style API key",
      pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/,
    },
    {
      label: "bearer token",
      pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/i,
    },
    {
      label: "LinkedIn li_at cookie value",
      pattern: /\bli_at\s*=\s*(?!\$\{|\[REDACTED\])[^;\s"'`]+/,
    },
    {
      label: "LinkedIn JSESSIONID cookie value",
      pattern: /\bJSESSIONID\s*=\s*(?!\$\{|\[REDACTED\])[^;\s"'`]+/,
    },
    {
      label: "non-example email address",
      pattern:
        /\b[A-Z0-9._%+-]+@(?!example\.(?:com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    },
    {
      label: "non-example LinkedIn profile URL",
      pattern:
        /https:\/\/(?:www\.)?linkedin\.com\/in\/(?!example-|synthetic-)[A-Za-z0-9_%.-]+\/?/i,
    },
  ];

  for (const trackedFile of trackedFiles) {
    const contents = readFileSync(trackedFile, "utf8");

    for (const sensitivePattern of sensitivePatterns) {
      if (sensitivePattern.pattern.test(contents)) {
        fail(
          `${sensitivePattern.label} found in tracked file: ${trackedFile}`,
        );
      }
    }
  }
}

assertNoForbiddenTrackedPaths();
assertPackageJsonHasNoBrowserAutomationDeps();
assertPackageLockHasNoInstalledBrowserAutomationDeps();
assertNoTrackedSecretValues();

console.log("Repository safety verification passed.");
