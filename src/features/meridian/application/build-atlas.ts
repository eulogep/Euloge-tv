import { toSummary } from "@/features/catalog/application/normalize";
import { catalogQualityScore } from "@/features/catalog/application/catalog-quality";
import { canFeatureChannel, isCatalogActive } from "@/features/catalog/application/source-health";
import type { NormalizedChannel } from "@/features/catalog/domain/types";
import { stationFromSummary, type Atlas, type AtlasCountry } from "../domain/atlas";
import { placeForZone } from "../domain/places";

/** Per dial stop, so a country's second time zone is not crowded out by its first. */
const STATIONS_PER_PLACE = 6;

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
      zones: {},
      stations: [],
      pool: [],
    };
    entry.count += 1;
    if (channel.broadcastTimeZone && entry.zones) {
      entry.zones[channel.broadcastTimeZone] = (entry.zones[channel.broadcastTimeZone] ?? 0) + 1;
    }
    if (canFeatureChannel(summary)) entry.pool.push(channel);
    byCountry.set(channel.countryCode, entry);
  }

  const countries: AtlasCountry[] = [];
  for (const { pool, ...country } of byCountry.values()) {
    const taken = new Map<unknown, number>();
    const stations = pool
      .map((channel) => ({ channel, score: catalogQualityScore(channel) }))
      .sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name))
      .filter(({ channel }) => {
        const place = placeForZone(country.code, channel.broadcastTimeZone);
        const count = taken.get(place) ?? 0;
        taken.set(place, count + 1);
        return count < STATIONS_PER_PLACE;
      })
      .map(({ channel }) => stationFromSummary(toSummary(channel)));
    countries.push({ ...country, stations });
  }

  const atlas: Atlas = { countries, generatedAt: new Date().toISOString() };
  cache.set(catalog, atlas);
  return atlas;
};
