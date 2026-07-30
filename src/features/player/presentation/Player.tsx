"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type {
  PublicChannelDetail,
  NormalizedStream,
  SourceAvailability,
} from "@/features/catalog/domain/types";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";
import { fromNativeMediaError } from "../domain/errors";
import type { PlaybackErrorCode, PlaybackState, PlaybackStrategyKind } from "../domain/types";
import { chooseStrategy } from "../application/playback-strategy";
import {
  availabilityStatusFromError,
  buildSourceAttemptPlan,
  detectBrowserFamily,
  nextUnattemptedSourceIndex,
  type BrowserFamily,
  type SourceObservationMap,
} from "../application/source-selection";
import { isDefinitiveProbeFailure, probeSource } from "../application/source-probe";
import { cleanupPlaybackResources } from "../application/cleanup";
import { createHlsAdapter, type HlsAdapter } from "../infrastructure/hls-adapter";
import { PlayerErrorOverlay } from "./PlayerErrorOverlay";
import { SubtitleMenu } from "@/features/subtitles/presentation/SubtitleMenu";
import { LocalWebVttProvider } from "@/features/subtitles/infrastructure/local-webvtt-provider";
import { storage } from "@/lib/storage/local";

type PlaybackMemory = {
  observations: SourceObservationMap;
};

const SOURCE_MEMORY_KEY = "mjtv:source-memory:v2";

type PlayerProps = {
  channel: PublicChannelDetail;
  preferredSourceId?: string | null;
  /** Notified when a stream starts playing — used for history. */
  onPlaying?: (_channelId: string, _sourceId: string | null) => void;
  /** Notified on fatal error after all sources exhausted. */
  onAllSourcesFailed?: () => void;
  /** Returns to the catalog without assuming a URL-based router. */
  onBack?: () => void;
};

type FailureDetails = {
  reason?: string;
  responseStatus?: number | null;
  detectedContentType?: string | null;
};

const errorCodeFromProbeStatus = (status: SourceAvailability["status"]): PlaybackErrorCode => {
  switch (status) {
    case "timeout":
      return "TIMEOUT";
    case "forbidden_or_restricted":
      return "FORBIDDEN_OR_RESTRICTED";
    case "invalid_url":
      return "UNSUPPORTED_FORMAT";
    case "temporarily_unavailable":
      return "SOURCE_UNAVAILABLE";
    default:
      return "NETWORK";
  }
};

const planSources = (
  channel: PublicChannelDetail,
  browser: BrowserFamily,
  observations: SourceObservationMap = {},
  preferredSourceId?: string | null,
): NormalizedStream[] => {
  const plan = buildSourceAttemptPlan(channel.streams, browser, observations);
  if (!preferredSourceId) return plan;
  return [...plan].sort(
    (left, right) => Number(left.id !== preferredSourceId) - Number(right.id !== preferredSourceId),
  );
};

export function Player({
  channel,
  preferredSourceId,
  onPlaying,
  onAllSourcesFailed,
  onBack,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsAdapterRef = useRef<HlsAdapter | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const attemptedSourceIdsRef = useRef<Set<string>>(new Set());
  const handledFailureIdsRef = useRef<Set<string>>(new Set());
  const loadTokenRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackStartedAtRef = useRef(0);
  const observationsRef = useRef<SourceObservationMap>({});
  const browserRef = useRef<BrowserFamily>("unknown");
  const strategyRef = useRef<PlaybackStrategyKind | null>(null);
  const notifiedRef = useRef<boolean>(false);
  const onPlayingRef = useRef(onPlaying);
  onPlayingRef.current = onPlaying;
  const channelIdRef = useRef(channel.id);
  channelIdRef.current = channel.id;
  const currentSourceIdRef = useRef<string | null>(null);
  const currentSourceRef = useRef<NormalizedStream | null>(null);
  const suppressMediaErrorsRef = useRef(false);

  const [state, setState] = useState<PlaybackState>("idle");
  const [strategy, setStrategy] = useState<PlaybackStrategyKind | null>(null);
  const [sourceIndex, setSourceIndex] = useState<number>(0);
  const [sources, setSources] = useState<NormalizedStream[]>(() =>
    planSources(channel, "unknown", {}, preferredSourceId),
  );
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
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

  // Build a stable attempt plan once per channel from browser-specific history.
  useEffect(() => {
    const browser = detectBrowserFamily();
    const memory = storage.get<PlaybackMemory>(SOURCE_MEMORY_KEY, { observations: {} });
    browserRef.current = browser;
    observationsRef.current = memory.observations;
    setSources(planSources(channel, browser, memory.observations, preferredSourceId));
    attemptedSourceIdsRef.current = new Set();
    handledFailureIdsRef.current = new Set();
    setAttemptedCount(0);
    setFallbackActive(false);
    setSourceIndex(0);
    setReloadNonce((value) => value + 1);
  }, [channel, preferredSourceId]);

  const currentSource = sources[sourceIndex] ?? null;
  currentSourceIdRef.current = currentSource?.id ?? null;
  currentSourceRef.current = currentSource;

  // Cleanup the current source: destroy hls.js, revoke blob URLs, clear <video>.
  const cleanup = useCallback(() => {
    try {
      suppressMediaErrorsRef.current = true;
      cleanupPlaybackResources({
        video: videoRef.current,
        adapter: hlsAdapterRef.current,
        blobUrls: blobUrlsRef.current,
      });
      queueMicrotask(() => {
        suppressMediaErrorsRef.current = false;
      });
    } catch {
      suppressMediaErrorsRef.current = false;
    }
    hlsAdapterRef.current = null;
    notifiedRef.current = false;
  }, []);

  const updateObservation = useCallback(
    (
      stream: NormalizedStream,
      updates: Partial<Omit<SourceAvailability, "compatibility">>,
      browserCompatibility?: "compatible" | "incompatible",
    ) => {
      const current = observationsRef.current[stream.id] ?? stream.availability;
      const browser = browserRef.current;
      const next: SourceAvailability = {
        ...current,
        ...updates,
        compatibility: {
          ...current.compatibility,
          ...(browserCompatibility ? { [browser]: browserCompatibility } : {}),
        },
      };
      const observations = { ...observationsRef.current, [stream.id]: next };
      observationsRef.current = observations;
      storage.set<PlaybackMemory>(SOURCE_MEMORY_KEY, { observations });
    },
    [],
  );

  const finishFallbackNotice = useCallback(() => {
    if (!fallbackStartedAtRef.current) return;
    const remaining = Math.max(0, 700 - (Date.now() - fallbackStartedAtRef.current));
    if (fallbackNoticeTimerRef.current) clearTimeout(fallbackNoticeTimerRef.current);
    fallbackNoticeTimerRef.current = setTimeout(() => {
      setFallbackActive(false);
      fallbackStartedAtRef.current = 0;
      fallbackNoticeTimerRef.current = null;
    }, remaining);
  }, []);

  const handleSourceFailure = useCallback(
    (stream: NormalizedStream, code: PlaybackErrorCode, details: FailureDetails = {}) => {
      if (handledFailureIdsRef.current.has(stream.id)) return;
      handledFailureIdsRef.current.add(stream.id);
      const status = availabilityStatusFromError(code);
      updateObservation(
        stream,
        {
          status,
          lastCheckedAt: new Date().toISOString(),
          failureReason: details.reason ?? code,
          responseStatus: details.responseStatus ?? null,
          detectedContentType: details.detectedContentType ?? null,
          playbackStrategy: strategyRef.current,
        },
        status === "unsupported_format" ? "incompatible" : undefined,
      );
      cleanup();
      logEvent(`Échec ${stream.title}: ${code}`);

      const next = nextUnattemptedSourceIndex(sources, attemptedSourceIdsRef.current);
      if (next !== null) {
        fallbackStartedAtRef.current = Date.now();
        setFallbackActive(true);
        setState("switching-source");
        setErrorCode(code);
        logEvent(`Bascule automatique vers la source ${next + 1}`);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = setTimeout(() => {
          setSourceIndex(next);
          fallbackTimerRef.current = null;
        }, 350);
        return;
      }

      setErrorCode(code);
      setFallbackActive(false);
      setState("error");
      onAllSourcesFailed?.();
    },
    [cleanup, logEvent, onAllSourcesFailed, sources, updateObservation],
  );

  const loadSource = useCallback(
    async (stream: NormalizedStream, index: number) => {
      const video = videoRef.current;
      if (!video) return;

      const token = ++loadTokenRef.current;
      cleanup();
      setState("loading");
      setErrorCode(null);
      setStrategy(null);
      setLevels([]);
      setCurrentLevel(-1);
      attemptedSourceIdsRef.current.add(stream.id);
      setAttemptedCount(attemptedSourceIdsRef.current.size);
      logEvent(`Source ${index + 1}/${sources.length}: ${stream.kind} ${stream.protocol}`);

      updateObservation(stream, {
        status: "checking",
        lastCheckedAt: new Date().toISOString(),
        failureReason: null,
        responseStatus: null,
        detectedContentType: null,
      });

      const probe = await probeSource(stream);
      if (token !== loadTokenRef.current) return;
      updateObservation(stream, {
        status: probe.status,
        lastCheckedAt: probe.checkedAt,
        failureReason: probe.failureReason,
        responseStatus: probe.responseStatus,
        detectedContentType: probe.detectedContentType,
      });
      if (isDefinitiveProbeFailure(probe.status)) {
        handleSourceFailure(stream, errorCodeFromProbeStatus(probe.status), {
          reason: probe.failureReason ?? probe.status,
          responseStatus: probe.responseStatus,
          detectedContentType: probe.detectedContentType,
        });
        return;
      }

      const canHls: "" | "maybe" | "probably" = video.canPlayType("application/vnd.apple.mpegurl");
      // hls.js support is checked lazily inside the dynamic import branch.
      // On Safari/iOS `canPlayType` returns "maybe"/"probably" so we use
      // native HLS and never import hls.js.
      const hlsJsSupported = canHls === "";

      const strat = chooseStrategy({
        stream,
        videoCanPlayHls: canHls,
        hlsJsSupported,
        detectedContentType: probe.detectedContentType,
      });
      setStrategy(strat.kind);
      strategyRef.current = strat.kind;
      logEvent(`Stratégie: ${strat.kind}`);

      if (strat.kind === "unsupported") {
        handleSourceFailure(stream, (strat.reason as PlaybackErrorCode) ?? "UNSUPPORTED_FORMAT", {
          detectedContentType: probe.detectedContentType,
        });
        return;
      }

      if (
        strat.kind === "native-hls" ||
        strat.kind === "native-mp4" ||
        strat.kind === "native-direct"
      ) {
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
                    finishFallbackNotice();
                    logEvent("Manifeste chargé");
                  },
                  onLevelSwitched: (lvls) => setLevels(lvls),
                  onFatalError: (failure) => {
                    handleSourceFailure(stream, failure.code, {
                      reason: failure.reason,
                      responseStatus: failure.responseStatus,
                      detectedContentType: probe.detectedContentType,
                    });
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
              handleSourceFailure(stream, "UNSUPPORTED_FORMAT", {
                reason: "hls_js_not_supported",
                detectedContentType: probe.detectedContentType,
              });
            }
          })
          .catch((err) => {
            logger.error("hls.js dynamic import failed", {
              message: err instanceof Error ? err.message : String(err),
            });
            handleSourceFailure(stream, "UNKNOWN", {
              reason: "hls_js_import_failed",
              detectedContentType: probe.detectedContentType,
            });
          });
      }
    },
    [
      cleanup,
      finishFallbackNotice,
      handleSourceFailure,
      logEvent,
      sources.length,
      updateObservation,
    ],
  );

  // Load the current source on mount and when sourceIndex changes.
  useEffect(() => {
    if (!currentSource) {
      setErrorCode("SOURCE_UNAVAILABLE");
      setState("error");
      return;
    }
    void loadSource(currentSource, sourceIndex);
    return () => {
      loadTokenRef.current += 1;
      cleanup();
    };
  }, [cleanup, currentSource, loadSource, reloadNonce, sourceIndex]);

  // Wire <video> events.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      setState("ready");
      finishFallbackNotice();
      setDuration(video.duration || 0);
    };
    const onPlay = () => {
      setState("playing");
      finishFallbackNotice();
      const stream = currentSourceRef.current;
      if (stream) {
        updateObservation(
          stream,
          {
            status: "playable",
            lastCheckedAt: new Date().toISOString(),
            failureReason: null,
            playbackStrategy: strategyRef.current,
          },
          "compatible",
        );
      }
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
      if (suppressMediaErrorsRef.current) return;
      const stream = currentSourceRef.current;
      if (!stream) return;
      const code = fromNativeMediaError(video.error?.code, video.error?.message);
      logEvent(`Erreur native ${code}`);
      handleSourceFailure(stream, code, { reason: video.error?.message ?? "native_media_error" });
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
  }, [finishFallbackNotice, handleSourceFailure, logEvent, updateObservation]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (fallbackNoticeTimerRef.current) clearTimeout(fallbackNoticeTimerRef.current);
      cleanup();
    };
  }, [cleanup]);

  const retryAllSources = useCallback(() => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = null;
    if (fallbackNoticeTimerRef.current) clearTimeout(fallbackNoticeTimerRef.current);
    fallbackNoticeTimerRef.current = null;
    fallbackStartedAtRef.current = 0;
    setFallbackActive(false);
    attemptedSourceIdsRef.current = new Set();
    handledFailureIdsRef.current = new Set();
    setAttemptedCount(0);
    setErrorCode(null);
    setState("idle");
    setSourceIndex(0);
    setReloadNonce((value) => value + 1);
  }, []);

  const chooseSource = useCallback(
    (sourceId: string) => {
      const index = sources.findIndex((source) => source.id === sourceId);
      if (index < 0) return;
      attemptedSourceIdsRef.current = new Set();
      handledFailureIdsRef.current = new Set();
      setAttemptedCount(0);
      setFallbackActive(false);
      setErrorCode(null);
      setState("switching-source");
      setSourceIndex(index);
      setReloadNonce((value) => value + 1);
    },
    [sources],
  );

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
  const switchingSource = state === "switching-source" || fallbackActive;
  const isPlaying = state === "playing";
  const hasError = state === "error";
  const isLive = !duration || !isFinite(duration) || currentSource?.kind === "hls";

  return (
    <div
      className="border-border relative aspect-video w-full overflow-hidden rounded-2xl border bg-black shadow-[var(--shadow-card-hover)]"
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
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex min-h-7 items-center gap-1.5 rounded-full border border-[var(--live)]/50 bg-[var(--live)]/90 px-2.5 text-xs font-semibold text-white shadow-lg">
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

      {switchingSource && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[var(--scrim)] p-6 text-center text-white backdrop-blur-sm"
        >
          <Loader2 className="h-9 w-9 animate-spin" aria-hidden />
          <p className="font-semibold">Tentative d’une autre source…</p>
          <p className="text-sm text-white/70">
            {attemptedCount} source{attemptedCount > 1 ? "s" : ""} essayée
            {attemptedCount > 1 ? "s" : ""} sur {sources.length}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {hasError && errorCode && (
        <PlayerErrorOverlay
          code={errorCode}
          attemptedCount={attemptedCount}
          sourceCount={sources.length}
          sources={sources.map((source) => ({ id: source.id, title: source.title }))}
          onRetry={retryAllSources}
          onChooseSource={chooseSource}
          onBack={onBack ?? (() => {})}
        />
      )}

      {/* Custom controls */}
      {!hasError && !switchingSource && (
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              aria-label={isPlaying ? "Mettre en pause" : "Lecture"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
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
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Sous-titres"
              >
                <Subtitles className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={requestPiP}
                className="hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 sm:flex"
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={requestFullscreen}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
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
                Essais: {attemptedCount}/{sources.length}
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
