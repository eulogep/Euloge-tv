import { describe, it, expect } from "vitest";
import { reducePlayback, initialState } from "@/features/player/application/state-machine";
import type { PlaybackEvent } from "@/features/player/domain/types";

const apply = (events: PlaybackEvent[]) => events.reduce(reducePlayback, initialState);

describe("playback state machine", () => {
  it("starts in idle", () => {
    expect(initialState).toBe("idle");
  });

  it("transitions idle → loading on LOAD", () => {
    expect(apply([{ type: "LOAD" }])).toBe("loading");
  });

  it("transitions loading → ready on READY", () => {
    expect(apply([{ type: "LOAD" }, { type: "READY" }])).toBe("ready");
  });

  it("transitions ready → playing on PLAY", () => {
    expect(apply([{ type: "LOAD" }, { type: "READY" }, { type: "PLAY" }])).toBe("playing");
  });

  it("transitions playing → paused on PAUSE", () => {
    expect(apply([{ type: "LOAD" }, { type: "READY" }, { type: "PLAY" }, { type: "PAUSE" }])).toBe(
      "paused",
    );
  });

  it("transitions playing → buffering on BUFFERING", () => {
    expect(
      apply([{ type: "LOAD" }, { type: "READY" }, { type: "PLAY" }, { type: "BUFFERING" }]),
    ).toBe("buffering");
  });

  it("transitions playing → ended on ENDED", () => {
    expect(apply([{ type: "LOAD" }, { type: "READY" }, { type: "PLAY" }, { type: "ENDED" }])).toBe(
      "ended",
    );
  });

  it("transitions playing → error on fatal ERROR", () => {
    expect(
      apply([
        { type: "LOAD" },
        { type: "READY" },
        { type: "PLAY" },
        { type: "ERROR", code: "NETWORK", fatal: true },
      ]),
    ).toBe("error");
  });

  it("transitions error → loading on LOAD (retry)", () => {
    expect(
      apply([
        { type: "LOAD" },
        { type: "READY" },
        { type: "PLAY" },
        { type: "ERROR", code: "NETWORK", fatal: true },
        { type: "LOAD" },
      ]),
    ).toBe("loading");
  });

  it("transitions playing → switching-source on SWITCH_SOURCE", () => {
    expect(
      apply([{ type: "LOAD" }, { type: "READY" }, { type: "PLAY" }, { type: "SWITCH_SOURCE" }]),
    ).toBe("switching-source");
  });

  it("transitions switching-source → loading on LOAD", () => {
    expect(
      apply([
        { type: "LOAD" },
        { type: "READY" },
        { type: "PLAY" },
        { type: "SWITCH_SOURCE" },
        { type: "LOAD" },
      ]),
    ).toBe("loading");
  });

  it("RESET returns to idle from any state", () => {
    expect(
      apply([
        { type: "LOAD" },
        { type: "READY" },
        { type: "PLAY" },
        { type: "ERROR", code: "MEDIA", fatal: true },
        { type: "RESET" },
      ]),
    ).toBe("idle");
  });

  it("rejects invalid transitions (e.g. idle → playing)", () => {
    expect(apply([{ type: "PLAY" }])).toBe("idle");
  });
});
