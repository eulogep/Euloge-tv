import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHlsAdapter } from "@/features/player/infrastructure/hls-adapter";
import type { NormalizedStream } from "@/features/catalog/domain/types";

// Mock hls.js with a minimal surface.
const destroyMock = vi.fn();
const startLoadMock = vi.fn();
const recoverMediaErrorMock = vi.fn();
const loadSourceMock = vi.fn();
const attachMediaMock = vi.fn();
const onMock = vi.fn();

vi.mock("hls.js", () => {
  return {
    default: class FakeHls {
      static isSupported() {
        return true;
      }
      static Events = {
        MANIFEST_PARSED: "hlsManifestParsed",
        ERROR: "hlsError",
        LEVEL_SWITCHED: "hlsLevelSwitched",
      };
      constructor(_opts: unknown) {}
      attachMedia = attachMediaMock;
      loadSource = loadSourceMock;
      on = onMock;
      destroy = destroyMock;
      startLoad = startLoadMock;
      recoverMediaError = recoverMediaErrorMock;
      levels: unknown[] = [];
      currentLevel = -1;
    },
  };
});

const baseStream: NormalizedStream = {
  id: "s",
  url: "https://example.com/x.m3u8",
  title: "",
  quality: null,
  label: null,
  feedId: null,
  protocol: "https",
  kind: "hls",
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred",
};

describe("createHlsAdapter cleanup", () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    video = document.createElement("video");
    destroyMock.mockReset();
    attachMediaMock.mockReset();
    loadSourceMock.mockReset();
    onMock.mockReset();
    startLoadMock.mockReset();
    recoverMediaErrorMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("destroys hls.js on destroy()", async () => {
    const adapter = createHlsAdapter({
      video,
      stream: baseStream,
      callbacks: {
        onFatalError: () => {},
        onRecovered: () => {},
        onManifestParsed: () => {},
        onLevelSwitched: () => {},
      },
    });
    await adapter.start();
    adapter.destroy();
    expect(destroyMock).toHaveBeenCalled();
  });

  it("removes listeners via destroy (no throw)", async () => {
    const adapter = createHlsAdapter({
      video,
      stream: baseStream,
      callbacks: {
        onFatalError: () => {},
        onRecovered: () => {},
        onManifestParsed: () => {},
        onLevelSwitched: () => {},
      },
    });
    await adapter.start();
    expect(() => adapter.destroy()).not.toThrow();
  });

  it("revokes blob URLs is the Player's responsibility; adapter just destroys hls", async () => {
    const adapter = createHlsAdapter({
      video,
      stream: baseStream,
      callbacks: {
        onFatalError: () => {},
        onRecovered: () => {},
        onManifestParsed: () => {},
        onLevelSwitched: () => {},
      },
    });
    await adapter.start();
    adapter.destroy();
    // destroy is idempotent and safe to call again.
    expect(() => adapter.destroy()).not.toThrow();
  });

  it("surfaces fatal network error and performs single retry", async () => {
    const onFatal = vi.fn();
    const onRecovered = vi.fn();
    const adapter = createHlsAdapter({
      video,
      stream: baseStream,
      callbacks: {
        onFatalError: onFatal,
        onRecovered: onRecovered,
        onManifestParsed: () => {},
        onLevelSwitched: () => {},
      },
    });
    await adapter.start();
    expect(onMock).toHaveBeenCalled();
    // Find the registered ERROR handler.
    const errorCall = onMock.mock.calls.find((args) => args[0] === "hlsError");
    expect(errorCall).toBeTruthy();
    const handler = errorCall![1] as (e: unknown, data: unknown) => void;
    // First fatal network error → recovery.
    handler(null, { fatal: true, type: "networkError", details: "manifestLoadError" });
    expect(startLoadMock).toHaveBeenCalledTimes(1);
    expect(onRecovered).toHaveBeenCalledWith("network");
    // Second fatal network error → fatal surfaced.
    handler(null, { fatal: true, type: "networkError", details: "manifestLoadError" });
    expect(onFatal).toHaveBeenCalled();
  });

  it("surfaces fatal media error and performs single retry", async () => {
    const onFatal = vi.fn();
    const onRecovered = vi.fn();
    const adapter = createHlsAdapter({
      video,
      stream: baseStream,
      callbacks: {
        onFatalError: onFatal,
        onRecovered: onRecovered,
        onManifestParsed: () => {},
        onLevelSwitched: () => {},
      },
    });
    await adapter.start();
    const errorCall = onMock.mock.calls.find((args) => args[0] === "hlsError");
    const handler = errorCall![1] as (e: unknown, data: unknown) => void;
    handler(null, { fatal: true, type: "mediaError", details: "bufferStalledError" });
    expect(recoverMediaErrorMock).toHaveBeenCalledTimes(1);
    expect(onRecovered).toHaveBeenCalledWith("media");
    handler(null, { fatal: true, type: "mediaError", details: "bufferStalledError" });
    expect(onFatal).toHaveBeenCalled();
  });
});
