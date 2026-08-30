
import { ErrorCode } from "../types/error.types.js";
import type { ParsedLinkedinProfileUrl } from "../types/linkedin-url.types.js";
import { AppError } from "./app-error.js";

const ALLOWED_LINKEDIN_HOSTNAMES = new Set([
    "linkedin.com",
    "www.linkedin.com",
]);


const MIN_IDENTIFIER_LENGTH = 3;
const MAX_IDENTIFIER_LENGTH = 100;

const PUBLIC_IDENTIFIER_PATTERN = /^[\p{L}\p{N}_-]+$/u;

function invalidLinkedinUrl(
    message: string,
    details?: Record<string, unknown>
): AppError {
   return new AppError({
      statusCode: 400,
      code: ErrorCode.INVALID_LINKEDIN_URL,
      message,
      details,
   });
}

export function parseLinkedinProfileUrl(
   input: string,
): ParsedLinkedinProfileUrl {
    
    const trimmedInput = input.trim();

    if(!trimmedInput){
        throw invalidLinkedinUrl("linkedin profile url is required");
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(trimmedInput);
    }
    catch {
        throw invalidLinkedinUrl(
            "The provided value is not a valid URL",
        )
    }

    if(parsedUrl.protocol !== "https:"){
        throw invalidLinkedinUrl(
            "LinkedIn profile URL must be HTTPS",
        )
    }

    const normalizedHostname = parsedUrl.hostname.toLowerCase();

    if(!ALLOWED_LINKEDIN_HOSTNAMES.has(normalizedHostname)){
        throw invalidLinkedinUrl(
          "URL must belong to linkedin.com",
         {
            hostname: normalizedHostname,
         },
        );
    };

    if (parsedUrl.username || parsedUrl.password) {
    throw invalidLinkedinUrl(
      "LinkedIn URL must not contain authentication credentials",
    );
   }
   
   if (parsedUrl.port && parsedUrl.port !== "443") {
    throw invalidLinkedinUrl(
      "LinkedIn profile URL contains an unsupported port",
      {
        port: parsedUrl.port,
      },
    );
  }

  const pathSegments = parsedUrl.pathname
    .split("/")
    .filter(Boolean);

  if (pathSegments.length !== 2 || pathSegments[0] !== "in") {
    throw invalidLinkedinUrl(
      "URL must point directly to a LinkedIn member profile",
      {
        expectedFormat:
          "https://www.linkedin.com/in/example-profile/",
      },
    );
  }


  let publicIdentifier: string;

  try {
    publicIdentifier = decodeURIComponent(pathSegments[1] ?? "");
  } catch {
    throw invalidLinkedinUrl(
      "LinkedIn public identifier contains invalid encoding",
    );
  }

  if (
    publicIdentifier.length < MIN_IDENTIFIER_LENGTH ||
    publicIdentifier.length > MAX_IDENTIFIER_LENGTH
  ) {
    throw invalidLinkedinUrl(
      `LinkedIn public identifier must contain between ${MIN_IDENTIFIER_LENGTH} and ${MAX_IDENTIFIER_LENGTH} characters`,
    );
  }

  if (!PUBLIC_IDENTIFIER_PATTERN.test(publicIdentifier)) {
    throw invalidLinkedinUrl(
      "LinkedIn public identifier contains unsupported characters",
    );
  }

  const encodedIdentifier = encodeURIComponent(publicIdentifier);

  return {
    originalUrl: trimmedInput,
    canonicalUrl: `https://www.linkedin.com/in/${encodedIdentifier}/`,
    publicIdentifier,
  };

}
