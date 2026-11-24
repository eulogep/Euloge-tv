"use client";

import { useEffect, useState } from "react";
import { Grid2x2, Shuffle } from "lucide-react";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { navigateFocusableGrid } from "@/components/app-shell/tv-remote-navigation";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useFavorites } from "@/features/favorites/favorites";
import { useAppStore } from "@/lib/utils/app-store";
import { canFeatureChannel } from "../application/source-health";
import { useCatalog } from "./use-catalog";
import { LiveMosaicWall } from "./LiveMosaicWall";

const MOSAIC_INTENT_KEY = "mjtv:open-mosaic-once";

export const requestMosaicOnLive = () => {
  try {
    window.sessionStorage.setItem(MOSAIC_INTENT_KEY, "1");
  } catch {
    // ignore
  }
  useAppStore.getState().setView({ view: "live" });
};

export function LiveView() {
  const watch = useAppStore((state) => state.watch);
  const { has, toggle } = useFavorites();
  const { items, loading, error } = useCatalog({ limit: 100, sort: "quality" });
  const liveItems = items.filter(canFeatureChannel);
  const [mosaicOpen, setMosaicOpen] = useState(false);

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("mosaic") === "1";
      const fromIntent = window.sessionStorage.getItem(MOSAIC_INTENT_KEY) === "1";
      if (fromIntent) window.sessionStorage.removeItem(MOSAIC_INTENT_KEY);
      if (fromUrl || fromIntent) setMosaicOpen(true);
    } catch {
      // ignore
    }
  }, []);

  const watchRandomChannel = () => {
    if (liveItems.length === 0) return;
    const index = Math.floor(Math.random() * liveItems.length);
    watch(liveItems[index].id);
  };

  return (
    <section className="space-y-6" aria-labelledby="live-title">
      <header className="md-page-header flex flex-wrap items-end justify-between gap-4">
        <div>
          {!error && (
            <p className="md-kicker">
              <span className="md-pulse" aria-hidden /> À l’antenne
            </p>
          )}
          <h1 id="live-title" className="type-title mt-1">
            Live
          </h1>
          {!loading && !error && (
            <p className="text-muted mt-1.5 text-sm">
              {liveItems.length} {liveItems.length === 1 ? "chaîne" : "chaînes"} avec une source à
              essayer
            </p>
          )}
        </div>
        {!loading && !error && liveItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMosaicOpen((prev) => !prev)}
              aria-pressed={mosaicOpen}
              className={
                mosaicOpen
                  ? "premium-button-primary gap-2 px-4 text-xs"
                  : "premium-button-secondary gap-2 px-4 text-xs"
              }
            >
              <Grid2x2 className="h-3.5 w-3.5" aria-hidden />
              {mosaicOpen ? "Quitter la Mosaïque" : "Mosaïque 4 écrans"}
            </button>
            <button
              type="button"
              onClick={watchRandomChannel}
              className="premium-button-secondary gap-2 px-4 text-xs"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden />
              Chaîne aléatoire
            </button>
          </div>
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
        <EmptyState title="Aucune source à essayer" description="Revenez un peu plus tard." />
      ) : mosaicOpen ? (
        <LiveMosaicWall
          channels={liveItems}
          onExpand={watch}
          onClose={() => setMosaicOpen(false)}
        />
      ) : (
        <div
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          data-tv-grid="true"
          onKeyDown={(event) => {
            if (navigateFocusableGrid(event.currentTarget, event.key, 4)) {
              event.preventDefault();
            }
          }}
        >
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
