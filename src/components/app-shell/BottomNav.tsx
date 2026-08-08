"use client";

import { NAV_ITEMS, type NavView } from "@/config/navigation";
import { useAppStore } from "@/lib/utils/app-store";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const view = useAppStore((state) => state.view);
  const navigate = useAppStore((state) => state.navigatePrimary);
  const activeView: NavView | null =
    view.view === "settings" || view.view === "import"
      ? "profile"
      : view.view === "channels"
        ? "explore"
        : ["search", "epg", "watch"].includes(view.view)
          ? null
          : (view.view as NavView);

  return (
    <nav
      aria-label="Navigation principale"
      className="border-border bg-surface/96 supports-[backdrop-filter]:bg-surface/84 fixed inset-x-0 bottom-0 z-[var(--z-navigation)] border-t shadow-[var(--shadow-nav)] backdrop-blur-xl"
      style={{
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
      data-testid="bottom-navigation"
    >
      <ul className="mx-auto grid h-16 max-w-3xl grid-cols-5 items-stretch px-1 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;
          return (
            <li key={item.view} className="min-w-0">
              <button
                type="button"
                onClick={() => navigate(item.view)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  "flex h-full min-h-11 w-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[10px] leading-none font-bold transition-colors duration-[var(--duration-base)]",
                  active ? "text-accent-bright" : "text-subtle hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.35 : 1.8} aria-hidden />
                <span className="line-clamp-2 text-center break-words" data-nav-label>
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
