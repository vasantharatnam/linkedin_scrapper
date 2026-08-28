import { DefaultLinkedinHttpClient } from "./linkedin-http.client.js";

export const linkedinHttpClient =
  new DefaultLinkedinHttpClient();

export { DefaultLinkedinHttpClient };

export type {
  LinkedinHttpClient,
  LinkedinHttpMethod,
  LinkedinHttpRequestOptions,
  LinkedinHttpResponse,
} from "../types/linkedin-http.types.js";