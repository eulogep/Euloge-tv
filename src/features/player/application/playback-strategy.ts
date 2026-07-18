import type { NormalizedStream } from "@/features/catalog/domain/types";
import type { PlaybackStrategy, PlaybackStrategyKind } from "../domain/types";

export type StrategyInput = {
  stream: NormalizedStream;
  /** Result of `video.canPlayType("application/vnd.apple.mpegurl")`. */
  videoCanPlayHls: "" | "maybe" | "probably";
  /** Result of `Hls.isSupported()` (false on Safari/iOS). */
  hlsJsSupported: boolean;
};

/**
 * Decide the playback strategy for a given stream and browser capabilities.
 *
 * HLS:
 *   1. If `video.canPlayType("application/vnd.apple.mpegurl")` is truthy
 *      → use native HLS (Safari, iOS).
 *   2. Else if `Hls.isSupported()` → use hls.js.
 *   3. Else → unsupported.
 *
 * MP4: use native <video>.
 *
 * Unknown kind: never pretend it's compatible.
 */
export const chooseStrategy = (input: StrategyInput): PlaybackStrategy => {
  const { stream, videoCanPlayHls, hlsJsSupported } = input;

  if (stream.protocol === "http") {
    // On an HTTPS page this will be blocked by mixed-content. We still allow
    // attempting native HLS/MP4 if the page itself is HTTP, but in practice
    // MJTV is served over HTTPS.
    return {
      kind: "unsupported",
      reason: "MIXED_CONTENT",
    };
  }

  if (stream.kind === "hls") {
    if (videoCanPlayHls === "probably" || videoCanPlayHls === "maybe") {
      return { kind: "native-hls" };
    }
    if (hlsJsSupported) {
      return { kind: "hls.js" };
    }
    return { kind: "unsupported", reason: "UNSUPPORTED_FORMAT" };
  }

  if (stream.kind === "mp4") {
    return { kind: "native-mp4" };
  }

  return { kind: "unsupported", reason: "UNSUPPORTED_FORMAT" };
};

export const strategyLabel: Record<PlaybackStrategyKind, string> = {
  "native-hls": "HLS natif (Safari)",
  "hls.js": "HLS.js",
  "native-mp4": "MP4 natif",
  unsupported: "Non supporté",
};
