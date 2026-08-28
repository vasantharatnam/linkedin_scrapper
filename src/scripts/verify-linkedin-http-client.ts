import { DefaultLinkedinHttpClient } from "../clients/index.js";
import { AppError } from "../utils/app-error.js";

interface ExampleResponse {
  message: string;
}

let capturedUrl: string | null = null;
let capturedMethod: string | null = null;

const successfulFetch: typeof fetch = async (
  input,
  init,
): Promise<Response> => {
  capturedUrl =
    input instanceof URL ? input.toString() : String(input);

  capturedMethod = init?.method ?? "GET";

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