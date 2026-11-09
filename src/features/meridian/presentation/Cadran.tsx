"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock8,
  Plane,
  Play,
  Power,
  Shuffle,
  Star,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { categoryLabelFr } from "@/features/catalog/application/taxonomy";
import { countryDisplayName } from "@/features/catalog/presentation/display-names";
import { useSettings } from "@/features/settings/settings";
import { useAppStore } from "@/lib/utils/app-store";
import { primeTimeStop, type Stop } from "../domain/atlas";
import { localClock } from "../domain/places";
import { dayPhase, inkForSky, skyCss, solarElevation, sunPosition } from "../domain/solar";
import { useNow } from "../application/use-now";
import { useVoyage } from "../application/voyage";
import { DialSound } from "./dial-sound";
import { TunerScreen } from "./TunerScreen";
import { useDial } from "./use-dial";

type Props = {
  stops: readonly Stop[];
  loading: boolean;
  isFavorite: (channelId: string) => boolean;
  onToggleFavorite: (channelId: string) => void;
  onWatch: (channelId: string) => void;
  reduceMotion: boolean;
};

const channelMemory = new Map<string, number>();

export function Cadran({
  stops,
  loading,
  isFavorite,
  onToggleFavorite,
  onWatch,
  reduceMotion,
}: Props) {
  const now = useNow();
  const { state: settings, update } = useSettings();
  const mainPlayerActive = useAppStore((state) => state.activePlayerChannelId !== null);
  const [channelIndex, setChannelIndex] = useState(0);
  const initialId = useCallback(
    () => primeTimeStop(stops, new Date())?.id ?? stops[0]?.id ?? null,
    [stops],
  );
  const soundOn = settings.dialSound && !mainPlayerActive;
  const soundRef = useRef<DialSound | null>(null);
  useEffect(() => {
    if (!soundOn) return;
    const sound = new DialSound(window.AudioContext);
    soundRef.current = sound;
    return () => {
      soundRef.current = null;
      sound.dispose();
    };
  }, [soundOn]);
  const dial = useDial({
    stops,
    now,
    reduceMotion,
    initialId,
    onSpeed: (speed) => soundRef.current?.setSpeed(speed),
    onSettle: () => soundRef.current?.lock(),
  });
  const { stop, settled } = dial;

  useEffect(() => {
    setChannelIndex(stop ? (channelMemory.get(stop.code) ?? 0) : 0);
  }, [stop]);

  const station = stop ? (stop.stations[channelIndex] ?? stop.stations[0] ?? null) : null;
  const total = stop?.stations.length ?? 0;

  const flip = useCallback(
    (direction: -1 | 1) => {
      if (!stop || total === 0) return;
      const next = (channelIndex + direction + total) % total;
      channelMemory.set(stop.code, next);
      setChannelIndex(next);
    },
    [channelIndex, stop, total],
  );

  const date = useMemo(() => (now ? new Date(now) : null), [now]);
  const place = stop?.place ?? null;
  const clock = date && place ? localClock(date, place.timeZone) : null;
  const sky = useMemo(() => {
    if (!date || !place) return null;
    const sun = sunPosition(date);
    const elevation = solarElevation(sun, place.latitude, place.longitude);
    return {
      color: skyCss(elevation),
      ink: inkForSky(elevation),
      phase: dayPhase(sun, place.latitude, place.longitude),
    };
  }, [date, place]);

  const countryName = stop ? countryDisplayName(stop.code, stop.name) : "";
  const shuffle = () => {
    const pool = stops.filter((item) => item.code !== stop?.code);
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) dial.tuneTo(next.id);
  };
  const toPrimeTime = () => {
    const prime = date ? primeTimeStop(stops, date) : null;
    if (prime) dial.tuneTo(prime.id);
  };

  const onDialKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => dial.step(-1),
      ArrowRight: () => dial.step(1),
      ArrowUp: () => flip(1),
      ArrowDown: () => flip(-1),
      PageUp: () => flip(1),
      PageDown: () => flip(-1),
      Enter: () => {
        if (station) onWatch(station.id);
      },
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const favorite = station ? isFavorite(station.id) : false;
  const canPreview = settings.screenPreview && !mainPlayerActive;

  return (
    <section
      className="md-cadran"
      aria-labelledby="md-cadran-title"
      data-testid="cadran"
      data-settled={settled}
      data-sky-ink={sky?.ink ?? "paper"}
      ref={dial.rootRef}
      style={{ "--place-sky": sky?.color ?? "var(--surface-elevated)" } as CSSProperties}
    >
      <div className="md-cadran-glow" aria-hidden />
      <div className="md-reading">
        <h1 id="md-cadran-title" className="md-tagline">
          Il est toujours 20 h <em>quelque part.</em>
        </h1>
        <p className="md-clock" data-testid="dial-clock">
          <span className="md-clock-digits">{clock?.label ?? "--:--"}</span>
        </p>
        <p className="md-city">
          <span className="md-city-a">à </span>
          <strong data-testid="dial-city">{place?.city ?? (loading ? "…" : "—")}</strong>
        </p>
        <p className="md-place-note">
          {stop ? (
            <>
              {countryName} · {sky?.phase ?? ""} · {stop.count.toLocaleString("fr-FR")}{" "}
              {stop.count > 1 ? "chaînes référencées" : "chaîne référencée"}
            </>
          ) : stops.length === 0 && !loading ? (
            "Aucune station à accorder pour le moment."
          ) : (
            "Recherche des stations…"
          )}
        </p>
      </div>

      <div className="md-dial">
        <button
          type="button"
          className="md-dial-step"
          data-side="left"
          onClick={() => dial.step(-1)}
          disabled={stops.length < 2}
          aria-label="Pays précédent vers l’ouest"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div
          className="md-dial-track"
          role="slider"
          tabIndex={0}
          aria-label="Cadran du monde. Flèches gauche et droite pour changer de pays, haut et bas pour changer de chaîne."
          aria-valuemin={-180}
          aria-valuemax={180}
          aria-valuenow={Math.round(dial.needle)}
          aria-valuetext={
            stop && clock
              ? `${place?.city}, ${countryName}, ${clock.label}${station ? `, ${station.name}` : ""}`
              : "Recherche"
          }
          onKeyDown={onDialKeyDown}
          {...dial.dialHandlers}
        >
          <canvas ref={dial.canvasRef} className="md-dial-canvas" aria-hidden />
          <span className="md-needle" aria-hidden />
        </div>
        <button
          type="button"
          className="md-dial-step"
          data-side="right"
          onClick={() => dial.step(1)}
          disabled={stops.length < 2}
          aria-label="Pays suivant vers l’est"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="md-set">
        <TunerScreen
          station={station}
          position={station ? { index: channelIndex, total } : null}
          searching={!settled}
          power={canPreview}
          reduceMotion={reduceMotion}
        />
        <div className="md-set-info">
          <div className="md-set-channel">
            <p className="md-set-name" data-testid="dial-channel">
              {station?.name ?? "—"}
            </p>
            <p className="md-set-meta">
              {station
                ? // "Direct" is reserved for a confirmed source, never a catalogue category.
                  station.category === "live"
                  ? "Généraliste"
                  : categoryLabelFr(station.category)
                : "Recherche d’un signal"}
              {station?.city && station.city !== place?.city && ` · ${station.city}`}
            </p>
          </div>
          <div className="md-set-programs" role="group" aria-label="Changer de chaîne">
            <button
              type="button"
              onClick={() => flip(-1)}
              disabled={total < 2}
              aria-label="Chaîne précédente"
            >
              <ChevronDown size={18} aria-hidden />
            </button>
            <span aria-hidden>P</span>
            <button
              type="button"
              onClick={() => flip(1)}
              disabled={total < 2}
              aria-label="Chaîne suivante"
            >
              <ChevronUp size={18} aria-hidden />
            </button>
          </div>
        </div>
        <div className="md-set-actions">
          <button
            type="button"
            className="md-watch"
            disabled={!station}
            onClick={() => station && onWatch(station.id)}
            aria-label={station ? `Regarder ${station.name}` : "Regarder"}
          >
            <Play size={18} fill="currentColor" aria-hidden /> Regarder
          </button>
          <button
            type="button"
            className="md-set-toggle"
            aria-pressed={favorite}
            disabled={!station}
            onClick={() => station && onToggleFavorite(station.id)}
            aria-label={favorite ? "Retirer de Ma liste" : "Ajouter à Ma liste"}
          >
            <Star size={18} fill={favorite ? "currentColor" : "none"} aria-hidden />
          </button>
          <button
            type="button"
            className="md-set-toggle"
            aria-pressed={settings.screenPreview}
            disabled={mainPlayerActive}
            onClick={() => update("screenPreview", !settings.screenPreview)}
            aria-label={
              settings.screenPreview
                ? "Éteindre l’écran : plus d’aperçu vidéo"
                : "Allumer l’écran : aperçu vidéo muet en zappant"
            }
            title={
              mainPlayerActive
                ? "L’aperçu attend la fin de la lecture en cours"
                : "Aperçu vidéo muet, en basse qualité"
            }
          >
            <Power size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="md-reading-actions">
        <button type="button" className="md-chip-button" onClick={toPrimeTime} disabled={!stop}>
          <Clock8 size={15} aria-hidden /> Aller à 20 h
        </button>
        <button
          type="button"
          className="md-chip-button"
          onClick={shuffle}
          disabled={stops.length < 2}
        >
          <Shuffle size={15} aria-hidden /> Au hasard
        </button>
        <button
          type="button"
          className="md-chip-button"
          onClick={() => useVoyage.getState().start()}
          disabled={stops.length < 2}
          aria-label="Lancer le mode Voyage : un tour du monde automatique à l’heure de 20 h"
        >
          <Plane size={15} aria-hidden /> Voyage
        </button>
        <button
          type="button"
          className="md-chip-button"
          aria-pressed={settings.dialSound}
          onClick={() => update("dialSound", !settings.dialSound)}
          aria-label={settings.dialSound ? "Couper le son du cadran" : "Activer le son du cadran"}
        >
          {settings.dialSound ? (
            <Volume2 size={15} aria-hidden />
          ) : (
            <VolumeX size={15} aria-hidden />
          )}
          Son
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {settled && stop && clock ? `${place?.city}, ${clock.label}. ${station?.name ?? ""}` : ""}
      </p>
    </section>
  );
}
