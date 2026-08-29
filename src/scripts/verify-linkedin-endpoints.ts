import { LinkedinInternalEndpointRequestBuilder } from "../linkedin/internal-endpoint-builder.js";
import { AppError } from "../utils/app-error.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

const builder = new LinkedinInternalEndpointRequestBuilder();

const request = builder.build(
  {
    method: "GET",
    path: "/voyager/api/synthetic/profile/{encodedPublicIdentifier}",
    query: {
      view: "synthetic",
      profile: "{publicIdentifier}",
    },
    headers: {
      accept: "application/vnd.linkedin.normalized+json+2.1",
    },
  },
  {
    profileUrl: parseLinkedinProfileUrl(
      "https://www.linkedin.com/in/example-profile/",
    ),
  },
);

if (
  request.path !==
  "/voyager/api/synthetic/profile/example-profile"
) {
  throw new Error(`Unexpected request path: ${request.path}`);
}

if (request.query?.profile !== "example-profile") {
  throw new Error("Expected public identifier query rendering");
}

if (request.headers?.accept === undefined) {
  throw new Error("Expected safe passthrough header");
}

try {
  builder.build(
    {
      method: "GET",
      path: "https://www.linkedin.com/voyager/api/synthetic",
    },
    {
      profileUrl: parseLinkedinProfileUrl(
        "https://www.linkedin.com/in/example-profile/",
      ),
    },
  );

  throw new Error("Expected absolute endpoint path to be rejected");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }
}

try {
  builder.build(
    {
      method: "GET",
      path: "/voyager/api/synthetic",
      headers: {
        cookie: "li_at=not-allowed",
      },
    },
    {
      profileUrl: parseLinkedinProfileUrl(
        "https://www.linkedin.com/in/example-profile/",
      ),
    },
  );

  throw new Error("Expected credential headers to be rejected");
} catch (error) {
  if (!(error instanceof AppError)) {
    throw error;
  }
}

console.log("LinkedIn endpoint builder verification passed.");
