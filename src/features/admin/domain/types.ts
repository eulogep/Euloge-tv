import type { CatalogCategory, ChannelHealthStatus } from "@/features/catalog/domain/types";
import type { EpgStatus } from "@/features/epg/domain/types";

export type AdminHealthStatus = "ONLINE" | "DEGRADED" | "OFFLINE" | "UNKNOWN";

export type AdminEpgProgram = {
  title: string;
  startAt: string;
  endAt: string;
};

export type AdminChannelRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  countryCode: string | null;
  countryName: string | null;
  languageCodes: string[];
  categories: CatalogCategory[];
  sourceCount: number;
  canOpen: boolean;
  canFeature: boolean;
  canRecommend: boolean;
  health: ChannelHealthStatus;
  operationalHealth: AdminHealthStatus;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  healthReasonCode: string;
  epgStatus: EpgStatus;
  epgProvider: string | null;
  epgMapping: string | null;
  currentProgram: AdminEpgProgram | null;
  nextProgram: AdminEpgProgram | null;
  laterPrograms: AdminEpgProgram[];
  archived: boolean;
};

export type AdminSourceRow = {
  id: string;
  channelId: string;
  channelName: string;
  displayUrl: string;
  kind: string;
  priority: number;
  eligible: boolean;
  health: string;
  operationalHealth: AdminHealthStatus;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureReason: string | null;
  mime: string | null;
};

export type AdminDashboardStats = {
  totalChannels: number;
  openableChannels: number;
  featureableChannels: number;
  recommendableChannels: number;
  unavailableChannels: number;
  degradedChannels: number;
  offlineChannels: number;
  archivedChannels: number;
  channelsWithoutUsableSource: number;
  epgAvailable: number;
  epgStale: number;
  epgUnavailable: number;
  countries: number;
  languages: number;
  categories: number;
};

export type AdminSnapshot = {
  generatedAt: string;
  channels: AdminChannelRow[];
  sources: AdminSourceRow[];
  stats: AdminDashboardStats;
  options: {
    countries: string[];
    languages: string[];
    categories: string[];
    health: string[];
    epg: string[];
  };
};

export type AdminChannelFilters = {
  query?: string;
  country?: string;
  language?: string;
  category?: string;
  health?: string;
  epg?: string;
  availability?: "openable" | "featureable" | "recommendable" | "unavailable" | "all";
};
