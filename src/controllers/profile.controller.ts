import type { NextFunction, Request, Response } from "express";

import {
  createProfileCacheKey,
  profileCache,
} from "../cache/index.js";
import {
  scrapeProfileRequestSchema,
  scrapeProfileResponseSchema,
  type LinkedinProfile,
  type ScrapeProfileResponse,
} from "../schemas/index.js";
import { linkedinProfileRetrievalService } from "../services/index.js";
import { parseLinkedinProfileUrl } from "../utils/linkedin-url.js";

interface ProfileRetrievalService {
  retrieveProfile(options: {
    linkedinUrl: string;
  }): Promise<LinkedinProfile>;
}

interface ProfileCache {
  get(key: string): LinkedinProfile | undefined;
  set(key: string, value: LinkedinProfile): void;
}

interface ScrapeProfileControllerOptions {
  service?: ProfileRetrievalService;
  cache?: ProfileCache;
}

export function createScrapeProfileController(
  optionsOrService:
    | ScrapeProfileControllerOptions
    | ProfileRetrievalService = {},
) {
  const options =
    "retrieveProfile" in optionsOrService
      ? { service: optionsOrService }
      : optionsOrService;
  const service =
    options.service ?? linkedinProfileRetrievalService;
  const cache = options.cache ?? profileCache;

  return async function scrapeProfile(
    request: Request,
    response: Response<ScrapeProfileResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = scrapeProfileRequestSchema.parse(request.body);
      const parsedUrl = parseLinkedinProfileUrl(body.linkedinUrl);
      const apiKeyScope =
        typeof response.locals?.apiKeyScope === "string"
          ? response.locals.apiKeyScope
          : "anonymous";
      const cacheKey = createProfileCacheKey(
        apiKeyScope,
        parsedUrl.canonicalUrl,
      );
      const cachedProfile = cache.get(cacheKey);

      if (cachedProfile) {
        const cachedResponseBody =
          scrapeProfileResponseSchema.parse({
            success: true,
            data: cachedProfile,
            meta: {
              scrapedAt: new Date().toISOString(),
              cached: true,
            },
          });

        response.status(200).json(cachedResponseBody);
        return;
      }

      const profile = await service.retrieveProfile({
        linkedinUrl: parsedUrl.canonicalUrl,
      });

      cache.set(cacheKey, profile);

      const responseBody = scrapeProfileResponseSchema.parse({
        success: true,
        data: profile,
        meta: {
          scrapedAt: new Date().toISOString(),
          cached: false,
        },
      });

      response.status(200).json(responseBody);
    } catch (error) {
      next(error);
    }
  };
}

export const scrapeProfile = createScrapeProfileController();
