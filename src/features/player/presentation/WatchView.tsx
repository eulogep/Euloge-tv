"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Star, Globe, Tag } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { Player } from "@/features/player/presentation/Player";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import type {
  NormalizedChannel,
  ChannelSummary,
  CatalogResponse,
} from "@/features/catalog/domain/types";

export function WatchView({ channelId }: { channelId: string }) {
  const goHome = useAppStore((s) => s.goHome);
  const watch = useAppStore((s) => s.watch);
  const { has, toggle } = useFavorites();
  const { push } = useHistory();
  const [channel, setChannel] = useState<NormalizedChannel | null>(null);
  const [related, setRelated] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/channels/${encodeURIComponent(channelId)}`);
        if (!res.ok) throw new Error("channel");
        const json = (await res.json()) as NormalizedChannel;
        if (cancelled) return;
        setChannel(json);
        // Load related channels from the same country.
        if (json.countryCode) {
          const r = await fetch(`/api/catalog?country=${json.countryCode}&limit=12`);
          if (r.ok) {
            const data = (await r.json()) as CatalogResponse;
            if (!cancelled) {
              setRelated(data.items.filter((c) => c.id !== channelId).slice(0, 6));
            }
          }
        }
      } catch {
        if (!cancelled) setError("Chaîne introuvable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={goHome}
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <ChannelGridSkeleton count={1} />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <EmptyState
        title={error ?? "Chaîne introuvable"}
        description="Cette chaîne n'existe plus ou a été retirée du catalogue."
        action={
          <button
            type="button"
            onClick={goHome}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Retour à l'accueil
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={goHome}
        className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <Player channel={channel} onPlaying={(cid, sid) => push(cid, sid)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{channel.name}</h1>
          <div className="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
            {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
            {channel.countryName && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {channel.countryName}
              </span>
            )}
            {channel.categories[0] && (
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" aria-hidden />
                <span className="capitalize">{channel.categories[0]}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggle(channel.id)}
          className="border-border hover:bg-surface-elevated inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm"
          aria-pressed={has(channel.id)}
        >
          <Star
            className={`h-4 w-4 ${has(channel.id) ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
          />
          {has(channel.id) ? "Favori" : "Ajouter"}
        </button>
      </div>
      {related.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold">Chaînes liées</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map((c) => (
              <ChannelCard
                key={c.id}
                channel={c}
                isFavorite={has(c.id)}
                onToggleFavorite={toggle}
                onOpen={watch}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
