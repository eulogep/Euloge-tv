"use client";

import { create } from "zustand";
import type { NavView } from "@/config/navigation";
import type { CatalogCategory, CatalogQuery } from "@/features/catalog/domain/types";

export type ExplorerFilters = {
  q?: string;
  country?: string;
  category?: CatalogCategory;
  language?: string;
  availability?: CatalogQuery["availability"];
  sort?: CatalogQuery["sort"];
  source?: CatalogQuery["source"];
};

export type ExplorerContext = {
  from: "home";
  returnLabel: string;
};

export type AppView =
  | { view: NavView }
  | { view: "channels"; filters?: ExplorerFilters; context?: ExplorerContext }
  | { view: "search"; filters?: ExplorerFilters; context?: ExplorerContext }
  | { view: "watch"; channelId: string }
  | { view: "epg"; channelId?: string }
  | { view: "import" }
  | { view: "settings" }
  | { view: "offline" };

type BrowserNavigationState = {
  app: "mjtv";
  version: 1;
  view: AppView;
  depth: number;
  scrollY: number;
};

type AppState = {
  view: AppView;
  canGoBack: boolean;
  activePlayerChannelId: string | null;
  playerMode: "full" | "mini" | null;
  initializeNavigation: () => () => void;
  setView: (view: AppView) => void;
  navigatePrimary: (view: NavView) => void;
  goBack: () => void;
  goHome: () => void;
  goChannels: () => void;
  openExplorer: (filters?: ExplorerFilters, context?: ExplorerContext) => void;
  replaceExplorerFilters: (filters: ExplorerFilters) => void;
  goFavorites: () => void;
  goHistory: () => void;
  goSettings: () => void;
  goImport: () => void;
  goSearch: () => void;
  goLive: () => void;
  goMyList: () => void;
  goProfile: () => void;
  openEpg: (channelId?: string) => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  closePlayer: () => void;
  watch: (channelId: string) => void;
};

const categories = new Set<CatalogCategory>([
  "live",
  "news",
  "sports",
  "music",
  "movies",
  "series",
  "kids",
  "animation",
  "anime",
  "documentaries",
  "culture",
  "religious",
  "entertainment",
  "lifestyle",
  "local",
  "international",
  "radio",
  "other",
]);
const availabilityValues = new Set(["recommended", "unverified", "limited", "blocked"]);
const sortValues = new Set(["quality", "name", "country"]);
const sourceValues = new Set(["iptv-org", "imported", "all"]);

const useful = (value: string | null): string | undefined => value?.trim() || undefined;

export function appViewToPath(view: AppView): string {
  const params = new URLSearchParams();
  if (view.view === "home") return "/";
  if (
    view.view === "explore" ||
    view.view === "live" ||
    view.view === "my-list" ||
    view.view === "profile"
  ) {
    params.set("view", view.view);
  } else if (view.view === "channels" || view.view === "search") {
    params.set("view", view.view === "channels" ? "explorer" : "search");
    const filters = view.filters;
    for (const [key, value] of [
      ["q", filters?.q],
      ["country", filters?.country],
      ["category", filters?.category],
      ["language", filters?.language],
      ["availability", filters?.availability],
      ["source", filters?.source],
    ] as const) {
      if (value) params.set(key, value);
    }
    if (filters?.sort && filters.sort !== "quality") params.set("sort", filters.sort);
    if (view.context?.from === "home") params.set("from", "home");
  } else if (view.view === "watch") {
    params.set("view", "watch");
    params.set("channel", view.channelId);
  } else if (view.view === "settings") {
    params.set("view", "settings");
  } else if (view.view === "import") {
    params.set("view", "library");
  } else if (view.view === "epg") {
    params.set("view", "epg");
    if (view.channelId) params.set("channel", view.channelId);
  } else {
    return "/";
  }
  return `/?${params.toString()}`;
}

export function appViewFromUrl(url: URL): AppView {
  const requestedView = url.searchParams.get("view");
  if (requestedView === "search" || requestedView === "explorer") {
    const category = useful(url.searchParams.get("category"));
    const availability = useful(url.searchParams.get("availability"));
    const sort = useful(url.searchParams.get("sort"));
    const source = useful(url.searchParams.get("source"));
    const filters: ExplorerFilters = {
      q: useful(url.searchParams.get("q")),
      country: useful(url.searchParams.get("country")),
      category:
        category && categories.has(category as CatalogCategory)
          ? (category as CatalogCategory)
          : undefined,
      language: useful(url.searchParams.get("language")),
      availability:
        availability && availabilityValues.has(availability)
          ? (availability as ExplorerFilters["availability"])
          : undefined,
      sort: sort && sortValues.has(sort) ? (sort as ExplorerFilters["sort"]) : "quality",
      source:
        source && sourceValues.has(source) ? (source as ExplorerFilters["source"]) : undefined,
    };
    return {
      view: requestedView === "explorer" ? "channels" : "search",
      filters,
      ...(url.searchParams.get("from") === "home"
        ? { context: { from: "home" as const, returnLabel: "Retour à l’accueil" } }
        : {}),
    };
  }
  if (requestedView === "explore") return { view: "explore" };
  if (requestedView === "live") return { view: "live" };
  if (requestedView === "my-list" || requestedView === "history") return { view: "my-list" };
  if (requestedView === "profile") return { view: "profile" };
  if (requestedView === "epg")
    return { view: "epg", channelId: useful(url.searchParams.get("channel")) };
  if (requestedView === "watch") {
    const channelId = useful(url.searchParams.get("channel"));
    return channelId ? { view: "watch", channelId } : { view: "home" };
  }
  if (requestedView === "settings") return { view: "settings" };
  if (requestedView === "library") return { view: "import" };
  return { view: "home" };
}

const isBrowserNavigationState = (value: unknown): value is BrowserNavigationState => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BrowserNavigationState>;
  return (
    candidate.app === "mjtv" &&
    candidate.version === 1 &&
    typeof candidate.depth === "number" &&
    typeof candidate.scrollY === "number"
  );
};

const restoreScroll = (scrollY: number): void => {
  const scroll = () => window.scrollTo({ top: scrollY, behavior: "auto" });
  window.requestAnimationFrame(scroll);
  window.setTimeout(scroll, 300);
};

export const useAppStore = create<AppState>((set, get) => {
  const navigate = (view: AppView, mode: "push" | "replace" = "push"): void => {
    const currentView = get().view;
    if (JSON.stringify(currentView) === JSON.stringify(view)) return;

    if (typeof window !== "undefined") {
      const currentState = isBrowserNavigationState(window.history.state)
        ? window.history.state
        : null;
      const depth = currentState?.depth ?? 0;
      const currentEntry: BrowserNavigationState = {
        app: "mjtv",
        version: 1,
        view: currentView,
        depth,
        scrollY: window.scrollY,
      };
      window.history.replaceState(currentEntry, "", appViewToPath(currentView));
      const nextDepth = mode === "push" ? depth + 1 : depth;
      const nextEntry: BrowserNavigationState = {
        app: "mjtv",
        version: 1,
        view,
        depth: nextDepth,
        scrollY: 0,
      };
      if (mode === "push") {
        window.history.pushState(nextEntry, "", appViewToPath(view));
      } else {
        window.history.replaceState(nextEntry, "", appViewToPath(view));
      }
      set({ view, canGoBack: nextDepth > 0 });
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    set({ view });
  };

  return {
    view: { view: "home" },
    canGoBack: false,
    activePlayerChannelId: null,
    playerMode: null,
    initializeNavigation: () => {
      if (typeof window === "undefined") return () => {};
      const existingState = isBrowserNavigationState(window.history.state)
        ? window.history.state
        : null;
      const view = appViewFromUrl(new URL(window.location.href));
      const depth = existingState?.depth ?? 0;
      const initialState: BrowserNavigationState = {
        app: "mjtv",
        version: 1,
        view,
        depth,
        scrollY: existingState?.scrollY ?? window.scrollY,
      };
      window.history.replaceState(initialState, "", appViewToPath(view));
      set({
        view,
        canGoBack: depth > 0,
        ...(view.view === "watch"
          ? { activePlayerChannelId: view.channelId, playerMode: "full" as const }
          : {}),
      });

      const onPopState = (event: PopStateEvent) => {
        const state = isBrowserNavigationState(event.state) ? event.state : null;
        const restoredView = appViewFromUrl(new URL(window.location.href));
        set((current) => ({
          view: restoredView,
          canGoBack: (state?.depth ?? 0) > 0,
          playerMode:
            restoredView.view === "watch" ? "full" : current.activePlayerChannelId ? "mini" : null,
          ...(restoredView.view === "watch"
            ? { activePlayerChannelId: restoredView.channelId }
            : {}),
        }));
        restoreScroll(state?.scrollY ?? 0);
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    },
    setView: (view) => navigate(view),
    goBack: () => {
      if (
        typeof window !== "undefined" &&
        isBrowserNavigationState(window.history.state) &&
        window.history.state.depth > 0
      ) {
        window.history.back();
        return;
      }
      navigate({ view: "home" }, "replace");
    },
    navigatePrimary: (view) => {
      navigate({ view });
      if (get().activePlayerChannelId) set({ playerMode: "mini" });
    },
    goHome: () => navigate({ view: "home" }),
    goChannels: () => navigate({ view: "channels" }),
    openExplorer: (filters, context) => navigate({ view: "channels", filters, context }),
    replaceExplorerFilters: (filters) => {
      const currentView = get().view;
      if (currentView.view !== "channels" && currentView.view !== "search") return;
      const nextView: AppView = { ...currentView, filters };
      if (JSON.stringify(currentView) === JSON.stringify(nextView)) return;
      if (typeof window !== "undefined") {
        const state = isBrowserNavigationState(window.history.state) ? window.history.state : null;
        window.history.replaceState(
          {
            app: "mjtv",
            version: 1,
            view: nextView,
            depth: state?.depth ?? 0,
            scrollY: window.scrollY,
          } satisfies BrowserNavigationState,
          "",
          appViewToPath(nextView),
        );
      }
      set({ view: nextView });
    },
    goFavorites: () => navigate({ view: "my-list" }),
    goHistory: () => navigate({ view: "my-list" }),
    goSettings: () => navigate({ view: "settings" }),
    goImport: () => navigate({ view: "import" }),
    goSearch: () => navigate({ view: "search" }),
    goLive: () => navigate({ view: "live" }),
    goMyList: () => navigate({ view: "my-list" }),
    goProfile: () => navigate({ view: "profile" }),
    openEpg: (channelId) => {
      navigate(channelId ? { view: "epg", channelId } : { view: "epg" });
      if (get().activePlayerChannelId) set({ playerMode: "mini" });
    },
    minimizePlayer: () => {
      if (!get().activePlayerChannelId) return;
      set({ playerMode: "mini" });
      navigate({ view: "home" }, "replace");
    },
    expandPlayer: () => {
      const channelId = get().activePlayerChannelId;
      if (!channelId) return;
      set({ playerMode: "full" });
      navigate({ view: "watch", channelId });
    },
    closePlayer: () => {
      const wasFull = get().view.view === "watch";
      set({ activePlayerChannelId: null, playerMode: null });
      if (wasFull) navigate({ view: "home" }, "replace");
    },
    watch: (channelId) => {
      set({ activePlayerChannelId: channelId, playerMode: "full" });
      navigate({ view: "watch", channelId });
    },
  };
});
