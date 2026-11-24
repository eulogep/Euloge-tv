import { describe, expect, it, vi } from "vitest";
import {
  fetchFreeTvStreams,
  parseFreeTvStreams,
} from "@/features/catalog/infrastructure/free-tv-client";
import { normalizeCatalog } from "@/features/catalog/application/normalize";

const SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-name="Das Erste" tvg-id="DasErste.de" group-title="Germany",Das Erste Ⓢ
https://daserste-live.ard-mcdn.de/daserste/live/hls/de/master.m3u8
#EXTINF:-1 tvg-name="Das Erste" tvg-id="DasErste.de" group-title="Germany",Das Erste Ⓢ
https://daserste-live.ard-mcdn.de/daserste/live/hls/de/master.m3u8
#EXTINF:-1 tvg-name="Euronews" tvg-id="Euronews.fr" group-title="France",Euronews Ⓨ
https://www.youtube.com/@euronews/live
#EXTINF:-1 tvg-name="Restricted" tvg-id="Restricted.de" group-title="Germany",Restricted
#EXTVLCOPT:http-referrer=https://private.example/
https://restricted.example/live.m3u8
#EXTINF:-1 tvg-name="Bad Proto" tvg-id="Bad.de" group-title="Germany",Bad
javascript:alert(1)
#EXTINF:-1 tvg-name="ARTE" tvg-id="ARTE.fr" group-title="France",ARTE Ⓖ
https://arte-live.example/index.m3u8
`;

describe("free-tv-client", () => {
  it("extracts only direct HTTP(S) HLS/MP4 streams without header restrictions and deduplicates", () => {
    const streams = parseFreeTvStreams(SAMPLE_M3U);
    expect(streams).toHaveLength(2);
    expect(streams[0]).toMatchObject({
      channel: "DasErste.de",
      title: "Das Erste",
      url: "https://daserste-live.ard-mcdn.de/daserste/live/hls/de/master.m3u8",
      label: "Free-TV",
      source_origin: "free-tv",
    });
    expect(streams[1]).toMatchObject({
      channel: "ARTE.fr",
      title: "ARTE",
      url: "https://arte-live.example/index.m3u8",
      source_origin: "free-tv",
    });
  });

  it("fails open with an empty list on network or HTTP error", async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchFreeTvStreams(failingFetch as unknown as typeof fetch)).toEqual([]);

    const non200Fetch = vi.fn().mockResolvedValue(new Response("err", { status: 503 }));
    expect(await fetchFreeTvStreams(non200Fetch as unknown as typeof fetch)).toEqual([]);
  });

  it("merges Free-TV backup streams into normalizeCatalog without duplicating existing URLs", () => {
    const freeTv = parseFreeTvStreams(SAMPLE_M3U);
    const catalog = normalizeCatalog({
      channels: [
        {
          id: "DasErste.de",
          name: "Das Erste",
          alt_names: null,
          network: null,
          owners: null,
          country: "DE",
          subdivision: null,
          city: null,
          categories: ["general"],
          is_nsfw: false,
          launched: null,
          closed: null,
          replaced_by: null,
          website: null,
        },
      ],
      streams: [
        {
          channel: "DasErste.de",
          feed: null,
          title: "Primary",
          url: "https://primary.example/daserste.m3u8",
          display_order: null,
          quality: "1080p",
          label: null,
        },
        ...freeTv,
      ],
      feeds: [],
      logos: [],
      guides: [],
      categories: [{ id: "general", name: "General" }],
      countries: [{ code: "DE", name: "Germany", flag: "🇩🇪", languages: ["deu"] }],
      languages: [{ code: "deu", name: "German" }],
      blocklist: [],
    });

    expect(catalog).toHaveLength(1);
    expect(catalog[0]!.streams).toHaveLength(2);
    expect(catalog[0]!.streams.map((s) => s.sourceOrigin)).toEqual(["iptv-org", "free-tv"]);
  });
});
