import { describe, it, expect, beforeEach } from "vitest";
import {
  addFavorite,
  clearFavorites,
  hasFavorite,
  migrateFavorites,
  removeFavorite,
  useFavorites,
} from "@/features/favorites/favorites";
import { renderHook, act } from "@testing-library/react";

describe("favorites", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("adds and has a favorite", () => {
    addFavorite("a");
    expect(hasFavorite("a")).toBe(true);
    expect(hasFavorite("b")).toBe(false);
  });

  it("removes a favorite", () => {
    addFavorite("a");
    removeFavorite("a");
    expect(hasFavorite("a")).toBe(false);
  });

  it("clears all favorites", () => {
    addFavorite("a");
    addFavorite("b");
    clearFavorites();
    expect(hasFavorite("a")).toBe(false);
    expect(hasFavorite("b")).toBe(false);
  });

  it("migrates legacy array shape", () => {
    const migrated = migrateFavorites(["a", "b", 123, null]);
    expect(migrated.version).toBe(1);
    expect(migrated.channelIds).toEqual(["a", "b"]);
  });

  it("migrates object with channelIds", () => {
    const migrated = migrateFavorites({ channelIds: ["a", "b"] });
    expect(migrated.channelIds).toEqual(["a", "b"]);
  });

  it("migrates garbage to empty state", () => {
    expect(migrateFavorites(null).channelIds).toEqual([]);
    expect(migrateFavorites(123).channelIds).toEqual([]);
    expect(migrateFavorites("x").channelIds).toEqual([]);
  });

  it("hook hydrates after mount and reflects mutations", async () => {
    const { result } = renderHook(() => useFavorites());
    // renderHook flushes the mount effect synchronously.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.hydrated).toBe(true);
    act(() => {
      addFavorite("z");
    });
    expect(result.current.has("z")).toBe(true);
  });
});
