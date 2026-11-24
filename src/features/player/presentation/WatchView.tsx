"use client";

import { useEffect, useRef, useState } from "react";
import {
  Star,
  Globe,
  Tag,
  RotateCcw,
  CalendarDays,
  ListVideo,
  ArrowUpRight,
  Sparkles,
  Tv,
} from "lucide-react";
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
import {
  canPlayChannel,
  channelHealthLabel,
  healthStatusOf,
  toPublicChannelDetail,
} from "@/features/catalog/application/source-health";
import { EpgNowNext } from "@/features/epg/presentation/EpgNowNext";
import { SourceReportPanel } from "@/features/catalog/presentation/SourceReportPanel";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { useVoyage } from "@/features/meridian/application/voyage";
import { WatchRibbon } from "@/features/meridian/presentation/WatchRibbon";
import { playlistStore } from "@/features/imported-playlists/infrastructure/playlist-store";
import { toNormalizedChannel } from "@/features/imported-playlists/domain/types";
import { ZapperDrawer } from "./ZapperDrawer";
import { cn } from "@/lib/utils";

const broadcasterWebsite = (value: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
};

const CATEGORY_AMBIENT: Record<string, [string, string]> = {
  news: ["#0284c7", "#38bdf8"],
  sports: ["#e11d48", "#f59e0b"],
  music: ["#c026d3", "#f472b6"],
  movies: ["#d97706", "#fbbf24"],
  series: ["#6366f1", "#a78bfa"],
  documentaries: ["#059669", "#34d399"],
  culture: ["#d97706", "#fbbf24"],
  entertainment: ["#db2777", "#fb923c"],
  kids: ["#0d9488", "#facc15"],
  international: ["#0891b2", "#2dd4bf"],
};

/**
 * Dynamic Philips-style Cinema Ambilight glow behind the active player.
 * Samples live video frames onto a tiny 12×8 canvas when CORS permits,
 * falling back seamlessly to the channel's studio category palette.
 */
function useCinemaAmbilight(
  containerRef: React.RefObject<HTMLDivElement | null>,
  category: string,
  active: boolean,
): [string, string] {
  const fallback = CATEGORY_AMBIENT[category] ?? ["#f5b942", "#38bdf8"];
  const [colors, setColors] = useState<[string, string]>(fallback);

  useEffect(() => {
    setColors(CATEGORY_AMBIENT[category] ?? ["#f5b942", "#38bdf8"]);
  }, [category]);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.width = 12;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let corsBlocked = false;
    const sample = () => {
      if (corsBlocked) return;
      const video = containerRef.current?.querySelector("video");
      if (!video || video.paused || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, 12, 8);
        const data = ctx.getImageData(0, 0, 12, 8).data;
        let lr = 0,
          lg = 0,
          lb = 0,
          rr = 0,
          rg = 0,
          rb = 0;
        let lc = 0,
          rc = 0;
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 12; x++) {
            const idx = (y * 12 + x) * 4;
            if (x < 6) {
              lr += data[idx]!;
              lg += data[idx + 1]!;
              lb += data[idx + 2]!;
              lc++;
            } else {
              rr += data[idx]!;
              rg += data[idx + 1]!;
              rb += data[idx + 2]!;
              rc++;
            }
          }
        }
        const left = `rgb(${Math.round(lr / lc)} ${Math.round(lg / lc)} ${Math.round(lb / lc)})`;
        const right = `rgb(${Math.round(rr / rc)} ${Math.round(rg / rc)} ${Math.round(rb / rc)})`;
        setColors([left, right]);
      } catch {
        // Cross-origin video stream without ACAO header: stick to studio fallback cleanly.
        corsBlocked = true;
      }
    };

    const timer = window.setInterval(sample, 450);
    return () => window.clearInterval(timer);
  }, [active, containerRef]);

  return colors;
}

export function WatchView({
  channelId,
  mode = "full",
}: {
  channelId: string;
  mode?: "full" | "mini";
}) {
  const minimizePlayer = useAppStore((s) => s.minimizePlayer);
  const expandPlayer = useAppStore((s) => s.expandPlayer);
  const closePlayer = useAppStore((s) => s.closePlayer);
  const openEpg = useAppStore((s) => s.openEpg);
  const watch = useAppStore((s) => s.watch);
  const { has, toggle } = useFavorites();
  const { push } = useHistory();
  const [channel, setChannel] = useState<PublicChannelDetail | null>(null);
  const [related, setRelated] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [preferredSourceId, setPreferredSourceId] = useState<string | null>(null);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [zapperOpen, setZapperOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [ambilightLeft, ambilightRight] = useCinemaAmbilight(
    stageRef,
    channel?.primaryCategory ?? "other",
    mode === "full",
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const isLocalImported =
          channelId.startsWith("imported:") ||
          channelId.startsWith("pending:") ||
          channelId.startsWith("pl_");
        if (isLocalImported) {
          const imported = await playlistStore.findChannel(channelId);
          if (cancelled) return;
          if (!imported) throw new Error("channel");
          setChannel(toPublicChannelDetail(toNormalizedChannel(imported)));
          setRelated([]);
          return;
        }
        const res = await fetch(`/api/channels/${encodeURIComponent(channelId)}`);
        if (!res.ok) {
          const imported = await playlistStore.findChannel(channelId).catch(() => null);
          if (cancelled) return;
          if (imported) {
            setChannel(toPublicChannelDetail(toNormalizedChannel(imported)));
            setRelated([]);
            return;
          }
          throw new Error("channel");
        }
        const json = (await res.json()) as PublicChannelDetail;
        if (cancelled) return;
        setChannel(json);
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
  }, [channelId, retryNonce]);

  if (loading) {
    return (
      <div className="space-y-4">
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
            onClick={closePlayer}
            className="premium-button-primary px-4 text-sm"
          >
            Retour à l'accueil
          </button>
        }
      />
    );
  }

  const enabledStreams = channel.streams;
  const healthStatus = healthStatusOf({
    health: channel.health,
    streamCount: enabledStreams.length,
  });
  const canWatch = canPlayChannel({
    health: channel.health,
    streamCount: enabledStreams.length,
  });
  const unavailableTitle =
    healthStatus === "archived"
      ? "Chaîne archivée"
      : healthStatus === "temporarily_unavailable"
        ? "Temporairement indisponible"
        : "Aucune source disponible";
  const unavailableDescription =
    healthStatus === "archived"
      ? "Cette chaîne est conservée à titre d’archive et ne peut pas être lancée."
      : "Cette chaîne reste visible pour conserver sa fiche et la raison de sa curation, mais elle ne peut pas être lancée actuellement.";
  const website = healthStatus === "archived" ? null : broadcasterWebsite(channel.websiteUrl);

  const player = canWatch ? (
    <Player
      key={`${channel.id}:${retryNonce}:${preferredSourceId ?? "auto"}`}
      channel={channel}
      preferredSourceId={preferredSourceId}
      onPlaying={(cid, sid) => {
        push(cid, sid);
        useVoyage.getState().confirm(cid);
      }}
      onBack={minimizePlayer}
      mini={mode === "mini"}
      onExpand={expandPlayer}
      onClose={closePlayer}
    />
  ) : null;

  return (
    <div
      className={cn(
        mode === "mini" ? "mini-player-dock" : "md-watch-view space-y-4",
        cinemaMode && mode === "full" && "md-cinema-lights-out",
      )}
      data-cinema-mode={cinemaMode ? "true" : "false"}
    >
      {mode === "full" && (
        <div
          className={cn(
            "transition-opacity duration-500",
            cinemaMode && "opacity-20 hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <WatchRibbon
            channelId={channel.id}
            channelName={channel.name}
            countryCode={channel.countryCode}
            timeZone={channel.broadcastTimeZone}
            city={channel.broadcastCity}
          />
        </div>
      )}

      {/* Cinema Ambilight Stage Wrapper */}
      <div ref={stageRef} className={mode === "full" ? "relative isolate" : undefined}>
        {mode === "full" && canWatch && (
          <div
            className="md-ambilight"
            aria-hidden
            style={
              {
                "--ambi-left": ambilightLeft,
                "--ambi-right": ambilightRight,
                opacity: cinemaMode ? 0.52 : 0.28,
              } as React.CSSProperties
            }
          />
        )}
        {player ?? (
          <div
            className="premium-surface flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center"
            data-system-state={healthStatus === "archived" ? "archived" : "no-source"}
          >
            <h2 className="type-section">{unavailableTitle}</h2>
            <p className="text-muted max-w-xl text-sm">{unavailableDescription}</p>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="premium-button-secondary mt-3 gap-2 px-4 text-sm"
              >
                Ouvrir le site de la chaîne <ArrowUpRight size={16} aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>

      {mode === "full" && (
        <div
          className={cn(
            "space-y-4 transition-opacity duration-500",
            cinemaMode && "opacity-20 hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="type-title truncate">{channel.name}</h1>
              <div className="text-muted mt-1 flex flex-wrap items-center gap-2 text-sm">
                {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
                {channel.countryName && (
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                    {channel.countryCode
                      ? countryDisplayName(channel.countryCode, channel.countryName)
                      : channel.countryName}
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
            <div className="flex flex-wrap shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setZapperOpen(true)}
                className="premium-button-secondary gap-1.5 px-3.5 text-xs"
              >
                <Tv className="h-4 w-4" aria-hidden /> Zapper
              </button>
              <button
                type="button"
                onClick={() => setCinemaMode((prev) => !prev)}
                aria-pressed={cinemaMode}
                className={
                  cinemaMode
                    ? "premium-button-primary gap-1.5 px-3.5 text-xs"
                    : "premium-button-secondary gap-1.5 px-3.5 text-xs"
                }
              >
                <Sparkles className="h-4 w-4" aria-hidden /> Cinéma
              </button>
              <button
                type="button"
                onClick={() => openEpg(channel.id)}
                className="premium-button-secondary gap-1.5 px-3.5 text-xs"
              >
                <CalendarDays className="h-4 w-4" aria-hidden /> Guide
              </button>
              <button
                type="button"
                onClick={() => toggle(channel.id)}
                className="premium-icon-button h-11 w-11 border border-[var(--border)]"
                aria-pressed={has(channel.id)}
                aria-label={has(channel.id) ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
              >
                <Star className={`h-4 w-4 ${has(channel.id) ? "fill-[var(--sun)] text-[var(--sun)]" : ""}`} />
              </button>
            </div>
          </div>
          <EpgNowNext epg={channel.epg} />
          {enabledStreams.length > 1 && (
            <details className="premium-surface p-3.5">
              <summary className="premium-button-secondary w-fit cursor-pointer list-none gap-2 px-4 text-sm">
                <ListVideo className="h-4 w-4" aria-hidden /> Choisir une autre source
              </summary>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {enabledStreams.map((stream, index) => (
                  <button
                    key={stream.id}
                    type="button"
                    onClick={() => {
                      setPreferredSourceId(stream.id);
                      setRetryNonce((value) => value + 1);
                    }}
                    className="border-border bg-background/40 min-h-11 rounded-xl border px-3.5 text-left text-sm hover:bg-[var(--state-hover)]"
                  >
                    Source {index + 1} — {stream.title}
                  </button>
                ))}
              </div>
            </details>
          )}
          {healthStatus !== "healthy" && (
            <section
              className="premium-surface space-y-4 p-4 sm:p-5"
              aria-label="Disponibilité de la chaîne"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="type-eyebrow">Disponibilité</p>
                  <h2 className="type-section mt-1">{channelHealthLabel(healthStatus)}</h2>
                  <p className="text-muted mt-1 max-w-2xl text-sm">
                    {channel.health?.reasonMessage ?? "Cette chaîne n’a pas encore été vérifiée."}
                  </p>
                </div>
                {(canWatch || healthStatus === "temporarily_unavailable") && (
                  <button
                    type="button"
                    onClick={() => setRetryNonce((value) => value + 1)}
                    className="premium-button-primary gap-2 px-4 text-sm"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden /> Réessayer
                  </button>
                )}
              </div>
              <SourceReportPanel channelId={channel.id} healthStatus={healthStatus} />
            </section>
          )}
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
      )}

      {mode === "full" && (
        <ZapperDrawer
          open={zapperOpen}
          currentChannelId={channel.id}
          onSelect={watch}
          onClose={() => setZapperOpen(false)}
        />
      )}
    </div>
  );
}
