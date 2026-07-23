import type {
  ChannelHealth,
  ChannelHealthStatus,
  ChannelSummary,
  NormalizedChannel,
  NormalizedStream,
  PublicChannelDetail,
  PublicChannelHealth,
  SourceCatalogHealth,
} from "../domain/types";

const FAILURE_STATUSES = new Set<SourceCatalogHealth["status"]>([
  "temporarily_unavailable",
  "unsupported_format",
  "invalid_url",
  "network_error",
  "forbidden_or_restricted",
  "dead",
]);

const DEFINITIVE_FAILURES = new Set<SourceCatalogHealth["status"]>([
  "unsupported_format",
  "invalid_url",
  "dead",
]);

const messages: Record<ChannelHealthStatus, string> = {
  healthy: "Au moins une source a été confirmée comme disponible.",
  degraded: "Une source reste utilisable, mais la disponibilité est limitée.",
  unverified: "Cette chaîne n’a pas encore été confirmée comme disponible.",
  temporarily_unavailable: "Cette chaîne a déjà fonctionné mais échoue actuellement.",
  unavailable: "Toutes les sources connues sont indisponibles ou invalides.",
  no_source: "Aucune source n’est actuellement référencée pour cette chaîne.",
  blocked_or_restricted: "L’accès aux sources est refusé ou restreint sans cause certaine.",
  archived: "Cette chaîne a été retirée manuellement du catalogue actif.",
};

export const activeStreams = (streams: readonly NormalizedStream[]): NormalizedStream[] =>
  streams.filter((stream) => !stream.disabled);

export const createUnverifiedSourceHealth = (
  stream: Pick<NormalizedStream, "sourceOrigin" | "manuallyApproved" | "disabled" | "priority">,
): SourceCatalogHealth => ({
  status: "unknown",
  checkedAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  responseStatus: null,
  contentType: null,
  manifestValid: null,
  playbackStrategy: null,
  compatibility: "unknown",
  failureReason: null,
  sourceOrigin: stream.sourceOrigin ?? "iptv-org",
  manuallyApproved: stream.manuallyApproved ?? false,
  disabled: stream.disabled ?? false,
  priority: stream.priority ?? 100,
});

const latestDate = (values: Array<string | null>): string | null => {
  const valid = values
    .filter((value): value is string => !!value && Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left));
  return valid[0] ?? null;
};

export type CalculateChannelHealthOptions = {
  archived?: boolean;
  preferredSourceId?: string | null;
  auditOrigin?: ChannelHealth["auditOrigin"];
  manuallyReviewed?: boolean;
  reviewerNote?: string | null;
  nextCheckAt?: string | null;
};

export const calculateChannelHealth = (
  streams: readonly NormalizedStream[],
  options: CalculateChannelHealthOptions = {},
): ChannelHealth => {
  const enabled = activeStreams(streams);
  const observations = enabled.map(
    (stream) => stream.catalogHealth ?? createUnverifiedSourceHealth(stream),
  );
  const playable = observations.filter((source) => source.status === "playable");
  const unknown = observations.filter((source) => source.status === "unknown");
  const failed = observations.filter((source) => FAILURE_STATUSES.has(source.status));
  const restricted = observations.filter((source) => source.status === "forbidden_or_restricted");
  const temporary = observations.filter((source) => source.status === "temporarily_unavailable");

  let status: ChannelHealthStatus;
  let reasonCode: string;
  if (options.archived) {
    status = "archived";
    reasonCode = "manual_archive";
  } else if (enabled.length === 0) {
    status = "no_source";
    reasonCode = "no_enabled_source";
  } else if (playable.length > 0) {
    status = failed.length > 0 || playable.length < enabled.length ? "degraded" : "healthy";
    reasonCode = status === "healthy" ? "recent_playable_source" : "partial_source_failure";
  } else if (restricted.length === enabled.length) {
    status = "blocked_or_restricted";
    reasonCode = "all_sources_restricted";
  } else if (temporary.length > 0 && observations.some((source) => source.lastSuccessAt !== null)) {
    status = "temporarily_unavailable";
    reasonCode = "recent_failure_after_success";
  } else if (
    failed.length === enabled.length &&
    observations.every((source) => DEFINITIVE_FAILURES.has(source.status))
  ) {
    status = "unavailable";
    reasonCode = "all_sources_definitively_failed";
  } else if (failed.length === enabled.length && temporary.length === enabled.length) {
    status = "temporarily_unavailable";
    reasonCode = "all_sources_temporarily_unavailable";
  } else if (unknown.length > 0) {
    status = "unverified";
    reasonCode = "sources_not_verified";
  } else {
    status = "unavailable";
    reasonCode = "all_sources_failed";
  }

  const checkedAt = latestDate(observations.map((source) => source.checkedAt));
  return {
    status,
    checkedAt,
    lastSuccessAt: latestDate(observations.map((source) => source.lastSuccessAt)),
    lastFailureAt: latestDate(observations.map((source) => source.lastFailureAt)),
    consecutiveFailures: failed.length,
    sourceCount: enabled.length,
    playableSourceCount: playable.length,
    unknownSourceCount: unknown.length,
    failedSourceCount: failed.length,
    preferredSourceId: options.preferredSourceId ?? null,
    reasonCode,
    reasonMessage: messages[status],
    auditOrigin: options.auditOrigin ?? "upstream",
    manuallyReviewed: options.manuallyReviewed ?? false,
    reviewerNote: options.reviewerNote ?? null,
    nextCheckAt: options.nextCheckAt ?? null,
  };
};

export const toPublicChannelHealth = (health: ChannelHealth): PublicChannelHealth => ({
  status: health.status,
  checkedAt: health.checkedAt,
  sourceCount: health.sourceCount,
  playableSourceCount: health.playableSourceCount,
  reasonCode: health.reasonCode,
  reasonMessage: health.reasonMessage,
});

export const toPublicChannelDetail = (channel: NormalizedChannel): PublicChannelDetail => {
  const health = channel.health ?? calculateChannelHealth(channel.streams);
  const streams = channel.streams.map(({ catalogHealth: _catalogHealth, ...stream }) => {
    void _catalogHealth;
    return stream;
  });
  return { ...channel, streams, health: toPublicChannelHealth(health) };
};

type HealthAwareSummary = Pick<ChannelSummary, "health" | "streamCount"> &
  Partial<Pick<ChannelSummary, "bestAvailability">>;

export const healthStatusOf = (channel: HealthAwareSummary): ChannelHealthStatus => {
  if (channel.health) return channel.health.status;
  if (channel.streamCount <= 0) return "no_source";
  switch (channel.bestAvailability) {
    case "playable":
      return "healthy";
    case "temporarily_unavailable":
    case "timeout":
    case "network_error":
      return "temporarily_unavailable";
    case "forbidden_or_restricted":
      return "blocked_or_restricted";
    case "unsupported_format":
    case "invalid_url":
      return "unavailable";
    default:
      return "unverified";
  }
};

export const isCatalogActive = (channel: HealthAwareSummary): boolean =>
  healthStatusOf(channel) !== "archived";

export const isHeroEligible = (channel: HealthAwareSummary): boolean =>
  channel.streamCount > 0 &&
  ["healthy", "degraded", "unverified"].includes(healthStatusOf(channel));

export const isRecommendationEligible = (channel: HealthAwareSummary): boolean =>
  ["healthy", "degraded", "unverified"].includes(healthStatusOf(channel));

export const healthRecommendationScore = (channel: HealthAwareSummary): number => {
  const score: Record<ChannelHealthStatus, number> = {
    healthy: 60,
    degraded: 35,
    unverified: 5,
    temporarily_unavailable: -35,
    blocked_or_restricted: -45,
    unavailable: -70,
    no_source: -80,
    archived: -1000,
  };
  return score[healthStatusOf(channel)];
};

export const channelHealthLabel = (status: ChannelHealthStatus): string => {
  const labels: Record<ChannelHealthStatus, string> = {
    healthy: "Direct confirmé",
    degraded: "Disponibilité limitée",
    unverified: "À vérifier",
    temporarily_unavailable: "Temporairement indisponible",
    unavailable: "Source indisponible",
    no_source: "Aucune source disponible",
    blocked_or_restricted: "Accès limité ou indisponible",
    archived: "Archivée",
  };
  return labels[status];
};
