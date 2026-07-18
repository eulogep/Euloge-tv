import "server-only";
import { fetchIptvOrgDataset } from "../infrastructure/iptv-org-client";
import { normalizeCatalog, queryCatalog, type QueryResult } from "../application/normalize";
import type { CatalogQuery, NormalizedChannel } from "../domain/types";

let normalizedCache: NormalizedChannel[] | null = null;

export async function getNormalizedCatalog(): Promise<NormalizedChannel[]> {
  if (normalizedCache) return normalizedCache;
  const dataset = await fetchIptvOrgDataset();
  normalizedCache = normalizeCatalog(dataset);
  return normalizedCache;
}

export async function queryCatalogService(query: CatalogQuery): Promise<QueryResult> {
  const all = await getNormalizedCatalog();
  return queryCatalog(all, query);
}

export async function getChannelById(id: string): Promise<NormalizedChannel | null> {
  const all = await getNormalizedCatalog();
  return all.find((c) => c.id === id) ?? null;
}

/** Test-only. */
export const __resetCatalogCache = (): void => {
  normalizedCache = null;
};
