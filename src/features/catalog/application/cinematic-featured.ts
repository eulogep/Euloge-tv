import type { ChannelSummary, SourceAvailabilityStatus } from "../domain/types";
import { canFeatureChannel, healthRecommendationScore } from "./source-health";

const MAX_CINEMATIC_CHANNELS = 7;

const availabilityRank: Record<SourceAvailabilityStatus, number> = {
  playable: 0,
  checking: 1,
  unknown: 2,
  timeout: 3,
  network_error: 4,
  temporarily_unavailable: 5,
  forbidden_or_restricted: 6,
  unsupported_format: 7,
  invalid_url: 8,
};

const compatibilityRank: Record<ChannelSummary["bestCompatibility"], number> = {
  preferred: 0,
  "native-only": 1,
  unknown: 2,
  limited: 3,
  blocked: 4,
};

export type CinematicTone = "red" | "violet" | "blue" | "orange";

/** Deterministic editorial tone; never derives arbitrary colors from remote images. */
export const cinematicToneForChannel = (channelId: string): CinematicTone => {
  const tones: readonly CinematicTone[] = ["red", "violet", "blue", "orange"];
  const hash = [...channelId].reduce((total, character) => total + character.charCodeAt(0), 0);
  return tones[hash % tones.length]!;
};

/** Presentation-ready selection based solely on the central hero eligibility rule. */
export const selectCinematicFeaturedChannels = (
  channels: readonly ChannelSummary[],
  limit = MAX_CINEMATIC_CHANNELS,
): ChannelSummary[] =>
  channels
    .filter((channel) => canFeatureChannel(channel) && channel.bestCompatibility !== "blocked")
    .sort((left, right) => {
      const health = healthRecommendationScore(right) - healthRecommendationScore(left);
      if (health !== 0) return health;
      const availability =
        availabilityRank[left.bestAvailability ?? "unknown"] -
        availabilityRank[right.bestAvailability ?? "unknown"];
      if (availability !== 0) return availability;
      const compatibility =
        compatibilityRank[left.bestCompatibility] - compatibilityRank[right.bestCompatibility];
      if (compatibility !== 0) return compatibility;
      const epg =
        Number(Boolean(right.epg?.currentProgram)) - Number(Boolean(left.epg?.currentProgram));
      if (epg !== 0) return epg;
      const logo = Number(Boolean(right.logoUrl)) - Number(Boolean(left.logoUrl));
      if (logo !== 0) return logo;
      const sources = right.streamCount - left.streamCount;
      if (sources !== 0) return sources;
      return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id);
    })
    .slice(0, Math.max(0, limit));
