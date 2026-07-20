"use client";

import { Star, Radio } from "lucide-react";
import { cn, initialsOf } from "@/lib/utils";
import type { ChannelSummary } from "@/features/catalog/domain/types";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";

type Props = {
  channel: ChannelSummary;
  isFavorite?: boolean;
  onToggleFavorite?: (_channelId: string) => void;
  onOpen?: (_channelId: string) => void;
};

const compatBadge = (
  compat: ChannelSummary["bestCompatibility"],
): { label: string; className: string } => {
  switch (compat) {
    case "preferred":
      return { label: "À vérifier", className: "bg-white/10 text-white/70" };
    case "native-only":
      return { label: "NAT", className: "bg-blue-500/20 text-blue-300" };
    case "limited":
      return { label: "LIMIT", className: "bg-[var(--warning)]/20 text-[var(--warning)]" };
    case "blocked":
      return { label: "BLOQ", className: "bg-[var(--danger)]/20 text-[var(--danger)]" };
    default:
      return { label: "?", className: "bg-white/10 text-white/60" };
  }
};

export function ChannelCard({ channel, isFavorite, onToggleFavorite, onOpen }: Props) {
  const badge = compatBadge(channel.bestCompatibility);
  const handleOpen = () => onOpen?.(channel.id);

  return (
    <article
      className="group border-border bg-surface relative flex flex-col overflow-hidden rounded-xl border transition-colors hover:border-[var(--accent)]/40"
      aria-label={`Chaîne ${channel.name}`}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="bg-surface-elevated relative aspect-video w-full overflow-hidden"
        aria-label={`Ouvrir ${channel.name}`}
      >
        {channel.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logoUrl}
            alt={`Logo ${channel.name}`}
            className="h-full w-full object-contain p-4"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling;
              if (fallback) fallback.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={cn(
            "to-surface-elevated flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)]/30 text-2xl font-bold text-white/90",
            channel.logoUrl ? "hidden" : "",
          )}
          aria-hidden={!!channel.logoUrl}
        >
          {initialsOf(channel.name)}
        </div>
        <span
          className={cn(
            "absolute top-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-semibold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        {channel.streamCount > 1 && (
          <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {channel.streamCount} sources
          </span>
        )}
      </button>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleOpen}
            className="block w-full truncate text-left text-sm font-semibold hover:text-[var(--accent)]"
            title={channel.name}
          >
            {channel.name}
          </button>
          <div className="text-muted mt-0.5 flex items-center gap-1.5 text-xs">
            {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
            {channel.countryName && <span className="truncate">{channel.countryName}</span>}
            {channel.categories[0] && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{categoryLabelFr(channel.categories[0])}</span>
              </>
            )}
          </div>
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(channel.id)}
            className="text-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/5 hover:text-[var(--accent)]"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            aria-pressed={isFavorite}
          >
            <Star
              className={cn("h-4 w-4", isFavorite && "fill-[var(--accent)] text-[var(--accent)]")}
            />
          </button>
        )}
      </div>
      <div className="sr-only">
        <Radio className="h-0 w-0" aria-hidden />
      </div>
    </article>
  );
}
