"use client";

import { useEffect, useState } from "react";
import type { CatalogResponse, ChannelSummary, CatalogQuery } from "../domain/types";

type State = {
  data: CatalogResponse | null;
  items: ChannelSummary[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
};

export function useCatalog(query: Omit<CatalogQuery, "cursor">): State {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = new URLSearchParams({
    q: query.q ?? "",
    country: query.country ?? "",
    category: query.category ?? "",
    language: query.language ?? "",
    availability: query.availability ?? "",
    sort: query.sort ?? "quality",
    limit: String(query.limit ?? 40),
    ...(query.source ? { source: query.source } : {}),
  }).toString();

  const fetchPage = async (cursor?: string): Promise<CatalogResponse> => {
    const url = `/api/catalog?${queryString}${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`catalog ${res.status}`);
    return (await res.json()) as CatalogResponse;
  };

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const first = await fetchPage();
      setData(first);
      setItems(first.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalogue indisponible.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(data.nextCursor);
      setData(next);
      setItems((prev) => [...prev, ...next.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch should only run when the query fields change (queryString)
  }, [queryString]);

  return { data, items, loading, loadingMore, error, loadMore, refetch };
}
