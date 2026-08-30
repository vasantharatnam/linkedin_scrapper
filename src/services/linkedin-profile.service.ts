import type { LinkedinProfile } from "../schemas/index.js";
import {
  LinkedinInternalEndpointRequestBuilder,
  getLinkedinInternalEndpointConfig,
  normalizeLinkedinBasicProfile,
  type LinkedinInternalEndpointConfig,
} from "../linkedin/index.js";
import type { LinkedinHttpClient } from "../types/linkedin-http.types.js";
import type { ParsedLinkedinProfileUrl } from "../types/linkedin-url.types.js";
import { ErrorCode } from "../types/error.types.js";
import { AppError } from "../utils/app-error.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";
import { linkedinHttpClient } from "../clients/index.js";

interface LinkedinProfileRetrievalServiceOptions {
  httpClient?: LinkedinHttpClient;
  endpointConfigProvider?: () => LinkedinInternalEndpointConfig;
  requestBuilder?: LinkedinInternalEndpointRequestBuilder;
}

interface RetrieveProfileOptions {
  linkedinUrl: string;
}

export class LinkedinProfileRetrievalService {
  private readonly httpClient: LinkedinHttpClient;
  private readonly endpointConfigProvider: () => LinkedinInternalEndpointConfig;
  private readonly requestBuilder: LinkedinInternalEndpointRequestBuilder;

  constructor(
    options: LinkedinProfileRetrievalServiceOptions = {},
  ) {
    this.httpClient = options.httpClient ?? linkedinHttpClient;
    this.endpointConfigProvider =
      options.endpointConfigProvider ??
      getLinkedinInternalEndpointConfig;
    this.requestBuilder =
      options.requestBuilder ??
      new LinkedinInternalEndpointRequestBuilder();
  }

  async retrieveProfile({
    linkedinUrl,
  }: RetrieveProfileOptions): Promise<LinkedinProfile> {
    const profileUrl = parseLinkedinProfileUrl(linkedinUrl);
    const endpointConfig = this.endpointConfigProvider();

    if (!endpointConfig.profile) {
      throw new AppError({
        statusCode: 503,
        code: ErrorCode.SCRAPING_FAILED,
        message:
          "LinkedIn profile endpoint configuration is required",
      });
    }

    const requestContext = {
      profileUrl,
    };
    const profileRequest = this.requestBuilder.build(
      endpointConfig.profile,
      requestContext,
    );

    const profileResponse =
      await this.httpClient.request<unknown>(profileRequest);

    const skillsResponse = endpointConfig.skills
      ? await this.retrieveOptionalSkillsResponse(
          endpointConfig,
          profileUrl,
        )
      : undefined;

    return normalizeLinkedinBasicProfile({
      profileUrl,
      response: profileResponse.data,
      skillsResponse,
    });
  }

  private async retrieveOptionalSkillsResponse(
    endpointConfig: LinkedinInternalEndpointConfig,
    profileUrl: ParsedLinkedinProfileUrl,
  ): Promise<unknown | undefined> {
    if (!endpointConfig.skills) {
      return undefined;
    }

    try {
      const skillsResponse =
        await this.httpClient.request<unknown>(
          this.requestBuilder.build(endpointConfig.skills, {
            profileUrl,
          }),
        );

      return skillsResponse.data;
    } catch (error) {
      if (
        error instanceof AppError &&
        (error.code === ErrorCode.FORBIDDEN ||
          error.code === ErrorCode.NOT_FOUND)
      ) {
        return undefined;
      }

      throw error;
    }
  }
}

export const linkedinProfileRetrievalService =
  new LinkedinProfileRetrievalService();
