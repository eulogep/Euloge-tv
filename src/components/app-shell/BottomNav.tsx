"use client";

import { NAV_ITEMS, type NavView } from "@/config/navigation";
import { useAppStore } from "@/lib/utils/app-store";
import { cn } from "@/lib/utils";
import { LayoutList } from "lucide-react";

type View = NavView | "watch" | "import";

export function BottomNav() {
  const view = useAppStore((s) => s.view);
  const goHome = useAppStore((s) => s.goHome);
  const goChannels = useAppStore((s) => s.goChannels);
  const goFavorites = useAppStore((s) => s.goFavorites);
  const goHistory = useAppStore((s) => s.goHistory);
  const goSettings = useAppStore((s) => s.goSettings);
  const goImport = useAppStore((s) => s.goImport);
  const navigate: Record<NavView, () => void> = {
    home: goHome,
    channels: goChannels,
    favorites: goFavorites,
    history: goHistory,
    settings: goSettings,
  };

  const activeView: View =
    view.view === "watch" || view.view === "import" ? view.view : (view.view as NavView);

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className="border-border bg-surface/95 supports-[backdrop-filter]:bg-surface/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.view;
          return (
            <li key={item.view} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={navigate[item.view]}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] leading-3 font-medium tracking-tight transition-colors min-[390px]:text-[10px] sm:text-[11px]",
                  isActive ? "text-[var(--accent)]" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
        <li className="min-w-0 flex-1">
          <button
            type="button"
            onClick={goImport}
            aria-current={activeView === "import" ? "page" : undefined}
            className={cn(
              "flex h-16 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] leading-3 font-medium tracking-tight transition-colors min-[390px]:text-[10px] sm:text-[11px]",
              activeView === "import" ? "text-[var(--accent)]" : "text-muted hover:text-foreground",
            )}
          >
            <LayoutList className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate">Bibliothèque</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
