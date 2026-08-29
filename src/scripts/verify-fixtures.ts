import path from "node:path";

import {
  SYNTHETIC_FIXTURE_ROOT,
  assertDirectoryExists,
  collectJsonFiles,
  findUnsafeFixtureValues,
  readJsonFile,
} from "./fixture-safety.js";

interface SyntheticFixtureEnvelope {
  fixtureMeta?: {
    synthetic?: unknown;
  };
}

await assertDirectoryExists(SYNTHETIC_FIXTURE_ROOT);

const fixtureFiles = await collectJsonFiles(SYNTHETIC_FIXTURE_ROOT);

if (fixtureFiles.length === 0) {
  throw new Error("No synthetic fixture files were found");
}

let failureCount = 0;

for (const fixtureFile of fixtureFiles) {
  const parsedFixture = await readJsonFile(fixtureFile);
  const envelope = parsedFixture as SyntheticFixtureEnvelope;

  if (envelope.fixtureMeta?.synthetic !== true) {
    failureCount += 1;
    console.error(
      `${fixtureFile}: fixtureMeta.synthetic must be true`,
    );
  }

  const unsafeFindings = findUnsafeFixtureValues(
    parsedFixture,
    fixtureFile,
  );

  for (const unsafeFinding of unsafeFindings) {
    failureCount += 1;
    console.error(
      [
        unsafeFinding.filePath,
        unsafeFinding.jsonPath,
        unsafeFinding.reason,
      ].join(": "),
    );
  }
}

if (failureCount > 0) {
  console.error(
    `Fixture verification failed: ${failureCount} unsafe finding(s).`,
  );
  process.exit(1);
}

console.log(
  `Fixture verification passed: ${fixtureFiles
    .map((fixtureFile) =>
      path.relative(process.cwd(), fixtureFile),
    )
    .join(", ")}`,
);
