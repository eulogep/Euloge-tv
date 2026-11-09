import { describe, expect, it } from "vitest";
import {
  dayPhase,
  inkForSky,
  SKY_INK,
  SKY_PAPER,
  skyRgb,
  solarElevation,
  sunPosition,
  wrapLongitude,
} from "@/features/meridian/domain/solar";

const luminance = (rgb: readonly number[]): number => {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (left: readonly number[], right: readonly number[]): number => {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe("solar position", () => {
  it("wraps longitudes into [-180, 180)", () => {
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-190)).toBe(170);
    expect(wrapLongitude(180)).toBe(-180);
    expect(wrapLongitude(0)).toBe(0);
  });

  it("puts the sun overhead at the equator around the March equinox at noon UTC", () => {
    const sun = sunPosition(new Date("2026-03-20T12:00:00Z"));
    expect(Math.abs(sun.declination)).toBeLessThan(1);
    expect(Math.abs(sun.subsolarLongitude)).toBeLessThan(3);
    expect(solarElevation(sun, 0, 0)).toBeGreaterThan(86);
    expect(solarElevation(sun, 0, 180)).toBeLessThan(-86);
  });

  it("follows the seasons", () => {
    const june = sunPosition(new Date("2026-06-21T12:00:00Z")).declination;
    const december = sunPosition(new Date("2026-12-21T12:00:00Z")).declination;
    expect(june).toBeGreaterThan(23);
    expect(december).toBeLessThan(-23);
  });

  it("tells dawn from dusk on either side of the sun", () => {
    // Sun over Greenwich: a place 90° to the west is at its dawn, 90° to the east at its dusk.
    const sun = sunPosition(new Date("2026-03-20T12:07:00Z"));
    expect(dayPhase(sun, 0, -90)).toBe("aube");
    expect(dayPhase(sun, 0, 90)).toBe("crépuscule");
    expect(dayPhase(sun, 0, 180)).toBe("nuit");
    expect(dayPhase(sun, 0, 0)).toBe("plein jour");
  });
});

describe("sky inks", () => {
  it("keeps the chosen brand ink above WCAG AA on every sky, night to noon", () => {
    const inks = { ink: SKY_INK, paper: SKY_PAPER } as const;
    for (let elevation = -90; elevation <= 90; elevation += 0.5) {
      const ratio = contrast(skyRgb(elevation), inks[inkForSky(elevation)]);
      expect(ratio, `elevation ${elevation}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("reads paper at night and ink under a bright sky", () => {
    expect(inkForSky(-40)).toBe("paper");
    expect(inkForSky(40)).toBe("ink");
  });
});
