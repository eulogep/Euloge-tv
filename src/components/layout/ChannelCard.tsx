"use client";

import { useEffect, useState } from "react";
import { Radio, Star } from "lucide-react";
import { cn, initialsOf } from "@/lib/utils";
import type { ChannelSummary } from "@/features/catalog/domain/types";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import { channelHealthLabel, healthStatusOf } from "@/features/catalog/application/source-health";

type Props = {
  channel: ChannelSummary;
  isFavorite?: boolean;
  onToggleFavorite?: (_channelId: string) => void;
  onOpen?: (_channelId: string) => void;
};

const statusBadge = (
  channel: ChannelSummary,
): { label: string; className: string; dotClassName: string } => {
  const health = healthStatusOf(channel);
  if (health === "healthy") {
    return {
      label: channelHealthLabel(health),
      className: "border-[var(--live)]/40 bg-[var(--live)]/14 text-[var(--live)]",
      dotClassName: "bg-[var(--live)]",
    };
  }
  if (["unavailable", "no_source", "blocked_or_restricted"].includes(health)) {
    return {
      label: channelHealthLabel(health),
      className: "border-[var(--danger)]/35 bg-[var(--danger)]/10 text-[var(--danger)]",
      dotClassName: "bg-[var(--danger)]",
    };
  }
  if (health === "temporarily_unavailable") {
    return {
      label: channelHealthLabel(health),
      className: "border-[var(--warning)]/35 bg-[var(--warning)]/10 text-[var(--warning)]",
      dotClassName: "bg-[var(--warning)]",
    };
  }
  return {
    label: channelHealthLabel(health),
    className: "border-[var(--border-strong)] bg-[var(--scrim)] text-[var(--muted)]",
    dotClassName: health === "degraded" ? "bg-[var(--warning)]" : "bg-[var(--accent-bright)]",
  };
};

export function ChannelCard({ channel, isFavorite, onToggleFavorite, onOpen }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const badge = statusBadge(channel);
  const canOpen = channel.streamCount > 0 && healthStatusOf(channel) !== "no_source";
  const handleOpen = () => {
    if (canOpen) onOpen?.(channel.id);
  };

  useEffect(() => setImageFailed(false), [channel.id, channel.logoUrl]);

  return (
    <article
      className="group border-border bg-card relative flex h-full flex-col overflow-hidden rounded-xl border shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]"
      aria-label={`Chaîne ${channel.name}`}
      data-testid="channel-card"
    >
      <button
        type="button"
        onClick={handleOpen}
        disabled={!canOpen}
        className="bg-surface-elevated relative aspect-video w-full overflow-hidden text-left"
        aria-label={
          canOpen ? `Ouvrir ${channel.name}` : `${channel.name} — aucune source disponible`
        }
      >
        <span
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgb(50_214_255_/_0.15),transparent_40%),linear-gradient(145deg,rgb(122_92_255_/_0.2),transparent)]"
          aria-hidden
        />
        {channel.logoUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logoUrl}
            alt={`Logo ${channel.name}`}
            className="relative h-full w-full object-contain p-5 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-standard)] group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            className="relative flex h-full w-full items-center justify-center text-3xl font-black tracking-[-0.04em] text-white/90"
            data-testid="channel-logo-fallback"
          >
            {initialsOf(channel.name)}
          </span>
        )}
        <span
          className={cn(
            "absolute top-2 right-2 inline-flex min-h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm",
            badge.className,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", badge.dotClassName)} aria-hidden />
          {badge.label}
        </span>
        {channel.streamCount > 1 && (
          <span className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-[var(--scrim)] px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
            {channel.streamCount} sources
          </span>
        )}
      </button>

      <div className="flex flex-1 items-start gap-2 p-3.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleOpen}
            disabled={!canOpen}
            className="hover:text-accent-bright block min-h-6 w-full truncate text-left text-sm font-bold transition-colors duration-[var(--duration-fast)] disabled:cursor-default disabled:hover:text-inherit"
            title={channel.name}
          >
            {channel.name}
          </button>
          <div className="text-muted mt-1 flex items-center gap-1.5 text-xs leading-5">
            {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
            {channel.countryName && <span className="truncate">{channel.countryName}</span>}
            {channel.countryName && channel.categories[0] && <span aria-hidden>·</span>}
            {channel.categories[0] && (
              <span className="truncate">{categoryLabelFr(channel.categories[0])}</span>
            )}
          </div>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(channel.id)}
            className={cn(
              "premium-icon-button h-11 w-11 shrink-0",
              isFavorite &&
                "text-accent-bright border-[var(--border-strong)] bg-[var(--state-selected)]",
            )}
            aria-label={isFavorite ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
            aria-pressed={isFavorite}
          >
            <Star className={cn("h-4.5 w-4.5", isFavorite && "fill-current")} aria-hidden />
          </button>
        )}
      </div>
      <Radio className="sr-only" aria-hidden />
    </article>
  );
}
