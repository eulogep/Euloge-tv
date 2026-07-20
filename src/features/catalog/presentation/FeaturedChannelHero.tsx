"use client";

import { useEffect, useState } from "react";
import { Play, Radio, Star } from "lucide-react";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import type { ChannelSummary, SourceAvailabilityStatus } from "@/features/catalog/domain/types";
import { cn, initialsOf } from "@/lib/utils";

const availabilityRank: Record<SourceAvailabilityStatus, number> = {
  playable: 0,
  checking: 1,
  unknown: 2,
  timeout: 3,
  network_error: 4,
  temporarily_unavailable: 5,
  forbidden_or_restricted: 6,
  unsupported_format: 7,
  invalid_url: 8,
};

const compatibilityRank: Record<ChannelSummary["bestCompatibility"], number> = {
  preferred: 0,
  "native-only": 1,
  unknown: 2,
  limited: 3,
  blocked: 4,
};

const viableStatuses = new Set<SourceAvailabilityStatus>(["playable", "checking", "unknown"]);

/** Stable presentation-only choice: no probing, fetching or catalog re-ranking. */
export const selectFeaturedChannel = (
  channels: readonly ChannelSummary[],
): ChannelSummary | null => {
  const candidates = channels.filter(
    (channel) =>
      channel.streamCount > 0 &&
      channel.bestCompatibility !== "blocked" &&
      viableStatuses.has(channel.bestAvailability ?? "unknown"),
  );

  return (
    [...candidates].sort((left, right) => {
      const availability =
        availabilityRank[left.bestAvailability ?? "unknown"] -
        availabilityRank[right.bestAvailability ?? "unknown"];
      if (availability !== 0) return availability;
      const compatibility =
        compatibilityRank[left.bestCompatibility] - compatibilityRank[right.bestCompatibility];
      if (compatibility !== 0) return compatibility;
      const logo = Number(Boolean(right.logoUrl)) - Number(Boolean(left.logoUrl));
      if (logo !== 0) return logo;
      const sources = right.streamCount - left.streamCount;
      if (sources !== 0) return sources;
      return left.name.localeCompare(right.name, "fr") || left.id.localeCompare(right.id);
    })[0] ?? null
  );
};

type Props = {
  channel: ChannelSummary;
  isInMyList: boolean;
  onToggleMyList: (channelId: string) => void;
  onWatch: (channelId: string) => void;
};

export function FeaturedChannelHero({ channel, isInMyList, onToggleMyList, onWatch }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const isConfirmedLive = channel.bestAvailability === "playable";

  useEffect(() => setImageFailed(false), [channel.id, channel.logoUrl]);

  return (
    <section
      className="premium-surface relative isolate min-h-[22rem] overflow-hidden sm:min-h-[25rem]"
      aria-labelledby="featured-channel-title"
      data-testid="featured-channel-hero"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgb(50_214_255_/_0.18),transparent_34%),radial-gradient(circle_at_20%_80%,rgb(122_92_255_/_0.3),transparent_42%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[var(--background)]/95 via-[var(--card)]/88 to-[var(--card)]/40"
        aria-hidden
      />

      <div className="relative grid min-h-[22rem] items-end gap-6 p-5 sm:min-h-[25rem] sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.72fr)] sm:items-center sm:p-8 lg:p-10">
        <div className="z-[var(--z-content)] max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold tracking-[0.08em] uppercase",
                isConfirmedLive
                  ? "border-[var(--live)]/40 bg-[var(--live)]/12 text-[var(--live)]"
                  : "text-accent-bright border-[var(--border-strong)] bg-[var(--state-hover)]",
              )}
            >
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {isConfirmedLive ? "Direct" : "À vérifier"}
            </span>
            <span className="text-muted text-xs font-medium">
              Sélection à la une · {channel.streamCount} source
              {channel.streamCount > 1 ? "s" : ""}
            </span>
          </div>

          <h2 id="featured-channel-title" className="type-display max-w-xl text-balance">
            <button
              type="button"
              onClick={() => onWatch(channel.id)}
              className="hover:text-accent-bright rounded-md text-left transition-colors duration-[var(--duration-fast)]"
            >
              {channel.name}
            </button>
          </h2>
          <p className="text-muted mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:text-base">
            {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
            {channel.countryName && <span>{channel.countryName}</span>}
            {channel.countryName && channel.categories[0] && <span aria-hidden>·</span>}
            {channel.categories[0] && <span>{categoryLabelFr(channel.categories[0])}</span>}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onWatch(channel.id)}
              className="premium-button-primary gap-2 px-5"
              aria-label={`Regarder ${channel.name}`}
            >
              <Play className="h-4.5 w-4.5 fill-current" aria-hidden />
              Regarder
            </button>
            <button
              type="button"
              onClick={() => onToggleMyList(channel.id)}
              className="premium-button-secondary gap-2 px-5"
              aria-pressed={isInMyList}
            >
              <Star className={cn("h-4.5 w-4.5", isInMyList && "fill-current")} aria-hidden />
              {isInMyList ? "Dans Ma liste" : "Ma liste"}
            </button>
          </div>
        </div>

        <div
          className="pointer-events-none absolute top-5 right-5 h-28 w-36 opacity-55 sm:static sm:h-56 sm:w-full sm:opacity-100"
          aria-hidden
        >
          <div className="border-border bg-surface/60 flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-sm">
            {channel.logoUrl && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.logoUrl}
                alt=""
                className="h-full w-full object-contain p-5 sm:p-8"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)]/40 to-[var(--secondary)]/16 text-3xl font-black tracking-[-0.04em] text-white sm:text-6xl"
                data-testid="featured-channel-fallback"
              >
                {initialsOf(channel.name)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
