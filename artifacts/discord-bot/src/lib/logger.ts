import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const _dirname = dirname(fileURLToPath(import.meta.url));

function getTimestamp() {
  return new Date().toISOString();
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function log(level: LogLevel, message: string, data?: unknown) {
  const prefix =
    level === "ERROR"
      ? "\x1b[31m"
      : level === "WARN"
        ? "\x1b[33m"
        : level === "INFO"
          ? "\x1b[36m"
          : "\x1b[90m";
  const reset = "\x1b[0m";
  const line = `${prefix}[${getTimestamp()}] [${level}]${reset} ${message}${data ? " " + JSON.stringify(data) : ""}`;
  if (level === "ERROR") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (msg: string, data?: unknown) => log("INFO", msg, data),
  warn: (msg: string, data?: unknown) => log("WARN", msg, data),
  error: (msg: string, data?: unknown) => log("ERROR", msg, data),
  debug: (msg: string, data?: unknown) => log("DEBUG", msg, data),
};
