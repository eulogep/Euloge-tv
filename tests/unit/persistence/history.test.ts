import { describe, it, expect, beforeEach } from "vitest";
import { addHistoryEntry, clearHistory, migrateHistory } from "@/features/history/history";

describe("history", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("dedupes by channelId (moves to top)", () => {
    addHistoryEntry({ channelId: "a", sourceId: null, watchedAt: "2024-01-01T00:00:00Z" });
    addHistoryEntry({ channelId: "b", sourceId: null, watchedAt: "2024-01-02T00:00:00Z" });
    addHistoryEntry({ channelId: "a", sourceId: null, watchedAt: "2024-01-03T00:00:00Z" });
    const raw = window.localStorage.getItem("mjtv:history:v1");
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.entries[0].channelId).toBe("a");
    expect(parsed.entries[1].channelId).toBe("b");
    expect(parsed.entries).toHaveLength(2);
  });

  it("caps at 50 entries", () => {
    for (let i = 0; i < 60; i++) {
      addHistoryEntry({
        channelId: `ch-${i}`,
        sourceId: null,
        watchedAt: new Date(Date.now() + i).toISOString(),
      });
    }
    const raw = JSON.parse(window.localStorage.getItem("mjtv:history:v1")!);
    expect(raw.entries.length).toBeLessThanOrEqual(50);
  });

  it("clears history", () => {
    addHistoryEntry({ channelId: "a", sourceId: null, watchedAt: new Date().toISOString() });
    clearHistory();
    const raw = JSON.parse(window.localStorage.getItem("mjtv:history:v1")!);
    expect(raw.entries).toEqual([]);
  });

  it("recovers from corrupted data", () => {
    window.localStorage.setItem("mjtv:history:v1", "{not json");
    const migrated = migrateHistory("garbage");
    expect(migrated.entries).toEqual([]);
  });

  it("migrates legacy array shape", () => {
    const migrated = migrateHistory([
      { channelId: "a", sourceId: null, watchedAt: "2024-01-01T00:00:00Z" },
      { channelId: "b" },
    ]);
    expect(migrated.entries).toHaveLength(2);
    expect(migrated.entries[1].watchedAt).toBeTruthy();
  });
});
