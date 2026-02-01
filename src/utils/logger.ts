// src/utils/logger.ts

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const env = process.env.CURSOR_ACP_LOG_LEVEL?.toLowerCase();
  if (env && env in LEVEL_PRIORITY) {
    return env as LogLevel;
  }
  return "info";
}

function isSilent(): boolean {
  return process.env.CURSOR_ACP_LOG_SILENT === "1" ||
         process.env.CURSOR_ACP_LOG_SILENT === "true";
}

function shouldLog(level: LogLevel): boolean {
  if (isSilent()) return false;
  const configured = getConfiguredLevel();
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configured];
}

function formatMessage(level: LogLevel, component: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[cursor-acp:${component}]`;
  const levelTag = level.toUpperCase().padEnd(5);

  let formatted = `${prefix} ${levelTag} ${message}`;

  if (data !== undefined) {
    if (typeof data === "object") {
      formatted += ` ${JSON.stringify(data)}`;
    } else {
      formatted += ` ${data}`;
    }
  }

  return formatted;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export function createLogger(component: string): Logger {
  return {
    debug: (message: string, data?: unknown) => {
      if (shouldLog("debug")) {
        console.error(formatMessage("debug", component, message, data));
      }
    },
    info: (message: string, data?: unknown) => {
      if (shouldLog("info")) {
        console.error(formatMessage("info", component, message, data));
      }
    },
    warn: (message: string, data?: unknown) => {
      if (shouldLog("warn")) {
        console.error(formatMessage("warn", component, message, data));
      }
    },
    error: (message: string, data?: unknown) => {
      if (shouldLog("error")) {
        console.error(formatMessage("error", component, message, data));
      }
    },
  };
}
