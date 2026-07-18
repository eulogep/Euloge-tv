"use client";

import { create } from "zustand";
import type { NavView } from "@/config/navigation";

export type AppView =
  | { view: NavView }
  | { view: "watch"; channelId: string }
  | { view: "import" }
  | { view: "offline" };

type AppState = {
  view: AppView;
  setView: (view: AppView) => void;
  goHome: () => void;
  goChannels: () => void;
  goFavorites: () => void;
  goHistory: () => void;
  goSettings: () => void;
  goImport: () => void;
  watch: (channelId: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  view: { view: "home" },
  setView: (view) => set({ view }),
  goHome: () => set({ view: { view: "home" } }),
  goChannels: () => set({ view: { view: "channels" } }),
  goFavorites: () => set({ view: { view: "favorites" } }),
  goHistory: () => set({ view: { view: "history" } }),
  goSettings: () => set({ view: { view: "settings" } }),
  goImport: () => set({ view: { view: "import" } }),
  watch: (channelId) => set({ view: { view: "watch", channelId } }),
}));
