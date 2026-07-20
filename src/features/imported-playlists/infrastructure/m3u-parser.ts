import { APP_CONFIG } from "@/config/app";
import { ValidationError } from "@/lib/errors";
import { isDangerousUrl } from "@/features/catalog/application/normalize";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import type { ImportedChannel } from "../domain/types";

export type ParsedM3uEntry = {
  name: string;
  url: string;
  logo: string | null;
  group: string | null;
  countryCode: string | null;
  languageCode: string | null;
  tvgId: string | null;
  tvgName: string | null;
  requiresReferrer: boolean;
  requiresCustomUserAgent: boolean;
  referrer: string | null;
  userAgent: string | null;
};

export type ParseResult = {
  entries: ParsedM3uEntry[];
  /** Lines that looked like entries but were rejected. */
  rejected: { line: string; reason: string }[];
};

const KV_PATTERN = /([a-zA-Z0-9-]+)="([^"]*)"/g;

const parseExtInfAttrs = (line: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const match = line.match(/^#EXTINF:(?:(-?\d+(?:\.\d+)?)),?(.*)$/i);
  if (!match) return attrs;
  const rest = (match[2] ?? "").trim();

  if (rest.length === 0) return attrs;

  // Detect whether the rest starts with attributes (key="value" pattern).
  const hasAttrs = /^[a-zA-Z0-9-]+="/.test(rest);

  if (hasAttrs) {
    // Find the LAST comma that's NOT inside quotes — that separates
    // attributes from the display name.
    let inQuotes = false;
    let commaIdx = -1;
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === "," && !inQuotes) commaIdx = i;
    }
    const attrPart = commaIdx >= 0 ? rest.slice(0, commaIdx) : rest;
    const namePart = commaIdx >= 0 ? rest.slice(commaIdx + 1) : "";
    if (namePart) attrs["__name__"] = namePart.trim();
    let m: RegExpExecArray | null;
    KV_PATTERN.lastIndex = 0;
    while ((m = KV_PATTERN.exec(attrPart)) !== null) {
      attrs[m[1].toLowerCase()] = m[2];
    }
  } else {
    // No attributes — the whole rest is the display name.
    attrs["__name__"] = rest;
  }
  return attrs;
};

const detectKind = (url: string): "hls" | "mp4" | "unknown" => {
  const lower = url.toLowerCase();
  if (lower.endsWith(".m3u8") || lower.includes(".m3u8?") || lower.includes("m3u8")) return "hls";
  if (lower.endsWith(".mp4") || lower.includes(".mp4?")) return "mp4";
  if (lower.endsWith(".webm") || lower.includes(".webm?")) return "mp4";
  return "unknown";
};

const detectProtocol = (url: string): "https" | "http" | "other" => {
  if (url.startsWith("https://")) return "https";
  if (url.startsWith("http://")) return "http";
  return "other";
};

/**
 * Parse a .m3u / .m3u8 playlist. Pure function — safe to unit-test without
 * any browser or server. Handles CRLF and LF, ignores unknown comments,
 * never executes file content, refuses dangerous protocols.
 */
export const parseM3u = (content: string): ParseResult => {
  if (!content || !content.trim()) {
    return { entries: [], rejected: [] };
  }
  const normalised = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalised.split("\n");
  const entries: ParsedM3uEntry[] = [];
  const rejected: { line: string; reason: string }[] = [];

  if (!lines[0]?.trim().startsWith("#EXTM3U")) {
    // Tolerate missing header — some real-world playlists omit it.
  }

  let pending: Partial<ParsedM3uEntry> & { referrer?: string | null; userAgent?: string | null } =
    {};
  let havePending = false;

  const flush = (urlLine: string) => {
    const url = urlLine.trim();
    if (!url) return;
    if (isDangerousUrl(url)) {
      rejected.push({ line: url, reason: "Protocole dangereux" });
      pending = {};
      havePending = false;
      return;
    }
    const protocol = detectProtocol(url);
    if (protocol === "other") {
      rejected.push({ line: url, reason: "Protocole non pris en charge" });
      pending = {};
      havePending = false;
      return;
    }
    const name = (pending.name ?? pending.tvgName ?? "Chaîne importée").trim();
    const entry: ParsedM3uEntry = {
      name,
      url,
      logo: pending.logo ?? null,
      group: pending.group ?? null,
      countryCode: pending.countryCode ?? null,
      languageCode: pending.languageCode ?? null,
      tvgId: pending.tvgId ?? null,
      tvgName: pending.tvgName ?? null,
      requiresReferrer: !!pending.referrer,
      requiresCustomUserAgent: !!pending.userAgent,
      referrer: pending.referrer ?? null,
      userAgent: pending.userAgent ?? null,
    };
    entries.push(entry);
    pending = {};
    havePending = false;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTM3U")) continue;
    if (line.startsWith("#EXTINF")) {
      const attrs = parseExtInfAttrs(line);
      pending = {
        name: attrs["__name__"] ?? undefined,
        tvgId: attrs["tvg-id"] ?? null,
        tvgName: attrs["tvg-name"] ?? null,
        logo: attrs["tvg-logo"] ?? null,
        group: attrs["group-title"] ?? null,
        countryCode: attrs["tvg-country"] ?? null,
        languageCode: attrs["tvg-language"] ?? null,
      };
      havePending = true;
      continue;
    }
    if (line.startsWith("#EXTVLCOPT:")) {
      const opt = line.slice("#EXTVLCOPT:".length).trim();
      const [key, ...rest] = opt.split("=");
      const value = rest.join("=").replace(/^"(.*)"$/, "$1");
      if (key.toLowerCase() === "http-referrer") {
        pending.referrer = value;
      } else if (key.toLowerCase() === "http-user-agent") {
        pending.userAgent = value;
      }
      // Unknown EXTVLCOPT keys are ignored.
      continue;
    }
    if (line.startsWith("#")) {
      // Unknown comment — ignore.
      continue;
    }
    // URL line.
    flush(line);
  }

  if (havePending) {
    rejected.push({ line: "[EXTINF sans URL]", reason: "Entrée incomplète" });
  }

  return { entries, rejected };
};

export const toImportedChannel = (
  entry: ParsedM3uEntry,
  playlistId: string,
  idx: number,
): ImportedChannel => {
  const kind = detectKind(entry.url);
  const protocol = detectProtocol(entry.url);
  const channelId = `${playlistId}:${idx}:${entry.tvgId ?? entry.name}`;
  return {
    id: channelId,
    name: entry.name,
    logoUrl: entry.logo,
    countryCode: entry.countryCode,
    categories: entry.group ? [entry.group] : [],
    languageCodes: entry.languageCode ? [entry.languageCode] : [],
    sourceUrl: entry.url,
    requiresReferrer: entry.requiresReferrer,
    requiresCustomUserAgent: entry.requiresCustomUserAgent,
    streams: [
      {
        id: `${channelId}:stream`,
        url: entry.url,
        title: entry.name,
        quality: null,
        label: null,
        feedId: null,
        protocol,
        kind,
        requiresReferrer: entry.requiresReferrer,
        requiresCustomUserAgent: entry.requiresCustomUserAgent,
        browserCompatibility:
          entry.requiresReferrer || entry.requiresCustomUserAgent
            ? "limited"
            : protocol === "http"
              ? "limited"
              : kind === "unknown"
                ? "unknown"
                : "preferred",
        availability: createUnknownSourceAvailability(),
      },
    ],
  };
};

export const validatePlaylistSize = (size: number): void => {
  if (size > APP_CONFIG.maxPlaylistBytes) {
    throw new ValidationError(
      `Playlist trop volumineuse (max ${APP_CONFIG.maxPlaylistBytes} octets).`,
    );
  }
};
