import type {
  CatalogCategory,
  ChannelHealthStatus,
  ChannelSummary,
} from "@/features/catalog/domain/types";
import { canFeatureChannel } from "@/features/catalog/application/source-health";
import { localClock, placeForZone, placesOf, type Place } from "./places";

/** The smallest channel projection the dial needs to zap without a round trip. */
export type AtlasStation = {
  id: string;
  name: string;
  logoUrl: string | null;
  category: CatalogCategory;
  health: ChannelHealthStatus;
  timeZone?: string | null;
  city?: string | null;
};

export type AtlasCountry = {
  code: string;
  name: string;
  /** Active channels referenced for this country, not just the ones listed here. */
  count: number;
  /** Active channels per published time zone, for countries spanning several. */
  zones?: Record<string, number>;
  stations: AtlasStation[];
};

export type Atlas = { countries: AtlasCountry[]; generatedAt: string };

/** A place on the dial: a known city in a country that has something to try. */
export type Stop = AtlasCountry & { id: string; place: Place };

export const stopsFromAtlas = (atlas: Atlas | null): Stop[] => {
  if (!atlas) return [];
  const stops: Stop[] = [];
  for (const country of atlas.countries) {
    if (country.stations.length === 0) continue;
    const places = placesOf(country.code);
    const main = places[0];
    for (const place of places) {
      const onPlace = (timeZone: string | null | undefined) =>
        (placeForZone(country.code, timeZone) ?? main) === place;
      // A stop exists only where the catalog really has channels to offer.
      const stations = country.stations.filter((station) => onPlace(station.timeZone));
      if (stations.length === 0) continue;
      const zoneCount = Object.entries(country.zones ?? {}).reduce(
        (total, [timeZone, count]) => total + (onPlace(timeZone) ? count : 0),
        0,
      );
      stops.push({
        ...country,
        id: `${country.code}:${place.city}`,
        count: zoneCount || (place === main ? country.count : stations.length),
        stations,
        place,
      });
    }
  }
  return stops.sort(
    (left, right) =>
      left.place.longitude - right.place.longitude || right.place.latitude - left.place.latitude,
  );
};

export const stationFromSummary = (channel: ChannelSummary): AtlasStation => ({
  id: channel.id,
  name: channel.name,
  logoUrl: channel.logoUrl,
  category: channel.primaryCategory,
  health: channel.health?.status ?? "unverified",
  timeZone: channel.broadcastTimeZone ?? null,
  city: channel.broadcastCity ?? null,
});

/** Fallback when the atlas endpoint is unreachable: tune what the page already has. */
export const atlasFromSummaries = (channels: readonly ChannelSummary[], perCountry = 6): Atlas => {
  const byCountry = new Map<string, AtlasCountry>();
  for (const channel of channels) {
    if (!channel.countryCode || !canFeatureChannel(channel)) continue;
    const entry = byCountry.get(channel.countryCode) ?? {
      code: channel.countryCode,
      name: channel.countryName ?? channel.countryCode,
      count: 0,
      zones: {},
      stations: [],
    };
    entry.count += 1;
    if (channel.broadcastTimeZone && entry.zones) {
      entry.zones[channel.broadcastTimeZone] = (entry.zones[channel.broadcastTimeZone] ?? 0) + 1;
    }
    const station = stationFromSummary(channel);
    const place = placeForZone(channel.countryCode, station.timeZone);
    const onSamePlace = entry.stations.filter(
      (other) => placeForZone(channel.countryCode!, other.timeZone) === place,
    );
    if (onSamePlace.length < perCountry) entry.stations.push(station);
    byCountry.set(channel.countryCode, entry);
  }
  return { countries: [...byCountry.values()], generatedAt: new Date().toISOString() };
};

/** Countries MJTV was made for get the first word when several are at the same hour. */
const HOME_AUDIENCE = new Set([
  "SN",
  "CD",
  "CG",
  "CI",
  "CM",
  "BJ",
  "TG",
  "BF",
  "ML",
  "GA",
  "GN",
  "NE",
  "TD",
  "RW",
  "BI",
  "MG",
  "HT",
  "FR",
  "BE",
  "CH",
  "CA",
  "MA",
  "DZ",
  "TN",
  "LU",
  "MC",
  "RE",
  "GP",
  "MQ",
  "NG",
  "GH",
  "KE",
]);

const minutesFromMidnight = (date: Date, stop: Stop): number => {
  const { hour, minute } = localClock(date, stop.place.timeZone);
  return hour * 60 + minute;
};

/** Circular distance between two times of day, in minutes. */
const clockDistance = (left: number, right: number): number => {
  const delta = Math.abs(left - right) % 1440;
  return Math.min(delta, 1440 - delta);
};

const audienceScore = (stop: Stop): number =>
  (HOME_AUDIENCE.has(stop.code) ? 1000 : 0) + Math.min(stop.count, 999);

/**
 * Stops closest to a time of day, best known first within the hour. Whatever
 * the UTC time, some country is within reach of it, which is the whole promise.
 */
export const stopsAtHour = (
  stops: readonly Stop[],
  date: Date,
  hour: number,
  windowMinutes = 75,
): Stop[] => {
  const target = hour * 60 + 30;
  const scored = stops.map((stop) => ({
    stop,
    distance: clockDistance(minutesFromMidnight(date, stop), target),
  }));
  const inWindow = scored.filter(({ distance }) => distance <= windowMinutes);
  const pool = inWindow.length > 0 ? inWindow : scored;
  const closest = Math.min(...pool.map(({ distance }) => distance));
  return pool
    .sort(
      (left, right) =>
        // Group by half-hour so a well-known place beats a marginally closer one.
        Math.round(left.distance / 30) - Math.round(right.distance / 30) ||
        audienceScore(right.stop) - audienceScore(left.stop) ||
        left.distance - right.distance,
    )
    .filter(({ distance }) => distance <= closest + windowMinutes)
    .map(({ stop }) => stop);
};

export const primeTimeStop = (stops: readonly Stop[], date: Date): Stop | null =>
  stopsAtHour(stops, date, 20)[0] ?? null;

/** A frank editorial grouping of the planet by what time it is there. */
export type WorldMoment = {
  id: "reveil" | "midi" | "vingt-heures" | "nuit";
  label: string;
  title: string;
  hour: number;
  stops: Stop[];
};

const onePerCountry = (stops: readonly Stop[]): Stop[] => {
  const seen = new Set<string>();
  return stops.filter((stop) => {
    if (seen.has(stop.code)) return false;
    seen.add(stop.code);
    return true;
  });
};

export const worldMoments = (stops: readonly Stop[], date: Date, perMoment = 4): WorldMoment[] =>
  (
    [
      { id: "reveil", label: "Au réveil", title: "On se lève", hour: 7 },
      { id: "midi", label: "À midi", title: "On déjeune", hour: 13 },
      { id: "vingt-heures", label: "À 20 h", title: "On s’installe", hour: 20 },
      { id: "nuit", label: "Tard le soir", title: "On veille", hour: 23 },
    ] as const
  ).map((moment) => ({
    ...moment,
    stops: onePerCountry(stopsAtHour(stops, date, moment.hour, 60))
      // Unlike the dial, a moment makes a claim about the hour: no nearest-match fallback.
      .filter((stop) => {
        const { hour, minute } = localClock(date, stop.place.timeZone);
        return clockDistance(hour * 60 + minute, moment.hour * 60 + 30) <= 60;
      })
      .slice(0, perMoment),
  }));

export type Escale = { stop: Stop; station: AtlasStation };

/**
 * The next call of a world tour: wherever it is closest to 20 h, in a country not
 * yet visited, on its most trustworthy channel. Once every country has been seen,
 * the tour starts over rather than ending.
 */
export const pickNextEscale = (
  stops: readonly Stop[],
  date: Date,
  visited: readonly string[],
): Escale | null => {
  const seen = new Set(visited);
  const ranked = stopsAtHour(stops, date, 20, 180);
  const stop =
    ranked.find((item) => !seen.has(item.code)) ??
    stops.find((item) => !seen.has(item.code)) ??
    ranked[0] ??
    null;
  const station =
    stop?.stations.find((item) => item.health === "healthy") ?? stop?.stations[0] ?? null;
  return stop && station ? { stop, station } : null;
};
