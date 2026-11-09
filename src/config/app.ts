/**
 * Single source of truth for the application name and global runtime config.
 * The name "MJTV" is intentionally overridable via NEXT_PUBLIC_APP_NAME so the
 * brand can be renamed from one place without touching the components.
 */
export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "MJTV",
  shortName: "MJTV",
  description:
    "Il est toujours 20 h quelque part. Zappez autour de la Terre sur un cadran éclairé par le vrai soleil : télévisions du monde, voix francophones et cultures africaines.",
  defaultCountry: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "FR",
  defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? "fra",
  enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true",
  enableEpg: process.env.NEXT_PUBLIC_ENABLE_EPG === "true",
  enableCinematicCarousel: process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_CAROUSEL !== "false",
  /** Cache lifetime (seconds) for the IPTV-org dataset on the server. */
  iptvRevalidateSeconds: Number(process.env.IPTV_DATA_REVALIDATE_SECONDS ?? 21600),
  /** Night ink of the Méridien identity, used for browser chrome. */
  accentColor: "#090B14",
  accentColorRgb: "9, 11, 20",
  version: "1.0.0",
  /** Maximum number of history entries kept in localStorage. */
  maxHistoryEntries: 50,
  /** Maximum accepted size (bytes) for an imported M3U playlist. */
  maxPlaylistBytes: 5 * 1024 * 1024,
  /** Maximum accepted size (bytes) for an imported WebVTT subtitle file. */
  maxSubtitleBytes: 2 * 1024 * 1024,
} as const;

export type AppConfig = typeof APP_CONFIG;
