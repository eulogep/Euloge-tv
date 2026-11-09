/**
 * Sending the picture to a TV. Safari has AirPlay built in. Chromium needs Google's
 * Cast SDK, a third-party script: it is only requested when the viewer presses the
 * button, never on page load. Whether the stream then plays depends on it allowing
 * the receiver's cross-origin requests, which MJTV does not control.
 */

export type RemoteKind = "airplay" | "cast";

type AirPlayVideo = HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void };

type CastSession = {
  loadMedia: (request: unknown) => Promise<unknown>;
};

type CastFramework = {
  CastContext: {
    getInstance: () => {
      setOptions: (options: { receiverApplicationId: string; autoJoinPolicy: string }) => void;
      requestSession: () => Promise<unknown>;
      getCurrentSession: () => CastSession | null;
    };
  };
};

type ChromeCast = {
  AutoJoinPolicy: { ORIGIN_SCOPED: string };
  media: {
    DEFAULT_MEDIA_RECEIVER_APP_ID: string;
    StreamType: { LIVE: string };
    MediaInfo: new (url: string, type: string) => { streamType?: string; metadata?: unknown };
    GenericMediaMetadata: new () => { title?: string };
    LoadRequest: new (info: unknown) => unknown;
  };
};

type CastWindow = Window & {
  __onGCastApiAvailable?: (available: boolean) => void;
  cast?: { framework?: CastFramework };
  chrome?: { cast?: ChromeCast };
};

const CAST_SDK_URL = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
const SDK_TIMEOUT_MS = 8_000;

export const detectRemoteKind = (
  video: HTMLVideoElement,
  browser: "safari" | "chromium" | "unknown",
): RemoteKind | null => {
  if (typeof (video as AirPlayVideo).webkitShowPlaybackTargetPicker === "function") {
    return "airplay";
  }
  return browser === "chromium" ? "cast" : null;
};

export const showAirPlayPicker = (video: HTMLVideoElement): void => {
  (video as AirPlayVideo).webkitShowPlaybackTargetPicker?.();
};

let sdk: Promise<void> | null = null;

const loadCastSdk = (): Promise<void> => {
  sdk ??= new Promise<void>((resolve, reject) => {
    const target = window as CastWindow;
    const timer = setTimeout(() => reject(new Error("cast_sdk_timeout")), SDK_TIMEOUT_MS);
    target.__onGCastApiAvailable = (available) => {
      clearTimeout(timer);
      if (available) resolve();
      else reject(new Error("cast_unavailable"));
    };
    const script = document.createElement("script");
    script.src = CAST_SDK_URL;
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error("cast_sdk_blocked"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    sdk = null;
    throw error;
  });
  return sdk;
};

export type CastOutcome = "casting" | "cancelled" | "unavailable" | "refused";

export const castStream = async (input: {
  url: string;
  title: string;
  kind: "hls" | "mp4" | "unknown";
}): Promise<CastOutcome> => {
  try {
    await loadCastSdk();
  } catch {
    return "unavailable";
  }
  const target = window as CastWindow;
  const framework = target.cast?.framework;
  const chromeCast = target.chrome?.cast;
  if (!framework || !chromeCast) return "unavailable";

  const context = framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: chromeCast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
  });
  try {
    await context.requestSession();
  } catch (error) {
    return String(error).includes("cancel") ? "cancelled" : "unavailable";
  }
  const session = context.getCurrentSession();
  if (!session) return "unavailable";

  const media = new chromeCast.media.MediaInfo(
    input.url,
    input.kind === "mp4" ? "video/mp4" : "application/x-mpegurl",
  );
  media.streamType = chromeCast.media.StreamType.LIVE;
  const metadata = new chromeCast.media.GenericMediaMetadata();
  metadata.title = input.title;
  media.metadata = metadata;
  try {
    await session.loadMedia(new chromeCast.media.LoadRequest(media));
    return "casting";
  } catch {
    return "refused";
  }
};

/** Test-only. */
export const __resetCastSdk = (): void => {
  sdk = null;
};
