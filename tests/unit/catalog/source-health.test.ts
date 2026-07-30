import { describe, expect, it } from "vitest";
import {
  canFeatureChannel,
  canOpenChannel,
  canPlayChannel,
  canRecommendChannel,
  calculateChannelHealth,
  healthRecommendationScore,
  toPublicChannelDetail,
} from "@/features/catalog/application/source-health";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import type {
  ChannelHealthStatus,
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
  const summary = (status: ChannelHealthStatus) => ({
    streamCount: 1,
    health: {
      status,
      checkedAt: null,
      sourceCount: 1,
      playableSourceCount: status === "healthy" ? 1 : 0,
      reasonCode: status,
      reasonMessage: status,
    },
  });

  it("uses one central eligibility policy for opening, playback, hero and recommendations", () => {
    const unavailable = summary("unavailable");
    const archived = summary("archived");
    const healthy = summary("healthy");

    expect(canOpenChannel(healthy)).toBe(true);
    expect(canPlayChannel(healthy)).toBe(true);
    expect(canFeatureChannel(healthy)).toBe(true);
    expect(canRecommendChannel(healthy)).toBe(true);

    expect(canOpenChannel(archived)).toBe(false);
    expect(canPlayChannel(archived)).toBe(false);
    for (const blocked of [unavailable, archived]) {
      expect(canFeatureChannel(blocked)).toBe(false);
      expect(canRecommendChannel(blocked)).toBe(false);
    }
    expect(canOpenChannel({ ...healthy, streamCount: 0 })).toBe(false);
  });

  it("excludes temporarily unavailable and no-source entries from recommendations", () => {
    for (const status of ["temporarily_unavailable", "no_source"] as const) {
      const entry = {
        streamCount: 1,
        health: {
          status,
          checkedAt: null,
          sourceCount: 1,
          playableSourceCount: 0,
          reasonCode: status,
          reasonMessage: status,
        },
      };
      expect(canFeatureChannel(entry)).toBe(false);
      expect(canRecommendChannel(entry)).toBe(false);
    }
  });

  it.each([
    ["healthy", 0, false],
    ["degraded", 0, false],
    ["unverified", 0, false],
    ["healthy", 1, true],
    ["archived", 1, false],
    ["no_source", 0, false],
  ] as const)(
    "evaluates status %s with %i streams as %s",
    (status, streamCount, expected) => {
      expect(canRecommendChannel({ ...summary(status), streamCount })).toBe(expected);
    },
  );

  it("ranks confirmed health above unverified health", () => {
    expect(
      healthRecommendationScore({ streamCount: 1, bestAvailability: "playable" }),
    ).toBeGreaterThan(healthRecommendationScore({ streamCount: 1, bestAvailability: "unknown" }));
  });

  it("projects the public detail and streams through an explicit allowlist", () => {
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
      streams: [
        Object.assign(stream("ok", health("playable", { failureReason: "internal detail" })), {
          futureInternalStreamField: "must not leak",
        }),
        {
          ...stream("disabled", health("playable")),
          disabled: true,
        },
      ],
    } satisfies NormalizedChannel;
    const result = toPublicChannelDetail(
      Object.assign(channel, { futureInternalChannelField: "must not leak" }),
    );
    expect(Object.keys(result).sort()).toEqual(
      [
        "alternativeNames",
        "categories",
        "countryCode",
        "countryFlag",
        "countryName",
        "health",
        "id",
        "isNsfw",
        "languageCodes",
        "logoUrl",
        "name",
        "primaryCategory",
        "streams",
        "tags",
        "websiteUrl",
      ].sort(),
    );
    expect(result.health.status).toBe("healthy");
    expect(result.streams).toHaveLength(1);
    expect(Object.keys(result.streams[0]).sort()).toEqual(
      [
        "availability",
        "browserCompatibility",
        "feedId",
        "id",
        "kind",
        "label",
        "protocol",
        "quality",
        "requiresCustomUserAgent",
        "requiresReferrer",
        "title",
        "url",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("futureInternal");
    expect(result.streams[0]).not.toHaveProperty("catalogHealth");
    expect(result.streams[0]).not.toHaveProperty("sourceOrigin");
    expect(result.streams[0]).not.toHaveProperty("manuallyApproved");
    expect(result.streams[0]).not.toHaveProperty("disabled");
    expect(result.streams[0]).not.toHaveProperty("priority");
    expect(result.health).not.toHaveProperty("reviewerNote");
    expect(result.health).not.toHaveProperty("auditOrigin");
  });

  it("never exposes stream URLs for an archived channel", () => {
    const channel = {
      id: "archive",
      name: "Archive",
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
      streams: [stream("still-present-internally", health("playable"))],
      health: calculateChannelHealth([stream("still-present-internally", health("playable"))], {
        archived: true,
      }),
    } satisfies NormalizedChannel;

    expect(toPublicChannelDetail(channel).streams).toEqual([]);
  });
});
