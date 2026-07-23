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

export type SourceHealthAuditStatus =
  | "playable"
  | "unknown"
  | "temporarily_unavailable"
  | "unsupported_format"
  | "invalid_url"
  | "network_error"
  | "forbidden_or_restricted"
  | "dead"
  | "no_source";

export type ChannelHealthStatus =
  | "healthy"
  | "degraded"
  | "unverified"
  | "temporarily_unavailable"
  | "unavailable"
  | "no_source"
  | "blocked_or_restricted"
  | "archived";

export type SourceCatalogHealth = {
  status: Exclude<SourceHealthAuditStatus, "no_source">;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  responseStatus: number | null;
  contentType: string | null;
  manifestValid: boolean | null;
  playbackStrategy: SourcePlaybackStrategy | null;
  compatibility: SourceCompatibilityStatus;
  failureReason: string | null;
  sourceOrigin: string;
  manuallyApproved: boolean;
  disabled: boolean;
  priority: number;
};

export type ChannelHealth = {
  status: ChannelHealthStatus;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  sourceCount: number;
  playableSourceCount: number;
  unknownSourceCount: number;
  failedSourceCount: number;
  preferredSourceId: string | null;
  reasonCode: string;
  reasonMessage: string;
  auditOrigin: "upstream" | "manual" | "local-audit" | "mixed";
  manuallyReviewed: boolean;
  reviewerNote: string | null;
  nextCheckAt: string | null;
};

export type PublicChannelHealth = Pick<
  ChannelHealth,
  "status" | "checkedAt" | "sourceCount" | "playableSourceCount" | "reasonCode" | "reasonMessage"
>;

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
  /** Curated catalog observation, distinct from browser-local availability. */
  catalogHealth?: SourceCatalogHealth;
  sourceOrigin?: string;
  manuallyApproved?: boolean;
  disabled?: boolean;
  priority?: number;
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
  /** Internal catalog-health model. Public routes expose only a projection. */
  health?: ChannelHealth;
};

export type ChannelSummary = Omit<NormalizedChannel, "streams" | "health"> & {
  streamCount: number;
  bestCompatibility: NormalizedStream["browserCompatibility"];
  /** Best known observation. Optional so cached/legacy API payloads remain readable. */
  bestAvailability?: SourceAvailabilityStatus;
  health?: PublicChannelHealth;
};

export type PublicChannelDetail = Omit<NormalizedChannel, "health"> & {
  health?: PublicChannelHealth;
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
