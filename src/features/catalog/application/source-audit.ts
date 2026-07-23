import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
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
  fetcher?: typeof fetch;
  lookup?: typeof dnsLookup;
  now?: () => Date;
};

const ipv4Parts = (value: string): number[] | null => {
  if (isIP(value) !== 4) return null;
  return value.split(".").map(Number);
};

export const isPrivateOrReservedIp = (value: string): boolean => {
  const normalized = value.toLowerCase().split("%")[0]!;
  const ipv4 = ipv4Parts(normalized);
  if (ipv4) {
    const [a, b] = ipv4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b! >= 64 && b! <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && b === 168) ||
      a! >= 224
    );
  }
  if (isIP(normalized) !== 6) return true;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("::ffff:")) {
    return isPrivateOrReservedIp(normalized.slice("::ffff:".length));
  }
  return false;
};

export const assertSafeAuditUrl = async (
  value: string,
  lookup: typeof dnsLookup = dnsLookup,
): Promise<URL> => {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("unsupported_protocol");
  }
  if (url.username || url.password) throw new Error("credentials_not_allowed");
  if (url.hostname.toLowerCase() === "localhost" || url.hostname.endsWith(".localhost")) {
    throw new Error("private_destination");
  }
  if (isIP(url.hostname)) {
    if (isPrivateOrReservedIp(url.hostname)) throw new Error("private_destination");
    return url;
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
    throw new Error("private_destination");
  }
  return url;
};

const isRedirect = (status: number): boolean => [301, 302, 303, 307, 308].includes(status);

const safeFetch = async (
  initialUrl: string,
  method: "HEAD" | "GET",
  signal: AbortSignal,
  options: Required<Pick<AuditSourceOptions, "maxRedirects">> & AuditSourceOptions,
): Promise<{ response: Response; finalUrl: URL }> => {
  let current = initialUrl;
  for (let redirect = 0; redirect <= options.maxRedirects; redirect += 1) {
    const safeUrl = await assertSafeAuditUrl(current, options.lookup ?? dnsLookup);
    const response = await (options.fetcher ?? fetch)(safeUrl, {
      method,
      redirect: "manual",
      signal,
      cache: "no-store",
      headers: {
        "user-agent": "MJTV-Source-Audit/1.0 (+https://github.com/eulogep/Euloge-tv)",
        ...(method === "GET" ? { range: `bytes=0-${(options.maxBytes ?? 65_536) - 1}` } : {}),
      },
    });
    if (!isRedirect(response.status)) return { response, finalUrl: safeUrl };
    const location = response.headers.get("location");
    if (!location) throw new Error("redirect_without_location");
    if (redirect === options.maxRedirects) throw new Error("too_many_redirects");
    current = new URL(location, safeUrl).toString();
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
