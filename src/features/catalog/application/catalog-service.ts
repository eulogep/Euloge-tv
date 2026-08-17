import "server-only";
import { fetchIptvOrgDataset } from "../infrastructure/iptv-org-client";
import { normalizeCatalog, queryCatalog, type QueryResult } from "../application/normalize";
import type { CatalogQuery, NormalizedChannel } from "../domain/types";
import { CatalogRuntime } from "./catalog-runtime";
import { calculateChannelHealth } from "./source-health";

const catalogRuntime = new CatalogRuntime<NormalizedChannel[]>((catalog) => catalog.length > 0);

export const getCatalogRuntimeState = (): {
  status: "idle" | "initializing" | "ready" | "failed";
  catalogAvailable: boolean;
} => catalogRuntime.getState();

export async function getNormalizedCatalog(): Promise<NormalizedChannel[]> {
  return catalogRuntime.getOrInitialize(async () => {
    const dataset = await fetchIptvOrgDataset();
    return normalizeCatalog(dataset);
  });
}

export async function queryCatalogService(query: CatalogQuery): Promise<QueryResult> {
  const all = await getNormalizedCatalog();
  return queryCatalog(all, query);
}

export async function getChannelById(id: string): Promise<NormalizedChannel | null> {
  const all = await getNormalizedCatalog();
  return all.find((c) => c.id === id) ?? null;
}

export async function getChannelHealthById(id: string) {
  const channel = await getChannelById(id);
  if (!channel) return null;
  return channel.health ?? calculateChannelHealth(channel.streams);
}

/** Test-only. */
export const __resetCatalogCache = (): void => {
  catalogRuntime.reset();
};
