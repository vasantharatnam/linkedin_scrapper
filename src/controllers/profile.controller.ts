import type { NextFunction, Request, Response } from "express";

import {
  scrapeProfileRequestSchema,
  scrapeProfileResponseSchema,
  type LinkedinProfile,
  type ScrapeProfileResponse,
} from "../schemas/index.js";
import { linkedinProfileRetrievalService } from "../services/index.js";

interface ProfileRetrievalService {
  retrieveProfile(options: {
    linkedinUrl: string;
  }): Promise<LinkedinProfile>;
}

export function createScrapeProfileController(
  service: ProfileRetrievalService = linkedinProfileRetrievalService,
) {
  return async function scrapeProfile(
    request: Request,
    response: Response<ScrapeProfileResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const body = scrapeProfileRequestSchema.parse(request.body);
      const profile = await service.retrieveProfile({
        linkedinUrl: body.linkedinUrl,
      });

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
