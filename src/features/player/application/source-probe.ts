import type { NormalizedStream, SourceAvailabilityStatus } from "@/features/catalog/domain/types";

export type SourceProbeResult = {
  status: SourceAvailabilityStatus;
  checkedAt: string;
  failureReason: string | null;
  responseStatus: number | null;
  detectedContentType: string | null;
};

export type SourceProbeOptions = {
  timeoutMs?: number;
  fetcher?: typeof fetch;
  now?: () => Date;
};

const statusFromResponse = (status: number): SourceAvailabilityStatus => {
  if (status === 401 || status === 403 || status === 451) return "forbidden_or_restricted";
  if (status === 404 || status === 410) return "temporarily_unavailable";
  if (status === 408 || status === 504) return "timeout";
  return "network_error";
};

export const probeSource = async (
  stream: Pick<NormalizedStream, "url">,
  options: SourceProbeOptions = {},
): Promise<SourceProbeResult> => {
  const now = options.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  let parsed: URL;
  try {
    parsed = new URL(stream.url);
  } catch {
    return {
      status: "invalid_url",
      checkedAt,
      failureReason: "invalid_url",
      responseStatus: null,
      detectedContentType: null,
    };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      status: "invalid_url",
      checkedAt,
      failureReason: "unsupported_protocol",
      responseStatus: null,
      detectedContentType: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000);
  try {
    const response = await (options.fetcher ?? fetch)(stream.url, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    const detectedContentType = response.headers.get("content-type");
    if (response.ok || response.status === 405 || response.status === 501) {
      return {
        status: "unknown",
        checkedAt,
        failureReason: null,
        responseStatus: response.status,
        detectedContentType,
      };
    }
    return {
      status: statusFromResponse(response.status),
      checkedAt,
      failureReason: `http_${response.status}`,
      responseStatus: response.status,
      detectedContentType,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        status: "timeout",
        checkedAt,
        failureReason: "probe_timeout",
        responseStatus: null,
        detectedContentType: null,
      };
    }
    // A CORS-blocked HEAD request does not prove that native media playback
    // will fail. Preserve the diagnostic but allow the playback attempt.
    return {
      status: "unknown",
      checkedAt,
      failureReason: "probe_unavailable",
      responseStatus: null,
      detectedContentType: null,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const isDefinitiveProbeFailure = (status: SourceAvailabilityStatus): boolean =>
  status !== "unknown" && status !== "checking" && status !== "playable";
