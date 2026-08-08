"use client";

import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { useFavorites } from "@/features/favorites/favorites";
import { useAppStore } from "@/lib/utils/app-store";
import { storage } from "@/lib/storage/local";
import { useCatalog } from "@/features/catalog/presentation/use-catalog";
import { CATALOG_CATEGORIES } from "@/features/catalog/application/taxonomy";

const RECENT_KEY = "mjtv:recent-searches:v1";

export function SearchView() {
  const goBack = useAppStore((state) => state.goBack);
  const watch = useAppStore((state) => state.watch);
  const initial = useAppStore((state) =>
    state.view.view === "search" ? state.view.filters : undefined,
  );
  const replaceFilters = useAppStore((state) => state.replaceExplorerFilters);
  const openExplorer = useAppStore((state) => state.openExplorer);
  const { has, toggle } = useFavorites();
  const [query, setQuery] = useState(initial?.q ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(initial?.q ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const { data, items, loading, error } = useCatalog({ limit: 100, sort: "quality" });

  useEffect(() => setRecent(storage.get<string[]>(RECENT_KEY, [])), []);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    replaceFilters({
      q: debouncedQuery || undefined,
      country: initial?.country,
      category: initial?.category,
      language: initial?.language,
      availability: initial?.availability,
      sort: initial?.sort,
      source: initial?.source,
    });
  }, [
    debouncedQuery,
    initial?.availability,
    initial?.category,
    initial?.country,
    initial?.language,
    initial?.sort,
    initial?.source,
    replaceFilters,
  ]);

  const scoped = useMemo(
    () =>
      items.filter(
        (channel) =>
          (!initial?.country || channel.countryCode === initial.country) &&
          (!initial?.category || channel.categories.includes(initial.category)) &&
          (!initial?.language || channel.languageCodes.includes(initial.language)),
      ),
    [initial?.category, initial?.country, initial?.language, items],
  );

  const fuse = useMemo(
    () =>
      new Fuse(scoped, {
        threshold: 0.42,
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 2,
        keys: [
          { name: "name", weight: 0.34 },
          { name: "alternativeNames", weight: 0.24 },
          { name: "countryName", weight: 0.12 },
          { name: "countryCode", weight: 0.07 },
          { name: "categories", weight: 0.1 },
          { name: "languageCodes", weight: 0.08 },
          { name: "tags", weight: 0.05 },
        ],
      }),
    [scoped],
  );

  const results = useMemo(
    () =>
      debouncedQuery
        ? fuse.search(debouncedQuery).slice(0, 40)
        : scoped.slice(0, 20).map((item) => ({ item, score: 0 })),
    [debouncedQuery, fuse, scoped],
  );
  const countries = useMemo(
    () =>
      debouncedQuery && data
        ? data.filters.countries
            .filter((item) =>
              item.label.toLocaleLowerCase("fr").includes(debouncedQuery.toLocaleLowerCase("fr")),
            )
            .slice(0, 6)
        : [],
    [data, debouncedQuery],
  );
  const categories = useMemo(
    () =>
      debouncedQuery && data
        ? data.filters.categories
            .filter((item) =>
              item.label.toLocaleLowerCase("fr").includes(debouncedQuery.toLocaleLowerCase("fr")),
            )
            .slice(0, 6)
        : [],
    [data, debouncedQuery],
  );

  const remember = (term: string) => {
    const value = term.trim();
    if (!value) return;
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 5);
    setRecent(next);
    storage.set(RECENT_KEY, next);
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="search-title">
      <h1 id="search-title" className="sr-only">
        Recherche
      </h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="premium-icon-button bg-card h-11 w-11 shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4.5 w-4.5" aria-hidden />
        </button>
        <label className="border-border bg-card flex h-11 flex-1 items-center gap-2 rounded-[var(--shape-lg)] border px-3 focus-within:border-[var(--border-strong)]">
          <Search className="text-subtle h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">Rechercher une chaîne</span>
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="franc 24, africa nwes, viet tv…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Rechercher une chaîne"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-9 w-9 items-center justify-center"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {!query && recent.length > 0 && (
        <section>
          <h2 className="type-eyebrow text-subtle mb-3">Recherches récentes</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="filter-chip"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}
      {loading ? (
        <ChannelGridSkeleton count={6} />
      ) : error ? (
        <EmptyState
          title="Recherche indisponible"
          description="Le catalogue ne répond pas pour le moment."
        />
      ) : results.length === 0 && countries.length === 0 && categories.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre nom, pays ou catégorie." />
      ) : (
        <div className="space-y-6">
          {results.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="type-eyebrow text-subtle">Chaînes</h2>
                {debouncedQuery && (
                  <span className="text-subtle text-[11px]">Résultats exacts et approchants</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {results.map(({ item, score }) => (
                  <div key={item.id} className="relative">
                    {debouncedQuery && (score ?? 0) > 0.08 && (
                      <span
                        className="absolute top-2 left-2 z-20 rounded-full bg-[var(--warning)] px-1.5 py-0.5 text-[9px] font-black text-black"
                        aria-label="Résultat approchant"
                      >
                        ≈
                      </span>
                    )}
                    <ChannelCard
                      channel={item}
                      isFavorite={has(item.id)}
                      onToggleFavorite={toggle}
                      onOpen={(id) => {
                        remember(query);
                        watch(id);
                      }}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          <ResultChips
            title="Pays"
            items={countries}
            onSelect={(value) => openExplorer({ country: value })}
          />
          <ResultChips
            title="Catégories"
            items={categories}
            onSelect={(value) => {
              if (CATALOG_CATEGORIES.includes(value as (typeof CATALOG_CATEGORIES)[number])) {
                openExplorer({ category: value as (typeof CATALOG_CATEGORIES)[number] });
              }
            }}
          />
        </div>
      )}
    </section>
  );
}

function ResultChips({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="type-eyebrow text-subtle mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className="filter-chip"
            onClick={() => onSelect(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
