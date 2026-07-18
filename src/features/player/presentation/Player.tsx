"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Pause,
  Play,
  Subtitles,
  Volume2,
  VolumeX,
  Maximize,
  PictureInPicture2,
  Radio,
} from "lucide-react";
import type { NormalizedChannel, NormalizedStream } from "@/features/catalog/domain/types";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { fromNativeMediaError } from "../domain/errors";
import type { PlaybackErrorCode, PlaybackState, PlaybackStrategyKind } from "../domain/types";
import { chooseStrategy } from "../application/playback-strategy";
import { createHlsAdapter, type HlsAdapter } from "../infrastructure/hls-adapter";
import { PlayerErrorOverlay } from "./PlayerErrorOverlay";
import { SubtitleMenu } from "@/features/subtitles/presentation/SubtitleMenu";
import { LocalWebVttProvider } from "@/features/subtitles/infrastructure/local-webvtt-provider";
import { storage } from "@/lib/storage/local";

type SourceMemory = Record<string, number>;

const SOURCE_MEMORY_KEY = "mjtv:source-memory:v1";

type PlayerProps = {
  channel: NormalizedChannel;
  /** Notified when a stream starts playing — used for history. */
  onPlaying?: (_channelId: string, _sourceId: string | null) => void;
  /** Notified on fatal error after all sources exhausted. */
  onAllSourcesFailed?: () => void;
};

const isPlayable = (s: NormalizedStream) =>
  s.protocol === "https" && (s.kind === "hls" || s.kind === "mp4");

export function Player({ channel, onPlaying, onAllSourcesFailed }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsAdapterRef = useRef<HlsAdapter | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const attemptCountRef = useRef<number>(0);
  const notifiedRef = useRef<boolean>(false);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const channelIdRef = useRef(channel.id);
  channelIdRef.current = channel.id;
  const currentSourceIdRef = useRef<string | null>(null);

  const [state, setState] = useState<PlaybackState>("idle");
  const [strategy, setStrategy] = useState<PlaybackStrategyKind | null>(null);
  const [sourceIndex, setSourceIndex] = useState<number>(0);
  const [errorCode, setErrorCode] = useState<PlaybackErrorCode | null>(null);
  const [levels, setLevels] = useState<{ height: number | null; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);
  const [subtitleOpen, setSubtitleOpen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [diagnosticOpen, setDiagnosticOpen] = useState<boolean>(false);
  const [recentEvents, setRecentEvents] = useState<string[]>([]);

  const logEvent = useCallback((msg: string) => {
    const ts = new Date().toISOString().slice(11, 19);
    setRecentEvents((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 8));
  }, []);

  // Pick the best playable sources first.
  const sources = useMemo(() => {
    const playable = channel.streams.filter(isPlayable);
    const limited = channel.streams.filter((s) => s.protocol === "http" && s.kind !== "unknown");
    return playable.length > 0 ? playable : limited;
  }, [channel]);

  // Restore last working source for this channel.
  const initialIndex = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const mem = storage.get<SourceMemory>(SOURCE_MEMORY_KEY, {});
    const idx = mem[channel.id];
    return typeof idx === "number" && idx >= 0 && idx < sources.length ? idx : 0;
  }, [channel.id, sources.length]);

  useEffect(() => {
    setSourceIndex(initialIndex);
  }, [initialIndex]);

  const currentSource = sources[sourceIndex] ?? null;
  currentSourceIdRef.current = currentSource?.id ?? null;

  // Cleanup the current source: destroy hls.js, revoke blob URLs, clear <video>.
  const cleanup = useCallback(() => {
    if (hlsAdapterRef.current) {
      hlsAdapterRef.current.destroy();
      hlsAdapterRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      try {
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
    }
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current.clear();
    notifiedRef.current = false;
  }, []);

  const loadSource = useCallback(
    (stream: NormalizedStream, index: number) => {
      const video = videoRef.current;
      if (!video) return;

      cleanup();
      setState("loading");
      setErrorCode(null);
      setStrategy(null);
      setLevels([]);
      setCurrentLevel(-1);
      logEvent(`Source ${index + 1}/${sources.length}: ${stream.kind} ${stream.protocol}`);

      const canHls: "" | "maybe" | "probably" = video.canPlayType("application/vnd.apple.mpegurl");
      // hls.js support is checked lazily inside the dynamic import branch.
      // On Safari/iOS `canPlayType` returns "maybe"/"probably" so we use
      // native HLS and never import hls.js.
      const hlsJsSupported = canHls === "";

      const strat = chooseStrategy({
        stream,
        videoCanPlayHls: canHls,
        hlsJsSupported,
      });
      setStrategy(strat.kind);
      logEvent(`Stratégie: ${strat.kind}`);

      if (strat.kind === "unsupported") {
        setErrorCode((strat.reason as PlaybackErrorCode) ?? "UNSUPPORTED_FORMAT");
        setState("error");
        return;
      }

      if (strat.kind === "native-hls" || strat.kind === "native-mp4") {
        video.src = stream.url;
        video.load();
        return;
      }

      if (strat.kind === "hls.js") {
        // Dynamic import to keep hls.js out of the SSR bundle.
        import("hls.js")
          .then(({ default: Hls }) => {
            if (Hls.isSupported()) {
              const adapter = createHlsAdapter({
                video,
                stream,
                callbacks: {
                  onManifestParsed: () => {
                    setState("ready");
                    logEvent("Manifeste chargé");
                  },
                  onLevelSwitched: (lvls) => setLevels(lvls),
                  onFatalError: (code) => {
                    setErrorCode(code);
                    logEvent(`Erreur fatale ${code}`);
                    setState("error");
                    hlsAdapterRef.current?.destroy();
                    hlsAdapterRef.current = null;
                  },
                  onRecovered: (kind) => {
                    logEvent(`Récupération ${kind}`);
                  },
                },
              });
              hlsAdapterRef.current = adapter;
              void adapter.start();
              // Track playing state via the <video> element events.
            } else {
              setErrorCode("UNSUPPORTED_FORMAT");
              setState("error");
            }
          })
          .catch((err) => {
            logger.error("hls.js dynamic import failed", {
              message: err instanceof Error ? err.message : String(err),
            });
            setErrorCode("UNKNOWN");
            setState("error");
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadSource is stable by design; adding cleanup/currentSource/loadSource would cause infinite loops
    [channel.id, logEvent, sources.length],
  );

  // Load the current source on mount and when sourceIndex changes.
  useEffect(() => {
    if (!currentSource) {
      setErrorCode("SOURCE_UNAVAILABLE");
      setState("error");
      return;
    }
    loadSource(currentSource, sourceIndex);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depends only on URL/index changes to avoid re-triggering on cleanup/loadSource identity changes
  }, [currentSource?.url, sourceIndex]);

  // Wire <video> events.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setState("ready");
      setDuration(video.duration || 0);
    };
    const onPlay = () => {
      setState("playing");
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        onPlayingRef.current?.(channelIdRef.current, currentSourceIdRef.current);
      }
    };
    const onPause = () => setState((s) => (s === "ended" ? s : "paused"));
    const onWaiting = () => setState("buffering");
    const onTime = () => setCurrent(video.currentTime);
    const onEnded = () => setState("ended");
    const onErr = () => {
      const code = fromNativeMediaError(video.error?.code, video.error?.message);
      setErrorCode(code);
      setState("error");
      logEvent(`Erreur native ${code}`);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onErr);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onErr);
    };
  }, [logEvent]);

  // Cleanup on unmount.
  useEffect(() => cleanup, [cleanup]);

  const tryNextSource = useCallback(() => {
    if (attemptCountRef.current >= APP_CONFIG.maxSourceAttempts - 1) {
      setErrorCode("SOURCE_UNAVAILABLE");
      setState("error");
      onAllSourcesFailed?.();
      return;
    }
    attemptCountRef.current += 1;
    const next = sourceIndex + 1;
    if (next < sources.length) {
      setSourceIndex(next);
      logEvent(`Bascule vers la source ${next + 1}`);
    } else {
      // Wrap back to 0 to allow retrying from the start.
      setSourceIndex(0);
      logEvent("Reprise depuis la source 1");
    }
  }, [onAllSourcesFailed, logEvent, sourceIndex, sources.length]);

  // Persist a successful source index.
  useEffect(() => {
    if (state !== "playing") return;
    const mem = storage.get<SourceMemory>(SOURCE_MEMORY_KEY, {});
    if (mem[channel.id] !== sourceIndex) {
      mem[channel.id] = sourceIndex;
      storage.set(SOURCE_MEMORY_KEY, mem);
    }
  }, [state, channel.id, sourceIndex]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const onVolumeChange = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    setVolume(value);
    if (value === 0) {
      video.muted = true;
      setMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setMuted(false);
    }
  }, []);

  const onQualityChange = useCallback((index: number) => {
    hlsAdapterRef.current?.setCurrentLevel(index);
    setCurrentLevel(index);
  }, []);

  const requestFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) void video.requestFullscreen();
  }, []);

  const requestPiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    type PiPDocument = Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    type PiPVideo = HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<void>;
    };
    const doc = document as PiPDocument;
    const v = video as PiPVideo;
    if (!v.requestPictureInPicture) return;
    try {
      if (doc.pictureInPictureElement) {
        await doc.exitPictureInPicture?.();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {
      // ignore
    }
  }, []);

  const addLocalSubtitle = useCallback(
    async (file: File) => {
      const video = videoRef.current;
      if (!video) return;
      const url = await LocalWebVttProvider.createTrack(file);
      blobUrlsRef.current.add(url);
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = file.name;
      track.srclang = "fr";
      track.src = url;
      track.default = true;
      video.appendChild(track);
      const tt = video.textTracks[video.textTracks.length - 1];
      if (tt) tt.mode = "showing";
      logEvent(`Sous-titre local: ${file.name}`);
    },
    [logEvent],
  );

  const buffering = state === "buffering" || state === "loading";
  const isPlaying = state === "playing";
  const hasError = state === "error";
  const isLive = !duration || !isFinite(duration) || currentSource?.kind === "hls";

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        playsInline
        controls={false}
        preload="metadata"
        crossOrigin="anonymous"
        className="h-full w-full bg-black"
        aria-label={`Lecteur ${channel.name}`}
      />

      {/* Live badge */}
      {isLive && isPlaying && (
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2 py-0.5 text-xs font-semibold text-white">
          <Radio className="h-3 w-3" aria-hidden />
          EN DIRECT
        </div>
      )}

      {/* Buffering spinner */}
      {buffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" aria-hidden />
        </div>
      )}

      {/* Error overlay */}
      {hasError && errorCode && (
        <PlayerErrorOverlay
          code={errorCode}
          sourceIndex={sourceIndex}
          sourceCount={sources.length}
          onTryNext={tryNextSource}
        />
      )}

      {/* Custom controls */}
      {!hasError && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3 transition-opacity",
            showControls || !isPlaying ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Progress / scrubber for non-live */}
          {!isLive && (
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = v;
                setCurrent(v);
              }}
              className="w-full accent-[var(--accent)]"
              aria-label="Position"
            />
          )}
          <div className="flex items-center gap-2 text-white">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={muted ? "Activer le son" : "Couper le son"}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="h-1 w-20 accent-[var(--accent)]"
              aria-label="Volume"
            />
            <span className="ml-1 text-xs text-white/70 tabular-nums">
              {formatTime(current)} / {isLive ? "DIRECT" : formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {levels.length > 1 && (
                <label className="hidden items-center gap-1 text-xs text-white/80 sm:flex">
                  <span>Qualité</span>
                  <select
                    value={currentLevel}
                    onChange={(e) => onQualityChange(Number(e.target.value))}
                    className="rounded bg-white/10 px-1 py-0.5 text-xs text-white"
                  >
                    <option value={-1} className="bg-black">
                      Auto
                    </option>
                    {levels.map((l) => (
                      <option key={l.index} value={l.index} className="bg-black">
                        {l.height ? `${l.height}p` : `#${l.index}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => setSubtitleOpen((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Sous-titres"
              >
                <Subtitles className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={requestPiP}
                className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={requestFullscreen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Plein écran"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitle menu */}
      {subtitleOpen && (
        <SubtitleMenu
          videoRef={videoRef}
          onImportVtt={addLocalSubtitle}
          onClose={() => setSubtitleOpen(false)}
        />
      )}

      {/* Dev diagnostic panel */}
      {APP_CONFIG.enableDebug && (
        <div className="absolute top-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setDiagnosticOpen((v) => !v)}
            className="rounded bg-black/60 px-2 py-1 text-xs text-white"
            aria-label="Diagnostic"
          >
            <AlertCircle className="h-4 w-4" />
          </button>
          {diagnosticOpen && (
            <div className="mt-2 w-64 rounded bg-black/80 p-3 text-xs text-white/90">
              <div>État: {state}</div>
              <div>Stratégie: {strategy ?? "—"}</div>
              <div>
                Source: {sourceIndex + 1}/{sources.length}
              </div>
              <div>
                Essais: {attemptCountRef.current + 1}/{APP_CONFIG.maxSourceAttempts}
              </div>
              <div>Dernière erreur: {errorCode ?? "—"}</div>
              <div className="mt-2 font-semibold">Événements récents</div>
              <ul className="max-h-40 overflow-y-auto">
                {recentEvents.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Source badge */}
      {sources.length > 1 && (
        <div className="absolute top-3 right-3 z-20 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white/80">
          Source {sourceIndex + 1}/{sources.length}
        </div>
      )}
    </div>
  );
}

const formatTime = (s: number): string => {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};
