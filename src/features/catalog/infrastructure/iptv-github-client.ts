import { logger } from "@/lib/utils/logger";
import type { IptvStream } from "./schemas";
import { detectKind, isDangerousUrl, isValidHttpUrl } from "../application/normalize";

const BASE_RAW = "https://raw.githubusercontent.com/iptv-org/iptv/master/streams";
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 3_000_000;

const KV_RE = /([a-zA-Z0-9-]+)="([^"]*)"/g;

function parseCountryM3u(text: string, countryCode: string): IptvStream[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: IptvStream[] = [];
  const seen = new Set<string>();

  let pendingId: string | null = null;
  let pendingTitle: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      KV_RE.lastIndex = 0;
      const attrs: Record<string, string> = {};
      let m: RegExpExecArray | null;
      while ((m = KV_RE.exec(line)) !== null) attrs[m[1].toLowerCase()] = m[2];
      const comma = line.lastIndexOf(",");
      const displayName = comma >= 0 ? line.slice(comma + 1).trim() : "";
      pendingId = attrs["tvg-id"]?.trim() || null;
      pendingTitle = attrs["tvg-name"]?.trim() || displayName || null;
      continue;
    }

    if (line.startsWith("#")) continue;

    if (!isValidHttpUrl(line) || isDangerousUrl(line)) {
      pendingId = null;
      pendingTitle = null;
      continue;
    }

    const kind = detectKind(line);
    if (kind !== "hls" && kind !== "mp4") {
      pendingId = null;
      pendingTitle = null;
      continue;
    }

    const key = `${pendingId ?? ""}|${line}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({
        channel: pendingId ?? `github-${countryCode}-${out.length}`,
        feed: null,
        title: pendingTitle,
        url: line,
        display_order: null,
        quality: null,
        label: `GitHub/${countryCode.toUpperCase()}`,
        source_origin: "iptv-github",
      });
    }

    pendingId = null;
    pendingTitle = null;
  }

  return out;
}

export async function fetchIptvGithubCountryStreams(
  countryCode: string,
  fetcher: typeof fetch = fetch,
): Promise<IptvStream[]> {
  const code = countryCode.toLowerCase().replace(/[^a-z_]/g, "");
  if (!code) return [];

  const url = `${BASE_RAW}/${code}.m3u`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetcher(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      logger.warn("iptv-github country fetch non-200", { country: code, status: res.status });
      return [];
    }
    const text = await res.text();
    if (text.length > MAX_BYTES) {
      logger.warn("iptv-github country playlist too large", { country: code, bytes: text.length });
      return [];
    }
    const streams = parseCountryM3u(text, code);
    logger.info("iptv-github country streams loaded", { country: code, count: streams.length });
    return streams;
  } catch (err) {
    logger.warn("iptv-github country fetch failed", {
      country: code,
      message: err instanceof Error ? err.message : String(err),
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** List all available country M3U files from iptv-org/iptv GitHub. */
export async function listIptvGithubCountries(
  fetcher: typeof fetch = fetch,
): Promise<Array<{ name: string; path: string; countryCode: string }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetcher("https://api.github.com/repos/iptv-org/iptv/contents/streams", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item): item is { name: string; download_url: string } => typeof item === "object" && item !== null)
      .map((item) => ({
        name: item.name,
        path: item.name,
        countryCode: item.name.replace(/\.m3u$/, ""),
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
