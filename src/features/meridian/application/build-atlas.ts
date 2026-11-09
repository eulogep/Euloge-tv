import { toSummary } from "@/features/catalog/application/normalize";
import { catalogQualityScore } from "@/features/catalog/application/catalog-quality";
import { canFeatureChannel, isCatalogActive } from "@/features/catalog/application/source-health";
import type { NormalizedChannel } from "@/features/catalog/domain/types";
import { stationFromSummary, type Atlas, type AtlasCountry } from "../domain/atlas";

const STATIONS_PER_COUNTRY = 6;

const cache = new WeakMap<readonly NormalizedChannel[], Atlas>();

/** One pass over the catalog, memoized per catalog instance. */
export const buildAtlas = (catalog: readonly NormalizedChannel[]): Atlas => {
  const cached = cache.get(catalog);
  if (cached) return cached;

  const byCountry = new Map<string, AtlasCountry & { pool: NormalizedChannel[] }>();
  for (const channel of catalog) {
    if (!channel.countryCode) continue;
    const summary = toSummary(channel);
    if (!isCatalogActive(summary)) continue;
    const entry = byCountry.get(channel.countryCode) ?? {
      code: channel.countryCode,
      name: channel.countryName ?? channel.countryCode,
      count: 0,
      stations: [],
      pool: [],
    };
    entry.count += 1;
    if (canFeatureChannel(summary)) entry.pool.push(channel);
    byCountry.set(channel.countryCode, entry);
  }

  const countries: AtlasCountry[] = [];
  for (const { pool, ...country } of byCountry.values()) {
    const stations = pool
      .map((channel) => ({ channel, score: catalogQualityScore(channel) }))
      .sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name))
      .slice(0, STATIONS_PER_COUNTRY)
      .map(({ channel }) => stationFromSummary(toSummary(channel)));
    countries.push({ ...country, stations });
  }

  const atlas: Atlas = { countries, generatedAt: new Date().toISOString() };
  cache.set(catalog, atlas);
  return atlas;
};
