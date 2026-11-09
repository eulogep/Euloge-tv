import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  JOURNEYS_KEY,
  MAX_JOURNEYS,
  journeyFingerprint,
  readJourneyState,
} from "@/features/journeys/domain/journey";
import { useJourneys } from "@/features/journeys/application/use-journeys";

describe("personal journey notebook", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it("validates version, malformed filters, duplicates and capacity", () => {
    expect(readJourneyState({ version: 2, items: [] }).items).toEqual([]);
    const valid = { id: "a", name: "Sénégal", filters: { country: "SN", unknown: "discarded" } };
    const result = readJourneyState({
      version: 1,
      items: [
        null,
        valid,
        valid,
        { ...valid, id: "bad", filters: { country: "javascript:" } },
        ...Array.from({ length: 20 }, (_, i) => ({ ...valid, id: String(i) })),
      ],
    });
    expect(result.items).toHaveLength(MAX_JOURNEYS);
    expect(result.items[0]?.filters).toEqual({ country: "SN" });
    expect(new Set(result.items.map((item) => item.id)).size).toBe(MAX_JOURNEYS);
  });
  it("normalizes filter order, blanks and default sorting for deduplication", () => {
    expect(journeyFingerprint({ country: "SN", q: "", sort: "quality" })).toBe(
      journeyFingerprint({ country: "SN" }),
    );
    expect(journeyFingerprint({ country: "SN", sort: "name" })).not.toBe(
      journeyFingerprint({ country: "SN" }),
    );
  });
  it("saves, deduplicates, renames, synchronizes subscribers and removes", () => {
    const first = renderHook(() => useJourneys());
    const second = renderHook(() => useJourneys());
    act(() => {
      expect(first.result.current.save("Mon Sénégal", { country: "SN" })).toBe(true);
    });
    expect(second.result.current.items[0]?.name).toBe("Mon Sénégal");
    act(() => {
      first.result.current.save("Mes directs", { country: "SN", sort: "quality" });
    });
    expect(second.result.current.items).toHaveLength(1);
    const id = first.result.current.items[0]!.id;
    act(() => {
      first.result.current.rename(id, " Nouveau nom ");
    });
    expect(JSON.parse(localStorage.getItem(JOURNEYS_KEY)!).items[0].name).toBe("Nouveau nom");
    act(() => {
      first.result.current.remove(id);
    });
    expect(second.result.current.items).toEqual([]);
  });
  it("never reports success or updates visible state when persistence fails", () => {
    const { result } = renderHook(() => useJourneys());
    // jsdom keeps the method on Storage.prototype; the Node 26 fallback owns it directly.
    const owner = Object.hasOwn(localStorage, "setItem")
      ? localStorage
      : Object.getPrototypeOf(localStorage);
    vi.spyOn(owner, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    act(() => {
      expect(result.current.save("Sénégal", { country: "SN" })).toBe(false);
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.error).toContain("non enregistrée");
  });
  it("keeps an unreadable notebook intact instead of overwriting it", () => {
    localStorage.setItem(JOURNEYS_KEY, "broken JSON");
    const { result } = renderHook(() => useJourneys());
    expect(result.current.error).toContain("ne peut pas être lu");
    act(() => {
      expect(result.current.save("Sénégal", { country: "SN" })).toBe(false);
    });
    expect(localStorage.getItem(JOURNEYS_KEY)).toBe("broken JSON");
  });
  it("rejects blank names and a full notebook without removing older entries", () => {
    const { result } = renderHook(() => useJourneys());
    act(() => {
      expect(result.current.save(" ", {})).toBe(false);
    });
    for (let i = 0; i < MAX_JOURNEYS; i++)
      act(() => {
        result.current.save(`Escale ${i}`, { q: String(i) });
      });
    act(() => {
      expect(result.current.save("Overflow", { q: "extra" })).toBe(false);
    });
    expect(result.current.items).toHaveLength(MAX_JOURNEYS);
    expect(result.current.error).toContain("12 escales");
  });
});
