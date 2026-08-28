import { env } from "../config/env.js";
import { ErrorCode } from "../types/error.types.js";
import type {
  LinkedinHttpClient,
  LinkedinHttpRequestOptions,
  LinkedinHttpResponse,
} from "../types/linkedin-http.types.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

type FetchImplementation = typeof fetch;

interface DefaultLinkedinHttpClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export class DefaultLinkedinHttpClient
  implements LinkedinHttpClient
{
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: FetchImplementation;

  constructor(options: DefaultLinkedinHttpClientOptions = {}) {
    this.baseUrl = new URL(
      options.baseUrl ?? env.LINKEDIN_BASE_URL,
    );

    this.timeoutMs =
      options.timeoutMs ?? env.LINKEDIN_REQUEST_TIMEOUT_MS;

    this.fetchImplementation =
      options.fetchImplementation ?? globalThis.fetch;
  }

  async get<T>(
    path: string,
    options: Omit<
      LinkedinHttpRequestOptions,
      "method" | "path" | "body"
    > = {},
  ): Promise<LinkedinHttpResponse<T>> {
    return this.request<T>({
      ...options,
      method: "GET",
      path,
    });
  }

  async request<T>(
    options: LinkedinHttpRequestOptions,
  ): Promise<LinkedinHttpResponse<T>> {
    const requestUrl = this.buildRequestUrl(
      options.path,
      options.query,
    );

    const method = options.method ?? "GET";

    const headers = new Headers({
      accept: "application/json",
      ...options.headers,
    });

    let serializedBody: string | undefined;

    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      serializedBody = JSON.stringify(options.body);
    }

    logger.debug("Sending request to LinkedIn", {
      method,
      origin: requestUrl.origin,
      pathname: requestUrl.pathname,
    });

    let response: Response;

    try {
      response = await this.fetchImplementation(requestUrl, {
        method,
        headers,
        body: serializedBody,
        redirect: "manual",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw this.mapNetworkError(error);
    }

    if (!response.ok) {
      throw await this.mapHttpError(response);
    }

    const responseData = await this.parseResponseBody<T>(response);

    return {
      status: response.status,
      headers: response.headers,
      data: responseData,
    };
  }

  private buildRequestUrl(
    path: string,
    query: LinkedinHttpRequestOptions["query"],
  ): URL {
    if (!path.startsWith("/")) {
      throw new AppError({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "LinkedIn request path must start with '/'",
      });
    }

    if (path.startsWith("//")) {
      throw new AppError({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "LinkedIn request path must not be protocol-relative",
      });
    }

    const requestUrl = new URL(path, this.baseUrl);

    if (requestUrl.origin !== this.baseUrl.origin) {
      throw new AppError({
        statusCode: 500,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: "LinkedIn request cannot target another origin",
      });
    }

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        requestUrl.searchParams.set(key, String(value));
      }
    }

    return requestUrl;
  }

  private async parseResponseBody<T>(
    response: Response,
  ): Promise<T> {
    const contentType =
      response.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      throw new AppError({
        statusCode: 502,
        code: ErrorCode.SCRAPING_FAILED,
        message: "LinkedIn returned a non-JSON response",
        details: {
          upstreamStatus: response.status,
        },
      });
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new AppError({
        statusCode: 502,
        code: ErrorCode.SCRAPING_FAILED,
        message: "LinkedIn returned malformed JSON",
        cause: error,
      });
    }
  }

  private async mapHttpError(
    response: Response,
  ): Promise<AppError> {
    const details = {
      upstreamStatus: response.status,
      requestId:
        response.headers.get("x-li-uuid") ??
        response.headers.get("x-request-id") ??
        undefined,
    };

    if (response.status === 401) {
      return new AppError({
        statusCode: 502,
        code: ErrorCode.LINKEDIN_AUTH_REQUIRED,
        message: "LinkedIn authentication is required or has expired",
        details,
      });
    }

    if (response.status === 403) {
      return new AppError({
        statusCode: 502,
        code: ErrorCode.FORBIDDEN,
        message: "LinkedIn denied access to the requested resource",
        details,
      });
    }

    if (response.status === 404) {
      return new AppError({
        statusCode: 404,
        code: ErrorCode.NOT_FOUND,
        message: "LinkedIn resource was not found",
        details,
      });
    }

    if (response.status === 429) {
      return new AppError({
        statusCode: 503,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: "LinkedIn rate limit was exceeded",
        details: {
          ...details,
          retryAfter: response.headers.get("retry-after"),
        },
      });
    }

    if (response.status >= 500) {
      return new AppError({
        statusCode: 502,
        code: ErrorCode.SCRAPING_FAILED,
        message: "LinkedIn is temporarily unavailable",
        details,
      });
    }

    return new AppError({
      statusCode: 502,
      code: ErrorCode.SCRAPING_FAILED,
      message: "LinkedIn request failed",
      details,
    });
  }

  private mapNetworkError(error: unknown): AppError {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError")
    ) {
      return new AppError({
        statusCode: 504,
        code: ErrorCode.SCRAPING_FAILED,
        message: "LinkedIn request timed out",
        cause: error,
      });
    }

    return new AppError({
      statusCode: 502,
      code: ErrorCode.SCRAPING_FAILED,
      message: "Unable to connect to LinkedIn",
      cause: error,
    });
  }
}