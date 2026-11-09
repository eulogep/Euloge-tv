import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedChannel } from "@/features/catalog/domain/types";

const { getChannelById } = vi.hoisted(() => ({
  getChannelById: vi.fn(),
}));

vi.mock("@/features/catalog/application/catalog-service", () => ({
  getChannelById,
}));

import { GET } from "@/app/api/channels/[id]/route";

const internalChannel: NormalizedChannel = {
  id: "public-contract",
  name: "Public Contract",
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: null,
  languageCodes: ["fra"],
  primaryCategory: "news",
  categories: ["news"],
  tags: [],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streams: [
    {
      id: "stream",
      url: "https://example.com/live.m3u8",
      title: "Stream",
      quality: null,
      label: null,
      feedId: null,
      protocol: "https",
      kind: "hls",
      requiresReferrer: false,
      requiresCustomUserAgent: false,
      browserCompatibility: "preferred",
      availability: {
        status: "unknown",
        lastCheckedAt: null,
        failureReason: null,
        responseStatus: null,
        detectedContentType: null,
        playbackStrategy: null,
        compatibility: { safari: "unknown", chromium: "unknown", unknown: "unknown" },
      },
      catalogHealth: {
        status: "playable",
        checkedAt: "2026-07-22T12:00:00.000Z",
        lastSuccessAt: "2026-07-22T12:00:00.000Z",
        lastFailureAt: null,
        responseStatus: 200,
        contentType: "application/vnd.apple.mpegurl",
        manifestValid: true,
        playbackStrategy: "native-hls",
        compatibility: "compatible",
        failureReason: "internal-only",
        sourceOrigin: "private-audit-origin",
        manuallyApproved: true,
        disabled: false,
        priority: 1,
      },
    },
  ],
};

describe("GET /api/channels/[id]", () => {
  beforeEach(() => {
    getChannelById.mockReset();
  });

  it("serializes only the explicit public channel contract", async () => {
    getChannelById.mockResolvedValue(internalChannel);

    const response = await GET(new Request("http://localhost/api/channels/public-contract"), {
      params: Promise.resolve({ id: "public-contract" }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(getChannelById).toHaveBeenCalledWith("public-contract");
    expect(serialized).not.toMatch(
      /catalogHealth|sourceOrigin|manuallyApproved|auditOrigin|reviewerNote|priority/,
    );
    expect(body).toHaveProperty("health.status", "healthy");
    expect(body).toHaveProperty("streams.0.url", "https://example.com/live.m3u8");
  });

  it("publishes public metadata for viewer-side resolution without expiring signatures", async () => {
    getChannelById.mockResolvedValue({
      ...internalChannel,
      id: "RTS1.sn",
      streams: [
        {
          ...internalChannel.streams[0],
          resolver: "rts",
          url: "https://tveapi.acan.group/myapiv2/directplayback/26/json",
        },
      ],
    });
    const response = await GET(new Request("https://mjtv.test/api/channels/RTS1.sn"), {
      params: Promise.resolve({ id: "RTS1.sn" }),
    });
    const body = await response.json();
    expect(body.streams[0].url).toBe("https://tveapi.acan.group/myapiv2/directplayback/26/json");
    expect(body.streams[0].resolver).toBe("rts");
    expect(JSON.stringify(body)).not.toMatch(/wmsAuthSign|catalogHealth|reviewer/);
  });
});
