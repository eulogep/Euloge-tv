"use client";

import { useNow } from "../application/use-now";
import { localClock, placeOf } from "../domain/places";

/** What time it is where this channel broadcasts from. Renders nothing it cannot honestly know. */
export function PlaceClock({ code, className }: { code: string | null; className?: string }) {
  const now = useNow();
  const place = placeOf(code);
  if (!place || !now) return null;
  const { label } = localClock(new Date(now), place.timeZone);
  return (
    <time
      className={className}
      aria-label={`${label} à ${place.city}`}
      title={`Heure à ${place.city}`}
    >
      {label}
    </time>
  );
}
