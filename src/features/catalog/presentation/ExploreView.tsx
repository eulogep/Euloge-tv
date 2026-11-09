"use client";

import type { CSSProperties } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAppStore } from "@/lib/utils/app-store";
import { CATALOG_CATEGORIES, categoryLabelFr } from "../application/taxonomy";
import { categoryStyle } from "./category-style";
import { languageDisplayName } from "./display-names";
import { useCatalog } from "./use-catalog";
import { DiscoveryPassport } from "./DiscoveryPassport";
import { mireStyle } from "@/features/meridian/domain/mire";

import { JourneyNotebook } from "@/features/journeys/presentation/JourneyNotebook";

type FilterItem = { value: string; label: string; count?: number };

export function ExploreView() {
  const openExplorer = useAppStore((state) => state.openExplorer);
  const { data, loading, error } = useCatalog({ limit: 1, sort: "quality" });
  const categories = (data?.filters.categories ?? [])
    .filter((item) =>
      CATALOG_CATEGORIES.includes(item.value as (typeof CATALOG_CATEGORIES)[number]),
    )
    .slice(0, 12);

  return (
    <section className="space-y-8" aria-labelledby="explore-title">
      <header className="md-page-header">
        <p className="md-kicker">Guide des fréquences</p>
        <h1 id="explore-title" className="type-title">
          Explorer
        </h1>
        <p className="text-muted mt-2 text-sm">
          Toutes les télévisions du catalogue, là où elles émettent, dans la lumière de cette
          minute.
        </p>
      </header>

      {error ? (
        <EmptyState
          title="Exploration indisponible"
          description="Le catalogue ne répond pas pour le moment."
        />
      ) : (
        <>
          <DiscoveryPassport countries={data?.filters.countries ?? []} loading={loading} />
          <BrowseSection title="Par catégorie">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {(loading
                ? Array.from({ length: 8 }, (_, index) => ({
                    value: String(index),
                    label: "",
                    count: 0,
                  }))
                : categories
              ).map((item) => {
                const category = item.value as (typeof CATALOG_CATEGORIES)[number];
                const style = loading ? null : categoryStyle(category);
                const Icon = style?.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={loading}
                    onClick={() => openExplorer({ category })}
                    style={{ "--chip-accent": style?.accent } as CSSProperties}
                    className="quick-chip !min-h-14 !justify-start !px-3 text-left text-xs disabled:animate-pulse disabled:opacity-50"
                  >
                    {!loading && (
                      <span
                        className="md-chip-swatch"
                        style={mireStyle(category, category)}
                        aria-hidden
                      />
                    )}
                    {Icon && (
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: style?.accent }}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {loading ? " " : categoryLabelFr(category)}
                    </span>
                    {!loading && typeof item.count === "number" && (
                      <span
                        className="text-subtle text-[11px] font-semibold tabular-nums"
                        aria-hidden
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </BrowseSection>

          <BrowseSection title="Par langue">
            <ChipList
              items={(data?.filters.languages.slice(0, 14) ?? []).map((item) => ({
                ...item,
                label: languageDisplayName(item.value, item.label),
              }))}
              loading={loading}
              onSelect={(value) => openExplorer({ language: value })}
            />
          </BrowseSection>
        </>
      )}
      <JourneyNotebook />
    </section>
  );
}

function BrowseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="md-kicker mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ChipList({
  items,
  loading,
  onSelect,
}: {
  items: FilterItem[];
  loading: boolean;
  onSelect: (value: string) => void;
}) {
  if (loading) return <div className="bg-card h-10 w-full animate-pulse rounded-full" />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className="border-border bg-card inline-flex min-h-10 items-center gap-1.5 rounded-sm border px-4 text-xs font-bold text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--state-hover)] hover:text-[var(--foreground)]"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
