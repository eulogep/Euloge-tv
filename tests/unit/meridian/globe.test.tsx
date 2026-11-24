import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getLandDots,
  greatCircleArc,
  isLandPoint,
  projectOrtho,
  shortestAngleDelta,
} from "@/features/meridian/domain/world-geometry";
import { Constellation } from "@/features/meridian/presentation/Constellation";

describe("3D Earth Globe geometry & Constellation controls", () => {
  it("projects front-hemisphere points cleanly and hides back-hemisphere points", () => {
    const front = projectOrtho(48.9, 2.4, 48.9, 2.4, 200, 150, 100);
    expect(front.visible).toBe(true);
    expect(front.z).toBeCloseTo(1, 3);
    expect(front.x).toBeCloseTo(200, 1);
    expect(front.y).toBeCloseTo(150, 1);

    const back = projectOrtho(0, 180, 0, 0, 200, 150, 100);
    expect(back.visible).toBe(false);
    expect(back.z).toBeCloseTo(-1, 3);
  });

  it("wraps shortest angular deltas across the antimeridian", () => {
    expect(shortestAngleDelta(170, -170)).toBeCloseTo(20, 4);
    expect(shortestAngleDelta(-170, 170)).toBeCloseTo(-20, 4);
  });

  it("identifies major continents accurately and caches a rich Fibonacci land dot lattice", () => {
    expect(isLandPoint(2.35, 48.85)).toBe(true); // Paris
    expect(isLandPoint(15.3, -4.3)).toBe(true); // Kinshasa / Brazzaville
    expect(isLandPoint(139.7, 35.7)).toBe(true); // Tokyo
    expect(isLandPoint(-46.6, -23.5)).toBe(true); // São Paulo
    expect(isLandPoint(-35, 0)).toBe(false); // Mid-Atlantic ocean

    const dots = getLandDots();
    expect(dots.length).toBeGreaterThan(800);
    expect(getLandDots()).toBe(dots);
  });

  it("builds elevated 3D great-circle flight arcs between escales", () => {
    const arc = greatCircleArc(48.9, 2.4, -4.3, 15.3, 20);
    expect(arc).toHaveLength(21);
    expect(arc[0]!.altitude).toBeCloseTo(1, 4);
    expect(arc[10]!.altitude).toBeGreaterThan(1.05);
    expect(arc[20]!.altitude).toBeCloseTo(1, 4);
  });

  it("renders the accessible 3D globe canvas with data-stops and interactive surprise button", () => {
    const onSelect = vi.fn();
    render(
      <Constellation
        countries={[
          { value: "FR", label: "France", count: 25 },
          { value: "SN", label: "Sénégal", count: 8 },
          { value: "JP", label: "Japon", count: 14 },
        ]}
        selected={null}
        visited={["FR", "SN"]}
        onSelect={onSelect}
      />,
    );

    const canvas = screen.getByTestId("constellation");
    expect(canvas).toHaveAttribute("data-stops", "3");
    expect(canvas).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: /Tourner le globe vers 20 h/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /Lancer le globe vers une destination surprise/i }),
    );
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(["FR", "SN", "JP"]).toContain(onSelect.mock.calls[0]![0]);
  });
});
