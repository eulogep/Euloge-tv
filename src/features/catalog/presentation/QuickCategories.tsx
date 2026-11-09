"use client";

import type { CSSProperties } from "react";
import {
  Baby,
  BookOpen,
  Clapperboard,
  Film,
  Globe2,
  Music2,
  Newspaper,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { CatalogCategory } from "../domain/types";
import { categoryLabelFr } from "../application/taxonomy";
import { mireStyle } from "@/features/meridian/domain/mire";

type QuickCategory = { category: CatalogCategory; icon: LucideIcon; accent: string };

const QUICK_CATEGORIES: readonly QuickCategory[] = [
  { category: "news", icon: Newspaper, accent: "var(--category-news)" },
  { category: "sports", icon: Trophy, accent: "var(--category-sports)" },
  { category: "music", icon: Music2, accent: "var(--category-music)" },
  { category: "movies", icon: Film, accent: "var(--category-entertainment)" },
  { category: "entertainment", icon: Clapperboard, accent: "var(--category-entertainment)" },
  { category: "kids", icon: Baby, accent: "var(--category-kids)" },
  { category: "documentaries", icon: BookOpen, accent: "var(--category-documentaries)" },
  { category: "international", icon: Globe2, accent: "var(--category-international)" },
];

/** One-tap shortcuts into the explorer, shown right under the hero. */
export function QuickCategories({ onSelect }: { onSelect: (category: CatalogCategory) => void }) {
  return (
    <nav aria-label="Catégories rapides" data-testid="quick-categories">
      <ul className="no-scrollbar -mx-[var(--space-page-x)] flex gap-2.5 overflow-x-auto px-[var(--space-page-x)] py-1">
        {QUICK_CATEGORIES.map(({ category, icon: Icon, accent }) => (
          <li key={category} className="shrink-0">
            <button
              type="button"
              className="quick-chip"
              style={{ "--chip-accent": accent } as CSSProperties}
              onClick={() => onSelect(category)}
              aria-label={`Parcourir la catégorie ${categoryLabelFr(category)}`}
            >
              <span className="md-chip-swatch" style={mireStyle(category, category)} aria-hidden />
              <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden />
              {categoryLabelFr(category)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
