import { describe, expect, it } from "vitest";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import type { NormalizedChannel } from "@/features/catalog/domain/types";
import {
  applyChannelSourceOverride,
  applyChannelSourceOverrideEntry,
  parseChannelSourceOverrides,
} from "@/features/catalog/infrastructure/source-overrides";

const channel = (id = "demo"): NormalizedChannel => ({
  id,
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
    {
      id: "upstream",
      url: "https://example.com/upstream.m3u8",
      title: "Upstream",
      quality: null,
      label: null,
      feedId: null,
      protocol: "https",
      kind: "hls",
      requiresReferrer: false,
      requiresCustomUserAgent: false,
      browserCompatibility: "preferred",
      availability: createUnknownSourceAvailability(),
    },
  ],
});

describe("channel source overrides", () => {
  it("rejects non-HTTP manual sources and incomplete evidence", () => {
    expect(() =>
      parseChannelSourceOverrides({
        version: 1,
        entries: [
          {
            channelId: "demo",
            addSources: [
              {
                id: "bad",
                url: "file:///secret",
                title: "Bad",
                sourceOrigin: "test",
                manuallyApproved: true,
              },
            ],
            reason: "test",
            reviewedAt: "2026-07-22T12:00:00.000Z",
            reviewer: "test",
            evidence: [],
          },
        ],
      }),
    ).toThrow();
  });

  it("can disable an upstream source and add an explicitly reviewed source", () => {
    const parsed = parseChannelSourceOverrides({
      version: 1,
      entries: [
        {
          channelId: "demo",
          addSources: [
            {
              id: "reviewed",
              url: "https://broadcaster.example/live.m3u8",
              title: "Official live",
              sourceOrigin: "broadcaster website",
              manuallyApproved: true,
              priority: 1,
            },
          ],
          disableSources: ["upstream"],
          preferredSource: "reviewed",
          sourceHealth: [
            {
              sourceId: "reviewed",
              status: "playable",
              checkedAt: "2026-07-22T12:00:00.000Z",
              lastSuccessAt: "2026-07-22T12:00:00.000Z",
              responseStatus: 200,
              contentType: "application/vnd.apple.mpegurl",
              manifestValid: true,
              failureReason: null,
            },
          ],
          archived: false,
          reason: "Official source reviewed manually",
          reviewedAt: "2026-07-22T12:00:00.000Z",
          reviewer: "MJTV maintainer",
          evidence: ["https://broadcaster.example/live"],
          notes: null,
        },
      ],
    });
    const result = applyChannelSourceOverrideEntry(channel(), parsed.entries[0]!);
    expect(result.streams.find((source) => source.id === "upstream")).toMatchObject({
      disabled: true,
      catalogHealth: { disabled: true },
    });
    expect(result.streams[0]).toMatchObject({ id: "reviewed", manuallyApproved: true });
    expect(result.health).toMatchObject({ status: "healthy", preferredSourceId: "reviewed" });
  });

  it("applies the curated EMCI TV dead-source observation", () => {
    const emci = channel("EMCITV.fr");
    emci.streams[0]!.url =
      "https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/emciafrique.m3u8";
    const result = applyChannelSourceOverride(emci);
    expect(result.streams[0]?.catalogHealth).toMatchObject({ status: "dead", responseStatus: 404 });
    expect(result.health?.status).toBe("unavailable");
  });
});
