import type {
  NormalizedStream,
  SourceAvailability,
  SourceAvailabilityStatus,
  SourceCompatibilityStatus,
} from "@/features/catalog/domain/types";
import type { PlaybackErrorCode } from "../domain/types";

export type BrowserFamily = "safari" | "chromium" | "unknown";
export type SourceObservationMap = Record<string, SourceAvailability>;

export const detectBrowserFamily = (userAgent?: string): BrowserFamily => {
  const ua = userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  if (/CriOS|Chrome|Chromium|Edg\//i.test(ua)) return "chromium";
  if (/Safari/i.test(ua) && !/Android/i.test(ua)) return "safari";
  return "unknown";
};

export const mergeSourceAvailability = (
  stream: NormalizedStream,
  observations: SourceObservationMap,
): SourceAvailability => observations[stream.id] ?? stream.availability;

const compatibilityFor = (
  availability: SourceAvailability,
  browser: BrowserFamily,
): SourceCompatibilityStatus => availability.compatibility[browser];

const isRecentlyPlayable = (availability: SourceAvailability, now: number): boolean => {
  if (availability.status !== "playable" || !availability.lastCheckedAt) return false;
  const checkedAt = Date.parse(availability.lastCheckedAt);
  return Number.isFinite(checkedAt) && now - checkedAt <= 30 * 24 * 60 * 60 * 1000;
};

const LAST_RESORT_STATUSES = new Set<SourceAvailabilityStatus>([
  "temporarily_unavailable",
  "unsupported_format",
  "forbidden_or_restricted",
  "invalid_url",
]);

export const sourceRank = (
  stream: NormalizedStream,
  browser: BrowserFamily,
  observations: SourceObservationMap = {},
  now = Date.now(),
): number => {
  const availability = mergeSourceAvailability(stream, observations);
  const compatibility = compatibilityFor(availability, browser);
  if (compatibility === "compatible") return 0;
  if (stream.protocol === "https" && stream.kind === "hls") return 10;
  if (isRecentlyPlayable(availability, now)) return 20;
  if (availability.status === "unknown" || availability.status === "checking") return 30;
  if (compatibility === "incompatible" || LAST_RESORT_STATUSES.has(availability.status)) return 90;
  return 40;
};

export const rankSources = (
  streams: readonly NormalizedStream[],
  browser: BrowserFamily,
  observations: SourceObservationMap = {},
  now = Date.now(),
): NormalizedStream[] =>
  streams
    .map((stream, index) => ({
      stream,
      index,
      score: sourceRank(stream, browser, observations, now),
    }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ stream }) => stream);

export const buildSourceAttemptPlan = (
  streams: readonly NormalizedStream[],
  browser: BrowserFamily,
  observations: SourceObservationMap = {},
): NormalizedStream[] => {
  const unique = new Map<string, NormalizedStream>();
  for (const stream of rankSources(streams, browser, observations)) {
    if (!unique.has(stream.id)) unique.set(stream.id, stream);
  }

  const ranked = [...unique.values()];
  const relevant = ranked.filter((stream) => sourceRank(stream, browser, observations) < 90);
  return relevant.length > 0 ? relevant : ranked;
};

export const nextUnattemptedSourceIndex = (
  sources: readonly NormalizedStream[],
  attemptedSourceIds: ReadonlySet<string>,
): number | null => {
  const index = sources.findIndex((source) => !attemptedSourceIds.has(source.id));
  return index >= 0 ? index : null;
};

export const availabilityStatusFromError = (code: PlaybackErrorCode): SourceAvailabilityStatus => {
  switch (code) {
    case "UNSUPPORTED_FORMAT":
    case "MIXED_CONTENT":
    case "CUSTOM_HEADERS_REQUIRED":
      return "unsupported_format";
    case "TIMEOUT":
      return "timeout";
    case "FORBIDDEN_OR_RESTRICTED":
      return "forbidden_or_restricted";
    case "NETWORK":
    case "MANIFEST":
    case "CORS":
      return "network_error";
    case "SOURCE_UNAVAILABLE":
      return "temporarily_unavailable";
    default:
      return "network_error";
  }
};
