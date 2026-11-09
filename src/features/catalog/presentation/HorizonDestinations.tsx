"use client";

import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { useNow } from "@/features/meridian/application/use-now";
import { localClock, placeOf } from "@/features/meridian/domain/places";
import { skyAt } from "@/features/meridian/domain/solar";

const DESTINATIONS = [
  { code: "SN", name: "Sénégal", note: "L’Afrique de l’Ouest à l’antenne" },
  { code: "BJ", name: "Bénin", note: "Une autre fenêtre sur le quotidien" },
  { code: "CD", name: "Congo · RDC", note: "Au cœur du continent" },
  { code: "FR", name: "France", note: "Proche de vous, ouvert sur le monde" },
] as const;

export function HorizonDestinations({ onExplore }: { onExplore: (country: string) => void }) {
  const now = useNow();
  return (
    <section className="md-section md-destinations" aria-labelledby="md-destinations-title">
      <header className="md-section-head">
        <p className="md-kicker">Quelle sera votre escale ?</p>
        <h2 id="md-destinations-title" className="md-section-title">
          Tout près. <span>Un peu plus loin.</span>
        </h2>
      </header>
      <div className="md-destination-grid">
        {DESTINATIONS.map((destination) => {
          const place = placeOf(destination.code);
          const date = now && place ? new Date(now) : null;
          return (
            <button
              key={destination.code}
              type="button"
              className="md-destination"
              onClick={() => onExplore(destination.code)}
              aria-label={`Explorer les chaînes : ${destination.name}`}
              style={
                {
                  "--moment-sky":
                    date && place ? skyAt(date, place.latitude, place.longitude) : undefined,
                } as CSSProperties
              }
            >
              <span className="md-destination-clock">
                {date && place ? localClock(date, place.timeZone).label : "--:--"}
              </span>
              <span className="md-destination-name">{destination.name}</span>
              <span className="md-destination-note">{destination.note}</span>
              <ArrowUpRight size={18} aria-hidden />
            </button>
          );
        })}
      </div>
    </section>
  );
}
