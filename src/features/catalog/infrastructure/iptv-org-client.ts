import "server-only";
import { APP_CONFIG } from "@/config/app";
import { logger } from "@/lib/utils/logger";

import {
  IptvBlocklistArraySchema,
  IptvBlocklistSchema,
  IptvCategoryArraySchema,
  IptvCategorySchema,
  IptvChannelArraySchema,
  IptvChannelSchema,
  IptvCountryArraySchema,
  IptvCountrySchema,
  IptvFeedArraySchema,
  IptvFeedSchema,
  IptvGuideArraySchema,
  IptvGuideSchema,
  IptvLanguageArraySchema,
  IptvLanguageSchema,
  IptvLogoArraySchema,
  IptvLogoSchema,
  IptvStreamArraySchema,
  IptvStreamSchema,
  type IptvBlocklist,
  type IptvCategory,
  type IptvChannel,
  type IptvCountry,
  type IptvFeed,
  type IptvGuide,
  type IptvLanguage,
  type IptvLogo,
  type IptvStream,
} from "./schemas";

const BASE = "https://iptv-org.github.io/api";
const ENDPOINTS = {
  channels: `${BASE}/channels.json`,
  streams: `${BASE}/streams.json`,
  feeds: `${BASE}/feeds.json`,
  logos: `${BASE}/logos.json`,
  guides: `${BASE}/guides.json`,
  categories: `${BASE}/categories.json`,
  countries: `${BASE}/countries.json`,
  languages: `${BASE}/languages.json`,
  blocklist: `${BASE}/blocklist.json`,
} as const;

const TIMEOUT_MS = 8000;

async function fetchJson<T>(
  url: string,
  schema: { parse: (v: unknown) => T },
  label: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      next: { revalidate: APP_CONFIG.iptvRevalidateSeconds, tags: ["iptv-org"] },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("iptv-org fetch non-200", {
        endpoint: label,
        status: res.status,
      });
      return [] as unknown as T;
    }
    const raw: unknown = await res.json();
    return schema.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("iptv-org parse/fetch failed", { endpoint: label, message });
    // Schema error → return empty so the rest of the pipeline still works.
    return [] as unknown as T;
  } finally {
    clearTimeout(timer);
  }
}

export type IptvOrgDataset = {
  channels: IptvChannel[];
  streams: IptvStream[];
  feeds: IptvFeed[];
  logos: IptvLogo[];
  guides: IptvGuide[];
  categories: IptvCategory[];
  countries: IptvCountry[];
  languages: IptvLanguage[];
  blocklist: IptvBlocklist[];
  fetchedAt: string;
};

let cache: IptvOrgDataset | null = null;
let inflight: Promise<IptvOrgDataset> | null = null;

export async function fetchIptvOrgDataset(): Promise<IptvOrgDataset> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    logger.info("iptv-org dataset fetch start");
    const [channels, streams, feeds, logos, guides, categories, countries, languages, blocklist] =
      await Promise.all([
        fetchJson(ENDPOINTS.channels, IptvChannelArraySchema, "channels"),
        fetchJson(ENDPOINTS.streams, IptvStreamArraySchema, "streams"),
        fetchJson(ENDPOINTS.feeds, IptvFeedArraySchema, "feeds"),
        fetchJson(ENDPOINTS.logos, IptvLogoArraySchema, "logos"),
        fetchJson(ENDPOINTS.guides, IptvGuideArraySchema, "guides"),
        fetchJson(ENDPOINTS.categories, IptvCategoryArraySchema, "categories"),
        fetchJson(ENDPOINTS.countries, IptvCountryArraySchema, "countries"),
        fetchJson(ENDPOINTS.languages, IptvLanguageArraySchema, "languages"),
        fetchJson(ENDPOINTS.blocklist, IptvBlocklistArraySchema, "blocklist"),
      ]);
    const dataset: IptvOrgDataset = {
      channels,
      streams,
      feeds,
      logos,
      guides,
      categories,
      countries,
      languages,
      blocklist,
      fetchedAt: new Date().toISOString(),
    };
    logger.info("iptv-org dataset fetch complete", {
      channels: channels.length,
      streams: streams.length,
      logos: logos.length,
      blocklist: blocklist.length,
    });
    cache = dataset;
    inflight = null;
    return dataset;
  })();
  return inflight;
}

/** Test-only: inject a dataset so unit tests never hit the network. */
export const __setDatasetForTests = (dataset: IptvOrgDataset | null): void => {
  cache = dataset;
  inflight = null;
};

export {
  IptvBlocklistSchema,
  IptvCategorySchema,
  IptvChannelSchema,
  IptvCountrySchema,
  IptvFeedSchema,
  IptvGuideSchema,
  IptvLanguageSchema,
  IptvLogoSchema,
  IptvStreamSchema,
};
