/**
 * Normalised internal channel model. Decoupled from the raw iptv-org shape so
 * the upstream format can evolve without breaking the rest of the app.
 */
export type SourceAvailabilityStatus =
  | "unknown"
  | "checking"
  | "playable"
  | "temporarily_unavailable"
  | "unsupported_format"
  | "network_error"
  | "forbidden_or_restricted"
  | "invalid_url"
  | "timeout";

export type SourceCompatibilityStatus = "unknown" | "compatible" | "incompatible";

export type SourcePlaybackStrategy =
  "native-hls" | "hls.js" | "native-mp4" | "native-direct" | "unsupported";

export type SourceAvailability = {
  status: SourceAvailabilityStatus;
  lastCheckedAt: string | null;
  failureReason: string | null;
  responseStatus: number | null;
  detectedContentType: string | null;
  playbackStrategy: SourcePlaybackStrategy | null;
  compatibility: {
    safari: SourceCompatibilityStatus;
    chromium: SourceCompatibilityStatus;
    unknown: SourceCompatibilityStatus;
  };
};

export const createUnknownSourceAvailability = (): SourceAvailability => ({
  status: "unknown",
  lastCheckedAt: null,
  failureReason: null,
  responseStatus: null,
  detectedContentType: null,
  playbackStrategy: null,
  compatibility: {
    safari: "unknown",
    chromium: "unknown",
    unknown: "unknown",
  },
});

export type CatalogCategory =
  | "live"
  | "news"
  | "sports"
  | "music"
  | "movies"
  | "series"
  | "kids"
  | "animation"
  | "anime"
  | "documentaries"
  | "culture"
  | "religious"
  | "entertainment"
  | "lifestyle"
  | "local"
  | "international"
  | "radio"
  | "other";

export type NormalizedStream = {
  id: string;
  url: string;
  title: string;
  quality: string | null;
  label: string | null;
  feedId: string | null;
  protocol: "https" | "http" | "other";
  kind: "hls" | "mp4" | "unknown";
  requiresReferrer: boolean;
  requiresCustomUserAgent: boolean;
  browserCompatibility: "preferred" | "native-only" | "limited" | "blocked" | "unknown";
  availability: SourceAvailability;
};

export type NormalizedChannel = {
  id: string;
  name: string;
  alternativeNames: string[];
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  languageCodes: string[];
  /** Canonical category used for filtering and ranking. */
  primaryCategory: CatalogCategory;
  /** Canonical category list kept for backwards-compatible UI consumers. */
  categories: CatalogCategory[];
  /** Secondary normalized metadata that may include non-category upstream values. */
  tags: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  /** Always false — NSFW entries are excluded upstream. */
  isNsfw: false;
  streams: NormalizedStream[];
};

export type ChannelSummary = Omit<NormalizedChannel, "streams"> & {
  streamCount: number;
  bestCompatibility: NormalizedStream["browserCompatibility"];
  /** Best known observation. Optional so cached/legacy API payloads remain readable. */
  bestAvailability?: SourceAvailabilityStatus;
};

export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

export type CatalogFilters = {
  countries: FilterOption[];
  categories: FilterOption[];
  languages: FilterOption[];
};

export type CatalogResponse = {
  items: ChannelSummary[];
  nextCursor: string | null;
  total: number;
  filters: CatalogFilters;
  generatedAt: string;
};

export type CatalogQuery = {
  q?: string;
  country?: string;
  category?: string;
  language?: string;
  availability?: "recommended" | "unverified" | "limited" | "blocked";
  sort?: "quality" | "name" | "country";
  cursor?: string;
  limit: number;
  source?: "iptv-org" | "imported" | "all";
};
