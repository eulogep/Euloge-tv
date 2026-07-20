"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useCatalog } from "../presentation/use-catalog";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGrid } from "@/components/layout/ChannelGrid";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Search, X, ChevronDown, Loader2, ArrowLeft, House, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogCategory, CatalogQuery } from "../domain/types";

const DEFAULT_LIMIT = 40;

export function ChannelsView() {
  const watch = useAppStore((s) => s.watch);
  const initialFilters = useAppStore((s) =>
    s.view.view === "channels" ? s.view.filters : undefined,
  );
  const explorerContext = useAppStore((s) =>
    s.view.view === "channels" ? s.view.context : undefined,
  );
  const replaceExplorerFilters = useAppStore((s) => s.replaceExplorerFilters);
  const goBack = useAppStore((s) => s.goBack);
  const goHome = useAppStore((s) => s.goHome);
  const { has, toggle } = useFavorites();
  const [q, setQ] = useState(initialFilters?.q ?? "");
  const [country, setCountry] = useState(initialFilters?.country ?? "");
  const [category, setCategory] = useState(initialFilters?.category ?? "");
  const [language, setLanguage] = useState(initialFilters?.language ?? "");
  const [availability, setAvailability] = useState(initialFilters?.availability ?? "");
  const [sort, setSort] = useState<NonNullable<CatalogQuery["sort"]>>(
    initialFilters?.sort ?? "quality",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(initialFilters?.q ?? "");

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    replaceExplorerFilters({
      q: debouncedQ || undefined,
      country: country || undefined,
      category: (category as CatalogCategory) || undefined,
      language: language || undefined,
      availability: (availability as CatalogQuery["availability"]) || undefined,
      sort,
    });
  }, [availability, category, country, debouncedQ, language, replaceExplorerFilters, sort]);

  const { data, items, loading, loadingMore, error, loadMore, refetch } = useCatalog({
    q: debouncedQ,
    country: country || undefined,
    category: category || undefined,
    language: language || undefined,
    availability:
      (availability as "recommended" | "unverified" | "limited" | "blocked") || undefined,
    sort,
    limit: DEFAULT_LIMIT,
  });

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setCountry("");
    setCategory("");
    setLanguage("");
    setAvailability("");
    setSort("quality");
  };

  return (
    <section aria-label="Explorer les chaînes" className="space-y-6">
      <header className="space-y-4">
        {explorerContext?.from === "home" && (
          <button
            type="button"
            onClick={goBack}
            className="premium-button-secondary gap-1 px-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {explorerContext.returnLabel}
          </button>
        )}
        <div>
          <p className="type-eyebrow">Catalogue</p>
          <h1 className="type-title mt-1">Explorer</h1>
          <p className="text-muted mt-2 text-sm leading-6">
            Recherchez dans tout le catalogue sans modifier les univers de l’accueil.
          </p>
        </div>
        <div className="relative">
          <Search
            className="text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une chaîne…"
            aria-label="Rechercher une chaîne"
            className="border-border bg-card h-12 w-full rounded-xl border pr-12 pl-10 text-sm shadow-[var(--shadow-card)] transition-colors duration-[var(--duration-fast)] focus:border-[var(--border-strong)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="premium-icon-button absolute top-1/2 right-1 h-11 w-11 -translate-y-1/2"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="premium-button-secondary gap-1 px-4 text-sm"
          aria-expanded={filtersOpen}
        >
          Filtres
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")}
          />
        </button>
        {filtersOpen && data && (
          <div className="premium-surface grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect
              label="Pays"
              value={country}
              onChange={setCountry}
              options={data.filters.countries}
            />
            <FilterSelect
              label="Catégorie"
              value={category}
              onChange={setCategory}
              options={data.filters.categories}
            />
            <FilterSelect
              label="Langue"
              value={language}
              onChange={setLanguage}
              options={data.filters.languages}
            />
            <FilterSelect
              label="Disponibilité"
              value={availability}
              onChange={setAvailability}
              options={[
                { value: "recommended", label: "Source recommandée", count: data.total },
                { value: "unverified", label: "Non vérifiée", count: data.total },
                { value: "limited", label: "Limitée", count: data.total },
                { value: "blocked", label: "Bloquée", count: data.total },
              ]}
              showCounts={false}
            />
            <FilterSelect
              label="Tri"
              value={sort}
              onChange={(value) => setSort(value as "quality" | "name" | "country")}
              options={[
                { value: "quality", label: "Qualité du catalogue", count: data.total },
                { value: "name", label: "Nom", count: data.total },
                { value: "country", label: "Pays", count: data.total },
              ]}
              showAll={false}
              showCounts={false}
            />
          </div>
        )}
      </header>

      {loading ? (
        <ChannelGridSkeleton count={12} />
      ) : error ? (
        <div
          role="alert"
          className="premium-surface flex min-h-[40vh] flex-col items-center justify-center gap-4 p-5 text-center"
          data-system-state="error"
        >
          <div>
            <h2 className="text-lg font-semibold">Impossible de charger le catalogue</h2>
            <p className="text-muted mx-auto mt-1 max-w-lg text-sm">{error.message}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={refetch}
              className="premium-button-primary gap-2 px-4 text-sm"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Réessayer
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="premium-button-secondary px-4 text-sm"
            >
              Réinitialiser les filtres
            </button>
            <button
              type="button"
              onClick={goHome}
              className="premium-button-secondary gap-2 px-4 text-sm"
            >
              <House className="h-4 w-4" aria-hidden /> Retour à l’accueil
            </button>
          </div>
          {error.technicalDetails && (
            <details className="text-muted max-w-full text-left text-xs">
              <summary className="cursor-pointer text-center">Détails techniques</summary>
              <pre className="bg-background mt-2 max-w-full overflow-x-auto rounded-lg p-3 whitespace-pre-wrap">
                {error.code}: {error.technicalDetails}
              </pre>
            </details>
          )}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aucune chaîne trouvée"
          description="Essayez de modifier votre recherche ou vos filtres."
        />
      ) : (
        <>
          <ChannelGrid
            items={items.map((c) => (
              <ChannelCard
                key={c.id}
                channel={c}
                isFavorite={has(c.id)}
                onToggleFavorite={toggle}
                onOpen={watch}
              />
            ))}
          />
          {data?.nextCursor && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="premium-button-secondary gap-2 px-5 text-sm"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Chargement…" : "Afficher plus"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
  showAll = true,
  showCounts = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; count: number }[];
  showAll?: boolean;
  showCounts?: boolean;
}) => {
  const controlId = `catalog-filter-${label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1 text-xs">
      <label htmlFor={controlId} className="text-muted font-medium">
        {label}
      </label>
      <select
        id={controlId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-card h-11 rounded-lg border px-3 text-sm transition-colors duration-[var(--duration-fast)] focus:border-[var(--border-strong)]"
      >
        {showAll && <option value="">Tous</option>}
        {options.slice(0, 60).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {showCounts ? ` (${o.count})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
};
