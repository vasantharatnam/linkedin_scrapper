

export type LinkedinHttpMethod = "GET" | "POST";

export interface LinkedinHttpRequestOptions {
    method?: LinkedinHttpMethod;
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string,string>;
    body?: unknown;
}

export interface LinkedinHttpResponse<T> {
    status: number;
    headers: Headers;
    data: T;
}

export interface LinkedinHttpClient {
  request<T>(
    options: LinkedinHttpRequestOptions,
  ): Promise<LinkedinHttpResponse<T>>;

  get<T>(
    path: string,
    options?: Omit<
      LinkedinHttpRequestOptions,
      "method" | "path" | "body"
    >,
  ): Promise<LinkedinHttpResponse<T>>;
}