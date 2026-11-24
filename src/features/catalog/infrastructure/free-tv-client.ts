import { logger } from "@/lib/utils/logger";
import { detectKind, isDangerousUrl, isValidHttpUrl } from "../application/normalize";
import type { IptvStream } from "./schemas";

export const FREE_TV_PLAYLIST_URL =
  "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8";

const TIMEOUT_MS = 8000;
const MAX_PLAYLIST_BYTES = 2_500_000;
const NON_DIRECT_HOST_RE =
  /(?:^|\.)(?:youtube\.com|youtu\.be|twitch\.tv|dailymotion\.com|vimeo\.com)$/i;
const KV_RE = /([a-zA-Z0-9-]+)="([^"]*)"/g;
const CLEAN_TITLE_RE = /\s*[ⓈⒼⓎⓉⒻ]+\s*/g;

const isDirectPlayableUrl = (rawUrl: string): boolean => {
  if (!isValidHttpUrl(rawUrl) || isDangerousUrl(rawUrl)) return false;
  try {
    const parsed = new URL(rawUrl);
    if (NON_DIRECT_HOST_RE.test(parsed.hostname)) return false;
  } catch {
    return false;
  }
  const kind = detectKind(rawUrl);
  return kind === "hls" || kind === "mp4";
};

/**
 * Parse the public Free-TV/IPTV M3U8 playlist into IptvStream entries keyed by
 * `tvg-id`. Only direct HTTP(S) HLS/MP4 streams without custom header
 * requirements are kept.
 */
export const parseFreeTvStreams = (content: string): IptvStream[] => {
  if (!content || !content.trim()) return [];
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: IptvStream[] = [];
  const seen = new Set<string>();

  let pendingChannelId: string | null = null;
  let pendingTitle: string | null = null;
  let hasHeaderRestriction = false;

  const reset = () => {
    pendingChannelId = null;
    pendingTitle = null;
    hasHeaderRestriction = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      reset();
      const attrs: Record<string, string> = {};
      KV_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = KV_RE.exec(line)) !== null) {
        attrs[match[1].toLowerCase()] = match[2];
      }
      const commaIdx = line.lastIndexOf(",");
      const displayName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      pendingChannelId = attrs["tvg-id"]?.trim() || null;
      const rawTitle = (attrs["tvg-name"]?.trim() || displayName || "")
        .replace(CLEAN_TITLE_RE, " ")
        .trim();
      pendingTitle = rawTitle || null;
      continue;
    }

    if (line.startsWith("#EXTVLCOPT:")) {
      const opt = line.slice("#EXTVLCOPT:".length).trim().toLowerCase();
      if (opt.startsWith("http-referrer=") || opt.startsWith("http-user-agent=")) {
        hasHeaderRestriction = true;
      }
      continue;
    }

    if (line.startsWith("#")) continue;

    if (pendingChannelId && !hasHeaderRestriction && isDirectPlayableUrl(line)) {
      const dedupeKey = `${pendingChannelId}|${line}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        out.push({
          channel: pendingChannelId,
          feed: null,
          title: pendingTitle,
          url: line,
          display_order: null,
          quality: null,
          label: "Free-TV",
          source_origin: "free-tv",
        });
      }
    }
    reset();
  }

  return out;
};

/**
 * Best-effort fetch of public Free-To-Air backup streams from Free-TV/IPTV.
 * Always fails open (returns `[]`) so the primary iptv-org catalog is never
 * disrupted.
 */
export async function fetchFreeTvStreams(fetcher: typeof fetch = fetch): Promise<IptvStream[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(FREE_TV_PLAYLIST_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("free-tv fetch non-200", { status: res.status });
      return [];
    }
    const text = await res.text();
    if (text.length > MAX_PLAYLIST_BYTES) {
      logger.warn("free-tv playlist exceeded byte budget", { length: text.length });
      return [];
    }
    const streams = parseFreeTvStreams(text);
    logger.info("free-tv streams loaded", { count: streams.length });
    return streams;
  } catch (err) {
    logger.warn("free-tv fetch failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}
