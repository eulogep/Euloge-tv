import { describe, expect, it } from "vitest";
import {
  calculateChannelHealth,
  healthRecommendationScore,
  isHeroEligible,
  isRecommendationEligible,
  toPublicChannelDetail,
} from "@/features/catalog/application/source-health";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import type {
  NormalizedChannel,
  NormalizedStream,
  SourceCatalogHealth,
} from "@/features/catalog/domain/types";

const health = (
  status: SourceCatalogHealth["status"],
  extra: Partial<SourceCatalogHealth> = {},
): SourceCatalogHealth => ({
  status,
  checkedAt: "2026-07-22T12:00:00.000Z",
  lastSuccessAt: status === "playable" ? "2026-07-22T12:00:00.000Z" : null,
  lastFailureAt: status === "playable" || status === "unknown" ? null : "2026-07-22T12:00:00.000Z",
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
  ...extra,
});

const stream = (id: string, catalogHealth: SourceCatalogHealth): NormalizedStream => ({
  id,
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
  availability: createUnknownSourceAvailability(),
  catalogHealth,
});

describe("calculateChannelHealth", () => {
  it.each([
    [[], "no_source"],
    [[stream("ok", health("playable"))], "healthy"],
    [[stream("ok", health("playable")), stream("bad", health("dead"))], "degraded"],
    [[stream("unknown", health("unknown"))], "unverified"],
    [[stream("dead", health("dead"))], "unavailable"],
    [[stream("restricted", health("forbidden_or_restricted"))], "blocked_or_restricted"],
  ])("derives %s as %s", (streams, expected) => {
    expect(calculateChannelHealth(streams as NormalizedStream[]).status).toBe(expected);
  });

  it("distinguishes a recent failure after a known success", () => {
    const result = calculateChannelHealth([
      stream(
        "temporary",
        health("temporarily_unavailable", { lastSuccessAt: "2026-07-21T12:00:00.000Z" }),
      ),
    ]);
    expect(result.status).toBe("temporarily_unavailable");
  });

  it("lets a manual archive override source availability", () => {
    expect(
      calculateChannelHealth([stream("ok", health("playable"))], { archived: true }).status,
    ).toBe("archived");
  });
});

describe("health-aware curation", () => {
  it("excludes unavailable entries from hero and generic recommendations", () => {
    const unavailable = {
      streamCount: 1,
      health: {
        status: "unavailable" as const,
        checkedAt: null,
        sourceCount: 1,
        playableSourceCount: 0,
        reasonCode: "dead",
        reasonMessage: "dead",
      },
    };
    expect(isHeroEligible(unavailable)).toBe(false);
    expect(isRecommendationEligible(unavailable)).toBe(false);
  });

  it("ranks confirmed health above unverified health", () => {
    expect(
      healthRecommendationScore({ streamCount: 1, bestAvailability: "playable" }),
    ).toBeGreaterThan(healthRecommendationScore({ streamCount: 1, bestAvailability: "unknown" }));
  });

  it("removes internal audit fields from the public detail", () => {
    const channel = {
      id: "demo",
      name: "Demo",
      alternativeNames: [],
      countryCode: "FR",
      countryName: "France",
      countryFlag: null,
      languageCodes: ["fra"],
      primaryCategory: "live",
      categories: ["live"],
      tags: [],
      logoUrl: null,
      websiteUrl: null,
      isNsfw: false,
      streams: [stream("ok", health("playable", { failureReason: "internal detail" }))],
    } satisfies NormalizedChannel;
    const result = toPublicChannelDetail(channel);
    expect(result.health?.status).toBe("healthy");
    expect(result.streams[0]).not.toHaveProperty("catalogHealth");
    expect(result.health).not.toHaveProperty("reviewerNote");
  });
});
