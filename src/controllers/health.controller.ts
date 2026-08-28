
import type {Request, Response } from "express";

import { env } from  "../config/env.js"
import type { HealthResponse } from "../types/health.types.js";


export function getHealth(
  _request: Request,
  response: Response<HealthResponse>,
): void {
     const responseBody: HealthResponse = {
        success: true,
        data: {
            status: "healthy",
            service: "linkedin-profile-api",
            version: "1.0.0",
            environment: env.NODE_ENV,
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        },
     };

     response.status(200).json(responseBody);
}