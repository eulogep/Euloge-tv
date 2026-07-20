"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogResponse, ChannelSummary, CatalogQuery } from "../domain/types";

export type CatalogClientError = {
  code: string;
  message: string;
  technicalDetails?: string;
};

type State = {
  data: CatalogResponse | null;
  items: ChannelSummary[];
  loading: boolean;
  loadingMore: boolean;
  error: CatalogClientError | null;
  loadMore: () => Promise<void>;
  refetch: () => void;
};

const appendUsefulValue = (params: URLSearchParams, key: string, value?: string): void => {
  const normalized = value?.trim();
  if (normalized) params.set(key, normalized);
};

/** Build a stable catalog query without ever emitting empty optional parameters. */
export function buildCatalogSearchParams(
  query: Omit<CatalogQuery, "cursor">,
  cursor?: string,
): string {
  const params = new URLSearchParams();
  appendUsefulValue(params, "q", query.q);
  appendUsefulValue(params, "country", query.country);
  appendUsefulValue(params, "category", query.category);
  appendUsefulValue(params, "language", query.language);
  appendUsefulValue(params, "availability", query.availability);
  appendUsefulValue(params, "source", query.source);
  params.set("sort", query.sort ?? "quality");
  params.set("limit", String(query.limit ?? 40));
  appendUsefulValue(params, "cursor", cursor);
  return params.toString();
}

class CatalogRequestError extends Error {
  readonly catalogError: CatalogClientError;

  constructor(catalogError: CatalogClientError) {
    super(catalogError.message);
    this.name = "CatalogRequestError";
    this.catalogError = catalogError;
  }
}

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === "AbortError") ||
  (error instanceof Error && error.name === "AbortError");

const technicalMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : error === undefined ? undefined : String(error);

const toCatalogError = (error: unknown): CatalogClientError => {
  if (error instanceof CatalogRequestError) return error.catalogError;
  if (isAbortError(error)) {
    return {
      code: "REQUEST_ABORTED",
      message: "La requête catalogue a été annulée.",
      technicalDetails: technicalMessage(error),
    };
  }
  return {
    code: "NETWORK_ERROR",
    message: "Impossible de joindre le catalogue. Vérifiez votre connexion puis réessayez.",
    technicalDetails: technicalMessage(error),
  };
};

const parseCatalogResponse = async (response: Response): Promise<CatalogResponse> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new CatalogRequestError({
      code: "INVALID_RESPONSE",
      message: "Le catalogue a renvoyé une réponse illisible. Réessayez dans un instant.",
      technicalDetails: technicalMessage(error),
    });
  }

  if (!response.ok) {
    const apiError =
      typeof body === "object" && body !== null && "error" in body
        ? (body.error as { code?: unknown; message?: unknown; fields?: unknown })
        : null;
    const technicalDetails = apiError?.fields
      ? JSON.stringify(apiError.fields)
      : `HTTP ${response.status}`;

    if (response.status === 400) {
      throw new CatalogRequestError({
        code: typeof apiError?.code === "string" ? apiError.code : "INVALID_CATALOG_QUERY",
        message:
          typeof apiError?.message === "string"
            ? apiError.message
            : "Les filtres du catalogue sont invalides. Réinitialisez-les puis réessayez.",
        technicalDetails,
      });
    }

    throw new CatalogRequestError({
      code: typeof apiError?.code === "string" ? apiError.code : "SERVER_ERROR",
      message:
        typeof apiError?.message === "string"
          ? apiError.message
          : "Le catalogue est temporairement indisponible. Réessayez dans un instant.",
      technicalDetails,
    });
  }

  return body as CatalogResponse;
};

const fetchCatalogPage = async (
  query: Omit<CatalogQuery, "cursor">,
  signal: AbortSignal,
  cursor?: string,
): Promise<CatalogResponse> => {
  const searchParams = buildCatalogSearchParams(query, cursor);
  const response = await fetch(`/api/catalog?${searchParams}`, { signal });
  return parseCatalogResponse(response);
};

export function useCatalog(query: Omit<CatalogQuery, "cursor">): State {
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<CatalogClientError | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const requestSequence = useRef(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const queryString = buildCatalogSearchParams(query);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    loadMoreController.current?.abort();
    setLoadingMore(false);
    setLoading(true);
    setError(null);

    void fetchCatalogPage(query, controller.signal)
      .then((first) => {
        if (requestId !== requestSequence.current) return;
        setData(first);
        setItems(first.items);
      })
      .catch((caught: unknown) => {
        if (requestId !== requestSequence.current) return;
        const nextError = toCatalogError(caught);
        if (nextError.code !== "REQUEST_ABORTED") setError(nextError);
      })
      .finally(() => {
        if (requestId === requestSequence.current) setLoading(false);
      });

    return () => controller.abort();
    // queryString deliberately provides stable value semantics for the query object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString, refreshIndex]);

  const refetch = useCallback(() => setRefreshIndex((value) => value + 1), []);

  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return;
    const requestId = requestSequence.current;
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setError(null);
    try {
      const next = await fetchCatalogPage(query, controller.signal, data.nextCursor);
      if (requestId !== requestSequence.current) return;
      setData(next);
      setItems((previous) => [...previous, ...next.items]);
    } catch (caught) {
      if (requestId !== requestSequence.current) return;
      const nextError = toCatalogError(caught);
      if (nextError.code !== "REQUEST_ABORTED") setError(nextError);
    } finally {
      if (requestId === requestSequence.current) setLoadingMore(false);
    }
  }, [data?.nextCursor, loadingMore, query]);

  return { data, items, loading, loadingMore, error, loadMore, refetch };
}
