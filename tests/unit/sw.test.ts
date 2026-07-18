import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Read the actual sw.js file to ensure we test the live routing code.
const swPath = path.resolve(process.cwd(), "public/sw.js");
const swContent = fs.readFileSync(swPath, "utf8");

// Extract the exact isVideoRequest function from the service worker source
const getIsVideoRequest = () => {
  const extMatch = swContent.match(/const VIDEO_EXTENSIONS = \[[\s\S]*?\];/);
  const hintsMatch = swContent.match(/const VIDEO_HOSTS_HINTS = \[[\s\S]*?\];/);
  const fnMatch = swContent.match(/const isVideoRequest = \([\s\S]*?};/);

  if (!extMatch || !hintsMatch || !fnMatch) {
    throw new Error("Could not parse sw.js code");
  }

  const setupCode = `${extMatch[0]}\n${hintsMatch[0]}\n${fnMatch[0]}`;
  return new Function(`${setupCode}\nreturn isVideoRequest;`)();
};

describe("Service Worker Cache Routing & Video Exclusions", () => {
  const isVideoRequest = getIsVideoRequest();

  describe("isVideoRequest filter validation", () => {
    it("should exclude standard video playlist and segment formats", () => {
      expect(isVideoRequest(new URL("https://example.com/stream.m3u8"))).toBe(true);
      expect(isVideoRequest(new URL("https://example.com/media/segment.ts"))).toBe(true);
      expect(isVideoRequest(new URL("https://example.com/files/video.mp4"))).toBe(true);
      expect(isVideoRequest(new URL("https://example.com/audio/track.m4a"))).toBe(true);
      expect(isVideoRequest(new URL("https://example.com/stream.m4s"))).toBe(true);
      expect(isVideoRequest(new URL("https://example.com/audio.aac"))).toBe(true);
    });

    it("should exclude URLs containing video path hints", () => {
      expect(isVideoRequest(new URL("https://iptv-provider.com/live/ts/chunk-9482"))).toBe(true);
      expect(isVideoRequest(new URL("https://streaming.net/hls/m3u8/channel1"))).toBe(true);
      expect(isVideoRequest(new URL("https://source.tv/mp4/movie"))).toBe(true);
    });

    it("should allow regular application assets to be cached", () => {
      expect(isVideoRequest(new URL("https://example.com/"))).toBe(false);
      expect(isVideoRequest(new URL("https://example.com/index.html"))).toBe(false);
      expect(isVideoRequest(new URL("https://example.com/globals.css"))).toBe(false);
      expect(isVideoRequest(new URL("https://example.com/manifest.webmanifest"))).toBe(false);
      expect(isVideoRequest(new URL("https://example.com/icons/icon-192.png"))).toBe(false);
      expect(isVideoRequest(new URL("https://example.com/api/catalog"))).toBe(false);
    });
  });

  describe("Range request and general exclusions in sw.js", () => {
    it("should contain Range request bypass check", () => {
      // Ensure the sw.js code checks the range header
      expect(swContent).toContain('if (req.headers.get("range")) return;');
    });

    it("should bypass non-GET requests", () => {
      // Ensure non-GET requests are not intercepted
      expect(swContent).toContain('if (req.method !== "GET") return;');
    });

    it("should filter only same-origin requests or navigations for caching", () => {
      expect(swContent).toContain("url.origin === self.location.origin");
      expect(swContent).toContain('req.mode === "navigate"');
    });
  });
});
