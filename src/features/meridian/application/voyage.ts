"use client";

import { create } from "zustand";

export const VOYAGE_DURATIONS = [3, 5, 10] as const;
/** A channel that has shown nothing after this long is skipped. */
export const VOYAGE_SIGNAL_MS = 30_000;
const MAX_SILENT_ESCALES = 8;
const MEMORY = 40;

type VoyageState = {
  active: boolean;
  minutes: number;
  /** When to leave the current call. 0 means: leave as soon as the atlas is ready. */
  nextAt: number;
  /** Deadline for a picture to appear, or null once one has. */
  signalBy: number | null;
  channelId: string | null;
  city: string | null;
  visited: string[];
  silent: number;
  notice: string | null;
  start: (minutes?: number) => void;
  stop: (notice?: string) => void;
  setMinutes: (minutes: number) => void;
  skip: () => void;
  arrive: (input: { channelId: string; city: string; code: string }, now?: number) => void;
  confirm: (channelId: string) => void;
  /** Records a channel that stayed silent. False means the tour has given up. */
  miss: () => boolean;
};

/** A session-only tour: it is never saved and ends with the player. */
export const useVoyage = create<VoyageState>((set, get) => ({
  active: false,
  minutes: 5,
  nextAt: 0,
  signalBy: null,
  channelId: null,
  city: null,
  visited: [],
  silent: 0,
  notice: null,
  start: (minutes = get().minutes) =>
    set({
      active: true,
      minutes: VOYAGE_DURATIONS.some((value) => value === minutes) ? minutes : 5,
      nextAt: 0,
      signalBy: null,
      channelId: null,
      city: null,
      visited: [],
      silent: 0,
      notice: null,
    }),
  stop: (notice) =>
    set({ active: false, nextAt: 0, signalBy: null, channelId: null, notice: notice ?? null }),
  setMinutes: (minutes) => {
    if (!VOYAGE_DURATIONS.some((value) => value === minutes)) return;
    const { active, signalBy } = get();
    set({ minutes, ...(active && !signalBy ? { nextAt: Date.now() + minutes * 60_000 } : {}) });
  },
  skip: () => set({ nextAt: Date.now() }),
  arrive: ({ channelId, city, code }, now = Date.now()) =>
    set((state) => ({
      channelId,
      city,
      nextAt: now + state.minutes * 60_000,
      signalBy: now + VOYAGE_SIGNAL_MS,
      visited: [...state.visited, code].slice(-MEMORY),
    })),
  confirm: (channelId) => {
    if (get().channelId === channelId) set({ signalBy: null, silent: 0 });
  },
  miss: () => {
    const silent = get().silent + 1;
    set({ silent });
    return silent < MAX_SILENT_ESCALES;
  },
}));
