"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  Clapperboard,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Tv,
  X,
} from "lucide-react";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useCatalog } from "@/features/catalog/presentation/use-catalog";
import { canFeatureChannel } from "@/features/catalog/application/source-health";
import { useFavorites } from "@/features/favorites/favorites";
import { useAppStore } from "@/lib/utils/app-store";
import {
  customToDestination,
  OFFICIAL_PLATFORMS,
  officialToDestination,
  STREAMING_CATEGORIES,
  tbcplSiteToDestination,
  type StreamingCategory,
  type StreamingDestination,
} from "../domain/platforms";
import { useStreamingHub } from "../application/use-streaming-hub";

const CUSTOM_CATEGORIES: readonly {
  id: Exclude<StreamingCategory, "all" | "official" | "custom">;
  label: string;
}[] = [
  { id: "movies", label: "Films & Séries" },
  { id: "replay", label: "Replay & Docs" },
  { id: "anime", label: "Animés" },
  { id: "livetv", label: "Live & Sports" },
  { id: "manga", label: "Manga" },
];

const filterDestinations = (
  items: readonly StreamingDestination[],
  category: StreamingCategory,
  normalizedQuery: string,
): StreamingDestination[] =>
  items.filter((item) => {
    const inCategory =
      category === "all"
        ? true
        : category === "official"
          ? item.source === "official"
          : category === "custom"
            ? item.source === "custom"
            : item.category === category;
    if (!inCategory) return false;
    if (!normalizedQuery) return true;
    return (
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.subtitle.toLowerCase().includes(normalizedQuery) ||
      item.badge.toLowerCase().includes(normalizedQuery)
    );
  });

export function StreamingHubView() {
  const watch = useAppStore((s) => s.watch);
  const openExplorer = useAppStore((s) => s.openExplorer);
  const { has: hasFavChannel, toggle: toggleFavChannel } = useFavorites();

  const {
    pins,
    recent,
    customPortals,
    tbcpl,
    loadingPortals,
    portalsError,
    togglePin,
    recordLaunch,
    addCustomPortal,
    removeCustomPortal,
  } = useStreamingHub();

  // Live 24/7 cinema & series streams inside MJTV's own catalog
  const { items: movieChannels } = useCatalog({
    category: "movies",
    limit: 12,
    sort: "quality",
  });
  const playableCinema = useMemo(
    () => movieChannels.filter(canFeatureChannel).slice(0, 10),
    [movieChannels],
  );

  const [category, setCategory] = useState<StreamingCategory>("all");
  const [query, setQuery] = useState("");
  const [showAllPortals, setShowAllPortals] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCat, setNewCat] = useState<Exclude<StreamingCategory, "all" | "official" | "custom">>(
    "movies",
  );
  const [formError, setFormError] = useState<string | null>(null);

  const officialItems = useMemo<StreamingDestination[]>(
    () => OFFICIAL_PLATFORMS.map(officialToDestination),
    [],
  );

  const tbcplItems = useMemo<StreamingDestination[]>(
    () => (tbcpl?.sites ?? []).map(tbcplSiteToDestination),
    [tbcpl],
  );

  const customItems = useMemo<StreamingDestination[]>(
    () => customPortals.map(customToDestination),
    [customPortals],
  );

  const allById = useMemo(() => {
    const map = new Map<string, StreamingDestination>();
    for (const item of [...customItems, ...officialItems, ...tbcplItems]) {
      map.set(item.id, item);
    }
    return map;
  }, [customItems, officialItems, tbcplItems]);

  const pinnedItems = useMemo(
    () =>
      pins
        .map((id) => allById.get(id))
        .filter((item): item is StreamingDestination => Boolean(item)),
    [allById, pins],
  );

  const recentItems = useMemo(
    () =>
      recent
        .map((id) => allById.get(id))
        .filter((item): item is StreamingDestination => Boolean(item))
        .slice(0, 6),
    [allById, recent],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredOfficial = useMemo(
    () => filterDestinations(officialItems, category, normalizedQuery),
    [officialItems, category, normalizedQuery],
  );

  const filteredPortals = useMemo(
    () => filterDestinations(tbcplItems, category, normalizedQuery),
    [tbcplItems, category, normalizedQuery],
  );

  const filteredCustom = useMemo(
    () => filterDestinations(customItems, category, normalizedQuery),
    [customItems, category, normalizedQuery],
  );

  const handleAddSubmit = (event: FormEvent) => {
    event.preventDefault();
    const res = addCustomPortal(newName, newUrl, newCat);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setFormError(null);
    setNewName("");
    setNewUrl("");
    setAddOpen(false);
    setCategory("custom");
  };

  const totalCount = officialItems.length + tbcplItems.length + customItems.length;
  const visiblePortals =
    showAllPortals || category !== "all" || Boolean(normalizedQuery)
      ? filteredPortals
      : filteredPortals.slice(0, 20);
  const hasMorePortals = visiblePortals.length < filteredPortals.length;
  const nothingFound =
    filteredOfficial.length === 0 &&
    filteredPortals.length === 0 &&
    filteredCustom.length === 0 &&
    !loadingPortals;

  return (
    <section className="space-y-8" aria-labelledby="streaming-hub-title">
      {/* Cinematic Streaming Hub Hero */}
      <header className="st-hero">
        <div className="st-hero-glow" aria-hidden />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="md-kicker">
              <Clapperboard className="h-3.5 w-3.5" aria-hidden /> Hub Streaming
            </p>
            <h1 id="streaming-hub-title" className="st-hero-title">
              Plateformes, cinéma <span>&amp; portails.</span>
            </h1>
            <p className="text-muted max-w-2xl text-sm leading-relaxed sm:text-base">
              Retrouvez les plateformes gratuites officielles, le répertoire films, animés et sports
              ainsi que vos portails personnels, réunis au même endroit.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="st-stat-pill">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                {officialItems.length} plateformes officielles
              </span>
              <span className="st-stat-pill">
                <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden />
                {tbcplItems.length > 0 ? `${tbcplItems.length} portails indexés` : "Répertoire en ligne"}
              </span>
              {pins.length > 0 && (
                <span className="st-stat-pill">
                  <Pin className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  {pins.length} {pins.length > 1 ? "épinglés" : "épinglé"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 xl:shrink-0">
            <label className="st-search-box">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Arte, Pluto, Anime, Sport…"
                aria-label="Filtrer les plateformes et portails de streaming"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Effacer la recherche"
                  className="text-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={() => {
                setAddOpen((prev) => !prev);
                setFormError(null);
              }}
              aria-expanded={addOpen}
              className="premium-button-primary shrink-0 gap-2 px-4 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un portail
            </button>
          </div>
        </div>

        {/* Collapsible custom portal drawer */}
        {addOpen && (
          <form onSubmit={handleAddSubmit} className="st-add-form" noValidate>
            <div className="grid gap-3 sm:grid-cols-12">
              <label className="sm:col-span-4">
                <span>Nom du portail</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex : Mon Ciné, Plex Perso…"
                  required
                />
              </label>
              <label className="sm:col-span-5">
                <span>Adresse web (URL)</span>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://exemple.com"
                  required
                />
              </label>
              <label className="sm:col-span-3">
                <span>Catégorie</span>
                <select
                  value={newCat}
                  onChange={(e) =>
                    setNewCat(
                      e.target.value as Exclude<StreamingCategory, "all" | "official" | "custom">,
                    )
                  }
                >
                  {CUSTOM_CATEGORIES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {formError ? (
                <p className="text-xs font-medium text-rose-400" role="alert">
                  {formError}
                </p>
              ) : (
                <p className="text-muted text-xs">
                  Enregistré localement dans ce navigateur — accessible en un clic.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="premium-button-secondary px-3.5 text-xs"
                >
                  Annuler
                </button>
                <button type="submit" className="premium-button-primary px-4 text-xs">
                  Enregistrer le portail
                </button>
              </div>
            </div>
          </form>
        )}
      </header>

      {/* Pinned & Recently Opened Quick Dock */}
      {(pinnedItems.length > 0 || recentItems.length > 0) && !normalizedQuery && (
        <section className="space-y-4" aria-label="Accès rapides streaming">
          {pinnedItems.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="st-subheading">
                <Pin className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden /> Vos plateformes
                épinglées
              </h2>
              <div className="st-dock">
                {pinnedItems.map((item) => (
                  <a
                    key={`pin-${item.id}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordLaunch(item.id)}
                    className="st-dock-chip"
                    style={{ "--st-accent": item.accent } as CSSProperties}
                  >
                    <span className="st-dock-monogram" aria-hidden>
                      {item.monogram}
                    </span>
                    <span className="truncate font-semibold">{item.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-65" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          )}

          {recentItems.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="st-subheading">
                <Clock className="h-3.5 w-3.5 text-sky-400" aria-hidden /> Récemment ouverts
              </h2>
              <div className="st-dock">
                {recentItems.map((item) => (
                  <a
                    key={`recent-${item.id}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordLaunch(item.id)}
                    className="st-dock-chip"
                    style={{ "--st-accent": item.accent } as CSSProperties}
                  >
                    <span className="st-dock-monogram" aria-hidden>
                      {item.monogram}
                    </span>
                    <span className="truncate font-medium">{item.name}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Category Filter Strip */}
      <div className="st-filter-bar" role="tablist" aria-label="Catégories de streaming">
        {STREAMING_CATEGORIES.map((tab) => {
          const active = category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(tab.id)}
              className={active ? "st-filter-pill st-filter-pill-active" : "st-filter-pill"}
            >
              {tab.label}
              {tab.id === "all" && <span className="st-filter-count">{totalCount}</span>}
              {tab.id === "custom" && customItems.length > 0 && (
                <span className="st-filter-count">{customItems.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom User Portals */}
      {filteredCustom.length > 0 && (
        <section className="space-y-3.5" aria-labelledby="streaming-custom-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="streaming-custom-title" className="st-section-title">
                Mes portails personnels
              </h2>
              <p className="text-muted text-xs">Vos liens streaming enregistrés dans ce navigateur.</p>
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustom.map((item) => {
              const pinned = pins.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="st-card"
                  style={{ "--st-accent": item.accent } as CSSProperties}
                >
                  <div className="st-card-top">
                    <span className="st-monogram" aria-hidden>
                      {item.monogram}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold">{item.name}</h3>
                      <p className="text-muted truncate text-xs">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePin(item.id)}
                        aria-label={pinned ? `Désépingler ${item.name}` : `Épingler ${item.name}`}
                        aria-pressed={pinned}
                        className="st-icon-btn"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomPortal(item.id)}
                        aria-label={`Supprimer ${item.name}`}
                        className="st-icon-btn hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="st-card-footer">
                    <span className="st-badge">{item.badge}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordLaunch(item.id)}
                      className="st-open-link"
                    >
                      Ouvrir <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {category === "custom" && filteredCustom.length === 0 && !normalizedQuery && (
        <EmptyState
          title="Aucun portail personnel"
          description="Ajoutez vos propres plateformes, serveurs Plex/Jellyfin ou sites streaming favoris pour y accéder en un clic."
          action={
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="premium-button-primary gap-2 px-4 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden /> Ajouter mon premier portail
            </button>
          }
        />
      )}

      {/* Official & Free Streaming Platforms */}
      {filteredOfficial.length > 0 && (
        <section className="space-y-4" aria-labelledby="streaming-official-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="streaming-official-title" className="st-section-title">
                Plateformes officielles &amp; gratuites
              </h2>
              <p className="text-muted text-xs sm:text-sm">
                Replay public, cinéma AVOD sans abonnement, animés et directs sportifs.
              </p>
            </div>
            <span className="text-muted font-mono text-xs">
              {filteredOfficial.length}{" "}
              {filteredOfficial.length > 1 ? "plateformes" : "plateforme"}
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOfficial.map((item) => {
              const pinned = pins.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="st-card"
                  style={{ "--st-accent": item.accent } as CSSProperties}
                >
                  <div className="st-card-top">
                    <span className="st-monogram" aria-hidden>
                      {item.monogram}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold tracking-tight">{item.name}</h3>
                      <span className="st-badge mt-1 inline-block">{item.badge}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePin(item.id)}
                      aria-label={pinned ? `Désépingler ${item.name}` : `Épingler ${item.name}`}
                      aria-pressed={pinned}
                      className="st-icon-btn"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-muted mt-3 line-clamp-2 text-xs leading-relaxed sm:text-[0.82rem]">
                    {item.subtitle}
                  </p>
                  <div className="st-card-footer">
                    <span className="text-muted truncate font-mono text-[0.68rem]">
                      {new URL(item.url).hostname.replace(/^www\./, "")}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordLaunch(item.id)}
                      className="st-open-link"
                    >
                      Ouvrir <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Community Streaming Portals Directory (/api/tbcpl) */}
      {(category !== "official" && category !== "custom") && (
        <section className="space-y-4" aria-labelledby="streaming-portals-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="streaming-portals-title" className="st-section-title">
                Répertoire Films, Animés, Sports &amp; Manga
              </h2>
              <p className="text-muted text-xs sm:text-sm">
                Portails externes indexés automatiquement — ouverture directe dans un nouvel onglet.
              </p>
            </div>
            {tbcplItems.length > 0 && (
              <span className="text-muted font-mono text-xs">
                {filteredPortals.length} {filteredPortals.length > 1 ? "portails" : "portail"}
              </span>
            )}
          </div>

          {loadingPortals ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="st-portal-skeleton" aria-hidden />
              ))}
            </div>
          ) : portalsError && filteredPortals.length === 0 ? (
            <div className="st-notice-box">{portalsError}</div>
          ) : filteredPortals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {visiblePortals.map((site) => {
                  const pinned = pins.includes(site.id);
                  return (
                    <article
                      key={site.id}
                      className="st-portal-card"
                      style={{ "--st-accent": site.accent } as CSSProperties}
                    >
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordLaunch(site.id)}
                        className="st-portal-link"
                      >
                        <span className="st-portal-monogram" aria-hidden>
                          {site.monogram}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">{site.name}</h3>
                          <p className="text-muted truncate font-mono text-[0.68rem]">
                            {site.subtitle}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                      </a>
                      <div className="st-portal-meta">
                        <span className="st-badge">{site.badge}</span>
                        <button
                          type="button"
                          onClick={() => togglePin(site.id)}
                          aria-label={pinned ? `Désépingler ${site.name}` : `Épingler ${site.name}`}
                          aria-pressed={pinned}
                          className="st-pin-mini"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {hasMorePortals && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllPortals(true)}
                    className="premium-button-secondary px-5 text-xs"
                  >
                    Afficher les {filteredPortals.length - visiblePortals.length} autres portails (
                    {filteredPortals.length} au total)
                  </button>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {nothingFound && (
        <EmptyState
          title="Aucun résultat trouvé"
          description={`Aucune plateforme ni portail ne correspond à « ${query} » dans cette catégorie.`}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="premium-button-secondary px-4 text-xs"
            >
              Réinitialiser les filtres
            </button>
          }
        />
      )}

      {/* Playable 24/7 Cinema Channels right inside MJTV */}
      {playableCinema.length > 0 && !normalizedQuery && (
        <section className="space-y-4 pt-2" aria-labelledby="streaming-mjtv-cinema-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="md-kicker">
                <Film className="h-3.5 w-3.5" aria-hidden /> En direct dans MJTV
              </p>
              <h2 id="streaming-mjtv-cinema-title" className="st-section-title mt-1">
                Chaînes Cinéma 24/7 prêtes à lire
              </h2>
            </div>
            <button
              type="button"
              onClick={() => openExplorer({ category: "movies" })}
              className="premium-button-secondary gap-1.5 px-3.5 text-xs"
            >
              <Tv className="h-3.5 w-3.5" aria-hidden /> Tout le cinéma
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {playableCinema.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isFavorite={hasFavChannel(channel.id)}
                onToggleFavorite={toggleFavChannel}
                onOpen={watch}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
