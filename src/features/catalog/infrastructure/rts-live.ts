import {
  getRtsFeed,
  rtsMetadataUrl,
  rtsFeedForChannel,
  type RtsFeedKey,
} from "../domain/official-streams";
import type { NormalizedStream } from "../domain/types";

const MAX_METADATA_BYTES = 16_384;
const CACHE_MS = 30_000;

/** Viewer-side resolution: provider playback URLs must be obtained by the viewing client. */
export const createRtsLiveResolver = (
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) => {
  const cache = new Map<RtsFeedKey, { url: string; expiresAt: number }>();
  const pending = new Map<RtsFeedKey, Promise<string>>();

  const requestSource = async (key: RtsFeedKey): Promise<string> => {
    const feed = getRtsFeed(key)!;
    const response = await fetcher(rtsMetadataUrl(key), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error("rts_source_unavailable");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > MAX_METADATA_BYTES) throw new Error("rts_metadata_too_large");
        chunks.push(next.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object") throw new Error("rts_invalid_metadata");
    const value =
      "web_url" in data && typeof data.web_url === "string"
        ? data.web_url
        : "direct_url" in data && typeof data.direct_url === "string"
          ? data.direct_url
          : null;
    if (!value || value.length > 4096) throw new Error("rts_invalid_url");
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "live1.acangroup.org" ||
      url.port !== "1929" ||
      url.pathname !== feed.playlistPath ||
      url.username ||
      url.password ||
      url.hash ||
      !url.searchParams.get("wmsAuthSign") ||
      [...url.searchParams.keys()].some((key) => key !== "wmsAuthSign")
    )
      throw new Error("rts_invalid_url");
    return url.toString();
  };

  return async (value: string): Promise<string> => {
    if (!getRtsFeed(value)) throw new Error("rts_unknown_feed");
    const key = value as RtsFeedKey;
    const existing = cache.get(key);
    if (existing && existing.expiresAt > now()) return existing.url;
    const inflight = pending.get(key);
    if (inflight) return inflight;
    const task = requestSource(key)
      .then((url) => {
        cache.set(key, { url, expiresAt: now() + CACHE_MS });
        return url;
      })
      .catch(() => {
        throw new Error("rts_source_unavailable");
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
};

export const resolveRtsLiveUrl = createRtsLiveResolver();

export async function resolveOfficialPlaybackStream(
  stream: NormalizedStream,
  channelId: string,
): Promise<NormalizedStream> {
  if (stream.resolver !== "rts") return stream;
  const feed = rtsFeedForChannel(channelId);
  if (!feed || stream.url !== rtsMetadataUrl(feed)) throw new Error("rts_unknown_feed");
  return { ...stream, url: await resolveRtsLiveUrl(feed) };
}
