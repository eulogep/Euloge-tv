"use client";

import Hls from "hls.js";
import type { NormalizedStream } from "@/features/catalog/domain/types";
import { logger } from "@/lib/utils/logger";
import { fromHlsErrorDetail } from "../domain/errors";
import type { PlaybackErrorCode } from "../domain/types";

export type HlsAdapterCallbacks = {
  onManifestParsed: () => void;
  onLevelSwitched: (
    levels: { height: number | null; bitrate: number | null; index: number }[],
  ) => void;
  onFatalError: (code: PlaybackErrorCode) => void;
  onRecovered: (kind: "network" | "media") => void;
};

export type HlsAdapter = {
  start: () => Promise<void>;
  destroy: () => void;
  /** Set the current level by hls.js index (-1 = auto). */
  setCurrentLevel: (index: number) => void;
  /** Whether the underlying instance is still alive. */
  isAlive: () => boolean;
};

export type CreateHlsAdapterInput = {
  video: HTMLVideoElement;
  stream: NormalizedStream;
  callbacks: HlsAdapterCallbacks;
};

/**
 * Factory that wraps an hls.js instance with strict cleanup, single-retry
 * recovery, and error mapping. The Player component owns the returned
 * adapter and must call `destroy()` on every source change / unmount.
 */
export const createHlsAdapter = (input: CreateHlsAdapterInput): HlsAdapter => {
  const { video, stream, callbacks } = input;
  let hls: Hls | null = null;
  let alive = false;
  let recovered = false;

  const start = async (): Promise<void> => {
    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      manifestLoadingMaxRetry: 2,
      levelLoadingMaxRetry: 2,
      fragLoadingMaxRetry: 2,
    });
    alive = true;

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      callbacks.onManifestParsed();
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      if (!hls) return;
      callbacks.onLevelSwitched(
        hls.levels.map((lvl, index) => ({
          height: lvl.height ?? null,
          bitrate: lvl.bitrate ?? null,
          index,
        })),
      );
      void data;
    });

    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!alive || !hls) return;
      const code = fromHlsErrorDetail(data.type ?? "", data.details ?? "", data.fatal);
      logger.warn("hls.js error", {
        details: data.details,
        type: data.type,
        fatal: data.fatal,
        code,
      });
      if (data.fatal) {
        // Use string literals (rather than Hls.ErrorTypes.*) so the adapter
        // is robust to hls.js API surface changes and to test mocks.
        const type = String(data.type ?? "");
        if (type === "networkError") {
          if (!recovered) {
            recovered = true;
            hls.startLoad();
            callbacks.onRecovered("network");
          } else {
            callbacks.onFatalError(code);
          }
        } else if (type === "mediaError") {
          if (!recovered) {
            recovered = true;
            hls.recoverMediaError();
            callbacks.onRecovered("media");
          } else {
            callbacks.onFatalError(code);
          }
        } else {
          callbacks.onFatalError(code);
        }
      }
    });

    hls.loadSource(stream.url);
    hls.attachMedia(video);
  };

  const destroy = (): void => {
    if (!alive || !hls) {
      // Allow idempotent destroy even if start failed.
      alive = false;
      return;
    }
    alive = false;
    const instance = hls;
    hls = null;
    try {
      // hls.js's destroy() handles listener cleanup internally — we don't
      // need to call off() explicitly, and doing so would couple us to the
      // exact event names.
      instance.destroy();
    } catch (err) {
      logger.warn("hls.js destroy failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const setCurrentLevel = (index: number): void => {
    if (alive && hls) hls.currentLevel = index;
  };

  const isAlive = (): boolean => alive;

  return { start, destroy, setCurrentLevel, isAlive };
};

/** Legacy named export for the Player component. */
export const attachHls = (
  video: HTMLVideoElement,
  stream: NormalizedStream,
  callbacks: HlsAdapterCallbacks,
): HlsAdapter => {
  const adapter = createHlsAdapter({ video, stream, callbacks });
  void adapter.start();
  return adapter;
};
