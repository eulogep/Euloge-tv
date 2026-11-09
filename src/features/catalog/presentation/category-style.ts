import {
  Baby,
  BookOpen,
  Clapperboard,
  Film,
  Globe2,
  Home,
  Landmark,
  Layers3,
  Heart,
  MapPin,
  Music2,
  Newspaper,
  Radio,
  Shapes,
  Sparkles,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { CatalogCategory } from "../domain/types";

export type CategoryStyle = { icon: LucideIcon; accent: string };

/** Single source of truth for category colours and icons, shared by Home and Explorer. */
export const CATEGORY_STYLES: Record<CatalogCategory, CategoryStyle> = {
  live: { icon: Radio, accent: "var(--live)" },
  news: { icon: Newspaper, accent: "var(--category-news)" },
  sports: { icon: Trophy, accent: "var(--category-sports)" },
  music: { icon: Music2, accent: "var(--category-music)" },
  movies: { icon: Film, accent: "var(--category-entertainment)" },
  series: { icon: Tv, accent: "var(--category-anime)" },
  kids: { icon: Baby, accent: "var(--category-kids)" },
  animation: { icon: Layers3, accent: "var(--category-animation)" },
  anime: { icon: Sparkles, accent: "var(--category-anime)" },
  documentaries: { icon: BookOpen, accent: "var(--category-documentaries)" },
  culture: { icon: Landmark, accent: "var(--category-culture)" },
  religious: { icon: Heart, accent: "var(--category-religious)" },
  entertainment: { icon: Clapperboard, accent: "var(--category-entertainment)" },
  lifestyle: { icon: Home, accent: "var(--category-culture)" },
  local: { icon: MapPin, accent: "var(--category-neutral)" },
  international: { icon: Globe2, accent: "var(--category-international)" },
  radio: { icon: Radio, accent: "var(--category-music)" },
  other: { icon: Shapes, accent: "var(--category-neutral)" },
};

export const categoryStyle = (category: CatalogCategory): CategoryStyle =>
  CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
