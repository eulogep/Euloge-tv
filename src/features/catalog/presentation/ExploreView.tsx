"use client";

import { useAppStore } from "@/lib/utils/app-store";
import { CATALOG_CATEGORIES, categoryLabelFr } from "../application/taxonomy";
import { useCatalog } from "./use-catalog";

const CATEGORY_COLORS = [
  "var(--category-news)",
  "var(--category-sports)",
  "var(--category-music)",
  "var(--category-documentaries)",
  "var(--category-entertainment)",
  "var(--category-international)",
];

export function ExploreView() {
  const openExplorer = useAppStore((state) => state.openExplorer);
  const { data, loading } = useCatalog({ limit: 1, sort: "quality" });
  const categories = (data?.filters.categories ?? [])
    .filter((item) =>
      CATALOG_CATEGORIES.includes(item.value as (typeof CATALOG_CATEGORIES)[number]),
    )
    .slice(0, 10);

  return (
    <section className="space-y-7" aria-labelledby="explore-title">
      <header>
        <h1 id="explore-title" className="type-title">
          Explorer
        </h1>
        <p className="text-muted mt-2 text-sm">
          Parcourez le catalogue par catégorie, pays ou langue.
        </p>
      </header>

      <BrowseSection title="Par catégorie">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {(loading
            ? Array.from({ length: 6 }, (_, index) => ({
                value: String(index),
                label: "",
                count: 0,
              }))
            : categories
          ).map((item, index) => (
            <button
              key={item.value}
              type="button"
              disabled={loading}
              onClick={() =>
                openExplorer({ category: item.value as (typeof CATALOG_CATEGORIES)[number] })
              }
              className="border-border bg-card flex min-h-12 items-center gap-2.5 rounded-[var(--shape-lg)] border px-3 text-left text-xs font-bold transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--state-hover)] disabled:animate-pulse disabled:opacity-50"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                aria-hidden
              />
              <span>
                {loading ? " " : categoryLabelFr(item.value as (typeof CATALOG_CATEGORIES)[number])}
              </span>
            </button>
          ))}
        </div>
      </BrowseSection>

      <BrowseSection title="Par pays">
        <ChipList
          items={data?.filters.countries.slice(0, 16) ?? []}
          loading={loading}
          onSelect={(value) => openExplorer({ country: value })}
        />
      </BrowseSection>
      <BrowseSection title="Par langue">
        <ChipList
          items={data?.filters.languages.slice(0, 14) ?? []}
          loading={loading}
          onSelect={(value) => openExplorer({ language: value })}
        />
      </BrowseSection>
    </section>
  );
}

function BrowseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="type-eyebrow text-subtle mb-3">{title}</h2>
      {children}
    </section>
  );
}

function ChipList({
  items,
  loading,
  onSelect,
}: {
  items: { value: string; label: string }[];
  loading: boolean;
  onSelect: (value: string) => void;
}) {
  if (loading) return <div className="bg-card h-10 w-full animate-pulse rounded-full" />;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onSelect(item.value)}
          className="border-border bg-card min-h-10 rounded-full border px-4 text-xs font-bold text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
