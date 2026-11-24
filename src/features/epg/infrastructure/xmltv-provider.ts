import type {
  EpgProgram,
  EpgProvider,
  EpgProviderContext,
  EpgProviderResult,
} from "../domain/types";
import { parseXmltvPrograms } from "./xmltv-parser";

export type XmltvEpgProviderOptions = {
  id?: string;
  name?: string;
  feedUrl: string;
  allowedOrigins: readonly string[];
  maxBytes?: number;
  maxProgramsPerChannel?: number;
  cacheTtlMs?: number;
  fetchFn?: typeof fetch;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

const normalizeXmltvChannelId = (epgChannelId: string): string =>
  epgChannelId.startsWith("xmltv:") ? epgChannelId.slice("xmltv:".length) : epgChannelId;

const isAllowedHttpsFeedUrl = (feedUrl: string, allowedOrigins: readonly string[]): boolean => {
  try {
    const parsed = new URL(feedUrl);
    if (parsed.protocol !== "https:") return false;
    return allowedOrigins.some((origin) => {
      try {
        return new URL(origin).origin === parsed.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

/**
 * XMLTV provider conforming to `docs/EPG_ARCHITECTURE.md`:
 * - HTTPS only with explicit origin allow-list
 * - Honors AbortSignal and enforces max payload byte size
 * - Parses and validates XMLTV schedules without exposing private URLs or errors
 */
export class XmltvEpgProvider implements EpgProvider {
  readonly id: string;
  private readonly name: string;
  private readonly feedUrl: string;
  private readonly allowedOrigins: readonly string[];
  private readonly maxBytes: number;
  private readonly maxProgramsPerChannel: number;
  private readonly cacheTtlMs: number;
  private readonly fetchFn: typeof fetch;

  private cachedCatalog: {
    byChannel: Map<string, EpgProgram[]>;
    updatedAt: string;
    fetchedAtMs: number;
  } | null = null;

  constructor(options: XmltvEpgProviderOptions) {
    this.id = options.id ?? "xmltv-remote";
    this.name = options.name ?? "Guide XMLTV";
    this.feedUrl = options.feedUrl;
    this.allowedOrigins = options.allowedOrigins;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxProgramsPerChannel = options.maxProgramsPerChannel ?? 96;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async load(
    epgChannelId: string,
    { signal, now }: EpgProviderContext,
  ): Promise<EpgProviderResult | null> {
    if (signal.aborted) {
      throw new DOMException("EPG request aborted", "AbortError");
    }
    if (epgChannelId.startsWith("fixture:")) {
      return null;
    }
    if (!isAllowedHttpsFeedUrl(this.feedUrl, this.allowedOrigins)) {
      throw new Error("EPG feed URL origin or protocol is not allowed");
    }

    const targetChannelId = normalizeXmltvChannelId(epgChannelId);
    if (!targetChannelId) return null;

    const catalog = await this.getOrFetchCatalog(signal, now);
    const programs = catalog.byChannel.get(targetChannelId) ?? [];

    return {
      programs,
      source: {
        id: this.id,
        name: this.name,
        kind: "remote",
      },
      updatedAt: catalog.updatedAt,
    };
  }

  private async getOrFetchCatalog(
    signal: AbortSignal,
    now: Date,
  ): Promise<{ byChannel: Map<string, EpgProgram[]>; updatedAt: string }> {
    if (this.cachedCatalog && now.getTime() - this.cachedCatalog.fetchedAtMs <= this.cacheTtlMs) {
      return this.cachedCatalog;
    }

    const response = await this.fetchFn(this.feedUrl, {
      method: "GET",
      signal,
      headers: {
        accept: "application/xml, text/xml;q=0.9, */*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`XMLTV feed returned HTTP ${response.status}`);
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > this.maxBytes) {
        throw new Error("XMLTV payload exceeds maximum allowed size");
      }
    }

    const xml = await this.readBoundedText(response, signal);
    const byChannel = parseXmltvPrograms(xml, {
      maxProgramsPerChannel: this.maxProgramsPerChannel,
    });
    const updatedAt = now.toISOString();

    this.cachedCatalog = {
      byChannel,
      updatedAt,
      fetchedAtMs: now.getTime(),
    };

    return this.cachedCatalog;
  }

  private async readBoundedText(response: Response, signal: AbortSignal): Promise<string> {
    if (!response.body) {
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > this.maxBytes) {
        throw new Error("XMLTV payload exceeds maximum allowed size");
      }
      return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const chunks: string[] = [];
    let receivedBytes = 0;

    try {
      while (true) {
        if (signal.aborted) {
          throw new DOMException("EPG request aborted", "AbortError");
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.byteLength;
          if (receivedBytes > this.maxBytes) {
            await reader.cancel();
            throw new Error("XMLTV payload exceeds maximum allowed size");
          }
          chunks.push(decoder.decode(value, { stream: true }));
        }
      }
      chunks.push(decoder.decode());
      return chunks.join("");
    } finally {
      reader.releaseLock();
    }
  }
}

/**
 * Composite provider that routes `fixture:*` identifiers to the deterministic
 * local fixture provider and other identifiers to the secondary provider (e.g. XMLTV).
 */
export class CompositeEpgProvider implements EpgProvider {
  readonly id = "mjtv-composite";

  constructor(private readonly providers: readonly EpgProvider[]) {}

  async load(epgChannelId: string, context: EpgProviderContext): Promise<EpgProviderResult | null> {
    for (const provider of this.providers) {
      const result = await provider.load(epgChannelId, context);
      if (result !== null) return result;
    }
    return null;
  }
}
