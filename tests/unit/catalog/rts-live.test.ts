import { describe, expect, it, vi } from "vitest";
import { createRtsLiveResolver } from "@/features/catalog/infrastructure/rts-live";
import { parseChannelSourceOverrides } from "@/features/catalog/infrastructure/source-overrides";

const fixtureUrl = (signature = "fixture-signature") =>
  `https://live1.acangroup.org:1929/larts/rts1_all/playlist.m3u8?wmsAuthSign=${signature}`;

describe("official RTS live resolver", () => {
  it("refreshes expiring URLs instead of storing them in the catalogue", async () => {
    let now = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ web_url: fixtureUrl("first") }))
      .mockResolvedValueOnce(Response.json({ web_url: fixtureUrl("second") }));
    const resolve = createRtsLiveResolver(fetcher, () => now);
    expect(await resolve("1")).toBe(fixtureUrl("first"));
    expect(await resolve("1")).toBe(fixtureUrl("first"));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://tveapi.acan.group/myapiv2/directplayback/26/json",
      expect.objectContaining({ cache: "no-store", redirect: "error" }),
    );
    now = 30_001;
    expect(await resolve("1")).toBe(fixtureUrl("second"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent requests for the same public feed", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ web_url: fixtureUrl() }));
    const resolve = createRtsLiveResolver(fetcher);
    expect(await Promise.all([resolve("1"), resolve("1")])).toEqual([fixtureUrl(), fixtureUrl()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not return an expired URL when a refresh fails", async () => {
    let now = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ web_url: fixtureUrl() }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    const resolve = createRtsLiveResolver(fetcher, () => now);
    await resolve("1");
    now = 31_000;
    await expect(resolve("1")).rejects.toThrow("rts_source_unavailable");
  });

  it("refuses unknown feeds without making a network request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const resolve = createRtsLiveResolver(fetcher);
    for (const id of ["5", "__proto__", "https://example.com", "../1"]) {
      await expect(resolve(id)).rejects.toThrow("rts_unknown_feed");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    "http://live1.acangroup.org:1929/larts/rts1_all/playlist.m3u8?wmsAuthSign=fixture",
    "https://127.0.0.1/larts/rts1_all/playlist.m3u8?wmsAuthSign=fixture",
    "https://live1.acangroup.org.evil.example:1929/larts/rts1_all/playlist.m3u8?wmsAuthSign=fixture",
    "https://live1.acangroup.org:1929/larts/rts2.stream/playlist.m3u8?wmsAuthSign=fixture",
    "https://user:password@live1.acangroup.org:1929/larts/rts1_all/playlist.m3u8?wmsAuthSign=fixture",
    "https://live1.acangroup.org:1929/larts/rts1_all/playlist.m3u8",
    `${fixtureUrl()}&redirect=https://example.com`,
  ])("refuses an unexpected playback destination: %s", async (url) => {
    const resolve = createRtsLiveResolver(
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({ web_url: url })),
    );
    await expect(resolve("1")).rejects.toThrow("rts_source_unavailable");
  });

  it("bounds metadata responses and returns a constant error", async () => {
    const resolve = createRtsLiveResolver(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("x".repeat(20_000))),
    );
    await expect(resolve("1")).rejects.toThrow(/^rts_source_unavailable$/);
  });

  it("rejects a resolver attached to another channel or metadata endpoint", () => {
    const entry = {
      channelId: "RTS1.sn",
      addSources: [
        {
          id: "official",
          title: "Official",
          url: "https://tveapi.acan.group/myapiv2/directplayback/26/json",
          resolver: "rts",
          sourceOrigin: "https://www.rts.sn/tv/rts-1",
          manuallyApproved: true,
        },
      ],
      reason: "reviewed",
      reviewedAt: "2026-10-30T12:00:00.000Z",
      reviewer: "test",
      evidence: ["browser playback"],
    };
    expect(() => parseChannelSourceOverrides({ version: 1, entries: [entry] })).not.toThrow();
    expect(() =>
      parseChannelSourceOverrides({ version: 1, entries: [{ ...entry, channelId: "Other.sn" }] }),
    ).toThrow();
    expect(() =>
      parseChannelSourceOverrides({
        version: 1,
        entries: [
          {
            ...entry,
            addSources: [{ ...entry.addSources[0], url: "https://example.com/metadata" }],
          },
        ],
      }),
    ).toThrow();
  });
});
