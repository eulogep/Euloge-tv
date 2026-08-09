"use client";

import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useFavorites } from "@/features/favorites/favorites";
import { useAppStore } from "@/lib/utils/app-store";
import { canFeatureChannel } from "../application/source-health";
import { useCatalog } from "./use-catalog";

export function LiveView() {
  const watch = useAppStore((state) => state.watch);
  const { has, toggle } = useFavorites();
  const { items, loading, error } = useCatalog({ limit: 100, sort: "quality" });
  const liveItems = items.filter(canFeatureChannel);

  return (
    <section className="space-y-5" aria-labelledby="live-title">
      <header>
        <h1 id="live-title" className="type-title">
          Live
        </h1>
        {!loading && !error && (
          <p className="text-subtle mt-1 text-xs font-medium">
            {liveItems.length} {liveItems.length === 1 ? "chaîne" : "chaînes"} à l’antenne
          </p>
        )}
      </header>
      {loading ? (
        <ChannelGridSkeleton count={8} />
      ) : error ? (
        <EmptyState
          title="Live indisponible"
          description="Impossible de charger les chaînes en direct pour le moment."
        />
      ) : liveItems.length === 0 ? (
        <EmptyState title="Aucune chaîne en direct" description="Revenez un peu plus tard." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {liveItems.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isFavorite={has(channel.id)}
              onToggleFavorite={toggle}
              onOpen={watch}
              compact
            />
          ))}
        </div>
      )}
    </section>
  );
}
