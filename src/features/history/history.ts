"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_CONFIG } from "@/config/app";
import { storage } from "@/lib/storage/local";

const KEY = "mjtv:history:v1";
const CHANGED_EVENT = "mjtv:history-changed";

export type WatchHistoryEntry = {
  channelId: string;
  sourceId: string | null;
  watchedAt: string;
};

export type HistoryState = {
  version: 1;
  entries: WatchHistoryEntry[];
};

const DEFAULT: HistoryState = { version: 1, entries: [] };

export const migrateHistory = (raw: unknown): HistoryState => {
  if (!raw) return DEFAULT;
  if (Array.isArray(raw)) {
    const entries = (raw as unknown[])
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
      .map((e) => {
        const obj = e as Record<string, unknown>;
        return {
          channelId: typeof obj.channelId === "string" ? obj.channelId : "",
          sourceId:
            typeof obj.sourceId === "string" || obj.sourceId === null
              ? (obj.sourceId as string | null)
              : null,
          watchedAt: typeof obj.watchedAt === "string" ? obj.watchedAt : new Date().toISOString(),
        } as WatchHistoryEntry;
      })
      .filter((e) => e.channelId)
      .slice(0, APP_CONFIG.maxHistoryEntries);
    return { version: 1, entries };
  }
  if (typeof raw !== "object") return DEFAULT;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.entries)) return DEFAULT;
  const entries = (obj.entries as unknown[])
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => {
      const o = e as Record<string, unknown>;
      return {
        channelId: typeof o.channelId === "string" ? o.channelId : "",
        sourceId:
          typeof o.sourceId === "string" || o.sourceId === null
            ? (o.sourceId as string | null)
            : null,
        watchedAt: typeof o.watchedAt === "string" ? o.watchedAt : new Date().toISOString(),
      } as WatchHistoryEntry;
    })
    .filter((e) => e.channelId)
    .slice(0, APP_CONFIG.maxHistoryEntries);
  return { version: 1, entries };
};

const read = (): HistoryState => migrateHistory(storage.get<unknown>(KEY, DEFAULT));

const write = (state: HistoryState): void => {
  storage.set(KEY, state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
};

/** Add an entry. Dedupes by channelId (moves existing to top). Caps at 50. */
export const addHistoryEntry = (entry: WatchHistoryEntry): void => {
  const state = read();
  const without = state.entries.filter((e) => e.channelId !== entry.channelId);
  const next: WatchHistoryEntry = {
    channelId: entry.channelId,
    sourceId: entry.sourceId ?? null,
    watchedAt: entry.watchedAt || new Date().toISOString(),
  };
  const entries = [next, ...without].slice(0, APP_CONFIG.maxHistoryEntries);
  write({ version: 1, entries });
};

export const clearHistory = (): void => {
  write(DEFAULT);
};

export const useHistory = () => {
  const [state, setState] = useState<HistoryState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setState(read());
    refresh();
    setHydrated(true);
    window.addEventListener(CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const push = useCallback(
    (channelId: string, sourceId: string | null) =>
      addHistoryEntry({
        channelId,
        sourceId,
        watchedAt: new Date().toISOString(),
      }),
    [],
  );
  const clear = useCallback(() => clearHistory(), []);

  return { state, hydrated, push, clear };
};
