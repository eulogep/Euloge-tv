import { describe, expect, it } from "vitest";
import {
  createUnknownSourceAvailability,
  type CatalogCategory,
  type NormalizedChannel,
  type NormalizedStream,
} from "@/features/catalog/domain/types";
import { rankRelatedChannels } from "@/features/catalog/application/related-channels";
import { catalogQualityScore } from "@/features/catalog/application/catalog-quality";

const source = (id: string, status: NormalizedStream["availability"]["status"] = "unknown") => ({
  id: `${id}:stream`,
  url: `https://example.com/${id}.m3u8`,
  title: id,
  quality: null,
  label: null,
  feedId: null,
  protocol: "https" as const,
  kind: "hls" as const,
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred" as const,
  availability: { ...createUnknownSourceAvailability(), status },
});

const channel = (
  id: string,
  countryCode: string,
  languageCodes: string[],
  primaryCategory: CatalogCategory,
  streams: NormalizedStream[] = [source(id)],
): NormalizedChannel => ({
  id,
  name: id,
  alternativeNames: [],
  countryCode,
  countryName: countryCode,
  countryFlag: null,
  languageCodes,
  primaryCategory,
  categories: [primaryCategory],
  tags: [],
  logoUrl: `https://example.com/${id}.png`,
  websiteUrl: null,
  isNsfw: false,
  streams,
});

describe("related channel ranking", () => {
  it("prefers French news for a French news channel over an unrelated Afghan channel", () => {
    const current = channel("actualites-fr", "FR", ["fra"], "news");
    const frenchNews = channel("info-fr", "FR", ["fra"], "news");
    const afghanMusic = channel("4-afghanistan", "AF", ["pus"], "music");
    expect(rankRelatedChannels(current, [afghanMusic, current, frenchNews])[0]?.id).toBe("info-fr");
  });

  it("excludes the current channel", () => {
    const current = channel("current", "FR", ["fra"], "news");
    expect(rankRelatedChannels(current, [current])).toEqual([]);
  });

  it("penalizes a channel with no viable source", () => {
    const viable = channel("viable", "FR", ["fra"], "news");
    const dead = channel("dead", "FR", ["fra"], "news", [source("dead", "unsupported_format")]);
    expect(catalogQualityScore(viable)).toBeGreaterThan(catalogQualityScore(dead));
  });
});
