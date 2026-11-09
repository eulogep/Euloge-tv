import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetCastSdk,
  castStream,
  detectRemoteKind,
  showAirPlayPicker,
} from "@/features/player/application/remote-playback";

const installCast = (
  session: { loadMedia: () => Promise<unknown> } | null,
  request: () => Promise<unknown>,
) => {
  const target = window as unknown as Record<string, unknown>;
  target.cast = {
    framework: {
      CastContext: {
        getInstance: () => ({
          setOptions: vi.fn(),
          requestSession: request,
          getCurrentSession: () => session,
        }),
      },
    },
  };
  target.chrome = {
    cast: {
      AutoJoinPolicy: { ORIGIN_SCOPED: "origin" },
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: "CC1AD845",
        StreamType: { LIVE: "LIVE" },
        MediaInfo: class {},
        GenericMediaMetadata: class {},
        LoadRequest: class {},
      },
    },
  };
};

/** Answers the SDK script as soon as it is injected. */
const answerSdk = (available: boolean) => {
  const append = vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    queueMicrotask(() =>
      (
        window as unknown as { __onGCastApiAvailable: (value: boolean) => void }
      ).__onGCastApiAvailable(available),
    );
    return node;
  });
  return append;
};

const input = { url: "https://example.com/a.m3u8", title: "RTS 1", kind: "hls" } as const;

describe("sending to a screen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    __resetCastSdk();
    delete (window as unknown as Record<string, unknown>).cast;
    delete (window as unknown as Record<string, unknown>).chrome;
  });

  it("prefers AirPlay where the browser has it", () => {
    const picker = vi.fn();
    const video = { webkitShowPlaybackTargetPicker: picker } as unknown as HTMLVideoElement;
    expect(detectRemoteKind(video, "chromium")).toBe("airplay");
    showAirPlayPicker(video);
    expect(picker).toHaveBeenCalledOnce();
  });

  it("offers Cast on Chromium only", () => {
    const video = {} as HTMLVideoElement;
    expect(detectRemoteKind(video, "chromium")).toBe("cast");
    expect(detectRemoteKind(video, "safari")).toBeNull();
    expect(detectRemoteKind(video, "unknown")).toBeNull();
  });

  it("does not request Google's script before the button is pressed", () => {
    expect(document.querySelector('script[src*="gstatic"]')).toBeNull();
  });

  it("reports no screen when the SDK says Cast is unavailable", async () => {
    answerSdk(false);
    expect(await castStream(input)).toBe("unavailable");
  });

  it("loads the stream as live once a session is open", async () => {
    answerSdk(true);
    const loadMedia = vi.fn(async () => {});
    installCast({ loadMedia }, async () => {});
    expect(await castStream(input)).toBe("casting");
    expect(loadMedia).toHaveBeenCalledOnce();
  });

  it("treats a dismissed device picker as a choice, not an error", async () => {
    answerSdk(true);
    installCast(null, async () => {
      throw "cancel";
    });
    expect(await castStream(input)).toBe("cancelled");
  });

  it("says when the receiver refuses the source", async () => {
    answerSdk(true);
    installCast(
      {
        loadMedia: async () => {
          throw new Error("LOAD_FAILED");
        },
      },
      async () => {},
    );
    expect(await castStream(input)).toBe("refused");
  });
});
