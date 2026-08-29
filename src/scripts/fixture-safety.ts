import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const FIXTURE_ROOT = path.resolve("fixtures");
export const SYNTHETIC_FIXTURE_ROOT = path.join(
  FIXTURE_ROOT,
  "synthetic",
);
export const RAW_FIXTURE_ROOT = path.join(FIXTURE_ROOT, "raw");
export const LOCAL_FIXTURE_ROOT = path.join(FIXTURE_ROOT, "local");

export interface UnsafeFinding {
  filePath: string;
  jsonPath: string;
  reason: string;
}

interface SensitivePattern {
  reason: string;
  pattern: RegExp;
}

const SENSITIVE_KEY_PATTERN =
  /^(authorization|cookie|csrf-token|x-li-track|x-li-page-instance|li_at|jsessionid|bcookie|bscookie|lidc|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)$/i;

const SENSITIVE_VALUE_PATTERNS: SensitivePattern[] = [
  {
    reason: "LinkedIn li_at cookie",
    pattern: /\bli_at\s*=/i,
  },
  {
    reason: "LinkedIn JSESSIONID cookie",
    pattern: /\bJSESSIONID\s*=/i,
  },
  {
    reason: "authorization bearer token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/i,
  },
  {
    reason: "OpenAI-style API key",
    pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/,
  },
  {
    reason: "email address",
    pattern:
      /\b[A-Z0-9._%+-]+@(?!example\.(?:com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  },
  {
    reason: "phone-like number",
    pattern:
      /(?:\+?\d[\s().-]*){9,}\d/,
  },
  {
    reason: "non-example LinkedIn profile URL",
    pattern:
      /https:\/\/(?:www\.)?linkedin\.com\/in\/(?!example-|synthetic-)[A-Za-z0-9_%.-]+\/?/i,
  },
];

export function redactFixtureValue(
  key: string,
  value: unknown,
): unknown {
  if (typeof value === "string") {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      return "[REDACTED]";
    }

    return SENSITIVE_VALUE_PATTERNS.reduce(
      (currentValue, sensitivePattern) =>
        currentValue.replace(sensitivePattern.pattern, "[REDACTED]"),
      value,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactFixtureValue(key, item));
  }

  if (value && typeof value === "object") {
    const redactedEntries = Object.entries(
      value as Record<string, unknown>,
    ).map(([entryKey, entryValue]) => [
      entryKey,
      redactFixtureValue(entryKey, entryValue),
    ]);

    return Object.fromEntries(redactedEntries);
  }

  return value;
}

export async function collectJsonFiles(
  directoryPath: string,
): Promise<string[]> {
  const directoryEntries = await readdir(directoryPath, {
    withFileTypes: true,
  });

  const files = await Promise.all(
    directoryEntries.map(async (directoryEntry) => {
      const entryPath = path.join(directoryPath, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        return collectJsonFiles(entryPath);
      }

      if (
        directoryEntry.isFile() &&
        entryPath.endsWith(".json")
      ) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat().sort();
}

export async function assertDirectoryExists(
  directoryPath: string,
): Promise<void> {
  const directoryStat = await stat(directoryPath);

  if (!directoryStat.isDirectory()) {
    throw new Error(`${directoryPath} is not a directory`);
  }
}

export async function readJsonFile(
  filePath: string,
): Promise<unknown> {
  const fileContents = await readFile(filePath, "utf8");

  return JSON.parse(fileContents) as unknown;
}

export function findUnsafeFixtureValues(
  value: unknown,
  filePath: string,
  jsonPath = "$",
): UnsafeFinding[] {
  if (typeof value === "string") {
    return SENSITIVE_VALUE_PATTERNS.flatMap((sensitivePattern) =>
      sensitivePattern.pattern.test(value)
        ? [
            {
              filePath,
              jsonPath,
              reason: sensitivePattern.reason,
            },
          ]
        : [],
    );
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findUnsafeFixtureValues(
        item,
        filePath,
        `${jsonPath}[${index}]`,
      ),
    );
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entryValue]) => {
        const keyFinding = SENSITIVE_KEY_PATTERN.test(key)
          ? [
              {
                filePath,
                jsonPath: `${jsonPath}.${key}`,
                reason: "sensitive key name",
              },
            ]
          : [];

        return [
          ...keyFinding,
          ...findUnsafeFixtureValues(
            entryValue,
            filePath,
            `${jsonPath}.${key}`,
          ),
        ];
      },
    );
  }

  return [];
}

export function assertPathInside(
  childPath: string,
  parentPath: string,
): void {
  const relativePath = path.relative(
    path.resolve(parentPath),
    path.resolve(childPath),
  );

  if (
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      `${childPath} must be inside ${parentPath}`,
    );
  }
}
