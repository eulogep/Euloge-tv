"use client";

import { useEffect, useState, type RefObject } from "react";
import Hls from "hls.js";
import type { PublicChannelDetail, NormalizedStream } from "@/features/catalog/domain/types";
import { resolveOfficialPlaybackStream } from "@/features/catalog/infrastructure/rts-live";
import { ECONOMY_QUALITY } from "@/features/player/application/economy-quality";
import { chooseStrategy } from "@/features/player/application/playback-strategy";
import {
  buildSourceAttemptPlan,
  detectBrowserFamily,
} from "@/features/player/application/source-selection";
import { createHlsAdapter, type HlsAdapter } from "@/features/player/infrastructure/hls-adapter";

export type PreviewState = "off" | "loading" | "playing" | "failed";

/** Long enough that flicking through channels never touches the network. */
const DWELL_MS = 650;
const SOURCE_TIMEOUT_MS = 8_000;
const MAX_SOURCES = 2;

/**
 * Muted, lowest-quality live picture for the tuned channel, only once the viewer
 * has switched the screen on and has stopped on a channel. One source attempt at
 * a time, and everything is torn down before the next channel gets a chance.
 */
export const useScreenPreview = (
  videoRef: RefObject<HTMLVideoElement | null>,
  channelId: string | null,
  enabled: boolean,
): PreviewState => {
  const [state, setState] = useState<PreviewState>("off");

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !channelId || !video) {
      setState("off");
      return;
    }

    setState("loading");
    const controller = new AbortController();
    let adapter: HlsAdapter | null = null;
    let cancelAttempt: (() => void) | null = null;

    const releaseVideo = () => {
      cancelAttempt?.();
      cancelAttempt = null;
      adapter?.destroy();
      adapter = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const attempt = (stream: NormalizedStream): Promise<boolean> =>
      new Promise((resolve) => {
        const finish = (playing: boolean) => {
          clearTimeout(timeout);
          video.removeEventListener("playing", onPlaying);
          video.removeEventListener("error", onError);
          cancelAttempt = null;
          resolve(playing);
        };
        const onPlaying = () => finish(true);
        const onError = () => finish(false);
        const timeout = setTimeout(() => finish(false), SOURCE_TIMEOUT_MS);
        cancelAttempt = () => finish(false);
        video.addEventListener("playing", onPlaying);
        video.addEventListener("error", onError);

        const canHls = video.canPlayType("application/vnd.apple.mpegurl");
        const preferNativeHls = detectBrowserFamily() !== "chromium";
        const strategy = chooseStrategy({
          stream,
          videoCanPlayHls: canHls,
          hlsJsSupported: Hls.isSupported(),
          preferNativeHls,
        });
        if (strategy.kind === "unsupported") {
          finish(false);
        } else if (strategy.kind === "hls.js") {
          adapter = createHlsAdapter({
            video,
            stream,
            initialQuality: ECONOMY_QUALITY,
            callbacks: {
              onManifestParsed: () => void video.play().catch(() => finish(false)),
              onLevelSwitched: () => {},
              onRecovered: () => {},
              onFatalError: () => finish(false),
            },
          });
          void adapter.start();
        } else {
          video.src = stream.url;
          void video.play().catch(() => finish(false));
        }
      });

    const dwell = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/channels/${encodeURIComponent(channelId)}`, {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("channel");
          const detail = (await response.json()) as PublicChannelDetail;
          const plan = buildSourceAttemptPlan(
            detail.streams as NormalizedStream[],
            detectBrowserFamily(),
          ).slice(0, MAX_SOURCES);
          for (const source of plan) {
            if (controller.signal.aborted) return;
            const stream = await resolveOfficialPlaybackStream(source, channelId).catch(() => null);
            if (!stream || controller.signal.aborted) continue;
            if (await attempt(stream)) {
              if (!controller.signal.aborted) setState("playing");
              return;
            }
            if (controller.signal.aborted) return;
            adapter?.destroy();
            adapter = null;
          }
          if (!controller.signal.aborted) setState("failed");
        } catch {
          if (!controller.signal.aborted) setState("failed");
        }
      })();
    }, DWELL_MS);

    return () => {
      clearTimeout(dwell);
      controller.abort();
      releaseVideo();
    };
  }, [channelId, enabled, videoRef]);

  return state;
};
