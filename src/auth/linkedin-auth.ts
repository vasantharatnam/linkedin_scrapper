import { env } from "../config/env.js";
import { ErrorCode } from "../types/error.types.js";
import type {
  LinkedinAuthHeadersProvider,
  LinkedinSessionCredentials,
} from "../types/linkedin-auth.types.js";
import { AppError } from "../utils/app-error.js";

function removeSurroundingQuotes(value: string): string {
  if (
    value.length >= 2 &&
    value.startsWith('"') &&
    value.endsWith('"')
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function rejectUnsafeCookieCharacters(
  name: string,
  value: string,
): void {
  if (/[\r\n;]/.test(value)) {
    throw new AppError({
      statusCode: 500,
      code: ErrorCode.LINKEDIN_AUTH_REQUIRED,
      message: `LinkedIn ${name} contains unsafe characters`,
    });
  }
}

export function getLinkedinSessionCredentials():
  LinkedinSessionCredentials {
  const liAt = env.LINKEDIN_LI_AT;
  const jsessionId = env.LINKEDIN_JSESSIONID;

  if (!liAt || !jsessionId) {
    throw new AppError({
      statusCode: 503,
      code: ErrorCode.LINKEDIN_AUTH_REQUIRED,
      message: "LinkedIn session credentials are not configured",
    });
  }

  rejectUnsafeCookieCharacters("li_at", liAt);
  rejectUnsafeCookieCharacters("JSESSIONID", jsessionId);

  return {
    liAt,
    jsessionId,
  };
}

export const getLinkedinAuthHeaders: LinkedinAuthHeadersProvider =
  () => {
    const credentials = getLinkedinSessionCredentials();

    const csrfToken = removeSurroundingQuotes(
      credentials.jsessionId,
    );

    if (!csrfToken) {
      throw new AppError({
        statusCode: 503,
        code: ErrorCode.LINKEDIN_AUTH_REQUIRED,
        message: "LinkedIn CSRF token could not be derived",
      });
    }

    return {
      accept: "application/vnd.linkedin.normalized+json+2.1",
      cookie: [
        `li_at=${credentials.liAt}`,
        `JSESSIONID=${credentials.jsessionId}`,
      ].join("; "),
      "csrf-token": csrfToken,
      "x-restli-protocol-version": "2.0.0",
      "x-li-lang": env.LINKEDIN_LANGUAGE,
      "user-agent": env.LINKEDIN_USER_AGENT,
    };
  };