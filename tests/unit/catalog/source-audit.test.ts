import { describe, expect, it, vi } from "vitest";
import {
  assertSafeAuditUrl,
  auditSource,
  isPrivateOrReservedIp,
} from "@/features/catalog/application/source-audit";

const publicLookup = vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]);

describe("source audit SSRF controls", () => {
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.2", "::1", "fd00::1"])(
    "rejects private or reserved address %s",
    (address) => expect(isPrivateOrReservedIp(address)).toBe(true),
  );

  it("rejects localhost and non-HTTP protocols before fetch", async () => {
    await expect(assertSafeAuditUrl("http://localhost/live.m3u8")).rejects.toThrow(
      "private_destination",
    );
    await expect(assertSafeAuditUrl("file:///etc/passwd")).rejects.toThrow("unsupported_protocol");
  });

  it("revalidates every redirect and rejects a redirect to a private address", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }),
    ) as unknown as typeof fetch;
    const result = await auditSource(
      { id: "redirect", url: "https://example.com/live.m3u8" },
      { fetcher, lookup: publicLookup as never },
    );
    expect(result).toMatchObject({ status: "invalid_url", failureReason: "private_destination" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("source audit classification", () => {
  it("does not claim playable from HTTP 200 or a valid manifest alone", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { "content-type": "application/vnd.apple.mpegurl" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("#EXTM3U\n#EXT-X-VERSION:3\n", {
          status: 200,
          headers: { "content-type": "application/vnd.apple.mpegurl" },
        }),
      ) as unknown as typeof fetch;
    const result = await auditSource(
      { id: "hls", url: "https://example.com/live.m3u8" },
      { fetcher, lookup: publicLookup as never },
    );
    expect(result).toMatchObject({ status: "unknown", manifestValid: true });
  });

  it("bounds response bodies", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response("#EXTM3U\n".padEnd(2_000, "x"), { status: 200 }),
      ) as unknown as typeof fetch;
    const result = await auditSource(
      { id: "large", url: "https://example.com/live.m3u8" },
      { fetcher, lookup: publicLookup as never, maxBytes: 100 },
    );
    expect(result).toMatchObject({
      status: "unsupported_format",
      failureReason: "response_too_large",
    });
  });

  it("reports timeouts as network errors", async () => {
    const fetcher = vi.fn(
      async (_input: URL | RequestInfo, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;
    const result = await auditSource(
      { id: "timeout", url: "https://example.com/live.m3u8" },
      { fetcher, lookup: publicLookup as never, timeoutMs: 10 },
    );
    expect(result).toMatchObject({ status: "network_error", failureReason: "timeout" });
  });
});
