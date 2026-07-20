import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCatalog } from "@/features/catalog/presentation/use-catalog";
import type { CatalogResponse } from "@/features/catalog/domain/types";

const catalog = (id: string): CatalogResponse => ({
  items: [
    {
      id,
      name: id,
      alternativeNames: [],
      countryCode: "FR",
      countryName: "France",
      countryFlag: "🇫🇷",
      languageCodes: ["fra"],
      primaryCategory: "news",
      categories: ["news"],
      tags: [],
      logoUrl: null,
      websiteUrl: null,
      isNsfw: false,
      streamCount: 1,
      bestCompatibility: "preferred",
    },
  ],
  nextCursor: null,
  total: 1,
  filters: { countries: [], categories: [], languages: [] },
  generatedAt: "2026-07-20T00:00:00.000Z",
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useCatalog", () => {
  it("loads a 200 response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(catalog("news")));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCatalog({ category: "news", limit: 40 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items[0]?.id).toBe("news");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/catalog?category=news&sort=quality&limit=40",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("reads a structured JSON 400 error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "INVALID_CATALOG_QUERY",
              message: "Les paramètres du catalogue sont invalides.",
              fields: [{ field: "availability", message: "Invalid option" }],
            },
          },
          400,
        ),
      ),
    );

    const { result } = renderHook(() => useCatalog({ limit: 40 }));

    await waitFor(() => expect(result.current.error?.code).toBe("INVALID_CATALOG_QUERY"));
    expect(result.current.error?.message).toBe("Les paramètres du catalogue sont invalides.");
    expect(result.current.error?.technicalDetails).toContain("availability");
  });

  it("reports a readable network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const { result } = renderHook(() => useCatalog({ limit: 40 }));

    await waitFor(() => expect(result.current.error?.code).toBe("NETWORK_ERROR"));
    expect(result.current.error?.message).toContain("Vérifiez votre connexion");
    expect(result.current.error?.technicalDetails).toBe("Failed to fetch");
  });

  it("retries after an error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(jsonResponse(catalog("retried")));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCatalog({ limit: 40 }));
    await waitFor(() => expect(result.current.error?.code).toBe("NETWORK_ERROR"));

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.items[0]?.id).toBe("retried"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts an older request when filters change", async () => {
    const oldRequest = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce((_url, init) => {
        expect(init?.signal?.aborted).toBe(false);
        return oldRequest.promise;
      })
      .mockResolvedValueOnce(jsonResponse(catalog("new")));
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(({ q }) => useCatalog({ q, limit: 40 }), {
      initialProps: { q: "old" },
    });
    const oldSignal = fetchMock.mock.calls[0]?.[1]?.signal;

    rerender({ q: "new" });

    await waitFor(() => expect(result.current.items[0]?.id).toBe("new"));
    expect(oldSignal?.aborted).toBe(true);
    oldRequest.resolve(jsonResponse(catalog("old")));
    await act(async () => await Promise.resolve());
    expect(result.current.items[0]?.id).toBe("new");
  });

  it("keeps the newest response during rapid filter changes", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const third = deferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
      .mockImplementationOnce(() => third.promise);
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(({ category }) => useCatalog({ category, limit: 40 }), {
      initialProps: { category: "news" },
    });

    rerender({ category: "music" });
    rerender({ category: "kids" });
    third.resolve(jsonResponse(catalog("kids")));
    second.resolve(jsonResponse(catalog("music")));
    first.resolve(jsonResponse(catalog("news")));

    await waitFor(() => expect(result.current.items[0]?.id).toBe("kids"));
    expect(result.current.error).toBeNull();
  });

  it("distinguishes server failures", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 503)));
    const { result } = renderHook(() => useCatalog({ limit: 40 }));

    await waitFor(() => expect(result.current.error?.code).toBe("SERVER_ERROR"));
    expect(result.current.error?.technicalDetails).toBe("HTTP 503");
  });

  it("distinguishes invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("not-json", { status: 200, statusText: "OK" })),
    );
    const { result } = renderHook(() => useCatalog({ limit: 40 }));

    await waitFor(() => expect(result.current.error?.code).toBe("INVALID_RESPONSE"));
    expect(result.current.error?.message).toContain("réponse illisible");
  });
});
