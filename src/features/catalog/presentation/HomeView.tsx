"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useHistory } from "@/features/history/history";
import { useSettings } from "@/features/settings/settings";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { APP_CONFIG } from "@/config/app";
import { buildEditorialSections } from "../application/editorial-sections";
import type { EditorialSection as EditorialSectionModel } from "../domain/editorial";
import type {
  CatalogResponse,
  ChannelSummary,
  NormalizedChannel,
  NormalizedStream,
  SourceAvailabilityStatus,
} from "../domain/types";
import { EditorialSection } from "./EditorialSection";

const HOME_LIMIT = 100;
const LOCAL_CHANNEL_LIMIT = 30;

const compatibilityOrder: Record<NormalizedStream["browserCompatibility"], number> = {
  preferred: 0,
  "native-only": 1,
  unknown: 2,
  limited: 3,
  blocked: 4,
};

const availabilityOrder: Record<SourceAvailabilityStatus, number> = {
  playable: 0,
  checking: 1,
  unknown: 2,
  timeout: 3,
  network_error: 4,
  temporarily_unavailable: 5,
  forbidden_or_restricted: 6,
  unsupported_format: 7,
  invalid_url: 8,
};

const summarizeChannel = (channel: NormalizedChannel): ChannelSummary => {
  const { streams, ...summary } = channel;
  const bestCompatibility = streams.reduce<NormalizedStream["browserCompatibility"]>(
    (best, stream) =>
      compatibilityOrder[stream.browserCompatibility] < compatibilityOrder[best]
        ? stream.browserCompatibility
        : best,
    "blocked",
  );
  const bestAvailability = streams.reduce<SourceAvailabilityStatus>(
    (best, stream) =>
      availabilityOrder[stream.availability.status] < availabilityOrder[best]
        ? stream.availability.status
        : best,
    "invalid_url",
  );
  return {
    ...summary,
    streamCount: streams.length,
    bestCompatibility,
    bestAvailability,
  };
};

export function HomeView() {
  const watch = useAppStore((state) => state.watch);
  const openExplorer = useAppStore((state) => state.openExplorer);
  const setView = useAppStore((state) => state.setView);
  const { state: myListState, has, toggle } = useFavorites();
  const { state: historyState } = useHistory();
  const { state: settings } = useSettings();
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localIds = useMemo(
    () =>
      [
        ...new Set([
          ...myListState.channelIds,
          ...historyState.entries.map((entry) => entry.channelId),
        ]),
      ]
        .slice(0, LOCAL_CHANNEL_LIMIT)
        .join(","),
    [historyState.entries, myListState.channelIds],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/catalog?limit=${HOME_LIMIT}`);
        if (!response.ok) throw new Error("home");
        const catalog = (await response.json()) as CatalogResponse;
        const byId = new Map(catalog.items.map((channel) => [channel.id, channel]));
        const missingIds = localIds ? localIds.split(",").filter((id) => !byId.has(id)) : [];
        const localChannels = await Promise.all(
          missingIds.map(async (id) => {
            const detailResponse = await fetch(`/api/channels/${encodeURIComponent(id)}`);
            if (!detailResponse.ok) return null;
            return summarizeChannel((await detailResponse.json()) as NormalizedChannel);
          }),
        );
        for (const channel of localChannels) {
          if (channel) byId.set(channel.id, channel);
        }
        if (!cancelled) setItems([...byId.values()]);
      } catch {
        if (!cancelled) setError("L’accueil éditorial est momentanément indisponible.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localIds]);

  const sections = useMemo(
    () =>
      buildEditorialSections(
        items,
        {
          preferredCountry: settings.preferredCountry,
          preferredLanguages: settings.preferredLanguages,
          favoriteCategories: settings.favoriteCategories,
        },
        {
          myListChannelIds: myListState.channelIds,
          history: historyState.entries,
        },
      ),
    [historyState.entries, items, myListState.channelIds, settings],
  );

  const seeAll = (section: EditorialSectionModel) => {
    if (section.id === "my-list") {
      setView({ view: "favorites" });
      return;
    }
    if (section.id === "recent") {
      setView({ view: "history" });
      return;
    }
    openExplorer(
      {
        ...(section.primaryCategory ? { category: section.primaryCategory } : {}),
        ...(section.optionalCountry ? { country: section.optionalCountry } : {}),
        ...(section.optionalLanguage ? { language: section.optionalLanguage } : {}),
        sort: "quality",
      },
      { from: "home", returnLabel: "Retour à l’accueil" },
    );
  };

  if (loading) {
    return (
      <div className="space-y-8" aria-label="Chargement de l’accueil">
        <SkeletonSection title="Pour vous" />
        <SkeletonSection title="Actualités" />
      </div>
    );
  }

  if (error || sections.length === 0) {
    return (
      <EmptyState
        title="Bienvenue sur MJTV"
        description={error ?? "Aucune section éditoriale n’est disponible pour le moment."}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-8 overflow-x-clip">
      <header className="space-y-2 py-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
          Télévision en direct
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">{APP_CONFIG.name}</h1>
        <p className="text-muted max-w-2xl text-sm">{APP_CONFIG.description}</p>
      </header>
      <div className="space-y-10 sm:space-y-12">
        {sections.map((section) => (
          <EditorialSection
            key={section.id}
            section={section}
            isInMyList={has}
            onToggleMyList={toggle}
            onOpen={watch}
            onSeeAll={seeAll}
            reduceAnimations={settings.reduceAnimations}
          />
        ))}
      </div>
      <footer className="border-border text-muted border-t pt-4 text-xs">
        MJTV référence des sources externes. Disponibilité non garantie.
      </footer>
    </div>
  );
}

const SkeletonSection = ({ title }: { title: string }) => (
  <section className="space-y-3" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <ChannelGridSkeleton count={6} />
  </section>
);
