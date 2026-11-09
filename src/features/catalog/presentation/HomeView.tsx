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
import { selectCinematicFeaturedChannels } from "../application/cinematic-featured";
import type { EditorialSection as EditorialSectionModel } from "../domain/editorial";
import type {
  CatalogResponse,
  ChannelSummary,
  PublicChannelDetail,
  NormalizedStream,
  SourceAvailabilityStatus,
} from "../domain/types";
import { EditorialSection } from "./EditorialSection";
import { FeaturedChannelHero, selectFeaturedChannel } from "./FeaturedChannelHero";
import { CinematicFeaturedCarousel } from "./CinematicFeaturedCarousel";
import { QuickCategories } from "./QuickCategories";
import { EveningComposer } from "./EveningComposer";
import { CreatorCredit } from "@/components/creator/CreatorCredit";
import { canFeatureChannel } from "../application/source-health";
import { HorizonDestinations } from "./HorizonDestinations";
import { Cadran } from "@/features/meridian/presentation/Cadran";
import { Presets } from "@/features/meridian/presentation/Presets";
import { WorldMoments } from "@/features/meridian/presentation/WorldMoments";
import { useAtlas } from "@/features/meridian/application/use-atlas";
import { useReducedMotion } from "@/features/meridian/application/use-reduced-motion";
import { atlasFromSummaries, stopsFromAtlas } from "@/features/meridian/domain/atlas";

import { JourneyNotebook } from "@/features/journeys/presentation/JourneyNotebook";

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

const summarizeChannel = (channel: PublicChannelDetail): ChannelSummary => {
  const { streams, ...summary } = channel;
  const bestCompatibility = streams.reduce<NormalizedStream["browserCompatibility"]>(
    (best, stream) =>
      compatibilityOrder[stream.browserCompatibility] < compatibilityOrder[best]
        ? stream.browserCompatibility
        : best,
    "blocked",
  );
  const bestAvailability =
    streams.length > 0
      ? streams.reduce<SourceAvailabilityStatus>(
          (best, stream) =>
            availabilityOrder[stream.availability.status] < availabilityOrder[best]
              ? stream.availability.status
              : best,
          "invalid_url",
        )
      : undefined;
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
  const { state: myListState, has, toggle, add } = useFavorites();
  const { state: historyState } = useHistory();
  const { state: settings } = useSettings();
  const [items, setItems] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { atlas, failed: atlasFailed, loading: atlasLoading } = useAtlas();
  const reduceMotion = useReducedMotion();
  const stops = useMemo(
    () => stopsFromAtlas(atlas ?? (atlasFailed ? atlasFromSummaries(items) : null)),
    [atlas, atlasFailed, items],
  );

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
            try {
              const detailResponse = await fetch(`/api/channels/${encodeURIComponent(id)}`);
              if (!detailResponse.ok) return null;
              return summarizeChannel((await detailResponse.json()) as PublicChannelDetail);
            } catch {
              return null;
            }
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
  const featuredChannel = useMemo(() => selectFeaturedChannel(items), [items]);
  const cinematicChannels = useMemo(() => selectCinematicFeaturedChannels(items), [items]);
  const orderedSections = useMemo(() => {
    const live: EditorialSectionModel = {
      id: "live-now",
      title: "En direct maintenant",
      subtitle: "Des chaînes avec une source à essayer. La disponibilité peut varier.",
      primaryCategory: "live",
      priority: 0,
      maxItems: 12,
      visualVariant: "neutral",
      emptyBehavior: "hide",
      items: items.filter(canFeatureChannel).slice(0, 12),
    };
    const byId = new Map(sections.map((section) => [section.id, section]));
    const personal = [byId.get("recent"), byId.get("my-list")].filter(
      (section): section is EditorialSectionModel => !!section,
    );
    const editorial = sections.filter((section) => !["recent", "my-list"].includes(section.id));
    return [live, ...personal, ...editorial].filter((section) => section.items.length > 0);
  }, [items, sections]);

  const seeAll = (section: EditorialSectionModel) => {
    if (section.id === "live-now") {
      setView({ view: "live" });
      return;
    }
    if (section.id === "my-list") {
      setView({ view: "my-list", tab: "favorites" });
      return;
    }
    if (section.id === "recent") {
      setView({ view: "my-list", tab: "history" });
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

  const exploreCountry = (country: string) =>
    openExplorer({ country, sort: "quality" }, { from: "home", returnLabel: "Retour à l’accueil" });

  const presets = myListState.channelIds.map((id) => items.find((item) => item.id === id));
  const recent = historyState.entries
    .map((entry) => items.find((item) => item.id === entry.channelId && canFeatureChannel(item)))
    .find(Boolean);
  const initialLoad = loading && items.length === 0;
  const unavailable =
    !initialLoad && ((error && items.length === 0) || orderedSections.length === 0);

  return (
    <div
      className="min-w-0 space-y-[var(--space-section)]"
      data-reduce-motion={settings.reduceAnimations ? "true" : "false"}
    >
      <div>
        <Cadran
          stops={stops}
          loading={atlasLoading || (atlasFailed && loading)}
          isFavorite={has}
          onToggleFavorite={toggle}
          onWatch={watch}
          reduceMotion={reduceMotion}
        />
        {!initialLoad && !unavailable && (
          <Presets
            favorites={presets}
            recent={recent}
            favoriteCount={myListState.channelIds.length}
          />
        )}
      </div>
      {initialLoad ? (
        <div className="space-y-8" aria-label="Chargement de l’accueil">
          <SkeletonSection title="Pour vous" />
          <SkeletonSection title="Actualités" />
        </div>
      ) : unavailable ? (
        <EmptyState
          title="Bienvenue sur MJTV"
          description={error ?? "Aucune section éditoriale n’est disponible pour le moment."}
        />
      ) : (
        <>
          <WorldMoments stops={stops} onWatch={watch} onExploreCountry={exploreCountry} />
          <QuickCategories
            onSelect={(category) =>
              openExplorer(
                { category, sort: "quality" },
                { from: "home", returnLabel: "Retour à l’accueil" },
              )
            }
          />
          <section className="md-section" aria-label="À la une">
            <header className="md-section-head">
              <p className="md-kicker">À la une</p>
              <p className="md-section-title" aria-hidden>
                Sur le plateau
              </p>
            </header>
            {APP_CONFIG.enableCinematicCarousel && cinematicChannels.length > 1 ? (
              <CinematicFeaturedCarousel
                channels={cinematicChannels}
                onWatch={watch}
                reduceAnimations={settings.reduceAnimations}
                isFavorite={has}
                onToggleFavorite={toggle}
              />
            ) : featuredChannel ? (
              <FeaturedChannelHero
                channel={featuredChannel}
                isInMyList={has(featuredChannel.id)}
                onToggleMyList={toggle}
                onWatch={watch}
              />
            ) : null}
          </section>
          <div className="space-y-[var(--space-section)]">
            {orderedSections.map((section) => (
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
          <EveningComposer onWatch={watch} isFavorite={has} onAddFavorite={add} />
          <HorizonDestinations onExplore={exploreCountry} />
          <JourneyNotebook />
          <CreatorCredit />
          <footer className="border-border text-muted border-t pt-5 text-xs leading-5">
            MJTV référence des sources externes. Disponibilité non garantie. Les heures sont celles
            de la ville indiquée ; la lumière du cadran est calculée, pas filmée.
          </footer>
        </>
      )}
    </div>
  );
}

const SkeletonSection = ({ title }: { title: string }) => (
  <section className="space-y-3" aria-label={title}>
    <h2 className="text-lg font-semibold">{title}</h2>
    <ChannelGridSkeleton count={6} />
  </section>
);
