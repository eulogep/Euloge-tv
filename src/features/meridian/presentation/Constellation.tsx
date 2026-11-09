"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { useNow } from "../application/use-now";
import type { FilterOption } from "@/features/catalog/domain/types";
import { localClock, placesOf, type Place } from "../domain/places";
import { solarElevation, sunPosition } from "../domain/solar";
import { latitudeToY, paintDaylight, paintLight, paintSun } from "./world-painter";

type Light = { id: string; code: string; name: string; count: number; place: Place };

type Props = {
  countries: readonly FilterOption[];
  selected: string | null;
  visited: readonly string[];
  onSelect: (code: string) => void;
};

const HIT_RADIUS_PX = 22;

/**
 * Every country on air, placed where it broadcasts from, in tonight's real light.
 * No coastlines: the map draws itself out of the channels. Pointer shortcut only,
 * the destination list next to it gives the same choices to keyboards and readers.
 */
export function Constellation({ countries, selected, visited, onSelect }: Props) {
  const now = useNow();
  const stops = useMemo<Light[]>(
    () =>
      countries
        .filter((country) => country.count > 0)
        .flatMap((country) =>
          placesOf(country.value).map((place) => ({
            id: `${country.value}:${place.city}`,
            code: country.value,
            name: country.label,
            count: country.count,
            place,
          })),
        ),
    [countries],
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<Light | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !now || size.width === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const date = new Date(now);
    const sun = sunPosition(date);
    const daylight = document.createElement("canvas");
    paintDaylight(daylight, sun);
    context.imageSmoothingQuality = "high";
    context.drawImage(daylight, 0, 0, size.width, size.height);

    const xOf = (longitude: number) => ((longitude + 180) / 360) * size.width;
    const stamped = new Set(visited);
    for (const stop of stops) {
      const { latitude, longitude } = stop.place;
      const x = xOf(longitude);
      const y = latitudeToY(latitude, size.height);
      paintLight(context, x, y, stop.count, solarElevation(sun, latitude, longitude));
      if (stamped.has(stop.code)) {
        context.strokeStyle = "#ffc53d";
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.stroke();
      }
      if (stop.code === selected || stop.id === hover?.id) {
        context.strokeStyle = "#ff5a3c";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y, 10, 0, Math.PI * 2);
        context.stroke();
      }
    }
    paintSun(context, xOf(sun.subsolarLongitude), latitudeToY(sun.declination, size.height), 8);
  }, [hover, now, selected, size, stops, visited]);

  const stopAt = (event: PointerEvent<HTMLCanvasElement>): Light | null => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    let best: Light | null = null;
    let bestDistance = HIT_RADIUS_PX ** 2;
    for (const stop of stops) {
      const dx = ((stop.place.longitude + 180) / 360) * box.width - px;
      const dy = latitudeToY(stop.place.latitude, box.height) - py;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = stop;
      }
    }
    return best;
  };

  const shown = hover ?? stops.find((stop) => stop.code === selected) ?? null;
  const countryCount = useMemo(() => new Set(stops.map((stop) => stop.code)).size, [stops]);

  return (
    <figure className="md-constellation">
      <canvas
        ref={canvasRef}
        data-testid="constellation"
        data-stops={countryCount}
        aria-hidden
        onPointerMove={(event) => setHover(stopAt(event))}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          const stop = stopAt(event as unknown as PointerEvent<HTMLCanvasElement>);
          if (stop) onSelect(stop.code);
        }}
        style={{ cursor: hover ? "pointer" : "crosshair" }}
      />
      <figcaption>
        {shown && now ? (
          <>
            <strong>{countryDisplayName(shown.code, shown.name)}</strong>
            <span>
              {localClock(new Date(now), shown.place.timeZone).label} à {shown.place.city} ·{" "}
              {shown.count.toLocaleString("fr-FR")} {shown.count > 1 ? "chaînes" : "chaîne"}
            </span>
          </>
        ) : (
          <span>
            {stops.length > 0
              ? `${countryCount} pays à l’antenne, dans la lumière de cette minute.`
              : "La carte s’allume…"}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
