import { describe, it, expect } from "vitest";
import {
  normalizeCatalog,
  queryCatalog,
  isDangerousUrl,
  rankStream,
  computeCompatibility,
  detectKind,
} from "@/features/catalog/application/normalize";
import type { NormalizeInput } from "@/features/catalog/application/normalize";
import sample from "../../fixtures/iptv-org/sample.json" with { type: "json" };
import type {
  IptvBlocklist,
  IptvCategory,
  IptvChannel,
  IptvCountry,
  IptvFeed,
  IptvGuide,
  IptvLanguage,
  IptvLogo,
  IptvStream,
} from "@/features/catalog/infrastructure/schemas";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";

const input: NormalizeInput = {
  channels: sample.channels as unknown as IptvChannel[],
  streams: sample.streams as unknown as IptvStream[],
  feeds: sample.feeds as unknown as IptvFeed[],
  logos: sample.logos as unknown as IptvLogo[],
  guides: sample.guides as unknown as IptvGuide[],
  categories: sample.categories as unknown as IptvCategory[],
  countries: sample.countries as unknown as IptvCountry[],
  languages: sample.languages as unknown as IptvLanguage[],
  blocklist: sample.blocklist as unknown as IptvBlocklist[],
};

describe("normalizeCatalog", () => {
  it("keeps a channel with a no-source health state when every URL is invalid", () => {
    const invalidInput: NormalizeInput = {
      ...input,
      channels: [
        {
          ...input.channels[0],
          id: "invalid-only",
          name: "Invalid only",
        },
      ],
      streams: [
        {
          channel: "invalid-only",
          feed: null,
          title: "Invalid",
          url: "not a url",
          display_order: null,
          quality: null,
          label: null,
        },
      ],
      blocklist: [],
    };
    const [channel] = normalizeCatalog(invalidInput);
    expect(channel).toMatchObject({
      id: "invalid-only",
      streams: [],
      health: { status: "no_source", sourceCount: 0 },
    });
  });

  it("excludes NSFW channels", () => {
    const out = normalizeCatalog(input);
    expect(out.find((c) => c.id === "badnsfw")).toBeUndefined();
  });

  it("excludes blocklisted channels", () => {
    const out = normalizeCatalog(input);
    expect(out.find((c) => c.id === "blocked")).toBeUndefined();
  });

  it("excludes closed channels without replacement", () => {
    const out = normalizeCatalog(input);
    expect(out.find((c) => c.id === "closed")).toBeUndefined();
  });

  it("excludes dangerous-protocol streams", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1).toBeDefined();
    expect(tf1!.streams.every((s) => !s.url.startsWith("javascript:"))).toBe(true);
    expect(tf1!.streams.every((s) => !s.url.startsWith("rtmp:"))).toBe(true);
  });

  it("keeps only HLS and MP4 streams with http(s) protocol", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1!.streams.length).toBe(3); // m3u8 https, m3u8 http, mp4 https
    expect(tf1!.streams.every((s) => s.kind === "hls" || s.kind === "mp4")).toBe(true);
  });

  it("sorts streams by rank (HTTPS HLS first)", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1!.streams[0].url).toBe("https://example.com/tf1.m3u8");
    expect(tf1!.streams[1].url).toBe("https://example.com/tf1.mp4");
    // HTTP stream last
    expect(tf1!.streams[tf1!.streams.length - 1].protocol).toBe("http");
  });

  it("picks the in-use horizontal logo matching the main feed", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1!.logoUrl).toBe("https://example.com/tf1.png");
  });

  it("joins country info", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1!.countryName).toBe("France");
    expect(tf1!.countryFlag).toBe("🇫🇷");
    expect(tf1!.languageCodes).toEqual(["fra"]);
  });

  it("maps category ids to the canonical taxonomy", () => {
    const out = normalizeCatalog(input);
    const tf1 = out.find((c) => c.id === "tf1");
    expect(tf1!.primaryCategory).toBe("live");
    expect(tf1!.categories).toContain("entertainment");
  });
});

describe("isDangerousUrl", () => {
  it("detects javascript: URLs", () => {
    expect(isDangerousUrl("javascript:alert(1)")).toBe(true);
  });
  it("detects rtmp: URLs", () => {
    expect(isDangerousUrl("rtmp://example.com")).toBe(true);
  });
  it("accepts https URLs", () => {
    expect(isDangerousUrl("https://example.com/stream.m3u8")).toBe(false);
  });
});

describe("computeCompatibility", () => {
  it("marks HTTPS HLS as preferred", () => {
    expect(
      computeCompatibility({
        protocol: "https",
        kind: "hls",
        requiresReferrer: false,
        requiresCustomUserAgent: false,
      }),
    ).toBe("preferred");
  });
  it("marks HTTP as limited (mixed-content)", () => {
    expect(
      computeCompatibility({
        protocol: "http",
        kind: "hls",
        requiresReferrer: false,
        requiresCustomUserAgent: false,
      }),
    ).toBe("limited");
  });
  it("marks referrer-required as limited", () => {
    expect(
      computeCompatibility({
        protocol: "https",
        kind: "hls",
        requiresReferrer: true,
        requiresCustomUserAgent: false,
      }),
    ).toBe("limited");
  });
});

describe("detectKind", () => {
  it("prefers a reliable HLS content type over a missing extension", () => {
    expect(detectKind("https://example.com/live", "application/vnd.apple.mpegurl")).toBe("hls");
  });

  it("falls back to the URL extension when no content type is available", () => {
    expect(detectKind("https://example.com/live.m3u8", null)).toBe("hls");
  });
});

describe("rankStream", () => {
  const base = {
    id: "s",
    url: "",
    title: "",
    quality: null,
    label: null,
    feedId: null,
    requiresReferrer: false,
    requiresCustomUserAgent: false,
    browserCompatibility: "preferred" as const,
    availability: createUnknownSourceAvailability(),
  };
  it("HTTPS HLS scores better than HTTP HLS", () => {
    const https = rankStream({ ...base, protocol: "https", kind: "hls" }, true);
    const http = rankStream({ ...base, protocol: "http", kind: "hls" }, true);
    expect(https).toBeLessThan(http);
  });
  it("main feed scores better than non-main", () => {
    const main = rankStream({ ...base, protocol: "https", kind: "hls" }, true);
    const notMain = rankStream({ ...base, protocol: "https", kind: "hls" }, false);
    expect(main).toBeLessThan(notMain);
  });
});

describe("queryCatalog", () => {
  const all = normalizeCatalog(input);

  it("paginates results", () => {
    const r1 = queryCatalog(all, { limit: 1 });
    expect(r1.items).toHaveLength(1);
    expect(r1.nextCursor).not.toBeNull();
    expect(r1.total).toBe(2); // tf1 + france24
  });

  it("returns the next page via cursor", () => {
    const r1 = queryCatalog(all, { limit: 1 });
    const r2 = queryCatalog(all, { limit: 1, cursor: r1.nextCursor! });
    expect(r2.items).toHaveLength(1);
    expect(r2.nextCursor).toBeNull();
  });

  it("applies a search query case-insensitively", () => {
    const r = queryCatalog(all, { limit: 10, q: "tf1" });
    expect(r.items.every((c) => c.id === "tf1")).toBe(true);
    expect(r.total).toBe(1);
  });

  it("searches alternative names", () => {
    const r = queryCatalog(all, { limit: 10, q: "tf1 hd" });
    expect(r.items.find((c) => c.id === "tf1")).toBeDefined();
  });

  it("filters by country", () => {
    const r = queryCatalog(all, { limit: 10, country: "FR" });
    expect(r.total).toBe(2);
  });

  it("filters by category", () => {
    const r = queryCatalog(all, { limit: 10, category: "Actualités" });
    expect(r.total).toBe(1);
    expect(r.items[0].id).toBe("france24");
  });

  it("builds filter facets", () => {
    const r = queryCatalog(all, { limit: 10 });
    expect(r.filters.countries.length).toBeGreaterThan(0);
    expect(r.filters.categories.length).toBeGreaterThan(0);
  });

  it("enforces max limit of 100", () => {
    const r = queryCatalog(all, { limit: 1000 });
    expect(r.items.length).toBeLessThanOrEqual(100);
  });
});
