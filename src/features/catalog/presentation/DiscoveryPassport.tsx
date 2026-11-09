"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, Globe2, MapPin, RotateCcw } from "lucide-react";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import type { CatalogResponse, ChannelSummary } from "../domain/types";
import { canFeatureChannel } from "../application/source-health";
import { countryDisplayName, flagEmoji } from "./display-names";
import { Constellation } from "@/features/meridian/presentation/Constellation";

const PASSPORT_KEY = "mjtv:passport:v1";
const FEATURED_COUNTRIES = ["FR", "JP", "BR", "CG", "IN", "CA"];

type Props = {
  countries: CatalogResponse["filters"]["countries"];
  loading: boolean;
};

export function DiscoveryPassport({ countries, loading }: Props) {
  const watch = useAppStore((state) => state.watch);
  const openExplorer = useAppStore((state) => state.openExplorer);
  const { has, toggle } = useFavorites();
  const [visited, setVisited] = useState<string[]>([]);
  const visitedRef = useRef<string[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const readPassport = () => {
      try {
        const raw = window.localStorage.getItem(PASSPORT_KEY);
        if (raw === null) {
          visitedRef.current = [];
          setVisited([]);
          setStorageNotice(null);
          return;
        }
        const data: unknown = JSON.parse(raw);
        if (
          !data ||
          typeof data !== "object" ||
          !("version" in data) ||
          data.version !== 1 ||
          !("countries" in data) ||
          !Array.isArray(data.countries)
        ) {
          throw new Error("Invalid passport");
        }
        const saved = [
          ...new Set(
            data.countries.filter(
              (code): code is string => typeof code === "string" && /^[A-Z]{2}$/.test(code),
            ),
          ),
        ].slice(0, 250);
        visitedRef.current = saved;
        setVisited(saved);
        setStorageNotice(null);
      } catch {
        setStorageNotice(
          "Le carnet local n’a pas pu être relu. Vous pouvez explorer pour cette session.",
        );
      }
    };
    readPassport();
    const onStorage = (event: StorageEvent) => {
      if (event.key === PASSPORT_KEY || event.key === null) readPassport();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => () => request.current?.abort(), []);

  const destinations = useMemo(
    () =>
      countries
        .filter((country) => /^[A-Z]{2}$/.test(country.value) && country.count > 0)
        .map((country) => ({ ...country, label: countryDisplayName(country.value, country.label) }))
        .sort((left, right) => left.label.localeCompare(right.label, "fr")),
    [countries],
  );
  const featured = [
    ...new Set([...FEATURED_COUNTRIES, ...destinations.map((country) => country.value)]),
  ]
    .map((code) => destinations.find((country) => country.value === code))
    .filter((country) => country !== undefined)
    .slice(0, 6);
  const selected = destinations.find((country) => country.value === destination);

  const explore = async (code: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setDestination(code);
    setChannels([]);
    setFetching(true);
    setError(false);
    try {
      const query = new URLSearchParams({ country: code, sort: "quality", limit: "12" });
      const response = await fetch(`/api/catalog?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error("catalog");
      const data = (await response.json()) as CatalogResponse;
      const selection = data.items
        .filter((channel) => channel.countryCode === code && canFeatureChannel(channel))
        .slice(0, 4);
      if (controller.signal.aborted) return;
      setChannels(selection);
      if (selection.length > 0) {
        const next = [...new Set([...visitedRef.current, code])];
        visitedRef.current = next;
        setVisited(next);
        try {
          window.localStorage.setItem(
            PASSPORT_KEY,
            JSON.stringify({ version: 1, countries: next }),
          );
          setStorageNotice(null);
        } catch {
          setStorageNotice(
            "Cette escale reste visible pour cette session, mais le carnet n’a pas pu être enregistré.",
          );
        }
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setFetching(false);
    }
  };

  const clearPassport = () => {
    try {
      window.localStorage.removeItem(PASSPORT_KEY);
      request.current?.abort();
      visitedRef.current = [];
      setVisited([]);
      setDestination(null);
      setChannels([]);
      setFetching(false);
      setError(false);
      setStorageNotice(null);
    } catch {
      setStorageNotice(
        "Le carnet n’a pas pu être effacé. Vos escales enregistrées sont conservées.",
      );
    }
  };

  return (
    <section className="discovery-passport" aria-labelledby="passport-title">
      <header className="passport-heading">
        <div>
          <p className="md-kicker">
            <Globe2 size={13} aria-hidden /> Carnet d’escales
          </p>
          <h2 id="passport-title">
            Le monde, <span>une escale à la fois.</span>
          </h2>
          <p>Choisissez un pays, découvrez ses chaînes. Votre carnet reste dans ce navigateur.</p>
        </div>
        <p className="passport-counter">
          <strong>{visited.length.toString().padStart(2, "0")}</strong>
          <span>{visited.length > 1 ? "escales explorées" : "escale explorée"}</span>
        </p>
      </header>
      <Constellation
        countries={countries}
        selected={destination}
        visited={visited}
        onSelect={(code) => void explore(code)}
      />
      <div className="passport-destinations" aria-label="Destinations proposées">
        {featured.map((country) => (
          <button
            type="button"
            key={country.value}
            aria-pressed={destination === country.value}
            onClick={() => void explore(country.value)}
            aria-label={`${country.label}${visited.includes(country.value) ? ", déjà exploré" : ""}`}
          >
            <span className="passport-flag" aria-hidden>
              {flagEmoji(country.value)}
            </span>
            <span>{country.label}</span>
            {visited.includes(country.value) ? (
              <Check size={15} aria-hidden />
            ) : (
              <ArrowUpRight size={15} aria-hidden />
            )}
          </button>
        ))}
      </div>
      <div className="passport-tools">
        <label>
          <span>Autre destination</span>
          <select
            disabled={loading || destinations.length === 0}
            value={destination ?? ""}
            onChange={(event) => {
              if (event.target.value) void explore(event.target.value);
            }}
          >
            <option value="">{loading ? "Chargement des pays…" : "Choisir un pays"}</option>
            {destinations.map((country) => (
              <option value={country.value} key={country.value}>
                {country.label}
                {visited.includes(country.value) ? " · exploré" : ""}
              </option>
            ))}
          </select>
        </label>
        {visited.length > 0 && (
          <button type="button" className="passport-reset" onClick={clearPassport}>
            <RotateCcw size={14} aria-hidden /> Réinitialiser le carnet
          </button>
        )}
      </div>
      {storageNotice && (
        <p className="passport-notice" role="status">
          {storageNotice}
        </p>
      )}
      <div className="passport-results" aria-live="polite" aria-busy={fetching}>
        {fetching ? (
          <ChannelGridSkeleton count={4} />
        ) : error ? (
          <div className="passport-empty">
            <p role="alert">Cette escale n’a pas pu être chargée.</p>
            <button type="button" onClick={() => destination && void explore(destination)}>
              Réessayer cette destination
            </button>
          </div>
        ) : selected ? (
          <>
            <div className="passport-result-heading">
              <h3>
                <MapPin size={18} aria-hidden /> Votre escale : {selected.label}
              </h3>
              <span>{selected.count} chaînes référencées</span>
            </div>
            {channels.length > 0 ? (
              <div className="passport-channel-grid">
                {channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isFavorite={has(channel.id)}
                    onToggleFavorite={toggle}
                    onOpen={watch}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p className="passport-empty">
                Aucune source à proposer ici pour le moment. Vous pouvez consulter le catalogue du
                pays.
              </p>
            )}
            <button
              className="passport-see-all"
              type="button"
              onClick={() => openExplorer({ country: selected.value, sort: "quality" })}
            >
              Tout explorer : {selected.label}
              <ArrowUpRight size={16} aria-hidden />
            </button>
          </>
        ) : (
          <p className="passport-intro">
            Pas de valise à préparer. Juste une destination à choisir.
          </p>
        )}
      </div>
    </section>
  );
}
