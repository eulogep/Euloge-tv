"use client";

import { useEffect, useState } from "react";
import { Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { ChannelMire } from "@/features/meridian/presentation/ChannelMire";
import { PlaceClock } from "@/features/meridian/presentation/PlaceClock";
import type { ChannelSummary } from "@/features/catalog/domain/types";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import {
  canOpenChannel,
  channelHealthLabel,
  healthStatusOf,
} from "@/features/catalog/application/source-health";
import { EpgNowNext } from "@/features/epg/presentation/EpgNowNext";

type Props = {
  channel: ChannelSummary;
  isFavorite?: boolean;
  onToggleFavorite?: (_channelId: string) => void;
  onOpen?: (_channelId: string) => void;
  compact?: boolean;
  active?: boolean;
};

function ProgramProgress({ startAt, endAt }: { startAt: string; endAt: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const start = Date.parse(startAt);
      const end = Date.parse(endAt);
      setProgress(end > start ? Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) : 0);
    };
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [endAt, startAt]);

  return (
    <span
      className="absolute inset-x-0 bottom-0 z-[2] h-[3px] bg-black/50"
      role="progressbar"
      aria-label="Progression du programme en cours"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <span
        className="block h-full origin-left bg-gradient-to-r from-[var(--needle)] to-[var(--sun)]"
        style={{ transform: `scaleX(${progress})` }}
      />
    </span>
  );
}

const statusBadge = (
  channel: ChannelSummary,
): { label: string; className: string; dotClassName: string } => {
  const health = healthStatusOf(channel);
  if (health === "healthy") {
    return {
      label: "Direct",
      className:
        "bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white shadow-[0_4px_12px_rgba(244,63,94,0.45)]",
      dotClassName: "bg-white",
    };
  }
  if (["unavailable", "no_source", "blocked_or_restricted"].includes(health)) {
    return {
      label: channelHealthLabel(health),
      className: "border border-white/15 bg-black/70 text-white/90 backdrop-blur-md",
      dotClassName: "bg-[var(--needle)]",
    };
  }
  if (health === "temporarily_unavailable") {
    return {
      label: channelHealthLabel(health),
      className: "border border-white/15 bg-black/70 text-white/90 backdrop-blur-md",
      dotClassName: "bg-[var(--sun)]",
    };
  }
  return {
    label: channelHealthLabel(health),
    className: "border border-white/15 bg-black/65 text-white/90 backdrop-blur-md",
    dotClassName: health === "degraded" ? "bg-[var(--sun)]" : "bg-white/80",
  };
};

export function ChannelCard({
  channel,
  isFavorite,
  onToggleFavorite,
  onOpen,
  compact = false,
  active = false,
}: Props) {
  const badge = statusBadge(channel);
  const healthStatus = healthStatusOf(channel);
  const isOffline = [
    "temporarily_unavailable",
    "unavailable",
    "no_source",
    "blocked_or_restricted",
    "archived",
  ].includes(healthStatus);
  const canOpen = canOpenChannel(channel);
  const unavailableLabel =
    healthStatus === "archived"
      ? `${channel.name} — chaîne archivée`
      : `${channel.name} — aucune source disponible`;
  const mediaStateLabel =
    active && !isOffline ? " — Lecture en cours" : isFavorite && !active ? " — Dans Ma liste" : "";
  const countryName = channel.countryCode
    ? countryDisplayName(channel.countryCode, channel.countryName ?? channel.countryCode)
    : channel.countryName;
  // "Direct" stays the word for a confirmed source: the "live" category gets a neutral label.
  const category =
    channel.categories[0] === "live"
      ? "Généraliste"
      : channel.categories[0]
        ? categoryLabelFr(channel.categories[0])
        : null;
  const handleOpen = () => {
    if (canOpen) onOpen?.(channel.id);
  };

  return (
    <article
      className={cn(
        "md-card group border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform,filter,opacity] duration-[var(--duration-base)] ease-[var(--ease-standard)] focus-within:shadow-[var(--shadow-focus)] hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]",
        isOffline && "opacity-60 grayscale-[.7] hover:translate-y-0",
        active && "border-[var(--needle)] shadow-[0_0_0_1px_var(--needle),0_12px_30px_-8px_rgba(244,63,94,0.35)]",
      )}
      aria-label={`Chaîne ${channel.name}`}
      data-testid="channel-card"
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={!canOpen}
        className={cn(
          "bg-surface-elevated relative w-full overflow-hidden text-left",
          compact ? "h-[104px]" : "aspect-video",
        )}
        aria-label={canOpen ? `Ouvrir ${channel.name}${mediaStateLabel}` : unavailableLabel}
      >
        <ChannelMire
          channelId={channel.id}
          name={channel.name}
          logoUrl={channel.logoUrl}
          category={channel.primaryCategory}
          className="absolute inset-0"
          fallbackTestId="channel-logo-fallback"
        />
        {!isOffline && canOpen && (
          <span
            className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-[var(--duration-base)] group-hover:opacity-100"
            aria-hidden
          >
            <span className="flex h-10 w-10 scale-90 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white shadow-xl backdrop-blur-md transition-transform duration-[var(--duration-base)] group-hover:scale-100">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </span>
        )}
        {!isOffline && (
          <span
            className={cn(
              "md-card-status absolute top-2 right-2 z-[2] inline-flex min-h-5 items-center gap-1.5 rounded-full px-2",
              badge.className,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", badge.dotClassName)} aria-hidden />
            {badge.label}
          </span>
        )}
        {isOffline && (
          <span className="absolute inset-0 z-[2] flex items-center justify-center bg-[var(--scrim)] backdrop-blur-[2px]">
            <span className="md-card-status rounded-full border border-white/15 bg-black/80 px-2.5 py-1 text-white">
              {healthStatus === "archived" ? "Archivée" : "Hors ligne"}
            </span>
          </span>
        )}
        {active && !isOffline && (
          <span
            className="absolute right-2 bottom-2 z-[2] flex h-6 w-6 items-center justify-center rounded-full bg-[var(--needle)] text-[10px] text-white shadow-md"
            aria-hidden
          >
            Ⅱ
          </span>
        )}
        {isFavorite && !active && (
          <span
            className="absolute right-2 bottom-2 z-[2] flex h-6 w-6 items-center justify-center rounded-full bg-black/65 backdrop-blur-md"
            aria-hidden
          >
            <Star className="h-3.5 w-3.5 fill-[var(--sun)] text-[var(--sun)]" />
          </span>
        )}
        {channel.epg?.currentProgram &&
          ["available", "stale"].includes(channel.epg.status) &&
          !isOffline && (
            <ProgramProgress
              startAt={channel.epg.currentProgram.startAt}
              endAt={channel.epg.currentProgram.endAt}
            />
          )}
      </button>

      <div className={cn("flex flex-1 flex-col gap-0.5", compact ? "p-3" : "p-3.5")}>
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={handleOpen}
            disabled={!canOpen}
            className="block min-h-6 min-w-0 flex-1 truncate text-left text-[0.9rem] font-semibold tracking-[-0.01em] transition-colors duration-[var(--duration-fast)] hover:text-[var(--accent)] disabled:cursor-default disabled:hover:text-inherit"
            title={channel.name}
          >
            {channel.name}
          </button>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(channel.id)}
              className={cn(
                "md-card-star premium-icon-button -mt-1.5 -mr-1.5 h-11 w-11 shrink-0",
                compact &&
                  "compact-favorite-button absolute right-1.5 bottom-1.5 m-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                isFavorite &&
                  "border-[var(--accent)]/40 bg-[var(--state-selected)] text-[var(--accent)]",
              )}
              aria-label={isFavorite ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
              aria-pressed={isFavorite}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-[var(--sun)] text-[var(--sun)]")} aria-hidden />
            </button>
          )}
        </div>
        <div className="text-muted flex min-w-0 items-center gap-1.5 text-xs leading-5">
          {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
          {countryName && <span className="truncate">{countryName}</span>}
          <PlaceClock
            code={channel.countryCode}
            timeZone={channel.broadcastTimeZone}
            city={channel.broadcastCity}
            className="md-card-clock"
          />
        </div>
        {category && <p className="text-subtle truncate text-[11px] font-medium leading-4">{category}</p>}
        {/* Almost no channel has a guide: a card only speaks up when it knows something. */}
        {channel.epg?.currentProgram &&
          ["available", "stale"].includes(channel.epg.status) &&
          (compact ? (
            <p className="text-muted mt-1 truncate text-[11px] font-medium">
              {channel.epg.currentProgram.title}
            </p>
          ) : (
            <EpgNowNext epg={channel.epg} compact />
          ))}
      </div>
    </article>
  );
}
