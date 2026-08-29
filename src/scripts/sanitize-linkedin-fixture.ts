import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  LOCAL_FIXTURE_ROOT,
  RAW_FIXTURE_ROOT,
  assertPathInside,
  redactFixtureValue,
} from "./fixture-safety.js";

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputPath = readArgument("--input");
const outputPath = readArgument("--output");

if (!inputPath || !outputPath) {
  console.error(
    "Usage: npm run fixtures:sanitize -- --input fixtures/raw/input.json --output fixtures/local/output.sanitized.json",
  );
  process.exit(1);
}

const resolvedInputPath = path.resolve(inputPath);
const resolvedOutputPath = path.resolve(outputPath);

assertPathInside(resolvedInputPath, RAW_FIXTURE_ROOT);
assertPathInside(resolvedOutputPath, LOCAL_FIXTURE_ROOT);

const rawFixture = JSON.parse(
  await readFile(resolvedInputPath, "utf8"),
) as unknown;

const sanitizedFixture = redactFixtureValue("", rawFixture);

await mkdir(path.dirname(resolvedOutputPath), {
  recursive: true,
});

await writeFile(
  resolvedOutputPath,
  `${JSON.stringify(sanitizedFixture, null, 2)}\n`,
  "utf8",
);

console.log(
  `Sanitized local fixture written to ${path.relative(
    process.cwd(),
    resolvedOutputPath,
  )}. Keep this file untracked and convert it into a fully synthetic fixture before committing.`,
);
