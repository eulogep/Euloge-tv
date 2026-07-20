"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { BottomNav } from "./BottomNav";
import { useOnlineStatus } from "./use-online-status";
import { OfflineScreen } from "@/components/feedback/OfflineScreen";

export function AppShell({ children }: { children: React.ReactNode }) {
  const view = useAppStore((s) => s.view);
  const initializeNavigation = useAppStore((s) => s.initializeNavigation);
  const online = useOnlineStatus();
  const isWatch = view.view === "watch";

  useEffect(() => initializeNavigation(), [initializeNavigation]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className={cnMain(isWatch)} aria-busy={false}>
        {online ? children : <OfflineScreen />}
      </main>
      {!isWatch && <BottomNav />}
    </div>
  );
}

const cnMain = (isWatch: boolean): string =>
  ["flex-1 px-4 pb-24 pt-4 mx-auto w-full max-w-6xl", isWatch ? "" : "md:pb-24"].join(" ");
