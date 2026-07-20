import type { CatalogCategory } from "../domain/types";

export const CATALOG_CATEGORIES: readonly CatalogCategory[] = [
  "live",
  "news",
  "sports",
  "music",
  "movies",
  "series",
  "kids",
  "animation",
  "anime",
  "documentaries",
  "culture",
  "religious",
  "entertainment",
  "lifestyle",
  "local",
  "international",
  "radio",
  "other",
] as const;

export const CATEGORY_LABELS_FR: Record<CatalogCategory, string> = {
  live: "Direct",
  news: "Actualités",
  sports: "Sports",
  music: "Musique",
  movies: "Films",
  series: "Séries",
  kids: "Jeunesse",
  animation: "Animation",
  anime: "Anime",
  documentaries: "Documentaires",
  culture: "Culture",
  religious: "Religieux",
  entertainment: "Divertissement",
  lifestyle: "Art de vivre",
  local: "Local",
  international: "International",
  radio: "Radio",
  other: "Autre",
};

const CATEGORY_ALIASES: Record<string, CatalogCategory> = {
  live: "live",
  general: "live",
  generalist: "live",
  généraliste: "live",
  news: "news",
  actualité: "news",
  actualités: "news",
  sports: "sports",
  sport: "sports",
  music: "music",
  musique: "music",
  movies: "movies",
  movie: "movies",
  films: "movies",
  film: "movies",
  series: "series",
  séries: "series",
  kids: "kids",
  children: "kids",
  jeunesse: "kids",
  animation: "animation",
  anime: "anime",
  documentaries: "documentaries",
  documentary: "documentaries",
  documentaire: "documentaries",
  documentaires: "documentaries",
  culture: "culture",
  religious: "religious",
  religion: "religious",
  religieux: "religious",
  entertainment: "entertainment",
  divertissement: "entertainment",
  lifestyle: "lifestyle",
  local: "local",
  regional: "local",
  régional: "local",
  international: "international",
  radio: "radio",
  other: "other",
  autre: "other",
};

const normalizeToken = (value: string): string => value.trim().toLocaleLowerCase("fr-FR");

export const normalizeCategory = (value: string): CatalogCategory =>
  CATEGORY_ALIASES[normalizeToken(value)] ?? "other";

export type NormalizedCategories = {
  primaryCategory: CatalogCategory;
  categories: CatalogCategory[];
  tags: string[];
};

export const normalizeCategories = (values: readonly string[]): NormalizedCategories => {
  const categories: CatalogCategory[] = [];
  const tags: string[] = [];

  for (const raw of values) {
    const token = normalizeToken(raw);
    if (!token) continue;
    const category = CATEGORY_ALIASES[token];
    if (category) {
      if (!categories.includes(category)) categories.push(category);
    } else if (!tags.includes(token)) {
      tags.push(token);
    }
  }

  if (categories.length === 0) categories.push("other");
  return {
    primaryCategory: categories[0],
    categories,
    tags,
  };
};

export const categoryLabelFr = (category: CatalogCategory): string => CATEGORY_LABELS_FR[category];
