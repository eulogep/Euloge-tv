import { describe, expect, it } from "vitest";
import { buildAtlas } from "@/features/meridian/application/build-atlas";
import type { NormalizedChannel } from "@/features/catalog/domain/types";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";

const channel = (id: string, countryCode: string | null, streams = 1): NormalizedChannel => ({
  id,
  name: id,
  alternativeNames: [],
  countryCode,
  countryName: countryCode,
  countryFlag: null,
  languageCodes: [],
  primaryCategory: "news",
  categories: ["news"],
  tags: [],
  logoUrl: id.endsWith("logo") ? "https://example.com/l.png" : null,
  websiteUrl: null,
  isNsfw: false,
  streams: Array.from({ length: streams }, (_, index) => ({
    id: `${id}:${index}`,
    url: "https://example.com/s.m3u8",
    title: id,
    quality: null,
    label: null,
    feedId: null,
    protocol: "https" as const,
    kind: "hls" as const,
    requiresReferrer: false,
    requiresCustomUserAgent: false,
    browserCompatibility: "preferred" as const,
    availability: createUnknownSourceAvailability(),
  })),
});

describe("buildAtlas", () => {
  it("groups by country, keeps the true total, and caps what it lists", () => {
    const catalog = Array.from({ length: 9 }, (_, index) => channel(`fr-${index}`, "FR"));
    const atlas = buildAtlas(catalog);
    expect(atlas.countries).toHaveLength(1);
    expect(atlas.countries[0]?.count).toBe(9);
    expect(atlas.countries[0]?.stations).toHaveLength(6);
  });

  it("lists the best channels first and exposes no stream URL", () => {
    const atlas = buildAtlas([channel("plain", "SN"), channel("with-logo", "SN")]);
    expect(atlas.countries[0]?.stations[0]?.id).toBe("with-logo");
    expect(JSON.stringify(atlas)).not.toContain("m3u8");
  });

  it("skips channels without a country and channels without a source", () => {
    const atlas = buildAtlas([channel("nowhere", null), channel("silent", "FR", 0)]);
    expect(atlas.countries.flatMap((country) => country.stations)).toEqual([]);
  });

  it("keeps channels from each time zone instead of letting one crowd out the others", () => {
    const catalog = [
      ...Array.from({ length: 9 }, (_, index) => ({
        ...channel(`ny-${index}-logo`, "US"),
        broadcastTimeZone: "America/New_York",
      })),
      {
        ...channel("la", "US"),
        broadcastTimeZone: "America/Los_Angeles",
        broadcastCity: "Los Angeles",
      },
    ];
    const [country] = buildAtlas(catalog).countries;
    expect(country?.zones).toEqual({ "America/New_York": 9, "America/Los_Angeles": 1 });
    expect(
      country?.stations.filter((station) => station.timeZone === "America/New_York"),
    ).toHaveLength(6);
    expect(country?.stations.find((station) => station.id === "la")?.city).toBe("Los Angeles");
  });

  it("computes once per catalog instance", () => {
    const catalog = [channel("a", "FR")];
    expect(buildAtlas(catalog)).toBe(buildAtlas(catalog));
  });
});
