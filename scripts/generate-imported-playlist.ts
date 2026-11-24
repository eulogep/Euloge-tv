import { writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fetchFreeTvStreams } from "../src/features/catalog/infrastructure/free-tv-client";

const IPTV_ORG_BASE = "https://iptv-org.github.io/api";
const USER_AGENT = "MJTV-Playlist-Generator/1.0 (+https://github.com/eulogep/Euloge-tv)";
const DEFAULT_COUNTRIES = ["DE", "FR", "GB", "US", "SN"];
const DEFAULT_LIMIT_PER_COUNTRY = 30;
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  "src/features/imported-playlists/infrastructure/generated-playlist.m3u",
);

export type RawChannel = {
  id: string;
  name: string;
  country: string | null;
  categories?: string[] | null;
  is_nsfw?: boolean;
  closed?: string | null;
};

export type RawStream = {
  channel: string | null;
  url: string;
  quality?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
};

export type RawLogo = {
  channel: string;
  url: string;
};

export type RawBlocklistEntry = {
  channel: string;
};

export type BuildPlaylistOptions = {
  channels: readonly RawChannel[];
  streams: readonly RawStream[];
  logos: readonly RawLogo[];
  blocklist: readonly RawBlocklistEntry[];
  countries?: readonly string[];
  limitPerCountry?: number;
};

const sanitizeAttr = (value: string): string => value.replace(/["\r\n]/g, " ").trim();

const isSafeHttpUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const streamScore = (stream: RawStream): number => {
  let score = 0;
  if (stream.url.startsWith("https://")) score += 4;
  if (stream.url.toLowerCase().includes(".m3u8")) score += 3;
  if (!stream.referrer && !stream.user_agent) score += 2;
  if (stream.quality?.includes("1080")) score += 2;
  else if (stream.quality?.includes("720")) score += 1;
  return score;
};

/**
 * Build a valid #EXTM3U playlist from public iptv-org datasets, filtering out
 * NSFW, closed, blocklisted, and non-HTTP(S) entries.
 */
export const buildM3uPlaylist = ({
  channels,
  streams,
  logos,
  blocklist,
  countries = DEFAULT_COUNTRIES,
  limitPerCountry = DEFAULT_LIMIT_PER_COUNTRY,
}: BuildPlaylistOptions): { m3u: string; count: number } => {
  const blockedIds = new Set(blocklist.map((b) => b.channel));
  const allowedCountries = new Set(countries.map((c) => c.toUpperCase()));

  const logoByChannel = new Map<string, string>();
  for (const logo of logos) {
    if (logo.channel && isSafeHttpUrl(logo.url) && !logoByChannel.has(logo.channel)) {
      logoByChannel.set(logo.channel, logo.url);
    }
  }

  const bestStreamByChannel = new Map<string, RawStream>();
  for (const stream of streams) {
    if (!stream.channel || !isSafeHttpUrl(stream.url)) continue;
    // Skip streams that require custom Referrer or User-Agent headers in browsers.
    if (stream.referrer || stream.user_agent) continue;
    const prev = bestStreamByChannel.get(stream.channel);
    if (!prev || streamScore(stream) > streamScore(prev)) {
      bestStreamByChannel.set(stream.channel, stream);
    }
  }

  const lines = ["#EXTM3U"];
  const countsByCountry = new Map<string, number>();
  let total = 0;

  for (const channel of channels) {
    if (channel.is_nsfw || channel.closed || blockedIds.has(channel.id)) continue;
    const country = channel.country?.toUpperCase() ?? "";
    if (allowedCountries.size > 0 && !allowedCountries.has(country)) continue;

    const currentCount = countsByCountry.get(country) ?? 0;
    if (currentCount >= limitPerCountry) continue;

    const stream = bestStreamByChannel.get(channel.id);
    if (!stream) continue;

    countsByCountry.set(country, currentCount + 1);
    total += 1;

    const attrs: string[] = [
      `tvg-id="${sanitizeAttr(channel.id)}"`,
      `tvg-name="${sanitizeAttr(channel.name)}"`,
    ];
    const logoUrl = logoByChannel.get(channel.id);
    if (logoUrl) attrs.push(`tvg-logo="${sanitizeAttr(logoUrl)}"`);
    if (country) attrs.push(`tvg-country="${sanitizeAttr(country)}"`);
    const group = channel.categories?.[0];
    if (group) attrs.push(`group-title="${sanitizeAttr(group)}"`);

    lines.push(`#EXTINF:-1 ${attrs.join(" ")},${sanitizeAttr(channel.name)}`);
    lines.push(stream.url);
  }

  return { m3u: `${lines.join("\n")}\n`, count: total };
};

const parseArg = (args: string[], prefix: string): string | undefined => {
  const exact = args.find((a) => a.startsWith(`${prefix}=`));
  return exact ? exact.slice(prefix.length + 1) : undefined;
};

const fetchJson = async <T>(endpoint: string): Promise<T> => {
  const res = await fetch(`${IPTV_ORG_BASE}/${endpoint}`, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}: HTTP ${res.status}`);
  return (await res.json()) as T;
};

async function main() {
  const args = process.argv.slice(2);
  const countriesArg = parseArg(args, "--countries");
  const limitArg = parseArg(args, "--limit");
  const outArg = parseArg(args, "--out");

  const countries = countriesArg
    ? countriesArg
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
    : DEFAULT_COUNTRIES;
  const limitPerCountry = limitArg
    ? Math.max(1, Number(limitArg) || DEFAULT_LIMIT_PER_COUNTRY)
    : DEFAULT_LIMIT_PER_COUNTRY;
  const outputPath = outArg ? path.resolve(process.cwd(), outArg) : DEFAULT_OUTPUT;

  const [channels, iptvStreams, freeTvStreams, logos, blocklist] = await Promise.all([
    fetchJson<RawChannel[]>("channels.json"),
    fetchJson<RawStream[]>("streams.json"),
    fetchFreeTvStreams(),
    fetchJson<RawLogo[]>("logos.json"),
    fetchJson<RawBlocklistEntry[]>("blocklist.json"),
  ]);

  const streams: RawStream[] = [
    ...iptvStreams,
    ...freeTvStreams.map((s) => ({
      channel: s.channel,
      url: s.url,
      quality: s.quality ?? null,
    })),
  ];

  const { m3u, count } = buildM3uPlaylist({
    channels,
    streams,
    logos,
    blocklist,
    countries,
    limitPerCountry,
  });

  await writeFile(outputPath, m3u, "utf8");
  console.log(
    `Generated ${count} public IPTV entries (iptv-org + Free-TV; ${countries.join(", ")}) -> ${outputPath}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
