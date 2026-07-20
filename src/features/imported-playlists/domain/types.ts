import type { NormalizedChannel, NormalizedStream } from "@/features/catalog/domain/types";
import { normalizeCategories } from "@/features/catalog/application/taxonomy";

/**
 * A channel imported from a local .m3u/.m3u8 playlist. Never uploaded to
 * the server. Stored in IndexedDB.
 */
export type ImportedChannel = {
  id: string;
  name: string;
  logoUrl: string | null;
  countryCode: string | null;
  categories: string[];
  languageCodes: string[];
  streams: NormalizedStream[];
  /** Original raw URL — useful for diagnostics. */
  sourceUrl: string;
  requiresReferrer: boolean;
  requiresCustomUserAgent: boolean;
};

export type ImportedPlaylist = {
  id: string;
  name: string;
  importedAt: string;
  schemaVersion: 1;
  channelCount: number;
  channels: ImportedChannel[];
};

/**
 * Adapter so imported channels can be consumed by the catalog UI exactly
 * like iptv-org channels.
 */
export const toNormalizedChannel = (imported: ImportedChannel): NormalizedChannel => {
  const normalizedCategories = normalizeCategories(imported.categories);
  return {
    id: imported.id,
    name: imported.name,
    alternativeNames: [],
    countryCode: imported.countryCode,
    countryName: null,
    countryFlag: null,
    languageCodes: imported.languageCodes,
    primaryCategory: normalizedCategories.primaryCategory,
    categories: normalizedCategories.categories,
    tags: normalizedCategories.tags,
    logoUrl: imported.logoUrl,
    websiteUrl: null,
    isNsfw: false,
    streams: imported.streams,
  };
};
