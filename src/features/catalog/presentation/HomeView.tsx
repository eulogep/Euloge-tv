"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { useSettings } from "@/features/settings/settings";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { APP_CONFIG } from "@/config/app";
import type { ChannelSummary, CatalogResponse } from "../domain/types";

const HOME_LIMIT = 18;

export function HomeView() {
  const watch = useAppStore((s) => s.watch);
  const { state: favState, has, toggle } = useFavorites();
  const { state: historyState } = useHistory();
  const { state: settings } = useSettings();
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: String(HOME_LIMIT * 4) });
        if (settings.preferredCountry) params.set("country", settings.preferredCountry);
        const res = await fetch(`/api/catalog?${params.toString()}`);
        if (!res.ok) throw new Error("home");
        const json = (await res.json()) as CatalogResponse;
        if (!cancelled) setData(json);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.preferredCountry]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonSection title="À regarder maintenant" />
        <SkeletonSection title="Chaînes françaises" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="Bienvenue sur MJTV"
        description="Le catalogue est vide pour le moment. Réessayez dans quelques minutes."
      />
    );
  }

  const favIds = new Set(favState.channelIds);
  const favs = data.items.filter((c) => favIds.has(c.id)).slice(0, HOME_LIMIT);
  const histSeen = new Set<string>();
  const histItems: ChannelSummary[] = [];
  for (const h of [...historyState.entries].reverse()) {
    if (histSeen.has(h.channelId)) continue;
    const c = data.items.find((s) => s.id === h.channelId);
    if (c) {
      histItems.push(c);
      histSeen.add(h.channelId);
    }
    if (histItems.length >= HOME_LIMIT) break;
  }
  const watchNow = data.items.slice(0, HOME_LIMIT);
  const news = data.items.filter((c) => c.categories.includes("news")).slice(0, HOME_LIMIT);
  const docs = data.items.filter((c) => c.categories.includes("documentary")).slice(0, HOME_LIMIT);
  const music = data.items.filter((c) => c.categories.includes("music")).slice(0, HOME_LIMIT);
  const fr = data.items.filter((c) => c.countryCode === "FR").slice(0, HOME_LIMIT);
  const intl = data.items.filter((c) => c.countryCode !== "FR").slice(0, HOME_LIMIT);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">{APP_CONFIG.name}</h1>
        <p className="text-muted text-sm">{APP_CONFIG.description}</p>
      </header>
      <Section
        title="À regarder maintenant"
        items={watchNow}
        onOpen={watch}
        fav={has}
        toggle={toggle}
      />
      {favs.length > 0 && (
        <Section title="Mes favoris" items={favs} onOpen={watch} fav={has} toggle={toggle} />
      )}
      {histItems.length > 0 && (
        <Section
          title="Récemment regardées"
          items={histItems}
          onOpen={watch}
          fav={has}
          toggle={toggle}
        />
      )}
      {fr.length > 0 && (
        <Section title="Chaînes françaises" items={fr} onOpen={watch} fav={has} toggle={toggle} />
      )}
      {news.length > 0 && (
        <Section title="Actualités" items={news} onOpen={watch} fav={has} toggle={toggle} />
      )}
      {docs.length > 0 && (
        <Section title="Documentaires" items={docs} onOpen={watch} fav={has} toggle={toggle} />
      )}
      {music.length > 0 && (
        <Section title="Musique" items={music} onOpen={watch} fav={has} toggle={toggle} />
      )}
      {intl.length > 0 && (
        <Section title="International" items={intl} onOpen={watch} fav={has} toggle={toggle} />
      )}
      <footer className="border-border text-muted border-t pt-4 text-xs">
        MJTV référence des sources externes. Disponibilité non garantie.
      </footer>
    </div>
  );
}

function Section({
  title,
  items,
  onOpen,
  fav,
  toggle,
}: {
  title: string;
  items: ChannelSummary[];
  onOpen: (id: string) => void;
  fav: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((c) => (
          <ChannelCard
            key={c.id}
            channel={c}
            isFavorite={fav(c.id)}
            onToggleFavorite={toggle}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

const SkeletonSection = ({ title }: { title: string }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    <ChannelGridSkeleton count={6} />
  </section>
);
