import type {
  LinkedinHttpMethod,
  LinkedinHttpRequestOptions,
} from "../types/linkedin-http.types.js";
import type { ParsedLinkedinProfileUrl } from "../types/linkedin-url.types.js";

export type LinkedinEndpointTemplateValue =
  | string
  | number
  | boolean
  | null
  | LinkedinEndpointTemplateValue[]
  | {
      [key: string]: LinkedinEndpointTemplateValue | undefined;
    };

export interface LinkedinInternalEndpointDefinition {
  method: LinkedinHttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  body?: LinkedinEndpointTemplateValue;
}

export interface LinkedinInternalEndpointConfig {
  profile?: LinkedinInternalEndpointDefinition;
  skills?: LinkedinInternalEndpointDefinition;
}

export interface LinkedinInternalRequestContext {
  profileUrl: ParsedLinkedinProfileUrl;
}

export type LinkedinInternalRequestOptions =
  LinkedinHttpRequestOptions;
