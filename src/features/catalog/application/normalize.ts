import type {
  CatalogFilters,
  CatalogQuery,
  ChannelSummary,
  FilterOption,
  NormalizedChannel,
  NormalizedStream,
} from "../domain/types";
import { createUnknownSourceAvailability } from "../domain/types";
import { categoryLabelFr, normalizeCategories, normalizeCategory } from "./taxonomy";
import { catalogQualityScore } from "./catalog-quality";
import {
  activeStreams,
  healthStatusOf,
  isCatalogActive,
  toPublicChannelHealth,
} from "./source-health";
import { applyChannelSourceOverride } from "../infrastructure/source-overrides";
import type {
  IptvBlocklist,
  IptvCategory,
  IptvChannel,
  IptvCountry,
  IptvFeed,
  IptvGuide,
  IptvLanguage,
  IptvLogo,
  IptvStream,
} from "../infrastructure/schemas";

/**
 * Dangerous URL protocols that must never be displayed or played.
 * The browser will refuse most of these anyway, but we exclude them
 * upstream so they never reach the UI.
 */
export const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "file:",
  "rtmp:",
  "udp:",
  "rtsp:",
  "mms:",
] as const;

export const isDangerousUrl = (url: string): boolean => {
  const lower = url.trim().toLowerCase();
  return DANGEROUS_PROTOCOLS.some((p) => lower.startsWith(p));
};

export const detectKind = (
  url: string,
  detectedContentType?: string | null,
): NormalizedStream["kind"] => {
  const contentType = detectedContentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (
    contentType === "application/vnd.apple.mpegurl" ||
    contentType === "application/x-mpegurl" ||
    contentType === "audio/mpegurl" ||
    contentType === "audio/x-mpegurl"
  ) {
    return "hls";
  }
  if (contentType?.startsWith("video/")) return "mp4";

  const lower = url.toLowerCase();
  // HLS playlists
  if (lower.endsWith(".m3u8") || lower.includes(".m3u8?")) return "hls";
  // Direct MP4
  if (lower.endsWith(".mp4") || lower.includes(".mp4?")) return "mp4";
  if (lower.endsWith(".webm") || lower.includes(".webm?")) return "mp4";
  if (lower.endsWith(".ogv") || lower.includes(".ogv?")) return "mp4";
  // Heuristic: m3u8 in path
  if (lower.includes("m3u8")) return "hls";
  return "unknown";
};

const detectProtocol = (url: string): NormalizedStream["protocol"] => {
  if (url.startsWith("https://")) return "https";
  if (url.startsWith("http://")) return "http";
  return "other";
};

export const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

/**
 * Compute an approximate browser-compatibility score for a stream.
 * On an HTTPS production page:
 *   - HTTPS + HLS  → preferred (will work, possibly via hls.js)
 *   - HTTPS + MP4  → preferred (native)
 *   - HTTP + any   → limited (mixed-content blocked on HTTPS pages)
 *   - unknown kind → unknown
 */
export const computeCompatibility = (
  stream: Pick<
    NormalizedStream,
    "protocol" | "kind" | "requiresReferrer" | "requiresCustomUserAgent"
  >,
): NormalizedStream["browserCompatibility"] => {
  if (stream.requiresCustomUserAgent || stream.requiresReferrer) {
    return "limited";
  }
  if (stream.protocol === "http") return "limited";
  if (stream.protocol !== "https") return "blocked";
  if (stream.kind === "hls" || stream.kind === "mp4") return "preferred";
  return "unknown";
};

const COMPAT_ORDER: Record<NormalizedStream["browserCompatibility"], number> = {
  preferred: 0,
  "native-only": 1,
  limited: 2,
  unknown: 3,
  blocked: 4,
};

const AVAILABILITY_ORDER: Record<NormalizedStream["availability"]["status"], number> = {
  playable: 0,
  checking: 1,
  unknown: 2,
  timeout: 3,
  network_error: 4,
  temporarily_unavailable: 5,
  forbidden_or_restricted: 6,
  unsupported_format: 7,
  invalid_url: 8,
};

/**
 * Rank streams of a single channel. Lower score = better.
 * Order: HTTPS → no custom UA → no referrer → HLS → quality → no restrictive label → main feed.
 */
export const rankStream = (stream: NormalizedStream, isMainFeed: boolean): number => {
  let score = 0;
  score += stream.protocol === "https" ? 0 : stream.protocol === "http" ? 5 : 10;
  score += stream.requiresCustomUserAgent ? 8 : 0;
  score += stream.requiresReferrer ? 4 : 0;
  score += stream.kind === "hls" ? 0 : stream.kind === "mp4" ? 1 : 6;
  // Quality: try to parse height
  const q = stream.quality?.match(/(\d{3,4})/);
  const height = q ? Number(q[1]) : 0;
  score += height === 0 ? 3 : Math.max(0, 1080 - height) / 200;
  score += stream.label ? 2 : 0;
  score += isMainFeed ? 0 : 1;
  return score;
};

const sortStreams = (streams: NormalizedStream[], mainFeedId: string | null): NormalizedStream[] =>
  streams
    .map((s) => ({ s, score: rankStream(s, mainFeedId ? s.feedId === mainFeedId : false) }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.s);

const pickLogo = (channelId: string, logos: IptvLogo[], feeds: IptvFeed[]): string | null => {
  const candidates = logos.filter((l) => l.channel === channelId && l.url);
  if (candidates.length === 0) return null;
  const inUse = candidates.filter((l) => l.in_use);
  const pool = inUse.length > 0 ? inUse : candidates;
  // Prefer horizontal
  const horizontal = pool.filter((l) => l.is_horizontal);
  const hPool = horizontal.length > 0 ? horizontal : pool;
  // Prefer matching feed
  const mainFeed = feeds.find((f) => f.channel === channelId && f.is_main);
  if (mainFeed) {
    const match = hPool.find((l) => l.feed && l.feed === mainFeed.id);
    if (match) return match.url;
  }
  return hPool[0]?.url ?? null;
};

export type NormalizeInput = {
  channels: IptvChannel[];
  streams: IptvStream[];
  feeds: IptvFeed[];
  logos: IptvLogo[];
  guides: IptvGuide[];
  categories: IptvCategory[];
  countries: IptvCountry[];
  languages: IptvLanguage[];
  blocklist: IptvBlocklist[];
};

export type NormalizeOptions = {
  /** When true, NSFW and blocklisted channels are excluded. */
  applyContentFilter?: boolean;
};

export const normalizeCatalog = (
  input: NormalizeInput,
  options: NormalizeOptions = {},
): NormalizedChannel[] => {
  const { applyContentFilter = true } = options;
  const blocklistSet = new Set(input.blocklist.map((b) => b.channel));
  const categoryMap = new Map(input.categories.map((c) => [c.id, c.name]));
  const countryMap = new Map(input.countries.map((c) => [c.code, c]));
  const _languageMap = new Map(input.languages.map((l) => [l.code, l.name]));
  const streamsByChannel = new Map<string, IptvStream[]>();
  for (const s of input.streams) {
    if (!s.channel) continue;
    const list = streamsByChannel.get(s.channel);
    if (list) list.push(s);
    else streamsByChannel.set(s.channel, [s]);
  }
  const feedsByChannel = new Map<string, IptvFeed[]>();
  for (const f of input.feeds) {
    if (!f.channel) continue;
    const list = feedsByChannel.get(f.channel);
    if (list) list.push(f);
    else feedsByChannel.set(f.channel, [f]);
  }

  const out: NormalizedChannel[] = [];

  for (const ch of input.channels) {
    if (!ch.id || !ch.name) continue;
    if (applyContentFilter && ch.is_nsfw) continue;
    if (applyContentFilter && blocklistSet.has(ch.id)) continue;
    if (ch.closed && !ch.replaced_by) continue;

    const rawStreams = streamsByChannel.get(ch.id) ?? [];
    const feeds = feedsByChannel.get(ch.id) ?? [];
    const mainFeedId = feeds.find((f) => f.is_main)?.id ?? null;

    const streams: NormalizedStream[] = [];
    for (const s of rawStreams) {
      if (!s.url || !isValidHttpUrl(s.url)) continue;
      if (isDangerousUrl(s.url)) continue;
      const protocol = detectProtocol(s.url);
      if (protocol === "other") continue; // skip rtmp/udp/etc
      const kind = detectKind(s.url);
      const requiresReferrer = false; // iptv-org streams do not carry referrer info
      const requiresCustomUserAgent = false;
      const normalized: NormalizedStream = {
        id: `${ch.id}:${s.url}`,
        url: s.url,
        title: s.title ?? ch.name,
        quality: s.quality ?? null,
        label: s.label ?? null,
        feedId: s.feed ?? null,
        protocol,
        kind,
        requiresReferrer,
        requiresCustomUserAgent,
        browserCompatibility: computeCompatibility({
          protocol,
          kind,
          requiresReferrer,
          requiresCustomUserAgent,
        }),
        availability: createUnknownSourceAvailability(),
        sourceOrigin: "iptv-org",
        manuallyApproved: false,
        disabled: false,
        priority: 100,
      };
      streams.push(normalized);
    }

    const sorted = sortStreams(streams, mainFeedId);
    const country = ch.country ? countryMap.get(ch.country) : undefined;
    const altNames = ch.alt_names
      ? ch.alt_names
          .split(";")
          .map((n) => n.trim())
          .filter(Boolean)
      : [];
    const languageCodes = country?.languages ?? [];
    const cats = ch.categories ?? [];
    const normalizedCategories = normalizeCategories(
      cats.flatMap((category) => [category, categoryMap.get(category) ?? ""]),
    );

    out.push(
      applyChannelSourceOverride({
        id: ch.id,
        name: ch.name,
        alternativeNames: altNames,
        countryCode: ch.country ?? null,
        countryName: country?.name ?? null,
        countryFlag: country?.flag ?? null,
        languageCodes,
        primaryCategory: normalizedCategories.primaryCategory,
        categories: normalizedCategories.categories,
        tags: normalizedCategories.tags,
        logoUrl: pickLogo(ch.id, input.logos, feeds),
        websiteUrl: ch.website ?? null,
        isNsfw: false,
        streams: sorted,
      }),
    );
  }

  return out;
};

export const toSummary = (channel: NormalizedChannel): ChannelSummary => {
  const enabledStreams = activeStreams(channel.streams);
  const compat = enabledStreams.reduce<NormalizedStream["browserCompatibility"]>(
    (best, s) =>
      COMPAT_ORDER[s.browserCompatibility] < COMPAT_ORDER[best] ? s.browserCompatibility : best,
    "blocked",
  );
  const { streams, ...rest } = channel;
  const bestAvailability =
    enabledStreams.length > 0
      ? enabledStreams.reduce<NormalizedStream["availability"]["status"]>(
          (best, stream) =>
            AVAILABILITY_ORDER[stream.availability.status] < AVAILABILITY_ORDER[best]
              ? stream.availability.status
              : best,
          "invalid_url",
        )
      : undefined;
  void streams;
  return {
    ...rest,
    streamCount: enabledStreams.length,
    bestCompatibility: compat,
    bestAvailability,
    health: channel.health ? toPublicChannelHealth(channel.health) : undefined,
  };
};

const matchesQuery = (channel: NormalizedChannel, q: string): boolean => {
  const needle = q.toLowerCase();
  if (channel.name.toLowerCase().includes(needle)) return true;
  return channel.alternativeNames.some((n) => n.toLowerCase().includes(needle));
};

export type CursorState = {
  offset: number;
  q?: string;
  country?: string;
  category?: string;
  language?: string;
  source?: CatalogQuery["source"];
};

export const encodeCursor = (state: CursorState): string =>
  Buffer.from(JSON.stringify(state), "utf8").toString("base64url");

export const decodeCursor = (cursor: string): CursorState => {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json) as CursorState;
  } catch {
    return { offset: 0 };
  }
};

const buildFilters = (channels: NormalizedChannel[]): CatalogFilters => {
  const countries = new Map<string, FilterOption>();
  const categories = new Map<string, FilterOption>();
  const languages = new Map<string, FilterOption>();
  for (const ch of channels.filter((channel) => isCatalogActive(toSummary(channel)))) {
    if (ch.countryCode && ch.countryName) {
      const k = ch.countryCode;
      countries.set(k, {
        value: k,
        label: ch.countryName,
        count: (countries.get(k)?.count ?? 0) + 1,
      });
    }
    for (const c of ch.categories) {
      categories.set(c, {
        value: c,
        label: categoryLabelFr(c),
        count: (categories.get(c)?.count ?? 0) + 1,
      });
    }
    for (const l of ch.languageCodes) {
      languages.set(l, {
        value: l,
        label: l,
        count: (languages.get(l)?.count ?? 0) + 1,
      });
    }
  }
  const sortDesc = (a: FilterOption, b: FilterOption) => b.count - a.count;
  return {
    countries: [...countries.values()].sort(sortDesc),
    categories: [...categories.values()].sort(sortDesc),
    languages: [...languages.values()].sort(sortDesc),
  };
};

const applyFilters = (
  channels: NormalizedChannel[],
  filters: Pick<CatalogQuery, "q" | "country" | "category" | "language" | "availability">,
): NormalizedChannel[] => {
  let out = channels;
  out = out.filter((channel) => isCatalogActive(toSummary(channel)));
  if (filters.q && filters.q.trim()) {
    out = out.filter((c) => matchesQuery(c, filters.q!.trim()));
  }
  if (filters.country) {
    out = out.filter((c) => c.countryCode === filters.country);
  }
  if (filters.category) {
    const category = normalizeCategory(filters.category);
    out = out.filter((c) => c.categories.includes(category));
  }
  if (filters.language) {
    out = out.filter((c) => c.languageCodes.includes(filters.language!));
  }
  if (filters.availability) {
    out = out.filter((channel) => {
      const summary = toSummary(channel);
      switch (filters.availability) {
        case "recommended":
          return healthStatusOf(summary) === "healthy" || healthStatusOf(summary) === "degraded";
        case "unverified":
          return healthStatusOf(summary) === "unverified";
        case "limited":
          return (
            summary.bestCompatibility === "limited" ||
            healthStatusOf(summary) === "temporarily_unavailable"
          );
        case "blocked":
          return (
            summary.bestCompatibility === "blocked" ||
            healthStatusOf(summary) === "blocked_or_restricted" ||
            healthStatusOf(summary) === "unavailable" ||
            healthStatusOf(summary) === "no_source"
          );
      }
    });
  }
  return out;
};

export type QueryResult = {
  items: ChannelSummary[];
  nextCursor: string | null;
  total: number;
  filters: CatalogFilters;
};

export const queryCatalog = (
  allChannels: NormalizedChannel[],
  query: CatalogQuery,
): QueryResult => {
  const limit = Math.min(Math.max(1, query.limit), 100);
  const cursor = query.cursor ? decodeCursor(query.cursor) : { offset: 0 };
  const offset = cursor.offset ?? 0;

  const filtered = applyFilters(allChannels, query).sort((a, b) => {
    if (query.sort === "name") return a.name.localeCompare(b.name);
    if (query.sort === "country") {
      return (
        (a.countryName ?? "").localeCompare(b.countryName ?? "") || a.name.localeCompare(b.name)
      );
    }
    return catalogQualityScore(b) - catalogQualityScore(a) || a.name.localeCompare(b.name);
  });
  const total = filtered.length;
  const slice = filtered.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const nextCursor = nextOffset < total ? encodeCursor({ ...cursor, offset: nextOffset }) : null;

  return {
    items: slice.map(toSummary),
    nextCursor,
    total,
    filters: buildFilters(allChannels),
  };
};
