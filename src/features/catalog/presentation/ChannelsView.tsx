"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/utils/app-store";
import { useFavorites } from "@/features/favorites/favorites";
import { useCatalog } from "../presentation/use-catalog";
import { ChannelCard } from "@/components/layout/ChannelCard";
import { ChannelGrid } from "@/components/layout/ChannelGrid";
import { ChannelGridSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Search, X, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 40;

export function ChannelsView() {
  const watch = useAppStore((s) => s.watch);
  const { has, toggle } = useFavorites();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, items, loading, loadingMore, error, loadMore } = useCatalog({
    q: debouncedQ,
    country: country || undefined,
    category: category || undefined,
    language: language || undefined,
    limit: DEFAULT_LIMIT,
  });

  return (
    <section aria-label="Catalogue des chaînes" className="space-y-4">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">Chaînes</h1>
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
            className="border-border bg-surface h-11 w-full rounded-full border pr-10 pl-10 text-sm outline-none focus:border-[var(--accent)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-muted hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="text-muted hover:text-foreground flex items-center gap-1 text-sm"
          aria-expanded={filtersOpen}
        >
          Filtres
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")}
          />
        </button>
        {filtersOpen && data && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
          </div>
        )}
      </header>

      {loading ? (
        <ChannelGridSkeleton count={12} />
      ) : error ? (
        <EmptyState title="Catalogue indisponible" description={error} />
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
                className="border-border hover:bg-surface-elevated inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50"
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; count: number }[];
}) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="text-muted font-medium">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-border bg-surface h-10 rounded-lg border px-2 text-sm outline-none focus:border-[var(--accent)]"
    >
      <option value="">Tous</option>
      {options.slice(0, 60).map((o) => (
        <option key={o.value} value={o.value}>
          {o.label} ({o.count})
        </option>
      ))}
    </select>
  </label>
);
