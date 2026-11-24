import { rtsFeedForChannel } from "../domain/official-streams";
import type { ChannelSummary, NormalizedChannel, NormalizedStream } from "../domain/types";
import type { IptvChannel, IptvLanguage } from "../infrastructure/schemas";
import { healthStatusOf } from "./source-health";

/**
 * Legal and editorial provenance tiers for MJTV channels:
 * - `official_broadcaster`: Direct official broadcaster feed or manually approved broadcaster stream
 * - `verified_public`: Public catalog stream whose playback health has been verified
 * - `public_unverified`: Public catalog stream without confirmed health observation
 * - `user_imported`: Private M3U/M3U8 playlist imported locally by the user in IndexedDB
 */
export type SourceProvenanceTier =
  | "official_broadcaster"
  | "verified_public"
  | "public_unverified"
  | "user_imported";

export type ChannelProvenanceInfo = {
  tier: SourceProvenanceTier;
  label: string;
  redistributable: boolean;
  isUserLocal: boolean;
};

const PROVENANCE_LABELS: Readonly<Record<SourceProvenanceTier, string>> = {
  official_broadcaster: "Diffuseur officiel",
  verified_public: "Flux public vérifié",
  public_unverified: "Catalogue public",
  user_imported: "Playlist personnelle",
};

export const isImportedChannelId = (channelId: string): boolean =>
  channelId.startsWith("imported:");

export const hasOfficialBroadcasterStream = (
  channelId: string,
  streams?: readonly Pick<NormalizedStream, "resolver" | "manuallyApproved" | "sourceOrigin">[],
): boolean => {
  if (rtsFeedForChannel(channelId) !== null) return true;
  if (!streams) return false;
  return streams.some(
    (stream) =>
      stream.resolver === "rts" ||
      (stream.manuallyApproved === true &&
        typeof stream.sourceOrigin === "string" &&
        stream.sourceOrigin.toLowerCase().includes("official")),
  );
};

export const classifyChannelProvenance = (
  channel: Pick<ChannelSummary, "id" | "streamCount" | "health" | "bestAvailability"> & {
    streams?: readonly Pick<NormalizedStream, "resolver" | "manuallyApproved" | "sourceOrigin">[];
  },
): ChannelProvenanceInfo => {
  if (isImportedChannelId(channel.id)) {
    return {
      tier: "user_imported",
      label: PROVENANCE_LABELS.user_imported,
      redistributable: false,
      isUserLocal: true,
    };
  }

  if (hasOfficialBroadcasterStream(channel.id, channel.streams)) {
    return {
      tier: "official_broadcaster",
      label: PROVENANCE_LABELS.official_broadcaster,
      redistributable: true,
      isUserLocal: false,
    };
  }

  const health = healthStatusOf(channel);
  if (health === "healthy") {
    return {
      tier: "verified_public",
      label: PROVENANCE_LABELS.verified_public,
      redistributable: false,
      isUserLocal: false,
    };
  }

  return {
    tier: "public_unverified",
    label: PROVENANCE_LABELS.public_unverified,
    redistributable: false,
    isUserLocal: false,
  };
};

export type EnrichedDatabaseMetadata = {
  network: string | null;
  owners: string[];
  subdivision: string | null;
  launchedYear: number | null;
  languageNames: string[];
};

/**
 * Extracts structured metadata from iptv-org/database channel and language records.
 */
export const extractDatabaseMetadata = (
  rawChannel: Pick<IptvChannel, "network" | "owners" | "subdivision" | "launched">,
  languageCodes: readonly string[],
  languages: readonly IptvLanguage[],
): EnrichedDatabaseMetadata => {
  const languageMap = new Map(languages.map((lang) => [lang.code, lang.name]));
  const owners = rawChannel.owners
    ? rawChannel.owners
        .split(";")
        .map((owner) => owner.trim())
        .filter(Boolean)
    : [];

  let launchedYear: number | null = null;
  if (rawChannel.launched) {
    const yearMatch = rawChannel.launched.match(/^(\d{4})/);
    if (yearMatch) {
      const parsed = Number(yearMatch[1]);
      if (parsed >= 1920 && parsed <= 2100) launchedYear = parsed;
    }
  }

  const languageNames = languageCodes
    .map((code) => languageMap.get(code) ?? code)
    .filter(Boolean);

  return {
    network: rawChannel.network?.trim() || null,
    owners,
    subdivision: rawChannel.subdivision?.trim() || null,
    launchedYear,
    languageNames,
  };
};

export const filterChannelsBySourceOrigin = <T extends Pick<NormalizedChannel, "id">>(
  channels: readonly T[],
  source: "iptv-org" | "imported" | "all" | undefined,
): T[] => {
  if (!source || source === "all") return [...channels];
  if (source === "imported") {
    return channels.filter((channel) => isImportedChannelId(channel.id));
  }
  return channels.filter((channel) => !isImportedChannelId(channel.id));
};
