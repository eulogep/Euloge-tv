import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  computeNextGridIndex,
  mapRemoteKeyToAction,
  navigateFocusableGrid,
} from "@/components/app-shell/tv-remote-navigation";

describe("TV remote & D-Pad spatial navigation", () => {
  it("maps standard D-Pad and Smart TV remote keys to semantic actions", () => {
    expect(mapRemoteKeyToAction("ArrowRight")).toEqual({ type: "move", direction: "right" });
    expect(mapRemoteKeyToAction("ArrowUp")).toEqual({ type: "move", direction: "up" });
    expect(mapRemoteKeyToAction("Enter")).toEqual({ type: "select" });
    expect(mapRemoteKeyToAction("BrowserBack")).toEqual({ type: "back" });
    expect(mapRemoteKeyToAction("ChannelUp")).toEqual({ type: "channel_step", delta: -1 });
    expect(mapRemoteKeyToAction("ChannelDown")).toEqual({ type: "channel_step", delta: 1 });
    expect(mapRemoteKeyToAction("Guide")).toEqual({ type: "open_guide" });
    expect(mapRemoteKeyToAction("a")).toBeNull();
  });

  it("computes bounded 2D grid indices for D-Pad navigation", () => {
    // 8 items in a 4-column grid:
    // [0, 1, 2, 3]
    // [4, 5, 6, 7]
    expect(computeNextGridIndex(0, 8, 4, "right")).toBe(1);
    expect(computeNextGridIndex(0, 8, 4, "left")).toBe(0);
    expect(computeNextGridIndex(1, 8, 4, "down")).toBe(5);
    expect(computeNextGridIndex(5, 8, 4, "up")).toBe(1);
    expect(computeNextGridIndex(7, 8, 4, "right")).toBe(7);
    expect(computeNextGridIndex(2, 8, 4, "up")).toBe(2);
  });

  it("moves DOM focus between channel cards inside a grid container", () => {
    render(
      <div
        data-testid="tv-grid"
        onKeyDown={(e) => {
          if (navigateFocusableGrid(e.currentTarget, e.key, 2)) {
            e.preventDefault();
          }
        }}
      >
        {["TF1", "France 2", "Arte", "TV5"].map((name) => (
          <article key={name} data-testid="channel-card">
            <button type="button">{name}</button>
          </article>
        ))}
      </div>,
    );

    const grid = screen.getByTestId("tv-grid");
    const tf1 = screen.getByRole("button", { name: "TF1" });
    const france2 = screen.getByRole("button", { name: "France 2" });
    const arte = screen.getByRole("button", { name: "Arte" });

    tf1.focus();
    expect(tf1).toHaveFocus();

    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(france2).toHaveFocus();

    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect( screen.getByRole("button", { name: "TV5" })).toHaveFocus();

    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(arte).toHaveFocus();
  });
});
