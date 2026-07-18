export type PlaybackState =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "switching-source"
  | "error"
  | "ended";

export type PlaybackErrorCode =
  | "NETWORK"
  | "MANIFEST"
  | "MEDIA"
  | "CORS"
  | "MIXED_CONTENT"
  | "UNSUPPORTED_FORMAT"
  | "CUSTOM_HEADERS_REQUIRED"
  | "GEO_RESTRICTED"
  | "SOURCE_UNAVAILABLE"
  | "TIMEOUT"
  | "UNKNOWN";

export type PlaybackStrategyKind = "native-hls" | "hls.js" | "native-mp4" | "unsupported";

export type PlaybackStrategy = {
  kind: PlaybackStrategyKind;
  reason?: string;
};

export type PlaybackEvent =
  | { type: "LOAD" }
  | { type: "READY" }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "BUFFERING" }
  | { type: "SWITCH_SOURCE" }
  | { type: "ENDED" }
  | { type: "ERROR"; code: PlaybackErrorCode; fatal: boolean }
  | { type: "RECOVERED" }
  | { type: "RESET" };

/** Diagnostic snapshot exposed in the dev-only diagnostic panel. */
export type PlaybackDiagnostic = {
  state: PlaybackState;
  strategy: PlaybackStrategyKind | null;
  streamKind: "hls" | "mp4" | "unknown" | null;
  currentSourceIndex: number;
  attemptedSources: number;
  lastErrorCode: PlaybackErrorCode | null;
  recentEvents: string[];
};
