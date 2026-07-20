import type { NormalizedStream } from "@/features/catalog/domain/types";
import type { PlaybackStrategy, PlaybackStrategyKind } from "../domain/types";

export type StrategyInput = {
  stream: NormalizedStream;
  /** Result of `video.canPlayType("application/vnd.apple.mpegurl")`. */
  videoCanPlayHls: "" | "maybe" | "probably";
  /** Result of `Hls.isSupported()` (false on Safari/iOS). */
  hlsJsSupported: boolean;
  /** MIME returned by an optional source probe. Preferred over URL heuristics. */
  detectedContentType?: string | null;
};

const kindFromContentType = (
  stream: NormalizedStream,
  detectedContentType?: string | null,
): NormalizedStream["kind"] => {
  const contentType = detectedContentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (
    contentType === "application/vnd.apple.mpegurl" ||
    contentType === "application/x-mpegurl" ||
    contentType === "audio/mpegurl" ||
    contentType === "audio/x-mpegurl"
  ) {
    return "hls";
  }
  if (contentType?.startsWith("video/")) return "mp4";
  return stream.kind;
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
  const { stream, videoCanPlayHls, hlsJsSupported, detectedContentType } = input;
  const kind = kindFromContentType(stream, detectedContentType);

  if (stream.protocol === "http") {
    // On an HTTPS page this will be blocked by mixed-content. We still allow
    // attempting native HLS/MP4 if the page itself is HTTP, but in practice
    // MJTV is served over HTTPS.
    return {
      kind: "unsupported",
      reason: "MIXED_CONTENT",
    };
  }

  if (kind === "hls") {
    if (videoCanPlayHls === "probably" || videoCanPlayHls === "maybe") {
      return { kind: "native-hls" };
    }
    if (hlsJsSupported) {
      return { kind: "hls.js" };
    }
    return { kind: "unsupported", reason: "UNSUPPORTED_FORMAT" };
  }

  if (kind === "mp4") {
    return { kind: "native-mp4" };
  }

  // Unknown HTTPS sources get one direct native attempt. The browser remains
  // the authority; this does not mark the source as confirmed playable.
  return { kind: "native-direct" };
};

export const strategyLabel: Record<PlaybackStrategyKind, string> = {
  "native-hls": "HLS natif (Safari)",
  "hls.js": "HLS.js",
  "native-mp4": "MP4 natif",
  "native-direct": "Lecture directe",
  unsupported: "Non supporté",
};
