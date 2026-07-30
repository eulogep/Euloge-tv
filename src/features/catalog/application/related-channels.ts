import type { ChannelSummary, NormalizedChannel, PublicChannelDetail } from "../domain/types";
import { catalogQualityScore, hasPotentiallyViableSource } from "./catalog-quality";
import { activeStreams, calculateChannelHealth, canRecommendChannel } from "./source-health";

const overlapCount = (left: readonly string[], right: readonly string[]): number => {
  const rightSet = new Set(right);
  return left.reduce((count, value) => count + (rightSet.has(value) ? 1 : 0), 0);
};

export const relatedChannelScore = (
  current: NormalizedChannel,
  candidate: NormalizedChannel,
): number => {
  if (current.id === candidate.id) return Number.NEGATIVE_INFINITY;

  let score = 0;
  if (
    current.primaryCategory !== "other" &&
    candidate.primaryCategory === current.primaryCategory
  ) {
    score += 40;
  }

  score += overlapCount(current.languageCodes, candidate.languageCodes) * 25;
  if (current.countryCode && candidate.countryCode === current.countryCode) score += 20;
  if (hasPotentiallyViableSource(candidate)) score += 15;
  else score -= 50;
  score += overlapCount(current.tags, candidate.tags) * 5;
  score += catalogQualityScore(candidate) / 10;
  return score;
};

export const rankRelatedChannels = (
  current: NormalizedChannel,
  candidates: readonly NormalizedChannel[],
  limit = 6,
): NormalizedChannel[] =>
  candidates
    .filter(
      (candidate) =>
        candidate.id !== current.id &&
        canRecommendChannel({
          streamCount: activeStreams(candidate.streams).length,
          health: candidate.health ?? calculateChannelHealth(candidate.streams),
        }),
    )
    .map((candidate) => ({ candidate, score: relatedChannelScore(current, candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);

export const rankRelatedSummaries = (
  current: NormalizedChannel | PublicChannelDetail,
  candidates: readonly ChannelSummary[],
  limit = 6,
): ChannelSummary[] => {
  const score = (candidate: ChannelSummary): number => {
    let value = 0;
    if (
      current.primaryCategory !== "other" &&
      candidate.primaryCategory === current.primaryCategory
    ) {
      value += 40;
    }
    value += overlapCount(current.languageCodes, candidate.languageCodes) * 25;
    if (current.countryCode && candidate.countryCode === current.countryCode) value += 20;
    if (candidate.streamCount > 0 && candidate.bestCompatibility !== "blocked") value += 15;
    else value -= 50;
    value += overlapCount(current.tags, candidate.tags) * 5;
    if (candidate.logoUrl) value += 3;
    if (candidate.countryCode) value += 2;
    return value;
  };

  return candidates
    .filter((candidate) => candidate.id !== current.id && canRecommendChannel(candidate))
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
};
