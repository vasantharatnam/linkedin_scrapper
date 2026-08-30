import { DefaultLinkedinHttpClient } from "../clients/index.js";
import { AppError } from "../utils/app-error.js";

interface ExampleResponse {
  message: string;
}

let capturedUrl: string | null = null;
let capturedMethod: string | null = null;


let capturedCookie: string | null = null;
let capturedCsrfToken: string | null = null;
let capturedProtocolVersion: string | null = null;

const syntheticCookieHeader = [
  ["li_at", "synthetic-session"].join("="),
  ["JSESSIONID", "\"ajax:synthetic-csrf\""].join("="),
].join("; ");

const mockAuthHeadersProvider = (): Record<string, string> => ({
  accept: "application/vnd.linkedin.normalized+json+2.1",
  cookie: syntheticCookieHeader,
  "csrf-token": "ajax:test-csrf",
  "x-restli-protocol-version": "2.0.0",
  "x-li-lang": "en_US",
  "user-agent": "LinkedIn HTTP Client Verification",
});

const successfulFetch: typeof fetch = async (
  input,
  init,
): Promise<Response> => {
  capturedUrl =
    input instanceof URL ? input.toString() : String(input);

  capturedMethod = init?.method ?? "GET";

  const headers = new Headers(init?.headers);

capturedCookie = headers.get("cookie");
capturedCsrfToken = headers.get("csrf-token");
capturedProtocolVersion = headers.get(
  "x-restli-protocol-version",
);

  return new Response(
    JSON.stringify({
      message: "mock response",
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
};

const successfulClient = new DefaultLinkedinHttpClient({
  baseUrl: "https://www.linkedin.com",
  timeoutMs: 5_000,
  fetchImplementation: successfulFetch,
  authHeadersProvider: mockAuthHeadersProvider,
});

const result = await successfulClient.get<ExampleResponse>(
  "/voyager/api/example",
  {
    query: {
      profileId: "example-profile",
      includeDetails: true,
      ignored: undefined,
    },
  },
);

if (result.status !== 200) {
  throw new Error("Expected status 200");
}

if (result.data.message !== "mock response") {
  throw new Error("Expected the mock response body");
}

if (capturedMethod !== "GET") {
  throw new Error(`Expected GET, received ${capturedMethod}`);
}

if (capturedCookie !== syntheticCookieHeader) {
  throw new Error("Expected LinkedIn session cookies");
}

if (capturedCsrfToken !== "ajax:test-csrf") {
  throw new Error("Expected LinkedIn CSRF token");
}

if (capturedProtocolVersion !== "2.0.0") {
  throw new Error("Expected LinkedIn Rest.li protocol version");
}

const expectedUrl =
  "https://www.linkedin.com/voyager/api/example" +
  "?profileId=example-profile&includeDetails=true";

if (capturedUrl !== expectedUrl) {
  throw new Error(
    `Unexpected request URL. Expected ${expectedUrl}, received ${capturedUrl}`,
  );
}

const unauthorizedFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      message: "Unauthorized",
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
      },
    },
  );

const unauthorizedClient = new DefaultLinkedinHttpClient({
  fetchImplementation: unauthorizedFetch,
  authHeadersProvider: mockAuthHeadersProvider,
});

try {
  await unauthorizedClient.get("/voyager/api/example");

  throw new Error("Expected the 401 response to be rejected");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }

  if (error.code !== "LINKEDIN_AUTH_REQUIRED") {
    throw new Error(
      `Expected LINKEDIN_AUTH_REQUIRED, received ${error.code}`,
    );
  }
}

console.log("LinkedIn HTTP client verification passed.");
