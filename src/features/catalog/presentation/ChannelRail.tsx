"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChannelCard } from "@/components/layout/ChannelCard";
import type { ChannelSummary } from "../domain/types";

type Props = {
  label: string;
  sectionId: string;
  items: readonly ChannelSummary[];
  isInMyList: (channelId: string) => boolean;
  onToggleMyList: (channelId: string) => void;
  onOpen: (channelId: string) => void;
  reduceAnimations?: boolean;
};

export function ChannelRail({
  label,
  sectionId,
  items,
  isInMyList,
  onToggleMyList,
  onOpen,
  reduceAnimations = false,
}: Props) {
  const railRef = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maximum = rail.scrollWidth - rail.clientWidth;
    setProgress(maximum <= 0 ? 1 : Math.min(1, Math.max(0, rail.scrollLeft / maximum)));
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let frame = requestAnimationFrame(updateProgress);
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items.length, updateProgress]);

  const move = useCallback(
    (direction: -1 | 1) => {
      const rail = railRef.current;
      if (!rail) return;
      rail.scrollBy({
        left: direction * Math.max(220, rail.clientWidth * 0.8),
        behavior: reduceAnimations ? "auto" : "smooth",
      });
    },
    [reduceAnimations],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const rail = railRef.current;
      rail?.scrollTo({
        left: event.key === "Home" ? 0 : rail.scrollWidth,
        behavior: reduceAnimations ? "auto" : "smooth",
      });
    }
  };

  return (
    <div className="group/rail relative min-w-0">
      <button
        type="button"
        onClick={() => move(-1)}
        aria-label={`Faire défiler ${label} vers la gauche`}
        className="premium-icon-button border-border bg-surface/95 absolute top-1/2 left-2 z-[var(--z-rail-control)] hidden h-11 w-11 -translate-y-1/2 shadow-lg backdrop-blur transition-opacity md:flex md:opacity-0 md:group-hover/rail:opacity-100 md:focus:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <ul
        ref={railRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={label}
        data-testid={`channel-rail-${sectionId}`}
        className="scroll-area flex min-w-0 touch-pan-x snap-x snap-proximity [scrollbar-width:thin] gap-3.5 overflow-x-auto overscroll-x-contain px-0.5 pb-3 sm:gap-4"
      >
        {items.map((channel) => (
          <li
            key={channel.id}
            className="w-[76vw] max-w-64 min-w-48 shrink-0 snap-start sm:w-56 lg:w-60"
          >
            <ChannelCard
              channel={channel}
              isFavorite={isInMyList(channel.id)}
              onToggleFavorite={onToggleMyList}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => move(1)}
        aria-label={`Faire défiler ${label} vers la droite`}
        className="premium-icon-button border-border bg-surface/95 absolute top-1/2 right-2 z-[var(--z-rail-control)] hidden h-11 w-11 -translate-y-1/2 shadow-lg backdrop-blur transition-opacity md:flex md:opacity-0 md:group-hover/rail:opacity-100 md:focus:opacity-100"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
      <div
        className="bg-border mx-auto h-1 w-20 overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`Progression dans ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full origin-left rounded-full bg-[var(--section-accent)] transition-transform duration-[var(--duration-base)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
