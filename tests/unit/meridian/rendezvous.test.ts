import { describe, expect, it } from "vitest";
import {
  formatDelay,
  nextOccurrence,
  parseRendezvous,
  rendezvousIcs,
  rendezvousPhase,
  rendezvousUrl,
} from "@/features/meridian/domain/rendezvous";
import { appViewFromUrl, appViewToPath } from "@/lib/utils/app-store";

describe("rendezvous", () => {
  it("accepts only a plausible instant from a link", () => {
    expect(parseRendezvous("1800000000000")).toBe(1_800_000_000_000);
    for (const bad of [null, "", "abc", "12", "9999999999999", "1800000000000;x", "-1"]) {
      expect(parseRendezvous(bad)).toBeUndefined();
    }
  });

  it("finds the next time a clock reads 20:00 in another zone", () => {
    const from = new Date("2026-11-09T12:00:00Z");
    expect(new Date(nextOccurrence(from, 20, 0, "Africa/Dakar")).toISOString()).toBe(
      "2026-11-09T20:00:00.000Z",
    );
    expect(new Date(nextOccurrence(from, 20, 0, "Asia/Tokyo")).toISOString()).toBe(
      "2026-11-10T11:00:00.000Z",
    );
  });

  it("rolls to tomorrow when the hour has passed, never to right now", () => {
    const from = new Date("2026-11-09T20:00:00Z");
    expect(new Date(nextOccurrence(from, 20, 0, "Africa/Dakar")).toISOString()).toBe(
      "2026-11-10T20:00:00.000Z",
    );
  });

  it("stays on the right wall clock across a daylight saving change", () => {
    // Paris leaves summer time on 25 October 2026.
    const from = new Date("2026-10-24T20:00:00Z");
    expect(new Date(nextOccurrence(from, 20, 0, "Europe/Paris")).toISOString()).toBe(
      "2026-10-25T19:00:00.000Z",
    );
  });

  it("moves through upcoming, ongoing and past", () => {
    const instant = 1_000_000;
    expect(rendezvousPhase(instant, instant - 1)).toBe("upcoming");
    expect(rendezvousPhase(instant, instant)).toBe("ongoing");
    expect(rendezvousPhase(instant, instant + 4 * 60 * 60_000)).toBe("past");
  });

  it("words a delay", () => {
    expect(formatDelay(5 * 60_000)).toBe("dans 5 min");
    expect(formatDelay(72 * 60_000)).toBe("dans 1 h 12");
    expect(formatDelay(120 * 60_000)).toBe("dans 2 h");
  });

  it("survives the app's URL round trip, and a tampered one is dropped", () => {
    const url = new URL(rendezvousUrl("https://mjtv.test", "RTS1.sn", 1_800_000_000_000));
    const view = appViewFromUrl(url);
    expect(view).toEqual({ view: "watch", channelId: "RTS1.sn", rendezvous: 1_800_000_000_000 });
    expect(appViewToPath(view)).toContain("rdv=1800000000000");
    expect(appViewFromUrl(new URL("https://mjtv.test/?view=watch&channel=a&rdv=oops"))).toEqual({
      view: "watch",
      channelId: "a",
    });
  });

  it("escapes channel names in the calendar file", () => {
    const ics = rendezvousIcs({
      channelId: "a b",
      channelName: "Une, chaîne; test",
      instant: Date.UTC(2026, 10, 9, 20),
      url: "https://mjtv.test",
      now: Date.UTC(2026, 10, 9, 12),
    });
    expect(ics).toContain("SUMMARY:Une\\, chaîne\\; test sur MJTV");
    expect(ics).toContain("DTSTART:20261109T200000Z");
    expect(ics).toContain("UID:");
    expect(ics.split("\r\n").at(-2)).toBe("END:VCALENDAR");
  });
});
