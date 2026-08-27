

export const ErrorCode = {
    VALIDATION_ERROR : "VALIDATION_ERROR",
    INVALID_LINKEDIN_URL : "INVALID_LINKEDIN_URL",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
    SCRAPING_FAILED: "SCRAPING_FAILED",
    LINKEDIN_AUTH_REQUIRED: "LINKEDIN_AUTH_REQUIRED",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR"
}


export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export interface ErrorResponse {
    success: false,
    error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
    };
}