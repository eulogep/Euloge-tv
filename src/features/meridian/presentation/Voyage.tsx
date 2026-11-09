"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Plane, SkipForward, X } from "lucide-react";
import { useAppStore } from "@/lib/utils/app-store";
import { useAtlas } from "../application/use-atlas";
import { useNow } from "../application/use-now";
import { useVoyage, VOYAGE_DURATIONS } from "../application/voyage";
import { pickNextEscale, stopsFromAtlas } from "../domain/atlas";

/** Does the travelling. Mounted only during a tour, so a normal visit pays nothing for it. */
function VoyageRunner() {
  const { atlas, failed } = useAtlas();
  const stops = useMemo(() => stopsFromAtlas(atlas), [atlas]);
  const nextAt = useVoyage((state) => state.nextAt);
  const signalBy = useVoyage((state) => state.signalBy);
  const stop = useVoyage((state) => state.stop);

  const hop = useCallback(() => {
    const escale = pickNextEscale(stops, new Date(), useVoyage.getState().visited);
    if (!escale) {
      stop("Le voyage s’arrête : aucune chaîne à proposer.");
      return;
    }
    useVoyage.getState().arrive({
      channelId: escale.station.id,
      city: escale.stop.place.city,
      code: escale.stop.code,
    });
    const app = useAppStore.getState();
    // The mini player stays small: only a full-screen viewer follows the URL.
    if (app.playerMode === "mini")
      useAppStore.setState({ activePlayerChannelId: escale.station.id });
    else app.watch(escale.station.id);
  }, [stop, stops]);

  useEffect(() => {
    if (failed) stop("Le voyage n’a pas pu démarrer : l’atlas des chaînes est indisponible.");
  }, [failed, stop]);

  useEffect(() => {
    if (stops.length === 0) return;
    const check = () => {
      const state = useVoyage.getState();
      const now = Date.now();
      if (state.signalBy !== null && now >= state.signalBy && now < state.nextAt) {
        if (state.miss()) hop();
        else stop("Le voyage s’arrête : plusieurs chaînes de suite sont restées muettes.");
      } else if (now >= state.nextAt) {
        hop();
      }
    };
    check();
    const due = Math.min(nextAt, signalBy ?? Infinity) - Date.now();
    const timer = window.setTimeout(check, Math.max(0, due));
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [hop, nextAt, signalBy, stop, stops.length]);

  return null;
}

/** Mounted once in the shell: a tour outlives channel changes and ends with the player. */
export function VoyageLifecycle() {
  const active = useVoyage((state) => state.active);
  const started = useVoyage((state) => state.channelId !== null);
  const notice = useVoyage((state) => state.notice);
  const hasPlayer = useAppStore((state) => state.activePlayerChannelId !== null);
  const stop = useVoyage((state) => state.stop);

  useEffect(() => {
    if (active && started && !hasPlayer) stop();
  }, [active, hasPlayer, started, stop]);

  return (
    <>
      {active && <VoyageRunner />}
      {notice && (
        <div className="md-sleep-notice" role="status">
          <Plane size={18} aria-hidden />
          <span>{notice}</span>
          <button type="button" onClick={() => stop()} aria-label="Fermer ce message">
            <X size={18} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

/** The tour's dashboard on the watch page. */
export function VoyagePanel() {
  const now = useNow();
  const active = useVoyage((state) => state.active);
  const city = useVoyage((state) => state.city);
  const nextAt = useVoyage((state) => state.nextAt);
  const minutes = useVoyage((state) => state.minutes);
  const { start, stop, skip, setMinutes } = useVoyage.getState();

  if (!active) {
    return (
      <button type="button" className="md-voyage-start" onClick={() => start()}>
        <Plane size={16} aria-hidden /> Voyage
      </button>
    );
  }

  const remaining = nextAt && now ? Math.max(1, Math.ceil((nextAt - now) / 60_000)) : minutes;
  return (
    <div className="md-voyage" role="group" aria-label="Mode Voyage">
      <p aria-live="polite">
        <Plane size={15} aria-hidden /> <strong>{city ?? "Départ…"}</strong>
        <span>prochaine escale dans {remaining} min</span>
      </p>
      <label>
        <span className="sr-only">Durée de chaque escale</span>
        <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
          {VOYAGE_DURATIONS.map((value) => (
            <option key={value} value={value}>
              {value} min
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={skip} aria-label="Escale suivante">
        <SkipForward size={16} aria-hidden />
      </button>
      <button type="button" onClick={() => stop()} aria-label="Terminer le voyage">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
