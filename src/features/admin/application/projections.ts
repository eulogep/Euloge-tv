import type { NormalizedChannel, NormalizedStream } from "@/features/catalog/domain/types";
import { hasPotentiallyViableSource } from "@/features/catalog/application/catalog-quality";
import {
  activeStreams,
  calculateChannelHealth,
  canFeatureChannel,
  canOpenChannel,
  canRecommendChannel,
} from "@/features/catalog/application/source-health";
import type { PublicEpgSchedule } from "@/features/epg/domain/types";
import type {
  AdminChannelFilters,
  AdminChannelRow,
  AdminDashboardStats,
  AdminHealthStatus,
  AdminSourceRow,
} from "../domain/types";

export const projectAdminHealth = (status: AdminChannelRow["health"]): AdminHealthStatus => {
  if (status === "healthy") return "ONLINE";
  if (status === "degraded") return "DEGRADED";
  if (status === "unverified" || status === "archived") return "UNKNOWN";
  return "OFFLINE";
};

const sourceOperationalHealth = (source: NormalizedStream): AdminHealthStatus => {
  const status = source.catalogHealth?.status ?? source.availability.status;
  if (status === "playable") return "ONLINE";
  if (status === "unknown" || status === "checking") return "UNKNOWN";
  return "OFFLINE";
};

export const redactOperationalUrl = (value: string): string => {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    const hadQuery = url.search.length > 0;
    url.search = "";
    url.hash = "";
    return `${url.origin}${url.pathname}${hadQuery ? "?[redacted]" : ""}`;
  } catch {
    return "[invalid-url]";
  }
};

const redactDiagnosticText = (value: string | null): string | null =>
  value?.replace(/https?:\/\/[^\s]+/giu, (url) => redactOperationalUrl(url)) ?? null;

export const buildAdminChannelRow = (
  channel: NormalizedChannel,
  epg: PublicEpgSchedule,
  epgMapping: string | null,
): AdminChannelRow => {
  const health = channel.health ?? calculateChannelHealth(channel.streams);
  const eligibilityInput = {
    streamCount: activeStreams(channel.streams).length,
    health,
  };
  return {
    id: channel.id,
    name: channel.name,
    logoUrl: channel.logoUrl,
    countryCode: channel.countryCode,
    countryName: channel.countryName,
    languageCodes: channel.languageCodes,
    categories: channel.categories,
    sourceCount: channel.streams.length,
    canOpen: canOpenChannel(eligibilityInput),
    canFeature: canFeatureChannel(eligibilityInput),
    canRecommend: canRecommendChannel(eligibilityInput),
    health: health.status,
    operationalHealth: projectAdminHealth(health.status),
    checkedAt: health.checkedAt,
    lastSuccessAt: health.lastSuccessAt,
    lastFailureAt: health.lastFailureAt,
    failureCount: health.consecutiveFailures,
    healthReasonCode: health.reasonCode,
    epgStatus: epg.status,
    epgProvider: epg.source?.name ?? null,
    epgMapping,
    currentProgram: epg.currentProgram,
    nextProgram: epg.nextProgram,
    laterPrograms: epg.laterPrograms ?? [],
    archived: health.status === "archived",
  };
};

export const buildAdminSourceRows = (channel: NormalizedChannel): AdminSourceRow[] =>
  channel.streams.map((source, index) => {
    const catalogHealth = source.catalogHealth;
    return {
      id: `${channel.id}:source:${index + 1}`,
      channelId: channel.id,
      channelName: channel.name,
      displayUrl: redactOperationalUrl(source.url),
      kind: source.kind,
      priority: source.priority ?? catalogHealth?.priority ?? 100,
      eligible: activeStreams([source]).length === 1 && !catalogHealth?.disabled,
      health: catalogHealth?.status ?? source.availability.status,
      operationalHealth: sourceOperationalHealth(source),
      lastCheckedAt: catalogHealth?.checkedAt ?? source.availability.lastCheckedAt,
      lastSuccessAt: catalogHealth?.lastSuccessAt ?? null,
      lastFailureAt: catalogHealth?.lastFailureAt ?? null,
      failureReason: redactDiagnosticText(
        catalogHealth?.failureReason ?? source.availability.failureReason,
      ),
      mime: catalogHealth?.contentType ?? source.availability.detectedContentType,
    };
  });

export const buildAdminDashboardStats = (
  channels: readonly AdminChannelRow[],
  originalChannels: readonly NormalizedChannel[],
): AdminDashboardStats => ({
  totalChannels: channels.length,
  openableChannels: channels.filter((channel) => channel.canOpen).length,
  featureableChannels: channels.filter((channel) => channel.canFeature).length,
  recommendableChannels: channels.filter((channel) => channel.canRecommend).length,
  unavailableChannels: channels.filter((channel) => channel.health === "unavailable").length,
  degradedChannels: channels.filter((channel) => channel.operationalHealth === "DEGRADED").length,
  offlineChannels: channels.filter((channel) => channel.operationalHealth === "OFFLINE").length,
  archivedChannels: channels.filter((channel) => channel.archived).length,
  channelsWithoutUsableSource: originalChannels.filter(
    (channel) => !hasPotentiallyViableSource(channel),
  ).length,
  epgAvailable: channels.filter((channel) => channel.epgStatus === "available").length,
  epgStale: channels.filter((channel) => channel.epgStatus === "stale").length,
  epgUnavailable: channels.filter((channel) => channel.epgStatus === "unavailable").length,
  countries: new Set(channels.map((channel) => channel.countryCode).filter(Boolean)).size,
  languages: new Set(channels.flatMap((channel) => channel.languageCodes)).size,
  categories: new Set(channels.flatMap((channel) => channel.categories)).size,
});

export const filterAdminChannels = (
  channels: readonly AdminChannelRow[],
  filters: AdminChannelFilters,
): AdminChannelRow[] => {
  const query = filters.query?.trim().toLocaleLowerCase("fr") ?? "";
  return channels.filter((channel) => {
    if (query && !`${channel.name} ${channel.id}`.toLocaleLowerCase("fr").includes(query)) {
      return false;
    }
    if (filters.country && channel.countryCode !== filters.country) return false;
    if (filters.language && !channel.languageCodes.includes(filters.language)) return false;
    if (filters.category && !channel.categories.some((category) => category === filters.category)) {
      return false;
    }
    if (filters.health && channel.health !== filters.health) return false;
    if (filters.epg && channel.epgStatus !== filters.epg) return false;
    if (filters.availability && filters.availability !== "all") {
      if (filters.availability === "openable" && !channel.canOpen) return false;
      if (filters.availability === "featureable" && !channel.canFeature) return false;
      if (filters.availability === "recommendable" && !channel.canRecommend) return false;
      if (filters.availability === "unavailable" && channel.canOpen) return false;
    }
    return true;
  });
};
