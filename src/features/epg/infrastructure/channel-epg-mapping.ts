import type { EpgChannelMapping } from "../application/epg-service";

/**
 * Explicit, reviewed mapping. Channel display names are deliberately never used
 * as identifiers because they are neither unique nor stable.
 */
export const CHANNEL_EPG_MAPPING = {
  "demo-fr": "fixture:demo-fr",
} as const satisfies EpgChannelMapping;
