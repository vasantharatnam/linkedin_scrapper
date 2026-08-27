import { env } from "../config/env.js"

type LogLevel = "debug" | "info" | "warn" | "error";

const logPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function shouldLog(level: LogLevel): boolean {
    return logPriority[level] >= logPriority[env.LOG_LEVEL]
}

function writeLog (level: LogLevel, message: string, metadata?: Record<string,unknown>,) : void {
      if(!shouldLog(level)){
        return;
      }

      const logEntry = {
          timeStamp: new Date().toISOString(),
          level,
          message,
          ...(metadata ? { metadata } : {}),
      };

      const serializedEntry =  JSON.stringify(logEntry);

      if(level === "error"){
        console.error(serializedEntry)
        return;
      }

      if(level === "warn"){
        console.warn(serializedEntry)
        return
      }

      console.log(serializedEntry);
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>): void {
    writeLog("debug", message, metadata);
  },

  info(message: string, metadata?: Record<string, unknown>): void {
    writeLog("info", message, metadata);
  },

  warn(message: string, metadata?: Record<string, unknown>): void {
    writeLog("warn", message, metadata);
  },

  error(message: string, metadata?: Record<string, unknown>): void {
    writeLog("error", message, metadata);
  },
};