"use client";

import { create } from "zustand";
import type { NavView } from "@/config/navigation";
import type { CatalogCategory } from "@/features/catalog/domain/types";

export type ExplorerFilters = {
  country?: string;
  category?: CatalogCategory;
  language?: string;
};

export type AppView =
  | { view: Exclude<NavView, "channels"> }
  | { view: "channels"; filters?: ExplorerFilters }
  | { view: "watch"; channelId: string }
  | { view: "import" }
  | { view: "offline" };

type AppState = {
  view: AppView;
  setView: (view: AppView) => void;
  goHome: () => void;
  goChannels: () => void;
  openExplorer: (filters?: ExplorerFilters) => void;
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
  openExplorer: (filters) => set({ view: { view: "channels", filters } }),
  goFavorites: () => set({ view: { view: "favorites" } }),
  goHistory: () => set({ view: { view: "history" } }),
  goSettings: () => set({ view: { view: "settings" } }),
  goImport: () => set({ view: { view: "import" } }),
  watch: (channelId) => set({ view: { view: "watch", channelId } }),
}));
