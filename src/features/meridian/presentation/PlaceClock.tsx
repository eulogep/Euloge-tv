"use client";

import { useNow } from "../application/use-now";
import { localClock, placeForZone, zoneCity } from "../domain/places";

type Props = {
  code: string | null;
  timeZone?: string | null;
  city?: string | null;
  className?: string;
};

/** What time it is where this channel broadcasts from. Renders nothing it cannot honestly know. */
export function PlaceClock({ code, timeZone, city, className }: Props) {
  const now = useNow();
  const place = code ? placeForZone(code, timeZone) : null;
  const zone = timeZone ?? place?.timeZone;
  if (!zone || !now) return null;
  const { label } = localClock(new Date(now), zone);
  const where = city ?? zoneCity(code, timeZone);
  const description = where ? `${label} à ${where}` : `${label}, heure de diffusion`;
  return (
    <time className={className} aria-label={description} title={description}>
      {label}
    </time>
  );
}
