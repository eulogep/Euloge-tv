"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Compass,
  Headphones,
  Moon,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import type { CatalogCategory, CatalogResponse, ChannelSummary } from "../domain/types";
import {
  canFeatureChannel,
  channelHealthLabel,
  healthStatusOf,
} from "../application/source-health";
import { categoryLabelFr } from "../application/taxonomy";

const MOODS = [
  {
    id: "unwind",
    label: "Déconnecter",
    description: "Musique & découvertes",
    icon: Headphones,
    categories: ["music", "documentaries"],
  },
  {
    id: "understand",
    label: "Comprendre",
    description: "Actualités & regards",
    icon: Compass,
    categories: ["news", "culture"],
  },
  {
    id: "family",
    label: "En famille",
    description: "Animation & jeunesse",
    icon: Users,
    categories: ["kids", "animation"],
  },
  {
    id: "cinema",
    label: "S’évader",
    description: "Films & séries",
    icon: Moon,
    categories: ["movies", "series"],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  icon: typeof Moon;
  categories: readonly CatalogCategory[];
}[];

type Props = {
  onWatch: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onAddFavorite: (id: string) => void;
};

export function EveningComposer({ onWatch, isFavorite, onAddFavorite }: Props) {
  const [moodId, setMoodId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const compose = async (mood: (typeof MOODS)[number]) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setMoodId(mood.id);
    setLoading(true);
    setError(null);
    setPlan([]);
    try {
      const groups = await Promise.all(
        mood.categories.map(async (category) => {
          const query = new URLSearchParams({ category, sort: "quality", limit: "12" });
          const response = await fetch(`/api/catalog?${query}`, { signal: controller.signal });
          if (!response.ok) throw new Error("catalog");
          const data = (await response.json()) as CatalogResponse;
          const channels = data.items.filter(canFeatureChannel);
          const start = Math.floor(Math.random() * channels.length);
          return [...channels.slice(start), ...channels.slice(0, start)];
        }),
      );
      const selection = new Map<string, ChannelSummary>();
      for (let index = 0; index < 12 && selection.size < 3; index++) {
        for (const group of groups) {
          const channel = group[index];
          if (channel && selection.size < 3) selection.set(channel.id, channel);
        }
      }
      if (!controller.signal.aborted) setPlan([...selection.values()]);
    } catch {
      if (!controller.signal.aborted)
        setError("Cette sélection n’a pas pu être chargée. Réessayez votre envie.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const allSaved = plan.length > 0 && plan.every((channel) => isFavorite(channel.id));
  return (
    <section className="evening-composer" aria-labelledby="evening-title">
      <header className="evening-heading">
        <div>
          <p className="md-kicker">
            <Sparkles size={13} aria-hidden /> Composer ma soirée
          </p>
          <h2 id="evening-title">
            Une envie. <span>Votre sélection.</span>
          </h2>
          <p>Choisissez votre humeur. On vous propose jusqu’à trois chaînes pour la suivre.</p>
        </div>
        <span className="evening-edition" aria-hidden>
          À LA
          <br />
          CARTE ↗
        </span>
      </header>
      <div className="evening-moods" aria-label="Votre envie du moment">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          return (
            <button
              key={mood.id}
              type="button"
              aria-pressed={moodId === mood.id}
              onClick={() => void compose(mood)}
            >
              <Icon size={22} aria-hidden />
              <span>
                <strong>{mood.label}</strong>
                <small>{mood.description}</small>
              </span>
              <ArrowUpRight size={17} aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="evening-results" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p className="evening-message">On compose votre sélection…</p>
        ) : error ? (
          <p className="evening-message" role="alert">
            {error}
          </p>
        ) : plan.length > 0 ? (
          <>
            <div className="evening-plan">
              {plan.map((channel, index) => (
                <article className="evening-pick" key={channel.id}>
                  <span className="evening-pick-number" aria-hidden>
                    0{index + 1}
                  </span>
                  <div>
                    <p>
                      {channel.categories[0]
                        ? categoryLabelFr(channel.categories[0])
                        : "Découverte"}
                    </p>
                    <h3>{channel.name}</h3>
                    <small>
                      {channel.countryFlag} {channel.countryName} ·{" "}
                      {channelHealthLabel(healthStatusOf(channel))}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => onWatch(channel.id)}
                    aria-label={`Regarder ${channel.name}`}
                  >
                    <Play size={17} fill="currentColor" aria-hidden />
                  </button>
                </article>
              ))}
            </div>
            <div className="evening-plan-footer">
              <p>Sources externes : la disponibilité de la lecture peut varier.</p>
              <button
                type="button"
                onClick={() => {
                  const mood = MOODS.find((item) => item.id === moodId);
                  if (mood) void compose(mood);
                }}
              >
                <RefreshCw size={15} aria-hidden /> Recomposer
              </button>
              <button
                type="button"
                disabled={allSaved}
                onClick={() => plan.forEach((channel) => onAddFavorite(channel.id))}
              >
                {allSaved ? <Check size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
                {allSaved ? "Sélection dans Ma liste" : "Tout ajouter à Ma liste"}
              </button>
            </div>
          </>
        ) : moodId ? (
          <p className="evening-message">
            Aucune source à proposer pour cette envie. Essayez-en une autre.
          </p>
        ) : (
          <p className="evening-message evening-idle">
            Qu’est-ce qui vous ferait du bien, là, maintenant ?
          </p>
        )}
      </div>
    </section>
  );
}
