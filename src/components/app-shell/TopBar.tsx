"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { MjtvLogo } from "@/components/branding/MjtvLogo";
import { useNow } from "@/features/meridian/application/use-now";
import { DIAL_CITIES, localClock, PLACES, type Place } from "@/features/meridian/domain/places";
import { useAppStore } from "@/lib/utils/app-store";

/** Where it is closest to 20 h, printed cities first so the name means something. */
const eightPmPlace = (date: Date): { place: Place; label: string } | null => {
  const printed = new Set(DIAL_CITIES);
  let best: { place: Place; label: string; score: number } | null = null;
  for (const place of PLACES.values()) {
    const clock = localClock(date, place.timeZone);
    const delta = Math.abs(clock.hour * 60 + clock.minute - 20 * 60 - 30);
    const distance = Math.min(delta, 1440 - delta);
    const score = distance + (printed.has(place.code) ? 0 : 20);
    if (!best || score < best.score) best = { place, label: clock.label, score };
  }
  return best;
};

function EightPm() {
  const now = useNow();
  const found = useMemo(() => (now ? eightPmPlace(new Date(now)) : null), [now]);
  if (!found) return null;
  return (
    <p className="md-topbar-prime" aria-hidden>
      <span className="md-pulse" /> {found.label} <span>à {found.place.city}</span>
    </p>
  );
}

export function TopBar() {
  const goHome = useAppStore((state) => state.goHome);
  const goSearch = useAppStore((state) => state.goSearch);
  return (
    <header className="md-topbar sticky top-[var(--safe-top)] z-30">
      <button type="button" onClick={goHome} className="md-brand" aria-label="Accueil MJTV">
        <MjtvLogo variant="mark" className="h-8 w-8 sm:hidden" />
        <span className="hidden sm:inline-flex">
          <MjtvLogo variant="horizontal" />
        </span>
      </button>
      <div className="md-topbar-end">
        <EightPm />
        <button type="button" onClick={goSearch} className="md-search" aria-label="Rechercher">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="md-search-hint" aria-hidden>
            Une chaîne, un pays…
          </span>
          <kbd aria-hidden>/</kbd>
        </button>
      </div>
    </header>
  );
}
