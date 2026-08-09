import { describe, expect, it } from "vitest";
import {
  buildAdminChannelRow,
  buildAdminDashboardStats,
  buildAdminSourceRows,
  filterAdminChannels,
  projectAdminHealth,
  redactOperationalUrl,
} from "@/features/admin/application/projections";
import { calculateChannelHealth } from "@/features/catalog/application/source-health";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import type {
  ChannelHealthStatus,
  NormalizedChannel,
  NormalizedStream,
  SourceCatalogHealth,
} from "@/features/catalog/domain/types";
import type { PublicEpgSchedule } from "@/features/epg/domain/types";

const catalogHealth = (
  status: SourceCatalogHealth["status"],
  extra: Partial<SourceCatalogHealth> = {},
): SourceCatalogHealth => ({
  status,
  checkedAt: "2026-08-09T10:00:00.000Z",
  lastSuccessAt: status === "playable" ? "2026-08-09T10:00:00.000Z" : null,
  lastFailureAt: status === "playable" ? null : "2026-08-09T10:00:00.000Z",
  responseStatus: 200,
  contentType: "application/vnd.apple.mpegurl",
  manifestValid: true,
  playbackStrategy: "hls.js",
  compatibility: "compatible",
  failureReason: null,
  sourceOrigin: "test",
  manuallyApproved: true,
  disabled: false,
  priority: 10,
  ...extra,
});

const stream = (
  id: string,
  status: SourceCatalogHealth["status"] = "playable",
  url = `https://example.com/${id}.m3u8`,
): NormalizedStream => ({
  id,
  url,
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
  catalogHealth: catalogHealth(status),
  priority: 10,
});

const channel = (
  id: string,
  streams: NormalizedStream[],
  healthStatus?: ChannelHealthStatus,
): NormalizedChannel => {
  const calculated = calculateChannelHealth(streams, { archived: healthStatus === "archived" });
  return {
    id,
    name: id === "demo-fr" ? "Démo France" : id,
    alternativeNames: [],
    countryCode: "FR",
    countryName: "France",
    countryFlag: "FR",
    languageCodes: ["fra"],
    primaryCategory: "news",
    categories: ["news"],
    tags: [],
    logoUrl: null,
    websiteUrl: null,
    isNsfw: false,
    streams,
    health: healthStatus ? { ...calculated, status: healthStatus } : calculated,
  };
};

const epg = (status: PublicEpgSchedule["status"]): PublicEpgSchedule => ({
  status,
  source: status === "available" ? { name: "Fixture", kind: "fixture" } : null,
  updatedAt: status === "available" ? "2026-08-09T10:00:00.000Z" : null,
  currentProgram:
    status === "available"
      ? { title: "Journal", startAt: "2026-08-09T10:00:00.000Z", endAt: "2026-08-09T10:30:00.000Z" }
      : null,
  nextProgram:
    status === "available"
      ? { title: "Météo", startAt: "2026-08-09T10:30:00.000Z", endAt: "2026-08-09T11:00:00.000Z" }
      : null,
  laterPrograms: [],
});

describe("admin projections", () => {
  it("reuses catalogue eligibility and projects EPG data", () => {
    const row = buildAdminChannelRow(
      channel("demo-fr", [stream("main")]),
      epg("available"),
      "fixture:demo-fr",
    );
    expect(row).toMatchObject({
      canOpen: true,
      canFeature: true,
      canRecommend: true,
      operationalHealth: "ONLINE",
      failureCount: 0,
      healthReasonCode: "recent_playable_source",
      epgStatus: "available",
      epgProvider: "Fixture",
      epgMapping: "fixture:demo-fr",
      currentProgram: { title: "Journal" },
      nextProgram: { title: "Météo" },
    });
  });

  it("keeps EPG unavailable independent from playback eligibility", () => {
    const row = buildAdminChannelRow(
      channel("without-epg", [stream("main")]),
      epg("unavailable"),
      null,
    );
    expect(row.canOpen).toBe(true);
    expect(row.epgStatus).toBe("unavailable");
  });

  it.each([
    ["healthy", "ONLINE"],
    ["degraded", "DEGRADED"],
    ["unverified", "UNKNOWN"],
    ["archived", "UNKNOWN"],
    ["unavailable", "OFFLINE"],
    ["no_source", "OFFLINE"],
  ] as const)("maps %s to %s without inventing measurements", (input, expected) => {
    expect(projectAdminHealth(input)).toBe(expected);
  });

  it("redacts credentials, query strings and fragments", () => {
    expect(
      redactOperationalUrl("https://user:pass@example.com/live/abc.m3u8?token=secret#part"),
    ).toBe("https://example.com/live/abc.m3u8?[redacted]");
    expect(redactOperationalUrl("not a url")).toBe("[invalid-url]");
  });

  it("projects source facts without raw sensitive URLs", () => {
    const [row] = buildAdminSourceRows(
      channel("demo-fr", [
        stream("main", "playable", "https://example.com/live.m3u8?token=secret"),
      ]),
    );
    expect(row).toMatchObject({
      eligible: true,
      health: "playable",
      operationalHealth: "ONLINE",
      priority: 10,
      displayUrl: "https://example.com/live.m3u8?[redacted]",
      mime: "application/vnd.apple.mpegurl",
    });
    expect(JSON.stringify(row)).not.toContain("secret");
    expect(row.id).toBe("demo-fr:source:1");
  });

  it("redacts an operational URL embedded in a failure diagnostic", () => {
    const failed = stream("failed", "dead");
    failed.catalogHealth!.failureReason =
      "Probe failed for https://user:pass@example.com/live.m3u8?token=secret";
    const [row] = buildAdminSourceRows(channel("demo-fr", [failed]));
    expect(row.failureReason).toBe("Probe failed for https://example.com/live.m3u8?[redacted]");
    expect(JSON.stringify(row)).not.toContain("secret");
  });

  it("calculates dashboard statistics from real projections", () => {
    const originals = [
      channel("demo-fr", [stream("ok")]),
      channel("degraded", [stream("ok"), stream("bad", "dead")]),
      channel("empty", []),
    ];
    const rows = originals.map((item, index) =>
      buildAdminChannelRow(
        item,
        epg(index === 0 ? "available" : "unavailable"),
        index === 0 ? "fixture:demo-fr" : null,
      ),
    );
    expect(buildAdminDashboardStats(rows, originals)).toMatchObject({
      totalChannels: 3,
      openableChannels: 2,
      unavailableChannels: 0,
      degradedChannels: 1,
      offlineChannels: 1,
      channelsWithoutUsableSource: 1,
      epgAvailable: 1,
      epgUnavailable: 2,
      countries: 1,
      languages: 1,
      categories: 1,
    });
  });

  it("combines channel filters", () => {
    const french = buildAdminChannelRow(
      channel("demo-fr", [stream("ok")]),
      epg("available"),
      "fixture:demo-fr",
    );
    const empty = buildAdminChannelRow(channel("empty", []), epg("unavailable"), null);
    expect(
      filterAdminChannels([french, empty], {
        query: "démo",
        country: "FR",
        epg: "available",
        availability: "openable",
      }),
    ).toEqual([french]);
    expect(filterAdminChannels([french, empty], { availability: "unavailable" })).toEqual([empty]);
  });
});
