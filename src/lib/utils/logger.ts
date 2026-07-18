/**
 * Tiny structured logger — no Pino/Winston in V1. Avoids leaking sensitive
 * data (full URLs with tokens, playlist content, subtitle content).
 */
type LogLevel = "debug" | "info" | "warn" | "error";
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isBrowser = typeof window !== "undefined";
const DEV = process.env.NODE_ENV !== "production";
const DIAGNOSTIC =
  (isBrowser &&
    (localStorage.getItem("mjtv:diagnostic") === "1" ||
      process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true")) ||
  false;

const minLevel: LogLevel = DEV || DIAGNOSTIC ? "debug" : "info";

const sanitizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    // Strip query string — may contain tokens.
    return `${u.origin}${u.pathname}`;
  } catch {
    return "[invalid-url]";
  }
};

const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  if (ORDER[level] < ORDER[minLevel]) return;
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
};

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  sanitizeUrl,
};
