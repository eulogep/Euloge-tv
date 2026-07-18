"use client";

import { NAV_ITEMS, type NavView } from "@/config/navigation";
import { useAppStore } from "@/lib/utils/app-store";
import { cn } from "@/lib/utils";
import { LayoutList } from "lucide-react";

type View = NavView | "watch" | "import";

export function BottomNav() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const goImport = useAppStore((s) => s.goImport);

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
            <li key={item.view} className="flex-1">
              <button
                type="button"
                onClick={() => setView({ view: item.view })}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-[var(--accent)]" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={goImport}
            aria-current={activeView === "import" ? "page" : undefined}
            className={cn(
              "flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
              activeView === "import" ? "text-[var(--accent)]" : "text-muted hover:text-foreground",
            )}
          >
            <LayoutList className="h-5 w-5" aria-hidden />
            <span>Bibliothèque</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
