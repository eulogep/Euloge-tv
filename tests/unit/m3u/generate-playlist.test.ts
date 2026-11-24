import { describe, expect, it } from "vitest";
import { buildM3uPlaylist } from "../../../scripts/generate-imported-playlist";
import { parseM3u } from "@/features/imported-playlists/infrastructure/m3u-parser";

describe("buildM3uPlaylist", () => {
  it("filters out nsfw, closed, blocklisted, and header-restricted streams", () => {
    const { m3u, count } = buildM3uPlaylist({
      countries: ["DE", "FR"],
      limitPerCountry: 5,
      channels: [
        { id: "de1.de", name: "DE One", country: "DE", categories: ["news"] },
        { id: "nsfw.de", name: "NSFW DE", country: "DE", categories: ["xxx"], is_nsfw: true },
        { id: "closed.de", name: "Closed DE", country: "DE", categories: ["news"], closed: "2024-01-01" },
        { id: "blocked.fr", name: "Blocked FR", country: "FR", categories: ["general"] },
        { id: "ref.fr", name: "Ref FR", country: "FR", categories: ["general"] },
        { id: "fr1.fr", name: "FR One", country: "FR", categories: ["general"] },
        { id: "us1.us", name: "US One", country: "US", categories: ["news"] },
      ],
      streams: [
        { channel: "de1.de", url: "http://example.com/de1.m3u8" },
        { channel: "de1.de", url: "https://example.com/de1.m3u8", quality: "1080p" },
        { channel: "nsfw.de", url: "https://example.com/nsfw.m3u8" },
        { channel: "closed.de", url: "https://example.com/closed.m3u8" },
        { channel: "blocked.fr", url: "https://example.com/blocked.m3u8" },
        { channel: "ref.fr", url: "https://example.com/ref.m3u8", referrer: "https://secret.example/" },
        { channel: "fr1.fr", url: "https://example.com/fr1.m3u8" },
        { channel: "us1.us", url: "https://example.com/us1.m3u8" },
      ],
      logos: [{ channel: "de1.de", url: "https://example.com/de1.png" }],
      blocklist: [{ channel: "blocked.fr" }],
    });

    expect(count).toBe(2);
    const parsed = parseM3u(m3u);
    expect(parsed.rejected).toEqual([]);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toMatchObject({
      name: "DE One",
      url: "https://example.com/de1.m3u8",
      logo: "https://example.com/de1.png",
      countryCode: "DE",
      group: "news",
      tvgId: "de1.de",
    });
    expect(parsed.entries[1]).toMatchObject({
      name: "FR One",
      url: "https://example.com/fr1.m3u8",
      countryCode: "FR",
    });
  });

  it("enforces per-country limits", () => {
    const { count } = buildM3uPlaylist({
      countries: ["DE"],
      limitPerCountry: 1,
      channels: [
        { id: "de1.de", name: "DE 1", country: "DE", categories: ["news"] },
        { id: "de2.de", name: "DE 2", country: "DE", categories: ["news"] },
      ],
      streams: [
        { channel: "de1.de", url: "https://example.com/1.m3u8" },
        { channel: "de2.de", url: "https://example.com/2.m3u8" },
      ],
      logos: [],
      blocklist: [],
    });

    expect(count).toBe(1);
  });
});
