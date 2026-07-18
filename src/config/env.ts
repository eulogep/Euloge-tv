/**
 * Centralised, typed access to public runtime environment variables.
 * Server-only secrets (no NEXT_PUBLIC_ prefix) are NOT exposed here.
 */
const required = (value: string | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value : fallback;

export const env = {
  public: {
    appName: required(process.env.NEXT_PUBLIC_APP_NAME, "MJTV"),
    defaultCountry: required(process.env.NEXT_PUBLIC_DEFAULT_COUNTRY, "FR"),
    defaultLanguage: required(process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE, "fra"),
    enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true",
    enableEpg: process.env.NEXT_PUBLIC_ENABLE_EPG === "true",
  },
  server: {
    iptvRevalidateSeconds: Number(process.env.IPTV_DATA_REVALIDATE_SECONDS ?? 21600),
  },
} as const;
