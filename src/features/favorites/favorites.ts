"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage/local";

const KEY = "mjtv:favorites:v1";

export type FavoritesState = {
  version: 1;
  channelIds: string[];
};

const DEFAULT: FavoritesState = { version: 1, channelIds: [] };

const CHANGED_EVENT = "mjtv:favorites-changed";

/** Migrate any older shape to the current schema. */
export const migrateFavorites = (raw: unknown): FavoritesState => {
  if (!raw) return DEFAULT;
  if (Array.isArray(raw)) {
    return {
      version: 1,
      channelIds: (raw as unknown[]).filter((x): x is string => typeof x === "string"),
    };
  }
  if (typeof raw !== "object") return DEFAULT;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.channelIds)) {
    return {
      version: 1,
      channelIds: (obj.channelIds as unknown[]).filter((x): x is string => typeof x === "string"),
    };
  }
  return DEFAULT;
};

const read = (): FavoritesState => migrateFavorites(storage.get<unknown>(KEY, DEFAULT));

const write = (state: FavoritesState): void => {
  storage.set(KEY, state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
};

export const addFavorite = (channelId: string): void => {
  const state = read();
  if (state.channelIds.includes(channelId)) return;
  write({ ...state, channelIds: [...state.channelIds, channelId] });
};

export const removeFavorite = (channelId: string): void => {
  const state = read();
  write({ ...state, channelIds: state.channelIds.filter((id) => id !== channelId) });
};

export const hasFavorite = (channelId: string): boolean => {
  return read().channelIds.includes(channelId);
};

export const clearFavorites = (): void => {
  write(DEFAULT);
};

export const toggleFavorite = (channelId: string): void => {
  if (hasFavorite(channelId)) removeFavorite(channelId);
  else addFavorite(channelId);
};

export const useFavorites = () => {
  const [state, setState] = useState<FavoritesState>(DEFAULT);
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

  const add = useCallback((id: string) => addFavorite(id), []);
  const remove = useCallback((id: string) => removeFavorite(id), []);
  const has = useCallback((id: string) => state.channelIds.includes(id), [state]);
  const toggle = useCallback((id: string) => toggleFavorite(id), []);
  const clear = useCallback(() => clearFavorites(), []);

  return { state, hydrated, add, remove, has, toggle, clear };
};
