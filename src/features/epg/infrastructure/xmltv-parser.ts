import type { EpgProgram } from "../domain/types";
import { isValidProgram } from "../application/programs";

const XML_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
};

export const decodeXmlText = (raw: string): string =>
  raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_match, dec: string) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (entity) => XML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();

/**
 * Parse an XMLTV timestamp (`YYYYMMDDHHmmss [±HHMM]` or `YYYYMMDDHHmm`) into an ISO 8601 UTC string.
 * Returns null when the timestamp is malformed.
 */
export const parseXmltvTimestamp = (raw: string): string | null => {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\s*([+-]\d{4}|Z|UTC|GMT))?$/i,
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const tzPart = match[7]?.toUpperCase() ?? "Z";

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  let offsetMinutes = 0;
  if (tzPart !== "Z" && tzPart !== "UTC" && tzPart !== "GMT") {
    const sign = tzPart.startsWith("-") ? -1 : 1;
    const tzHours = Number(tzPart.slice(1, 3));
    const tzMins = Number(tzPart.slice(3, 5));
    if (tzHours > 14 || tzMins > 59) return null;
    offsetMinutes = sign * (tzHours * 60 + tzMins);
  }

  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
  if (!Number.isFinite(utcMs)) return null;
  return new Date(utcMs).toISOString();
};

const extractAttribute = (tagAttrs: string, attrName: string): string | null => {
  const regex = new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = tagAttrs.match(regex);
  return match ? decodeXmlText(match[1]) : null;
};

const extractFirstTagContent = (innerXml: string, tagName: string): string | null => {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = innerXml.match(regex);
  if (!match) return null;
  const decoded = decodeXmlText(match[1]);
  return decoded.length > 0 ? decoded : null;
};

export type ParseXmltvOptions = {
  maxProgramsPerChannel?: number;
  maxTotalPrograms?: number;
};

/**
 * Pure, dependency-free XMLTV `<programme>` parser.
 * Never evaluates scripts or external DTD entities.
 */
export const parseXmltvPrograms = (
  xml: string,
  options: ParseXmltvOptions = {},
): Map<string, EpgProgram[]> => {
  const maxProgramsPerChannel = options.maxProgramsPerChannel ?? 96;
  const maxTotalPrograms = options.maxTotalPrograms ?? 10_000;
  const programsByChannel = new Map<string, EpgProgram[]>();

  if (!xml || !xml.includes("<programme")) {
    return programsByChannel;
  }

  const programmeRegex = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;
  let match: RegExpExecArray | null;
  let totalAccepted = 0;

  while ((match = programmeRegex.exec(xml)) !== null) {
    if (totalAccepted >= maxTotalPrograms) break;

    const attrs = match[1] ?? "";
    const body = match[2] ?? "";

    const channelId = extractAttribute(attrs, "channel");
    const rawStart = extractAttribute(attrs, "start");
    const rawStop = extractAttribute(attrs, "stop");
    if (!channelId || !rawStart || !rawStop) continue;

    const existing = programsByChannel.get(channelId);
    if (existing && existing.length >= maxProgramsPerChannel) continue;

    const startAt = parseXmltvTimestamp(rawStart);
    const endAt = parseXmltvTimestamp(rawStop);
    const title = extractFirstTagContent(body, "title");
    if (!startAt || !endAt || !title) continue;

    const description = extractFirstTagContent(body, "desc") ?? undefined;
    const program: EpgProgram = {
      title,
      ...(description ? { description } : {}),
      startAt,
      endAt,
    };

    if (!isValidProgram(program)) continue;

    if (existing) {
      existing.push(program);
    } else {
      programsByChannel.set(channelId, [program]);
    }
    totalAccepted += 1;
  }

  for (const [channelId, list] of programsByChannel.entries()) {
    list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    programsByChannel.set(channelId, list);
  }

  return programsByChannel;
};
