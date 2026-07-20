"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Trash2 } from "lucide-react";
import type { ChannelSummary } from "@/features/catalog/domain/types";

export function FavoritesView() {
  const watch = useAppStore((s) => s.watch);
  const { state, hydrated, toggle, clear } = useFavorites();
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!hydrated) return;
    if (state.channelIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        // Fetch each favorite by id in parallel (capped to 24).
        const ids = state.channelIds.slice(0, 24);
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
  }, [hydrated, state.channelIds]);

  return (
    <section className="space-y-4" aria-label="Ma liste">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ma liste</h1>
        {items.length > 0 && (
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
          title="Ma liste est vide"
          description="Ajoutez des chaînes à Ma liste depuis leur carte ou leur fiche."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              isFavorite
              onToggleFavorite={toggle}
              onOpen={watch}
            />
          ))}
        </div>
      )}
    </section>
  );
}
