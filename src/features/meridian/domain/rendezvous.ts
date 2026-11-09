/**
 * A rendezvous is one instant, carried in a link. Everyone reads it in their own
 * time zone. There is no server and no session: each viewer watches the same live
 * channel on their side, so nothing here claims frame-accurate sync.
 */

const MIN_INSTANT = Date.UTC(2020, 0, 1);
const MAX_INSTANT = Date.UTC(2100, 0, 1);
/** How long after its start a rendezvous is still "on". */
const ONGOING_MS = 3 * 60 * 60_000;

export const parseRendezvous = (value: string | null | undefined): number | undefined => {
  if (!value || !/^\d{10,14}$/.test(value)) return undefined;
  const instant = Number(value);
  return instant >= MIN_INSTANT && instant <= MAX_INSTANT ? instant : undefined;
};

const zonedMinutes = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") * 60 + read("minute");
};

/** The next time a clock in `timeZone` reads hour:minute, re-checked across a DST change. */
export const nextOccurrence = (
  from: Date,
  hour: number,
  minute: number,
  timeZone: string,
): number => {
  const start = Math.floor(from.getTime() / 60_000) * 60_000;
  const target = hour * 60 + minute;
  const distance = (at: number) =>
    (target - zonedMinutes(new Date(at), timeZone) + 1440) % 1440 || 1440;
  const first = start + distance(start) * 60_000;
  const drift = (target - zonedMinutes(new Date(first), timeZone) + 1440) % 1440;
  return first + (drift > 720 ? drift - 1440 : drift) * 60_000;
};

export type RendezvousPhase = "upcoming" | "ongoing" | "past";

export const rendezvousPhase = (instant: number, now: number): RendezvousPhase =>
  now < instant ? "upcoming" : now - instant <= ONGOING_MS ? "ongoing" : "past";

export const formatDelay = (milliseconds: number): string => {
  const total = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(total / 1440);
  if (days >= 1) return days === 1 ? "demain ou presque" : `dans ${days} jours`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `dans ${minutes} min`;
  return minutes === 0 ? `dans ${hours} h` : `dans ${hours} h ${String(minutes).padStart(2, "0")}`;
};

export const formatInstant = (instant: number, timeZone?: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));

export const rendezvousUrl = (origin: string, channelId: string, instant: number): string =>
  `${origin}/?view=watch&channel=${encodeURIComponent(channelId)}&rdv=${instant}`;

const icsStamp = (instant: number): string =>
  new Date(instant)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const icsText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/([;,])/g, "\\$1")
    .replace(/\r?\n/g, "\\n");

export const rendezvousIcs = (input: {
  channelId: string;
  channelName: string;
  instant: number;
  url: string;
  now: number;
}): string =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MJTV//Rendez-vous//FR",
    "BEGIN:VEVENT",
    `UID:${input.instant}-${input.channelId.replace(/[^\w.-]/g, "")}@mjtv`,
    `DTSTAMP:${icsStamp(input.now)}`,
    `DTSTART:${icsStamp(input.instant)}`,
    `DTEND:${icsStamp(input.instant + 60 * 60_000)}`,
    `SUMMARY:${icsText(`${input.channelName} sur MJTV`)}`,
    `DESCRIPTION:${icsText(input.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
