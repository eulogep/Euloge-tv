import { describe, expect, it } from "vitest";
import {
  createUnknownSourceAvailability,
  type CatalogCategory,
  type NormalizedChannel,
  type NormalizedStream,
  type SourceCatalogHealth,
} from "@/features/catalog/domain/types";
import { rankRelatedChannels } from "@/features/catalog/application/related-channels";
import { catalogQualityScore } from "@/features/catalog/application/catalog-quality";

const source = (
  id: string,
  status: NormalizedStream["availability"]["status"] = "unknown",
  catalogStatus?: SourceCatalogHealth["status"],
): NormalizedStream => ({
  id: `${id}:stream`,
  url: `https://example.com/${id}.m3u8`,
  title: id,
  quality: null,
  label: null,
  feedId: null,
  protocol: "https",
  kind: "hls",
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred",
  availability: { ...createUnknownSourceAvailability(), status },
  catalogHealth: catalogStatus
    ? {
        status: catalogStatus,
        checkedAt: "2026-07-22T12:00:00.000Z",
        lastSuccessAt: catalogStatus === "playable" ? "2026-07-22T12:00:00.000Z" : null,
        lastFailureAt: catalogStatus === "playable" ? null : "2026-07-22T12:00:00.000Z",
        responseStatus: null,
        contentType: null,
        manifestValid: null,
        playbackStrategy: null,
        compatibility: "unknown",
        failureReason: null,
        sourceOrigin: "test",
        manuallyApproved: false,
        disabled: false,
        priority: 100,
      }
    : undefined,
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

  it("derives missing channel health from catalog observations before recommending", () => {
    const current = channel("current", "FR", ["fra"], "news");
    const playable = channel("playable", "FR", ["fra"], "news", [
      source("playable", "unknown", "playable"),
    ]);
    const dead = channel("dead", "FR", ["fra"], "news", [source("dead", "unknown", "dead")]);
    const temporary = channel("temporary", "FR", ["fra"], "news", [
      source("temporary", "unknown", "temporarily_unavailable"),
    ]);
    const noSource = channel("no-source", "FR", ["fra"], "news", []);

    expect(rankRelatedChannels(current, [dead, temporary, noSource, playable])).toEqual([playable]);
  });

  it("excludes an archived candidate even when an internal source remains", () => {
    const current = channel("current", "FR", ["fra"], "news");
    const archived = channel("archived", "FR", ["fra"], "news");
    archived.health = {
      status: "archived",
      checkedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
      sourceCount: 1,
      playableSourceCount: 0,
      unknownSourceCount: 0,
      failedSourceCount: 0,
      preferredSourceId: null,
      reasonCode: "manual_archive",
      reasonMessage: "archived",
      auditOrigin: "manual",
      manuallyReviewed: true,
      reviewerNote: null,
      nextCheckAt: null,
    };

    expect(rankRelatedChannels(current, [archived])).toEqual([]);
  });
});
