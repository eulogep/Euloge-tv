import { describe, expect, it, vi } from "vitest";
import { probeSource } from "@/features/player/application/source-probe";

describe("source probe", () => {
  it("rejects an invalid URL without making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await probeSource({ url: "not a url" }, { fetcher });
    expect(result.status).toBe("invalid_url");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("records a 404 as temporarily unavailable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 404,
        headers: { "content-type": "application/vnd.apple.mpegurl" },
      }),
    );
    const result = await probeSource({ url: "https://example.com/dead.m3u8" }, { fetcher });
    expect(result.status).toBe("temporarily_unavailable");
    expect(result.responseStatus).toBe(404);
    expect(result.detectedContentType).toBe("application/vnd.apple.mpegurl");
  });

  it("keeps 403 classification ambiguous", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    const result = await probeSource({ url: "https://example.com/restricted" }, { fetcher });
    expect(result.status).toBe("forbidden_or_restricted");
  });

  it("reports a bounded timeout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
    const result = await probeSource(
      { url: "https://example.com/slow.m3u8" },
      { fetcher, timeoutMs: 1 },
    );
    expect(result.status).toBe("timeout");
  });

  it("does not treat an opaque CORS probe failure as proof of playback failure", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await probeSource({ url: "https://example.com/live.m3u8" }, { fetcher });
    expect(result.status).toBe("unknown");
    expect(result.failureReason).toBe("probe_unavailable");
  });
});
