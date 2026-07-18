/**
 * Normalised internal channel model. Decoupled from the raw iptv-org shape so
 * the upstream format can evolve without breaking the rest of the app.
 */
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
};

export type NormalizedChannel = {
  id: string;
  name: string;
  alternativeNames: string[];
  countryCode: string | null;
  countryName: string | null;
  countryFlag: string | null;
  languageCodes: string[];
  categories: string[];
  logoUrl: string | null;
  websiteUrl: string | null;
  /** Always false — NSFW entries are excluded upstream. */
  isNsfw: false;
  streams: NormalizedStream[];
};

export type ChannelSummary = Omit<NormalizedChannel, "streams"> & {
  streamCount: number;
  bestCompatibility: NormalizedStream["browserCompatibility"];
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
  cursor?: string;
  limit: number;
  source?: "iptv-org" | "imported" | "all";
};
