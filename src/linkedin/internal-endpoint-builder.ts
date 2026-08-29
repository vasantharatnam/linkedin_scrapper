import { ErrorCode } from "../types/error.types.js";
import type {
  LinkedinInternalEndpointDefinition,
  LinkedinInternalRequestContext,
  LinkedinInternalRequestOptions,
  LinkedinEndpointTemplateValue,
} from "./internal-endpoint.types.js";
import { AppError } from "../utils/app-error.js";

const TEMPLATE_TOKEN_PATTERN =
  /\{(publicIdentifier|encodedPublicIdentifier|canonicalUrl)\}/g;

const FORBIDDEN_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "csrf-token",
  "x-csrf-token",
  "x-li-track",
  "x-li-page-instance",
]);

const FORBIDDEN_VALUE_PATTERNS = [
  /\bli_at\s*=/i,
  /\bJSESSIONID\s*=/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/i,
  /\bcsrf-token\b/i,
  /\bauthorization\b/i,
];

export class LinkedinInternalEndpointRequestBuilder {
  build(
    definition: LinkedinInternalEndpointDefinition,
    context: LinkedinInternalRequestContext,
  ): LinkedinInternalRequestOptions {
    this.validateDefinition(definition);

    const path = this.renderTemplate(definition.path, context);

    this.validatePath(path);

    return {
      method: definition.method,
      path,
      query: this.renderQuery(definition.query, context),
      headers: definition.headers,
      body:
        definition.body === undefined
          ? undefined
          : this.renderBody(definition.body, context),
    };
  }

  private validateDefinition(
    definition: LinkedinInternalEndpointDefinition,
  ): void {
    if (definition.method !== "GET" && definition.method !== "POST") {
      throw this.invalidDefinition(
        "LinkedIn endpoint method must be GET or POST",
      );
    }

    this.validatePath(definition.path);

    for (const headerName of Object.keys(definition.headers ?? {})) {
      if (FORBIDDEN_HEADER_NAMES.has(headerName.toLowerCase())) {
        throw this.invalidDefinition(
          `LinkedIn endpoint definition must not include ${headerName} header`,
        );
      }
    }

    this.rejectSensitiveValues(definition);
  }

  private validatePath(path: string): void {
    if (!path.startsWith("/")) {
      throw this.invalidDefinition(
        "LinkedIn endpoint path must be relative and start with '/'",
      );
    }

    if (path.startsWith("//")) {
      throw this.invalidDefinition(
        "LinkedIn endpoint path must not be protocol-relative",
      );
    }

    if (/^https?:\/\//i.test(path)) {
      throw this.invalidDefinition(
        "LinkedIn endpoint path must not include an origin",
      );
    }
  }

  private renderQuery(
    query: LinkedinInternalEndpointDefinition["query"],
    context: LinkedinInternalRequestContext,
  ): LinkedinInternalRequestOptions["query"] {
    if (!query) {
      return undefined;
    }

    return Object.fromEntries(
      Object.entries(query).map(([key, value]) => [
        key,
        typeof value === "string"
          ? this.renderTemplate(value, context)
          : value,
      ]),
    );
  }

  private renderBody(
    value: LinkedinEndpointTemplateValue,
    context: LinkedinInternalRequestContext,
  ): LinkedinEndpointTemplateValue {
    if (typeof value === "string") {
      return this.renderTemplate(value, context);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.renderBody(item, context));
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [
          key,
          entryValue === undefined
            ? undefined
            : this.renderBody(entryValue, context),
        ]),
      );
    }

    return value;
  }

  private renderTemplate(
    template: string,
    context: LinkedinInternalRequestContext,
  ): string {
    return template.replace(
      TEMPLATE_TOKEN_PATTERN,
      (_match, token: string) => {
        if (token === "publicIdentifier") {
          return context.profileUrl.publicIdentifier;
        }

        if (token === "encodedPublicIdentifier") {
          return encodeURIComponent(
            context.profileUrl.publicIdentifier,
          );
        }

        return context.profileUrl.canonicalUrl;
      },
    );
  }

  private rejectSensitiveValues(value: unknown): void {
    if (typeof value === "string") {
      if (
        FORBIDDEN_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value),
        )
      ) {
        throw this.invalidDefinition(
          "LinkedIn endpoint definition contains credential-like material",
        );
      }

      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.rejectSensitiveValues(item);
      }

      return;
    }

    if (value && typeof value === "object") {
      for (const entryValue of Object.values(value)) {
        this.rejectSensitiveValues(entryValue);
      }
    }
  }

  private invalidDefinition(message: string): AppError {
    return new AppError({
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message,
    });
  }
}
