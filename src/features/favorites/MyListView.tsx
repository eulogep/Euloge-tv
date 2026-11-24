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
    <section className="space-y-6" aria-labelledby="my-list-title">
      <header className="md-page-header">
        <p className="md-kicker">Espace personnel</p>
        <h1 id="my-list-title" className="type-title mt-1">
          Ma liste
        </h1>
      </header>
      <div
        className="border-border bg-surface grid max-w-md grid-cols-2 rounded-full border p-1 shadow-[var(--shadow-card)]"
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
              "min-h-11 rounded-full text-xs font-bold transition-all",
              tab === value
                ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-accent)]"
                : "text-muted hover:text-foreground",
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
