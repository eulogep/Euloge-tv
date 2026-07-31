"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Radio } from "lucide-react";
import { categoryLabelFr } from "../application/taxonomy";
import { cinematicToneForChannel, type CinematicTone } from "../application/cinematic-featured";
import { channelHealthLabel, healthStatusOf } from "../application/source-health";
import type { ChannelSummary } from "../domain/types";
import { EpgNowNext } from "@/features/epg/presentation/EpgNowNext";
import { cn, initialsOf } from "@/lib/utils";

type Props = {
  channels: readonly ChannelSummary[];
  onWatch: (channelId: string) => void;
  reduceAnimations?: boolean;
};

const relativeOffset = (index: number, activeIndex: number, length: number): number => {
  let offset = index - activeIndex;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
};

export function CinematicFeaturedCarousel({ channels, onWatch, reduceAnimations = false }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const active = channels[activeIndex] ?? channels[0];

  useEffect(() => {
    if (activeIndex >= channels.length) setActiveIndex(0);
  }, [activeIndex, channels.length]);

  if (!active) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + channels.length) % channels.length);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    }
  };

  const tone: CinematicTone = cinematicToneForChannel(active.id);

  return (
    <section
      className="cinematic-carousel"
      data-testid="cinematic-featured-carousel"
      data-tone={tone}
      data-reduce-motion={reduceAnimations ? "true" : "false"}
      aria-label="Sélection de chaînes à la une"
      aria-roledescription="carrousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 40) return;
        move(end < start ? 1 : -1);
      }}
    >
      <div className="cinematic-halo" aria-hidden />
      <p className="type-eyebrow relative z-10 px-5 pt-5 sm:px-7 sm:pt-6">À découvrir maintenant</p>
      <div className="cinematic-viewport" aria-live="polite">
        {channels.map((channel, index) => {
          const offset = relativeOffset(index, activeIndex, channels.length);
          const visibleOffset = Math.abs(offset) <= 2 ? offset : "hidden";
          const isActive = index === activeIndex;
          return (
            <article
              key={channel.id}
              className="cinematic-card"
              data-offset={visibleOffset}
              data-testid={isActive ? "cinematic-active-card" : undefined}
              data-active={isActive ? "true" : "false"}
              data-channel-id={channel.id}
              aria-label={`${channel.name}${isActive ? ", chaîne active" : ""}`}
              aria-current={isActive ? "true" : undefined}
              aria-hidden={visibleOffset === "hidden" ? true : undefined}
            >
              {isActive ? (
                <ActiveCard channel={channel} onWatch={onWatch} />
              ) : (
                <button
                  type="button"
                  className="cinematic-side-button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Afficher ${channel.name}`}
                  tabIndex={visibleOffset === "hidden" ? -1 : 0}
                >
                  <ChannelArtwork channel={channel} />
                  <div className="absolute inset-x-0 bottom-0 z-10 space-y-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-16">
                    <p className="line-clamp-2 text-sm font-bold text-white sm:text-base">
                      {channel.name}
                    </p>
                    {healthStatusOf(channel) === "healthy" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80">
                        <Radio className="h-3 w-3 text-[var(--live)]" aria-hidden /> Direct
                      </span>
                    )}
                  </div>
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="cinematic-controls">
        <button
          type="button"
          className="premium-icon-button bg-black/25"
          onClick={() => move(-1)}
          aria-label="Chaîne précédente"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="cinematic-indicators" aria-label="Position dans le carrousel">
          {channels.map((channel, index) => (
            <button
              key={channel.id}
              type="button"
              className="cinematic-indicator"
              aria-label={`Afficher la chaîne ${index + 1} sur ${channels.length} : ${channel.name}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="premium-icon-button bg-black/25"
          onClick={() => move(1)}
          aria-label="Chaîne suivante"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}

function ActiveCard({
  channel,
  onWatch,
}: {
  channel: ChannelSummary;
  onWatch: (channelId: string) => void;
}) {
  const status = healthStatusOf(channel);
  return (
    <div className="cinematic-active-grid">
      <ChannelArtwork channel={channel} priority />
      <div className="relative z-10 flex min-w-0 flex-col justify-center p-4 sm:p-5 md:p-7">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold tracking-[0.08em] uppercase",
              status === "healthy"
                ? "border-[var(--live)]/45 bg-[var(--live)]/15 text-[var(--live)]"
                : "border-[var(--border-strong)] bg-[var(--state-hover)] text-[var(--foreground)]",
            )}
          >
            <Radio className="h-3 w-3" aria-hidden />
            {channelHealthLabel(status)}
          </span>
        </div>
        <h2 className="line-clamp-2 text-2xl font-extrabold tracking-[-0.03em] text-balance sm:text-3xl">
          {channel.name}
        </h2>
        <p className="text-muted mt-1 flex min-w-0 flex-wrap items-center gap-x-2 text-xs sm:text-sm">
          {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
          {channel.countryName && <span>{channel.countryName}</span>}
          {channel.countryName && channel.categories[0] && <span aria-hidden>·</span>}
          {channel.categories[0] && <span>{categoryLabelFr(channel.categories[0])}</span>}
        </p>
        <EpgNowNext epg={channel.epg} compact />
        <button
          type="button"
          className="premium-button-primary mt-4 w-fit gap-2 px-5"
          onClick={() => onWatch(channel.id)}
          aria-label={`Regarder maintenant — ${channel.name}`}
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          Regarder maintenant
        </button>
      </div>
    </div>
  );
}

function ChannelArtwork({
  channel,
  priority = false,
}: {
  channel: ChannelSummary;
  priority?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [channel.id, channel.logoUrl]);

  return (
    <div className="cinematic-artwork">
      {channel.logoUrl && !imageFailed ? (
        <Image
          src={channel.logoUrl}
          alt={`Logo de ${channel.name}`}
          fill
          sizes="(max-width: 767px) 78vw, 24vw"
          className="object-contain p-6"
          priority={priority}
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className="flex h-full min-h-[11rem] w-full items-center justify-center text-5xl font-black tracking-[-0.05em] text-white/90"
          data-testid={priority ? "cinematic-channel-fallback" : undefined}
          aria-label={`Identité visuelle de ${channel.name}`}
          role="img"
        >
          {initialsOf(channel.name)}
        </span>
      )}
    </div>
  );
}
