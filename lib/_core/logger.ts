type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = ["token", "cookie", "authorization", "secret", "password", "openid"];

function normalizeLogLevel(raw: string | undefined): LogLevel | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return null;
}

function resolveLogLevel(): LogLevel {
  const configured = normalizeLogLevel(process.env.EXPO_PUBLIC_APP_LOG_LEVEL || process.env.APP_LOG_LEVEL);
  if (configured) return configured;
  return typeof __DEV__ !== "undefined" && __DEV__ ? "debug" : "info";
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((token) => normalized.includes(token));
}

function mask(value: string): string {
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function sanitize(value: unknown, key?: string): unknown {
  if (key && shouldRedactKey(key)) {
    if (typeof value === "string") return mask(value);
    return "***";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(input)) {
      output[entryKey] = sanitize(entryValue, entryKey);
    }
    return output;
  }

  return value;
}

const activeLevel = resolveLogLevel();

function write(level: LogLevel, message: string, meta?: unknown) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel]) return;
  const payload = meta === undefined ? undefined : sanitize(meta);
  const prefix = `[app:${level}] ${message}`;

  if (level === "debug") {
    if (payload === undefined) console.debug(prefix);
    else console.debug(prefix, payload);
    return;
  }
  if (level === "info") {
    if (payload === undefined) console.info(prefix);
    else console.info(prefix, payload);
    return;
  }
  if (level === "warn") {
    if (payload === undefined) console.warn(prefix);
    else console.warn(prefix, payload);
    return;
  }

  if (payload === undefined) console.error(prefix);
  else console.error(prefix, payload);
}

export const appLogger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};
