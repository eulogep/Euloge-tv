"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { BottomNav } from "./BottomNav";
import { useOnlineStatus } from "./use-online-status";
import { OfflineScreen } from "@/components/feedback/OfflineScreen";
import { useSettings } from "@/features/settings/settings";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const initializeNavigation = useAppStore((s) => s.initializeNavigation);
  const online = useOnlineStatus();
  const { state: settings } = useSettings();
  const playerMode = useAppStore((s) => s.playerMode);
  const isImmersive = view.view === "watch" || view.view === "search" || view.view === "epg";
  const showTopBar = !isImmersive;
  const showBottomNav = view.view !== "watch" && view.view !== "search" && view.view !== "epg";

  useEffect(() => initializeNavigation(), [initializeNavigation]);

  return (
    <div
      className="relative flex min-h-screen flex-col before:pointer-events-none before:fixed before:inset-0 before:bg-[radial-gradient(circle_at_10%_0%,rgb(122_92_255_/_0.09),transparent_30%),radial-gradient(circle_at_100%_20%,rgb(50_214_255_/_0.05),transparent_28%)]"
      data-reduce-motion={settings.reduceAnimations ? "true" : "false"}
    >
      <main className={cnMain(isImmersive, playerMode === "mini")} aria-busy={false}>
        {showTopBar && <TopBar />}
        {online ? children : <OfflineScreen />}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

const cnMain = (isImmersive: boolean, hasMiniPlayer: boolean): string =>
  [
    "relative z-[var(--z-content)] mx-auto w-full max-w-6xl flex-1 px-[var(--space-page-x)] pt-5 sm:pt-7",
    hasMiniPlayer
      ? "pb-[calc(9.25rem+var(--safe-bottom))]"
      : isImmersive
        ? "pb-[calc(1.5rem+var(--safe-bottom))]"
        : "pb-[calc(5.5rem+var(--safe-bottom))]",
  ].join(" ");
