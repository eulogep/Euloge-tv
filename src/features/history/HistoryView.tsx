"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useHistory } from "@/features/history/history";
import { useFavorites } from "@/features/favorites/favorites";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Trash2 } from "lucide-react";
import type { ChannelSummary } from "@/features/catalog/domain/types";

const relativeDate = (iso: string): string => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
};

export function HistoryView() {
  const watch = useAppStore((s) => s.watch);
  const { state, hydrated, clear } = useHistory();
  const { has, toggle } = useFavorites();
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (state.entries.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const ids = state.entries.slice(0, 24).map((e) => e.channelId);
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/channels/${encodeURIComponent(id)}`);
            if (!res.ok) return null;
            const c = await res.json();
            return {
              ...c,
              streams: [],
              streamCount: c.streams?.length ?? 0,
              bestCompatibility: c.streams?.[0]?.browserCompatibility ?? "unknown",
            } as ChannelSummary;
          }),
        );
        if (!cancelled) setItems(results.filter((r): r is ChannelSummary => r !== null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, state.entries]);

  return (
    <section className="space-y-4" aria-label="Historique">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historique</h1>
        {state.entries.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-muted inline-flex items-center gap-1.5 text-sm hover:text-[var(--danger)]"
          >
            <Trash2 className="h-4 w-4" /> Vider
          </button>
        )}
      </header>
      {loading ? (
        <ChannelGridSkeleton count={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucun historique"
          description="Les chaînes que vous regardez apparaîtront ici."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((c, i) => {
            const entry = state.entries[i];
            return (
              <div key={c.id} className="relative">
                <ChannelCard
                  channel={c}
                  isFavorite={has(c.id)}
                  onToggleFavorite={toggle}
                  onOpen={watch}
                />
                {entry && (
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
                    {relativeDate(entry.watchedAt)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
