import { describe, expect, it } from "vitest";
import { economyLevelIndex } from "@/features/player/application/economy-quality";

describe("economy quality selection", () => {
  it("chooses up to 480p from unordered renditions without selecting HD", () => {
    expect(
      economyLevelIndex([{ height: 1080 }, { height: 360 }, { height: 480 }, { height: 720 }]),
    ).toBe(2);
  });
  it("uses the smallest available rendition when none is 480p or below", () => {
    expect(economyLevelIndex([{ height: 1080 }, { height: 720 }])).toBe(1);
  });
  it("prefers a lower bitrate at the same resolution and handles audio-only levels", () => {
    expect(
      economyLevelIndex([
        { height: 480, bitrate: 900000 },
        { height: 480, bitrate: 500000 },
      ]),
    ).toBe(1);
    expect(economyLevelIndex([{ bitrate: 128000 }, { bitrate: 64000 }])).toBe(1);
  });
  it("keeps automatic selection when no rendition exists", () => {
    expect(economyLevelIndex([])).toBe(-1);
  });
});
