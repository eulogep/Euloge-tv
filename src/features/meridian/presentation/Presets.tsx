"use client";

import { History, Star } from "lucide-react";
import type { ChannelSummary } from "@/features/catalog/domain/types";
import { useAppStore } from "@/lib/utils/app-store";

export const PRESET_SLOTS = 9;

type Props = {
  /** Favourite channels in saved order: position N answers to key N. */
  favorites: readonly (ChannelSummary | undefined)[];
  recent?: ChannelSummary;
  favoriteCount: number;
};

/** Radio presets: Ma liste, one key away. The numbers work from anywhere in the app. */
export function Presets({ favorites, recent, favoriteCount }: Props) {
  const watch = useAppStore((state) => state.watch);
  const setView = useAppStore((state) => state.setView);
  const slots = favorites.slice(0, PRESET_SLOTS);

  return (
    <section className="md-presets" aria-labelledby="md-presets-title">
      <h2 id="md-presets-title" className="md-kicker">
        <Star size={13} aria-hidden /> Préréglages
      </h2>
      <div className="md-preset-row">
        {recent && (
          <button
            type="button"
            className="md-preset md-preset-recent"
            onClick={() => watch(recent.id)}
            aria-label={`Reprendre le direct de ${recent.name}`}
          >
            <History size={15} aria-hidden />
            <span>{recent.name}</span>
          </button>
        )}
        {slots.map((channel, index) =>
          channel ? (
            <button
              key={channel.id}
              type="button"
              className="md-preset"
              onClick={() => watch(channel.id)}
              aria-label={`Préréglage ${index + 1} : ${channel.name}`}
              aria-keyshortcuts={String(index + 1)}
            >
              <kbd aria-hidden>{index + 1}</kbd>
              <span>{channel.name}</span>
            </button>
          ) : null,
        )}
        {favoriteCount === 0 && (
          <p className="md-preset-empty">
            Épinglez une chaîne avec <Star size={13} aria-label="l’étoile" /> : elle répondra aux
            touches <kbd>1</kbd> à <kbd>9</kbd>.
          </p>
        )}
        {favoriteCount > PRESET_SLOTS && (
          <button
            type="button"
            className="md-preset md-preset-more"
            onClick={() => setView({ view: "my-list", tab: "favorites" })}
          >
            Toute ma liste
          </button>
        )}
      </div>
    </section>
  );
}
