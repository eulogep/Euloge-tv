import type { CatalogCategory, ChannelSummary } from "./types";

export type EditorialVisualVariant =
  | "news"
  | "entertainment"
  | "music"
  | "kids"
  | "animation"
  | "documentaries"
  | "culture"
  | "international"
  | "neutral";

export type EditorialEmptyBehavior = "hide";

export type EditorialSectionDefinition = {
  id: string;
  title: string;
  subtitle: string;
  primaryCategory: CatalogCategory | null;
  optionalTags?: readonly string[];
  optionalCountry?: string | null;
  optionalLanguage?: string | null;
  priority: number;
  maxItems: number;
  visualVariant: EditorialVisualVariant;
  emptyBehavior: EditorialEmptyBehavior;
};

export type EditorialPreferences = {
  preferredCountry: string | null;
  preferredLanguages: readonly string[];
  favoriteCategories: readonly CatalogCategory[];
};

export type EditorialSection = EditorialSectionDefinition & {
  items: ChannelSummary[];
};

export type EditorialLocalState = {
  myListChannelIds: readonly string[];
  history: readonly { channelId: string }[];
};
