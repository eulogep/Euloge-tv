import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { Readable } from "node:stream";
import type { SourceHealthAuditStatus } from "../domain/types";

export type AuditSourceInput = { id: string; url: string };

export type SourceAuditResult = {
  id: string;
  url: string;
  status: Exclude<SourceHealthAuditStatus, "no_source">;
  checkedAt: string;
  responseStatus: number | null;
  contentType: string | null;
  streamType: "hls" | "video" | "unknown";
  manifestValid: boolean | null;
  failureReason: string | null;
  redirectedTo: string | null;
};

export type AuditSourceOptions = {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  requester?: AuditRequester;
  lookup?: typeof dnsLookup;
  now?: () => Date;
};

export type ResolvedAuditTarget = {
  url: URL;
  hostname: string;
  address: string;
  family: 4 | 6;
};

export type AuditRequest = {
  method: "HEAD" | "GET";
  signal: AbortSignal;
  maxBytes: number;
};

export type AuditRequester = (
  target: ResolvedAuditTarget,
  request: AuditRequest,
) => Promise<Response>;

export type PinnedRequestOptions = {
  protocol: "http:" | "https:";
  hostname: string;
  port: string | undefined;
  method: "HEAD" | "GET";
  path: string;
  headers: Record<string, string>;
  servername?: string;
  rejectUnauthorized?: true;
};

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4Addresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

export const normalizeIpLiteral = (value: string): string => {
  let normalized = value.trim().toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  const zoneIndex = normalized.indexOf("%");
  return zoneIndex >= 0 ? normalized.slice(0, zoneIndex) : normalized;
};

export const isPrivateOrReservedIp = (value: string): boolean => {
  const normalized = normalizeIpLiteral(value);
  const family = isIP(normalized);
  if (family === 4) return blockedIpv4Addresses.check(normalized, "ipv4");
  if (family === 6) return blockedIpv6Addresses.check(normalized, "ipv6");
  return true;
};

export const resolveSafeAuditTarget = async (
  value: string,
  lookup: typeof dnsLookup = dnsLookup,
): Promise<ResolvedAuditTarget> => {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported_protocol");
  }
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  const hostname = normalizeIpLiteral(url.hostname);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("private_destination");
  }
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateOrReservedIp(hostname)) throw new Error("private_destination");
    return { url, hostname, address: hostname, family: literalFamily as 4 | 6 };
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  const normalizedAddresses = addresses.map((entry) => ({
    address: normalizeIpLiteral(entry.address),
    family: isIP(normalizeIpLiteral(entry.address)),
  }));
  if (
    normalizedAddresses.length === 0 ||
    normalizedAddresses.some(
      (entry) => (entry.family !== 4 && entry.family !== 6) || isPrivateOrReservedIp(entry.address),
    )
  ) {
    throw new Error("private_destination");
  }
  const selected = normalizedAddresses[0]!;
  return {
    url,
    hostname,
    address: selected.address,
    family: selected.family as 4 | 6,
  };
};

export const assertSafeAuditUrl = async (
  value: string,
  lookup: typeof dnsLookup = dnsLookup,
): Promise<URL> => (await resolveSafeAuditTarget(value, lookup)).url;

export const createPinnedRequestOptions = (
  target: ResolvedAuditTarget,
  request: Pick<AuditRequest, "method" | "maxBytes">,
): PinnedRequestOptions => {
  const secure = target.url.protocol === "https:";
  return {
    protocol: secure ? "https:" : "http:",
    hostname: target.address,
    port: target.url.port || undefined,
    method: request.method,
    path: `${target.url.pathname}${target.url.search}`,
    headers: {
      host: target.url.host,
      "user-agent": "MJTV-Source-Audit/1.0 (+https://github.com/eulogep/Euloge-tv)",
      ...(request.method === "GET" ? { range: `bytes=0-${request.maxBytes - 1}` } : {}),
    },
    ...(secure
      ? {
          servername: isIP(target.hostname) ? undefined : target.hostname,
          rejectUnauthorized: true as const,
        }
      : {}),
  };
};

const sameRemoteAddress = (actual: string, expected: string): boolean => {
  const normalizedActual = normalizeIpLiteral(actual);
  const normalizedExpected = normalizeIpLiteral(expected);
  if (normalizedActual === normalizedExpected) return true;
  return (
    isIP(normalizedExpected) === 4 &&
    normalizedActual.startsWith("::ffff:") &&
    normalizedActual.slice("::ffff:".length) === normalizedExpected
  );
};

export const requestPinnedAuditTarget: AuditRequester = async (target, request) =>
  await new Promise<Response>((resolve, reject) => {
    if (request.signal.aborted) {
      reject(new Error("request_aborted"));
      return;
    }
    const options = createPinnedRequestOptions(target, request);
    const send = target.url.protocol === "https:" ? httpsRequest : httpRequest;
    const nodeRequest = send(options, (nodeResponse) => {
      const remoteAddress = nodeResponse.socket.remoteAddress;
      if (!remoteAddress || !sameRemoteAddress(remoteAddress, target.address)) {
        nodeResponse.destroy();
        reject(new Error("remote_address_mismatch"));
        return;
      }
      const status = nodeResponse.statusCode;
      if (!status) {
        nodeResponse.destroy();
        reject(new Error("invalid_http_response"));
        return;
      }
      const headers = new Headers();
      for (let index = 0; index < nodeResponse.rawHeaders.length; index += 2) {
        headers.append(nodeResponse.rawHeaders[index]!, nodeResponse.rawHeaders[index + 1]!);
      }
      const hasBody =
        request.method !== "HEAD" && status !== 204 && status !== 205 && status !== 304;
      const body = hasBody ? (Readable.toWeb(nodeResponse) as ReadableStream<Uint8Array>) : null;
      resolve(new Response(body, { status, headers }));
    });
    const abort = () => nodeRequest.destroy(new Error("request_aborted"));
    request.signal.addEventListener("abort", abort, { once: true });
    nodeRequest.once("close", () => request.signal.removeEventListener("abort", abort));
    nodeRequest.once("error", reject);
    nodeRequest.end();
  });

const isRedirect = (status: number): boolean => [301, 302, 303, 307, 308].includes(status);

const safeFetch = async (
  initialUrl: string,
  method: "HEAD" | "GET",
  signal: AbortSignal,
  options: Required<Pick<AuditSourceOptions, "maxRedirects">> & AuditSourceOptions,
): Promise<{ response: Response; finalUrl: URL }> => {
  let current = initialUrl;
  for (let redirect = 0; redirect <= options.maxRedirects; redirect += 1) {
    const target = await resolveSafeAuditTarget(current, options.lookup ?? dnsLookup);
    const response = await (options.requester ?? requestPinnedAuditTarget)(target, {
      signal,
      method,
      maxBytes: options.maxBytes ?? 65_536,
    });
    if (!isRedirect(response.status)) return { response, finalUrl: target.url };
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect_without_location");
    if (redirect === options.maxRedirects) throw new Error("too_many_redirects");
    current = new URL(location, target.url).toString();
  }
  throw new Error("too_many_redirects");
};

export const readLimitedResponseText = async (
  response: Response,
  maxBytes: number,
): Promise<string> => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("response_too_large");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
};

const statusFromHttp = (status: number): SourceAuditResult["status"] => {
  if (status === 401 || status === 403 || status === 451) return "forbidden_or_restricted";
  if (status === 404 || status === 410) return "dead";
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return "temporarily_unavailable";
  }
  return "network_error";
};

const streamType = (url: string, contentType: string | null): SourceAuditResult["streamType"] => {
  const mime = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mime?.includes("mpegurl") || url.toLowerCase().includes(".m3u8")) return "hls";
  if (mime?.startsWith("video/") || /\.(?:mp4|webm|ogv)(?:\?|$)/i.test(url)) return "video";
  return "unknown";
};

export const auditSource = async (
  source: AuditSourceInput,
  options: AuditSourceOptions = {},
): Promise<SourceAuditResult> => {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBytes = options.maxBytes ?? 65_536;
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const base = {
    id: source.id,
    url: source.url,
    checkedAt,
    responseStatus: null,
    contentType: null,
    streamType: "unknown" as const,
    manifestValid: null,
    redirectedTo: null,
  };
  try {
    const head = await safeFetch(source.url, "HEAD", controller.signal, {
      ...options,
      maxRedirects: options.maxRedirects ?? 3,
      maxBytes,
    });
    const responseStatus = head.response.status;
    const contentType = head.response.headers.get("content-type");
    const type = streamType(head.finalUrl.toString(), contentType);
    const redirectedTo = head.finalUrl.toString() === source.url ? null : head.finalUrl.toString();
    if (!head.response.ok && responseStatus !== 405 && responseStatus !== 501) {
      return {
        ...base,
        status: statusFromHttp(responseStatus),
        responseStatus,
        contentType,
        streamType: type,
        failureReason: `http_${responseStatus}`,
        redirectedTo,
      };
    }

    if (type === "hls" || responseStatus === 405 || responseStatus === 501) {
      const get = await safeFetch(source.url, "GET", controller.signal, {
        ...options,
        maxRedirects: options.maxRedirects ?? 3,
        maxBytes,
      });
      const getType = get.response.headers.get("content-type") ?? contentType;
      if (!get.response.ok) {
        return {
          ...base,
          status: statusFromHttp(get.response.status),
          responseStatus: get.response.status,
          contentType: getType,
          streamType: streamType(get.finalUrl.toString(), getType),
          manifestValid: false,
          failureReason: `http_${get.response.status}`,
          redirectedTo: get.finalUrl.toString() === source.url ? null : get.finalUrl.toString(),
        };
      }
      const body = await readLimitedResponseText(get.response, maxBytes);
      const manifestValid = /^#EXTM3U(?:\r?\n|$)/.test(body.trimStart());
      return {
        ...base,
        status: manifestValid ? "unknown" : "unsupported_format",
        responseStatus: get.response.status,
        contentType: getType,
        streamType: "hls",
        manifestValid,
        failureReason: manifestValid
          ? "manifest_valid_playback_unconfirmed"
          : "invalid_hls_manifest",
        redirectedTo: get.finalUrl.toString() === source.url ? null : get.finalUrl.toString(),
      };
    }

    return {
      ...base,
      status: "unknown",
      responseStatus,
      contentType,
      streamType: type,
      failureReason: "http_response_only_playback_unconfirmed",
      redirectedTo,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const inputFailure = new Set([
      "unsupported_protocol",
      "credentials_not_allowed",
      "private_destination",
      "Invalid URL",
    ]).has(reason);
    return {
      ...base,
      status: controller.signal.aborted
        ? "network_error"
        : inputFailure
          ? "invalid_url"
          : reason === "response_too_large"
            ? "unsupported_format"
            : "network_error",
      failureReason: controller.signal.aborted ? "timeout" : reason,
    };
  } finally {
    clearTimeout(timer);
  }
};

export const auditSources = async (
  sources: readonly AuditSourceInput[],
  options: AuditSourceOptions & { concurrency?: number } = {},
): Promise<SourceAuditResult[]> => {
  const results = new Array<SourceAuditResult>(sources.length);
  let cursor = 0;
  const concurrency = Math.min(3, Math.max(1, options.concurrency ?? 3));
  const worker = async () => {
    while (cursor < sources.length) {
      const index = cursor++;
      results[index] = await auditSource(sources[index]!, options);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker));
  return results;
};
