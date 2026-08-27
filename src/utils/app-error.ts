import type { ErrorCode } from "../types/error.types.js";

interface AppErrorOptions {
    statusCode: number;
    code: ErrorCode;
    message: string;
    details?: unknown;
    cause?: unknown;
}

export class AppError extends Error {
    readonly statusCode: number;
    readonly code: ErrorCode;
    readonly details?:unknown;
    readonly cause?: unknown;
    readonly isOperational: boolean;

    constructor(options: AppErrorOptions) {
    super(options.message);

    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
    this.isOperational = true;

    Error.captureStackTrace(this, AppError);
  }
}