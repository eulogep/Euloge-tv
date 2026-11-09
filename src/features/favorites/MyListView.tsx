"use client";

import { HistoryView } from "@/features/history/HistoryView";
import { cn } from "@/lib/utils";
import { useAppStore, type MyListTab } from "@/lib/utils/app-store";
import { FavoritesView } from "./FavoritesView";

export function MyListView() {
  const tab = useAppStore((state) =>
    state.view.view === "my-list" ? (state.view.tab ?? "favorites") : "favorites",
  );
  const setView = useAppStore((state) => state.setView);
  return (
    <section className="space-y-5" aria-labelledby="my-list-title">
      <h1 id="my-list-title" className="type-title">
        Ma liste
      </h1>
      <div
        className="border-border bg-card grid grid-cols-2 rounded-lg border p-1"
        role="tablist"
        aria-label="Sections de Ma liste"
      >
        {(
          [
            ["favorites", "Favoris"],
            ["history", "Historique"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setView({ view: "my-list", tab: value as MyListTab })}
            className={cn(
              "min-h-11 rounded-md text-xs font-bold transition-colors",
              tab === value ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "favorites" ? <FavoritesView embedded /> : <HistoryView embedded />}
      </div>
    </section>
  );
}
