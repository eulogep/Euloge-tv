"use client";

import { create } from "zustand";

export const SLEEP_DURATIONS = [15, 30, 60, 90] as const;
type SleepState = {
  deadline: number | null;
  minutes: number;
  finished: boolean;
  start: (minutes: number) => void;
  cancel: () => void;
  expire: () => boolean;
  dismiss: () => void;
};

/** A session deadline, never a saved preference. A closed player cancels it. */
export const useSleepTimer = create<SleepState>((set, get) => ({
  deadline: null,
  minutes: 0,
  finished: false,
  start: (minutes) => {
    if (!SLEEP_DURATIONS.some((value) => value === minutes)) return;
    set({ deadline: Date.now() + minutes * 60_000, minutes, finished: false });
  },
  cancel: () => set({ deadline: null, minutes: 0 }),
  expire: () => {
    const deadline = get().deadline;
    if (deadline === null || Date.now() < deadline) return false;
    set({ deadline: null, minutes: 0, finished: true });
    return true;
  },
  dismiss: () => set({ finished: false }),
}));
