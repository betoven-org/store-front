/**
 * Structured logger — JSON format for production, pretty for dev.
 * Compatible with Datadog, Grafana, Vercel Logs.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.info("User login", { email: "x@y.com", tenantId: 1 });
 *   log.error("Payment failed", { error: err.message, orderId: 123 });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === "development";

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (isDev) {
    const prefix = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌" }[level];
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    return `${prefix} [${level.toUpperCase()}] ${message}${ctx}`;
  }

  return JSON.stringify(entry);
}

export const log = {
  debug(message: string, context?: LogContext) {
    if (isDev) console.debug(formatMessage("debug", message, context));
  },
  info(message: string, context?: LogContext) {
    console.log(formatMessage("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatMessage("warn", message, context));
  },
  error(message: string, context?: LogContext) {
    console.error(formatMessage("error", message, context));
  },
};
