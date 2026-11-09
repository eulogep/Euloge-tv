"use client";

import { useMemo, type CSSProperties } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { useNow } from "../application/use-now";
import { worldMoments, type Stop, type WorldMoment } from "../domain/atlas";
import { localClock } from "../domain/places";
import { skyAt } from "../domain/solar";

type Props = {
  stops: readonly Stop[];
  onWatch: (channelId: string) => void;
  onExploreCountry: (code: string) => void;
};

/** Reads the time around the planet, then lets it programme the evening. */
export function WorldMoments({ stops, onWatch, onExploreCountry }: Props) {
  const now = useNow();
  const moments = useMemo(() => (now ? worldMoments(stops, new Date(now)) : []), [now, stops]);
  if (moments.every((moment) => moment.stops.length === 0)) return null;

  return (
    <section className="md-section md-moments" aria-labelledby="md-moments-title">
      <header className="md-section-head">
        <p className="md-kicker">Le fil des fuseaux</p>
        <h2 id="md-moments-title" className="md-section-title">
          Où en est le monde
        </h2>
        <p className="md-section-note">
          Ces écrans ne dorment jamais en même temps. On vous dit l’heure qu’il est chez eux, pas ce
          qu’ils diffusent.
        </p>
      </header>
      <div className="md-moment-grid">
        {moments
          .filter((moment) => moment.stops.length > 0)
          .map((moment) => (
            <MomentColumn
              key={moment.id}
              moment={moment}
              now={now}
              onWatch={onWatch}
              onExploreCountry={onExploreCountry}
            />
          ))}
      </div>
    </section>
  );
}

function MomentColumn({
  moment,
  now,
  onWatch,
  onExploreCountry,
}: {
  moment: WorldMoment;
  now: number;
  onWatch: (channelId: string) => void;
  onExploreCountry: (code: string) => void;
}) {
  const date = new Date(now);
  const lead = moment.stops[0];
  const sky = lead ? skyAt(date, lead.place.latitude, lead.place.longitude) : undefined;
  return (
    <article
      className="md-moment"
      data-moment={moment.id}
      style={{ "--moment-sky": sky } as CSSProperties}
    >
      <header className="md-moment-sky">
        <p>{moment.label}</p>
        <h3>{moment.title}</h3>
      </header>
      <ul>
        {moment.stops.map((stop) => {
          const station = stop.stations[0];
          const name = countryDisplayName(stop.code, stop.name);
          return (
            <li key={stop.id}>
              <time>{localClock(date, stop.place.timeZone).label}</time>
              <button
                type="button"
                className="md-moment-watch"
                onClick={() => station && onWatch(station.id)}
                disabled={!station}
                aria-label={
                  station
                    ? `Regarder ${station.name}, ${stop.place.city}`
                    : `${stop.place.city} : aucune chaîne à proposer`
                }
              >
                <strong>{stop.place.city}</strong>
                <span>
                  <Play size={10} fill="currentColor" aria-hidden /> {station?.name}
                </span>
              </button>
              <button
                type="button"
                className="md-moment-more"
                onClick={() => onExploreCountry(stop.code)}
                aria-label={`Toutes les chaînes : ${name}`}
              >
                <ArrowUpRight size={15} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
