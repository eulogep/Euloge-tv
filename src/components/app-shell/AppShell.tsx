"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { BottomNav } from "./BottomNav";
import { useOnlineStatus } from "./use-online-status";
import { OfflineScreen } from "@/components/feedback/OfflineScreen";
import { useSettings } from "@/features/settings/settings";
import { useFavorites } from "@/features/favorites/favorites";
import { TopBar } from "./TopBar";

import { SleepTimerLifecycle } from "@/features/player/presentation/SleepTimer";
import { VoyageLifecycle } from "@/features/meridian/presentation/Voyage";
import { TransferPrompt } from "@/features/transfer/TransferViews";
import { mapRemoteKeyToAction } from "./tv-remote-navigation";

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const initializeNavigation = useAppStore((s) => s.initializeNavigation);
  const goSearch = useAppStore((s) => s.goSearch);
  const openEpg = useAppStore((s) => s.openEpg);
  const goBack = useAppStore((s) => s.goBack);
  const canGoBack = useAppStore((s) => s.canGoBack);
  const watch = useAppStore((s) => s.watch);
  const { state: favorites } = useFavorites();
  const online = useOnlineStatus();
  const { state: settings } = useSettings();
  const playerMode = useAppStore((s) => s.playerMode);
  const isImmersive = view.view === "watch" || view.view === "search" || view.view === "epg";
  const showTopBar = !isImmersive;
  const showBottomNav = view.view !== "watch" && view.view !== "search" && view.view !== "epg";

  useEffect(() => initializeNavigation(), [initializeNavigation]);

  // Desktop & TV remote shortcuts: "⌘K"/"Ctrl+K" or "/" jumps to search, 1 to 9 tune the matching preset in Ma liste, Guide opens EPG.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        goSearch();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const remoteAction = mapRemoteKeyToAction(event.key);
      if (remoteAction?.type === "open_guide") {
        event.preventDefault();
        openEpg();
        return;
      }
      if (remoteAction?.type === "back" && canGoBack) {
        event.preventDefault();
        goBack();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        goSearch();
      } else if (/^[1-9]$/.test(event.key)) {
        const channelId = favorites.channelIds[Number(event.key) - 1];
        if (channelId) watch(channelId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoBack, favorites.channelIds, goBack, openEpg, goSearch, watch]);

  return (
    <div
      className={["md-shell relative flex min-h-screen flex-col"].join(" ")}
      data-reduce-motion={settings.reduceAnimations ? "true" : "false"}
    >
      <a href="#mjtv-main" className="md-skip-link">
        Aller au contenu
      </a>
      <main
        id="mjtv-main"
        tabIndex={-1}
        className={cnMain(isImmersive, playerMode === "mini")}
        aria-busy={false}
      >
        {showTopBar && <TopBar />}
        <SleepTimerLifecycle />
        <VoyageLifecycle />
        <TransferPrompt />
        {online ? children : <OfflineScreen />}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

const cnMain = (isImmersive: boolean, hasMiniPlayer: boolean): string =>
  [
    "relative z-[var(--z-content)] mx-auto w-full max-w-[100rem] flex-1 px-[var(--space-page-x)]",
    hasMiniPlayer
      ? `${isImmersive ? "pt-4 " : ""}pb-[calc(9.25rem+var(--safe-bottom))]`
      : isImmersive
        ? "pt-4 pb-[calc(1.5rem+var(--safe-bottom))]"
        : "pb-[calc(5.5rem+var(--safe-bottom))] lg:pb-14",
  ].join(" ");
