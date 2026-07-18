import { describe, it, expect } from "vitest";
import { chooseStrategy } from "@/features/player/application/playback-strategy";
import type { NormalizedStream } from "@/features/catalog/domain/types";

const baseStream = (overrides: Partial<NormalizedStream>): NormalizedStream => ({
  id: "s",
  url: "https://example.com/s.m3u8",
  title: "s",
  quality: null,
  label: null,
  feedId: null,
  protocol: "https",
  kind: "hls",
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred",
  ...overrides,
});

describe("chooseStrategy", () => {
  it("prefers native HLS when video.canPlayType returns 'probably'", () => {
    const s = chooseStrategy({
      stream: baseStream({}),
      videoCanPlayHls: "probably",
      hlsJsSupported: true,
    });
    expect(s.kind).toBe("native-hls");
  });

  it("uses native HLS when video.canPlayType returns 'maybe'", () => {
    const s = chooseStrategy({
      stream: baseStream({}),
      videoCanPlayHls: "maybe",
      hlsJsSupported: true,
    });
    expect(s.kind).toBe("native-hls");
  });

  it("falls back to hls.js when native HLS is unsupported", () => {
    const s = chooseStrategy({
      stream: baseStream({}),
      videoCanPlayHls: "",
      hlsJsSupported: true,
    });
    expect(s.kind).toBe("hls.js");
  });

  it("returns unsupported when neither native HLS nor hls.js works", () => {
    const s = chooseStrategy({
      stream: baseStream({}),
      videoCanPlayHls: "",
      hlsJsSupported: false,
    });
    expect(s.kind).toBe("unsupported");
    expect(s.reason).toBe("UNSUPPORTED_FORMAT");
  });

  it("uses native MP4 for MP4 streams", () => {
    const s = chooseStrategy({
      stream: baseStream({ kind: "mp4" }),
      videoCanPlayHls: "",
      hlsJsSupported: false,
    });
    expect(s.kind).toBe("native-mp4");
  });

  it("returns unsupported for unknown kind", () => {
    const s = chooseStrategy({
      stream: baseStream({ kind: "unknown" }),
      videoCanPlayHls: "",
      hlsJsSupported: true,
    });
    expect(s.kind).toBe("unsupported");
  });

  it("rejects HTTP streams (mixed content)", () => {
    const s = chooseStrategy({
      stream: baseStream({ protocol: "http" }),
      videoCanPlayHls: "probably",
      hlsJsSupported: true,
    });
    expect(s.kind).toBe("unsupported");
    expect(s.reason).toBe("MIXED_CONTENT");
  });
});
