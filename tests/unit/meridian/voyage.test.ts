import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoyage, VOYAGE_SIGNAL_MS } from "@/features/meridian/application/voyage";
import { pickNextEscale, stopsFromAtlas, type Atlas } from "@/features/meridian/domain/atlas";

const atlas = (...codes: string[]): Atlas => ({
  generatedAt: "2026-01-01T00:00:00.000Z",
  countries: codes.map((code) => ({
    code,
    name: code,
    count: 2,
    stations: [
      { id: `${code}-maybe`, name: "a", logoUrl: null, category: "news", health: "unverified" },
      { id: `${code}-sure`, name: "b", logoUrl: null, category: "news", health: "healthy" },
    ],
  })),
});

describe("choosing the next call", () => {
  const stops = stopsFromAtlas(atlas("SN", "FR", "JP"));
  const date = new Date("2026-01-15T20:10:00Z");

  it("goes where it is 20 h, on the most trustworthy channel", () => {
    const escale = pickNextEscale(stops, date, []);
    expect(escale?.stop.code).toBe("SN");
    expect(escale?.station.id).toBe("SN-sure");
  });

  it("does not return to a country already visited", () => {
    expect(pickNextEscale(stops, date, ["SN"])?.stop.code).not.toBe("SN");
  });

  it("starts over rather than ending when the whole world has been seen", () => {
    expect(pickNextEscale(stops, date, ["SN", "FR", "JP"])).not.toBeNull();
  });

  it("has nowhere to go without stops", () => {
    expect(pickNextEscale([], date, [])).toBeNull();
  });
});

describe("the tour's state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    useVoyage.getState().stop();
  });

  it("schedules the next call and waits for a picture", () => {
    useVoyage.getState().start(3);
    useVoyage.getState().arrive({ channelId: "a", city: "Dakar", code: "SN" });
    const state = useVoyage.getState();
    expect(state.nextAt).toBe(1_000_000 + 3 * 60_000);
    expect(state.signalBy).toBe(1_000_000 + VOYAGE_SIGNAL_MS);
    expect(state.visited).toEqual(["SN"]);
  });

  it("only accepts a picture from the channel it is waiting for", () => {
    useVoyage.getState().start();
    useVoyage.getState().arrive({ channelId: "a", city: "Dakar", code: "SN" });
    useVoyage.getState().confirm("other");
    expect(useVoyage.getState().signalBy).not.toBeNull();
    useVoyage.getState().confirm("a");
    expect(useVoyage.getState().signalBy).toBeNull();
  });

  it("gives up after too many silent channels, and a picture resets the count", () => {
    useVoyage.getState().start();
    useVoyage.getState().arrive({ channelId: "a", city: "Dakar", code: "SN" });
    expect(useVoyage.getState().miss()).toBe(true);
    useVoyage.getState().confirm("a");
    for (let index = 0; index < 7; index++) expect(useVoyage.getState().miss()).toBe(true);
    expect(useVoyage.getState().miss()).toBe(false);
  });

  it("refuses an unsupported duration", () => {
    useVoyage.getState().start(7);
    expect(useVoyage.getState().minutes).toBe(5);
  });
});
