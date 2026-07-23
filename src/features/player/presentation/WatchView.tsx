"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Star, Globe, Tag, ListVideo, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { Player } from "@/features/player/presentation/Player";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import type {
  PublicChannelDetail,
  ChannelSummary,
  CatalogResponse,
} from "@/features/catalog/domain/types";
import { rankRelatedSummaries } from "@/features/catalog/application/related-channels";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import { channelHealthLabel, healthStatusOf } from "@/features/catalog/application/source-health";
import { SourceReportPanel } from "@/features/catalog/presentation/SourceReportPanel";

export function WatchView({ channelId }: { channelId: string }) {
  const goBack = useAppStore((s) => s.goBack);
  const watch = useAppStore((s) => s.watch);
  const { has, toggle } = useFavorites();
  const { push } = useHistory();
  const [channel, setChannel] = useState<PublicChannelDetail | null>(null);
  const [related, setRelated] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [preferredSourceId, setPreferredSourceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/channels/${encodeURIComponent(channelId)}`);
        if (!res.ok) throw new Error("channel");
        const json = (await res.json()) as PublicChannelDetail;
        if (cancelled) return;
        setChannel(json);
        // Rank a broad deterministic candidate pool by category, language,
        // country, source availability and metadata quality.
        const r = await fetch("/api/catalog?limit=100");
        if (r.ok) {
          const data = (await r.json()) as CatalogResponse;
          if (!cancelled) {
            setRelated(rankRelatedSummaries(json, data.items, 6));
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
          onClick={goBack}
          className="premium-button-secondary gap-1 px-3 text-sm"
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
          <button type="button" onClick={goBack} className="premium-button-primary px-4 text-sm">
            Retour à l'accueil
          </button>
        }
      />
    );
  }

  const enabledStreams = channel.streams.filter((stream) => !stream.disabled);
  const healthStatus = healthStatusOf({
    health: channel.health,
    streamCount: enabledStreams.length,
  });
  const canWatch = enabledStreams.length > 0 && healthStatus !== "no_source";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={goBack}
        className="premium-button-secondary gap-1 px-3 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      {canWatch ? (
        <Player
          key={`${channel.id}:${retryNonce}:${preferredSourceId ?? "auto"}`}
          channel={channel}
          preferredSourceId={preferredSourceId}
          onPlaying={(cid, sid) => push(cid, sid)}
          onBack={goBack}
        />
      ) : (
        <div
          className="premium-surface flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"
          data-system-state="no-source"
        >
          <h2 className="type-section">Aucune source disponible</h2>
          <p className="text-muted max-w-xl text-sm">
            Cette chaîne reste visible pour conserver sa fiche et la raison de sa curation, mais
            elle ne peut pas être lancée actuellement.
          </p>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="type-title truncate">{channel.name}</h1>
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
                <span>{categoryLabelFr(channel.categories[0])}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggle(channel.id)}
          className="premium-button-secondary gap-1.5 px-4 text-sm"
          aria-pressed={has(channel.id)}
          aria-label={has(channel.id) ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
        >
          <Star
            className={`h-4 w-4 ${has(channel.id) ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
          />
          {has(channel.id) ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
        </button>
      </div>
      <section className="premium-surface space-y-4 p-4 sm:p-5" aria-label="Santé de la chaîne">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-eyebrow">Disponibilité</p>
            <h2 className="type-section mt-1">{channelHealthLabel(healthStatus)}</h2>
            <p className="text-muted mt-1 max-w-2xl text-sm">
              {channel.health?.reasonMessage ?? "Cette chaîne n’a pas encore été vérifiée."}
            </p>
            <p className="text-muted mt-2 text-xs">
              {enabledStreams.length} source{enabledStreams.length > 1 ? "s" : ""}
              {channel.health?.checkedAt
                ? ` · Dernier contrôle ${new Date(channel.health.checkedAt).toLocaleDateString("fr-FR")}`
                : " · Aucun contrôle catalogue daté"}
            </p>
          </div>
          {canWatch && (
            <button
              type="button"
              onClick={() => setRetryNonce((value) => value + 1)}
              className="premium-button-primary gap-2 px-4 text-sm"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Réessayer
            </button>
          )}
        </div>
        {enabledStreams.length > 1 && (
          <details>
            <summary className="premium-button-secondary w-fit cursor-pointer list-none gap-2 px-4 text-sm">
              <ListVideo className="h-4 w-4" aria-hidden /> Choisir une autre source
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {enabledStreams.map((stream, index) => (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => {
                    setPreferredSourceId(stream.id);
                    setRetryNonce((value) => value + 1);
                  }}
                  className="border-border bg-background/40 min-h-11 rounded-lg border px-3 text-left text-sm hover:bg-[var(--state-hover)]"
                >
                  Source {index + 1} — {stream.title}
                </button>
              ))}
            </div>
          </details>
        )}
        <SourceReportPanel channelId={channel.id} healthStatus={healthStatus} />
      </section>
      {related.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="type-section">Chaînes liées</h2>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
