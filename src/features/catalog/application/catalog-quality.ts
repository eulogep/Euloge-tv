import type { NormalizedChannel, NormalizedStream } from "../domain/types";
import { activeStreams, calculateChannelHealth, healthRecommendationScore } from "./source-health";

const CONFIRMED_UNUSABLE = new Set<NormalizedStream["availability"]["status"]>([
  "temporarily_unavailable",
  "unsupported_format",
  "forbidden_or_restricted",
  "invalid_url",
]);

export const hasPotentiallyViableSource = (channel: NormalizedChannel): boolean =>
  activeStreams(channel.streams).some(
    (stream) => !CONFIRMED_UNUSABLE.has(stream.availability.status),
  );

/** Internal-only catalog score. It is used for ordering and is never serialized. */
export const catalogQualityScore = (channel: NormalizedChannel, now = Date.now()): number => {
  const streams = activeStreams(channel.streams);
  let score = 0;
  if (streams.length > 0) score += 25;
  if (streams.some((stream) => stream.protocol === "https")) score += 15;
  if (streams.some((stream) => stream.protocol === "https" && stream.kind === "hls")) {
    score += 15;
  }
  score += Math.min(streams.length, 4) * 2;

  const recentSuccess = streams.some((stream) => {
    if (stream.availability.status !== "playable" || !stream.availability.lastCheckedAt)
      return false;
    const checkedAt = Date.parse(stream.availability.lastCheckedAt);
    return Number.isFinite(checkedAt) && now - checkedAt <= 30 * 24 * 60 * 60 * 1000;
  });
  if (recentSuccess) score += 15;
  if (channel.logoUrl) score += 5;
  if (channel.countryCode && channel.countryName) score += 5;
  if (channel.languageCodes.length > 0) score += 5;
  if (channel.primaryCategory !== "other") score += 5;
  if (channel.name.trim()) score += 2;
  if (!hasPotentiallyViableSource(channel)) score -= 50;
  const health = channel.health ?? calculateChannelHealth(streams);
  score += healthRecommendationScore({
    streamCount: health.sourceCount,
    health: {
      status: health.status,
      checkedAt: health.checkedAt,
      sourceCount: health.sourceCount,
      playableSourceCount: health.playableSourceCount,
      reasonCode: health.reasonCode,
      reasonMessage: health.reasonMessage,
    },
  });
  return score;
};
