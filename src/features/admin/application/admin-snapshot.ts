import "server-only";
import { getNormalizedCatalog } from "@/features/catalog/application/catalog-service";
import { getPublicEpg } from "@/features/epg/application/default-epg";
import { CHANNEL_EPG_MAPPING } from "@/features/epg/infrastructure/channel-epg-mapping";
import type { AdminSnapshot } from "../domain/types";
import {
  buildAdminChannelRow,
  buildAdminDashboardStats,
  buildAdminSourceRows,
} from "./projections";

/**
 * Builds a fresh private projection for each admin API request. The normalized
 * catalogue has its own server cache; the operational admin projection is not
 * persisted in the Next.js data cache.
 */
export const getAdminSnapshot = async (): Promise<AdminSnapshot> => {
  const catalog = await getNormalizedCatalog();
  const channelRows = await Promise.all(
    catalog.map(async (channel) => {
      const mapping = CHANNEL_EPG_MAPPING[channel.id as keyof typeof CHANNEL_EPG_MAPPING] ?? null;
      return buildAdminChannelRow(channel, await getPublicEpg(channel.id), mapping);
    }),
  );
  const sources = catalog.flatMap(buildAdminSourceRows);
  return {
    generatedAt: new Date().toISOString(),
    channels: channelRows,
    sources,
    stats: buildAdminDashboardStats(channelRows, catalog),
    options: {
      countries: [...new Set(channelRows.map((item) => item.countryCode).filter(Boolean))].sort(),
      languages: [...new Set(channelRows.flatMap((item) => item.languageCodes))].sort(),
      categories: [...new Set(channelRows.flatMap((item) => item.categories))].sort(),
      health: [...new Set(channelRows.map((item) => item.health))].sort(),
      epg: [...new Set(channelRows.map((item) => item.epgStatus))].sort(),
    } as AdminSnapshot["options"],
  };
};
