import { describe, expect, it, vi } from "vitest";
import {
  assertSafeAuditUrl,
  auditSource,
  createPinnedRequestOptions,
  isPrivateOrReservedIp,
  resolveSafeAuditTarget,
  type AuditRequester,
} from "@/features/catalog/application/source-audit";

const PUBLIC_IPV4 = "93.184.216.34";
const PUBLIC_IPV6 = "2606:4700:4700::1111";
const publicLookup = vi.fn(async () => [{ address: PUBLIC_IPV4, family: 4 as const }]);

describe("source audit SSRF controls", () => {
  it.each([
    "0.0.0.0",
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.2",
    "[::]",
    "[::1]",
    "[fe80::1]",
    "[fc00::1]",
    "[ff02::1]",
    "[::ffff:127.0.0.1]",
    "[::ffff:5db8:d822]",
  ])("rejects private or reserved address %s", (address) => {
    expect(isPrivateOrReservedIp(address)).toBe(true);
  });

  it.each([PUBLIC_IPV4, PUBLIC_IPV6, `[${PUBLIC_IPV6}]`])("accepts public address %s", (address) =>
    expect(isPrivateOrReservedIp(address)).toBe(false),
  );

  it("normalizes bracketed IPv6 before classification", async () => {
    await expect(assertSafeAuditUrl("http://[::1]/live.m3u8")).rejects.toThrow(
      "private_destination",
    );
    await expect(assertSafeAuditUrl(`https://[${PUBLIC_IPV6}]/live.m3u8`)).resolves.toBeInstanceOf(
      URL,
    );
  });

  it("rejects localhost and non-HTTP protocols before request", async () => {
    await expect(assertSafeAuditUrl("http://localhost/live.m3u8")).rejects.toThrow(
      "private_destination",
    );
    await expect(assertSafeAuditUrl("file:///etc/passwd")).rejects.toThrow("unsupported_protocol");
  });

  it("rejects mixed public and private A/AAAA answers without sending a request", async () => {
    const lookup = vi.fn(async () => [
      { address: PUBLIC_IPV4, family: 4 as const },
      { address: "fd00::1", family: 6 as const },
    ]);
    const requester = vi.fn<AuditRequester>();

    const result = await auditSource(
      { id: "mixed", url: "https://media.example/live.m3u8" },
      { lookup: lookup as never, requester },
    );

    expect(result).toMatchObject({ status: "invalid_url", failureReason: "private_destination" });
    expect(requester).not.toHaveBeenCalled();
  });

  it("pins the request to the validated address while preserving Host, SNI and TLS validation", async () => {
    const target = await resolveSafeAuditTarget(
      "https://media.example:8443/live.m3u8?variant=1",
      publicLookup as never,
    );
    const options = createPinnedRequestOptions(target, { method: "GET", maxBytes: 1024 });

    expect(options).toMatchObject({
      protocol: "https:",
      hostname: PUBLIC_IPV4,
      port: "8443",
      path: "/live.m3u8?variant=1",
      servername: "media.example",
      rejectUnauthorized: true,
      headers: {
        host: "media.example:8443",
        range: "bytes=0-1023",
      },
    });
  });

  it("blocks public-then-private rebinding before a second request is sent", async () => {
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: PUBLIC_IPV4, family: 4 }])
      .mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);
    const requester = vi.fn(async () =>
      Promise.resolve(new Response(null, { status: 302, headers: { location: "/next" } })),
    ) as AuditRequester;

    const result = await auditSource(
      { id: "rebind", url: "https://media.example/live.m3u8" },
      { lookup: lookup as never, requester },
    );

    expect(result).toMatchObject({ status: "invalid_url", failureReason: "private_destination" });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(requester).toHaveBeenCalledTimes(1);
  });

  it("revalidates every redirect and rejects a private hostname or literal", async () => {
    const requester = vi.fn(async () =>
      Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/admin" },
        }),
      ),
    ) as AuditRequester;
    const result = await auditSource(
      { id: "redirect", url: "https://example.com/live.m3u8" },
      { requester, lookup: publicLookup as never },
    );

    expect(result).toMatchObject({ status: "invalid_url", failureReason: "private_destination" });
    expect(requester).toHaveBeenCalledTimes(1);
  });

  it("passes the pinned public target to the requester without another DNS lookup", async () => {
    const requester = vi.fn(async (target) => {
      expect(target).toMatchObject({
        hostname: "media.example",
        address: PUBLIC_IPV4,
        family: 4,
      });
      return new Response(null, { status: 200, headers: { "content-type": "video/mp4" } });
    }) as AuditRequester;

    const result = await auditSource(
      { id: "public", url: "https://media.example/live.mp4" },
      { requester, lookup: publicLookup as never },
    );

    expect(result).toMatchObject({ status: "unknown", responseStatus: 200 });
    expect(publicLookup).toHaveBeenCalled();
    expect(requester).toHaveBeenCalledTimes(1);
  });
});

describe("source audit classification", () => {
  it("does not claim playable from HTTP 200 or a valid manifest alone", async () => {
    const requester = vi
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
      ) as AuditRequester;
    const result = await auditSource(
      { id: "hls", url: "https://example.com/live.m3u8" },
      { requester, lookup: publicLookup as never },
    );
    expect(result).toMatchObject({ status: "unknown", manifestValid: true });
  });

  it("bounds response bodies", async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response("#EXTM3U\n".padEnd(2_000, "x"), { status: 200 }),
      ) as unknown as AuditRequester;
    const result = await auditSource(
      { id: "large", url: "https://example.com/live.m3u8" },
      { requester, lookup: publicLookup as never, maxBytes: 100 },
    );
    expect(result).toMatchObject({
      status: "unsupported_format",
      failureReason: "response_too_large",
    });
  });

  it("reports timeouts as network errors", async () => {
    const requester = vi.fn(
      async (_target, request) =>
        await new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as AuditRequester;
    const result = await auditSource(
      { id: "timeout", url: "https://example.com/live.m3u8" },
      { requester, lookup: publicLookup as never, timeoutMs: 10 },
    );
    expect(result).toMatchObject({ status: "network_error", failureReason: "timeout" });
  });
});
