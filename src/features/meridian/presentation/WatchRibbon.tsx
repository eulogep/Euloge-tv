"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import { canFeatureChannel } from "@/features/catalog/application/source-health";
import type { CatalogResponse, ChannelSummary } from "@/features/catalog/domain/types";
import { useAppStore } from "@/lib/utils/app-store";
import { useNow } from "../application/use-now";
import { localClock, placeOf } from "../domain/places";
import { dayPhase, skyCss, solarElevation, sunPosition } from "../domain/solar";

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

type Props = {
  channelId: string;
  channelName: string;
  countryCode: string | null;
};

/** Stable, quality-ordered ring of a country's channels: P+ then P− returns where you were. */
const useCountryRing = (countryCode: string | null): ChannelSummary[] => {
  const [ring, setRing] = useState<ChannelSummary[]>([]);
  useEffect(() => {
    if (!countryCode) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ country: countryCode, sort: "quality", limit: "40" });
    void fetch(`/api/catalog?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as CatalogResponse;
        setRing(
          data.items.filter(
            (channel) => channel.countryCode === countryCode && canFeatureChannel(channel),
          ),
        );
      })
      .catch(() => {
        // Without a ring the P buttons simply stay disabled.
      });
    return () => controller.abort();
  }, [countryCode]);
  return ring;
};

/** Where the channel is on Earth right now, and the remote control for its neighbours. */
export function WatchRibbon({ channelId, channelName, countryCode }: Props) {
  const now = useNow();
  const watch = useAppStore((state) => state.watch);
  const ring = useCountryRing(countryCode);
  const [copied, setCopied] = useState(false);
  const place = placeOf(countryCode);

  const local = useMemo(() => {
    if (!now || !place) return null;
    const date = new Date(now);
    const sun = sunPosition(date);
    return {
      label: localClock(date, place.timeZone).label,
      sky: skyCss(solarElevation(sun, place.latitude, place.longitude)),
      phase: dayPhase(sun, place.latitude, place.longitude),
    };
  }, [now, place]);

  const others = ring.length > 1 || (ring.length === 1 && ring[0]!.id !== channelId);
  const zap = useMemo(
    () => (direction: -1 | 1) => {
      if (ring.length === 0) return;
      const index = ring.findIndex((channel) => channel.id === channelId);
      const start = index < 0 && direction < 0 ? 0 : index;
      const next = ring[(start + direction + ring.length) % ring.length];
      if (next && next.id !== channelId) watch(next.id);
    },
    [channelId, ring, watch],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "PageUp" && event.key !== "PageDown") return;
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      zap(event.key === "PageUp" ? 1 : -1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zap]);

  useEffect(() => setCopied(false), [channelId]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${channelName} sur MJTV`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Sharing dismissed or clipboard refused: nothing to report.
    }
  };

  return (
    <section
      className="md-ribbon"
      aria-label="Heure locale et télécommande"
      style={{ "--place-sky": local?.sky ?? "var(--border-strong)" } as CSSProperties}
    >
      <p className="md-ribbon-time">
        {place && local ? (
          <>
            <strong>{local.label}</strong>
            <span>
              à {place.city} · {local.phase}
            </span>
          </>
        ) : (
          <span>Émission sans lieu connu</span>
        )}
      </p>
      <div className="md-ribbon-actions">
        <button
          type="button"
          onClick={() => zap(-1)}
          disabled={!others}
          aria-label="Chaîne précédente du pays"
          aria-keyshortcuts="PageDown"
        >
          <ChevronDown size={17} aria-hidden /> P
        </button>
        <button
          type="button"
          onClick={() => zap(1)}
          disabled={!others}
          aria-label="Chaîne suivante du pays"
          aria-keyshortcuts="PageUp"
        >
          <ChevronUp size={17} aria-hidden /> P
        </button>
        <button type="button" onClick={() => void share()} aria-label="Partager cette chaîne">
          {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
          <span>{copied ? "Lien copié" : "Partager"}</span>
        </button>
      </div>
    </section>
  );
}
