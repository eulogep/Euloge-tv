import type {
  EditorialLocalState,
  EditorialPreferences,
  EditorialSection,
  EditorialSectionDefinition,
} from "../domain/editorial";
import type { CatalogCategory, ChannelSummary, SourceAvailabilityStatus } from "../domain/types";

const SECTION_LIMIT = 12;

export const DEFAULT_EDITORIAL_SECTIONS: readonly EditorialSectionDefinition[] = [
  {
    id: "for-you",
    title: "Pour vous",
    subtitle: "Une sélection équilibrée selon vos préférences.",
    primaryCategory: null,
    priority: 10,
    maxItems: SECTION_LIMIT,
    visualVariant: "neutral",
    emptyBehavior: "hide",
  },
  {
    id: "popular-country",
    title: "Chaînes populaires dans votre pays",
    subtitle: "Les chaînes les mieux renseignées pour votre pays préféré.",
    primaryCategory: null,
    optionalCountry: null,
    priority: 20,
    maxItems: SECTION_LIMIT,
    visualVariant: "neutral",
    emptyBehavior: "hide",
  },
  {
    id: "news",
    title: "Actualités",
    subtitle: "Information en direct et regards sur le monde.",
    primaryCategory: "news",
    priority: 30,
    maxItems: SECTION_LIMIT,
    visualVariant: "news",
    emptyBehavior: "hide",
  },
  {
    id: "entertainment",
    title: "Divertissement",
    subtitle: "Émissions, spectacles et chaînes généralistes.",
    primaryCategory: "entertainment",
    priority: 40,
    maxItems: SECTION_LIMIT,
    visualVariant: "entertainment",
    emptyBehavior: "hide",
  },
  {
    id: "music",
    title: "Musique",
    subtitle: "Clips, concerts et radios musicales en direct.",
    primaryCategory: "music",
    priority: 50,
    maxItems: SECTION_LIMIT,
    visualVariant: "music",
    emptyBehavior: "hide",
  },
  {
    id: "sports",
    title: "Sports",
    subtitle: "Chaînes sportives et rendez-vous en direct.",
    primaryCategory: "sports",
    priority: 60,
    maxItems: SECTION_LIMIT,
    visualVariant: "entertainment",
    emptyBehavior: "hide",
  },
  {
    id: "kids",
    title: "Jeunesse",
    subtitle: "Des programmes adaptés aux plus jeunes.",
    primaryCategory: "kids",
    priority: 70,
    maxItems: SECTION_LIMIT,
    visualVariant: "kids",
    emptyBehavior: "hide",
  },
  {
    id: "animation",
    title: "Animation",
    subtitle: "Séries animées et univers illustrés.",
    primaryCategory: "animation",
    priority: 80,
    maxItems: SECTION_LIMIT,
    visualVariant: "animation",
    emptyBehavior: "hide",
  },
  {
    id: "anime",
    title: "Anime",
    subtitle: "Chaînes consacrées à l’animation japonaise.",
    primaryCategory: "anime",
    priority: 90,
    maxItems: SECTION_LIMIT,
    visualVariant: "animation",
    emptyBehavior: "hide",
  },
  {
    id: "documentaries",
    title: "Documentaires",
    subtitle: "Sciences, nature, histoire et découverte.",
    primaryCategory: "documentaries",
    priority: 100,
    maxItems: SECTION_LIMIT,
    visualVariant: "documentaries",
    emptyBehavior: "hide",
  },
  {
    id: "culture",
    title: "Culture",
    subtitle: "Arts, patrimoine et idées en mouvement.",
    primaryCategory: "culture",
    priority: 110,
    maxItems: SECTION_LIMIT,
    visualVariant: "culture",
    emptyBehavior: "hide",
  },
  {
    id: "religious",
    title: "Religion",
    subtitle: "Cultes, spiritualités et traditions.",
    primaryCategory: "religious",
    priority: 120,
    maxItems: SECTION_LIMIT,
    visualVariant: "culture",
    emptyBehavior: "hide",
  },
  {
    id: "local",
    title: "Chaînes locales",
    subtitle: "La vie des régions et des territoires.",
    primaryCategory: "local",
    optionalCountry: null,
    priority: 130,
    maxItems: SECTION_LIMIT,
    visualVariant: "neutral",
    emptyBehavior: "hide",
  },
  {
    id: "international",
    title: "International",
    subtitle: "Des chaînes et des points de vue venus d’ailleurs.",
    primaryCategory: "international",
    priority: 140,
    maxItems: SECTION_LIMIT,
    visualVariant: "international",
    emptyBehavior: "hide",
  },
  {
    id: "radio",
    title: "Radios",
    subtitle: "Stations et programmes audio en direct.",
    primaryCategory: "radio",
    priority: 150,
    maxItems: SECTION_LIMIT,
    visualVariant: "music",
    emptyBehavior: "hide",
  },
  {
    id: "my-list",
    title: "Ma liste",
    subtitle: "Les chaînes que vous avez mises de côté.",
    primaryCategory: null,
    priority: 160,
    maxItems: SECTION_LIMIT,
    visualVariant: "neutral",
    emptyBehavior: "hide",
  },
  {
    id: "recent",
    title: "Regardées récemment",
    subtitle: "Reprenez rapidement là où vous vous étiez arrêté.",
    primaryCategory: null,
    priority: 170,
    maxItems: SECTION_LIMIT,
    visualVariant: "neutral",
    emptyBehavior: "hide",
  },
] as const;

const compatibilityScore: Record<ChannelSummary["bestCompatibility"], number> = {
  preferred: 24,
  "native-only": 20,
  unknown: 0,
  limited: -20,
  blocked: -60,
};

const availabilityScore: Record<SourceAvailabilityStatus, number> = {
  playable: 40,
  checking: 2,
  unknown: 0,
  timeout: -12,
  network_error: -14,
  temporarily_unavailable: -20,
  forbidden_or_restricted: -35,
  unsupported_format: -45,
  invalid_url: -60,
};

const channelScore = (
  channel: ChannelSummary,
  definition: EditorialSectionDefinition,
  preferences: EditorialPreferences,
): number => {
  let score = availabilityScore[channel.bestAvailability ?? "unknown"];
  score += compatibilityScore[channel.bestCompatibility];
  score += Math.min(channel.streamCount, 4) * 2;
  if (channel.logoUrl) score += 3;
  if (definition.primaryCategory === channel.primaryCategory) score += 45;
  if (preferences.favoriteCategories.includes(channel.primaryCategory)) score += 18;
  if (preferences.preferredCountry && channel.countryCode === preferences.preferredCountry) {
    score += 14;
  }
  score +=
    channel.languageCodes.filter((language) => preferences.preferredLanguages.includes(language))
      .length * 10;
  if (definition.optionalTags?.some((tag) => channel.tags.includes(tag))) score += 6;
  return score;
};

const channelMatchesSection = (
  channel: ChannelSummary,
  definition: EditorialSectionDefinition,
  preferences: EditorialPreferences,
  localState: EditorialLocalState,
): boolean => {
  if (channel.streamCount <= 0) return false;
  if (definition.id === "my-list") return localState.myListChannelIds.includes(channel.id);
  if (definition.id === "recent") {
    return localState.history.some((entry) => entry.channelId === channel.id);
  }
  if (definition.id === "for-you") return true;
  if (definition.id === "popular-country") {
    return !!preferences.preferredCountry && channel.countryCode === preferences.preferredCountry;
  }
  if (definition.id === "international") {
    return (
      channel.primaryCategory === "international" ||
      (!!preferences.preferredCountry && channel.countryCode !== preferences.preferredCountry)
    );
  }
  if (definition.primaryCategory && channel.primaryCategory !== definition.primaryCategory) {
    return false;
  }
  if (definition.optionalCountry && channel.countryCode !== definition.optionalCountry)
    return false;
  if (definition.optionalLanguage && !channel.languageCodes.includes(definition.optionalLanguage)) {
    return false;
  }
  return true;
};

const localOrder = (
  definition: EditorialSectionDefinition,
  localState: EditorialLocalState,
): Map<string, number> | null => {
  const ids =
    definition.id === "my-list"
      ? localState.myListChannelIds
      : definition.id === "recent"
        ? localState.history.map((entry) => entry.channelId)
        : null;
  return ids ? new Map(ids.map((id, index) => [id, index])) : null;
};

const materializeDefinitions = (
  channels: readonly ChannelSummary[],
  preferences: EditorialPreferences,
): EditorialSectionDefinition[] => {
  const preferredLanguage = preferences.preferredLanguages[0] ?? null;
  return DEFAULT_EDITORIAL_SECTIONS.map((definition) => ({
    ...definition,
    ...(definition.id === "popular-country" || definition.id === "local"
      ? { optionalCountry: preferences.preferredCountry }
      : {}),
    ...(definition.id === "for-you" ? { optionalLanguage: preferredLanguage } : {}),
    priority:
      definition.priority -
      (definition.primaryCategory &&
      preferences.favoriteCategories.includes(definition.primaryCategory)
        ? 60
        : 0) -
      (definition.id === "popular-country" && preferences.preferredCountry ? 8 : 0) -
      (definition.primaryCategory &&
      channels.some(
        (channel) =>
          channel.primaryCategory === definition.primaryCategory &&
          channel.languageCodes.some((language) =>
            preferences.preferredLanguages.includes(language),
          ),
      )
        ? 4
        : 0),
  })).sort((left, right) => left.priority - right.priority);
};

export const buildEditorialSections = (
  channels: readonly ChannelSummary[],
  preferences: EditorialPreferences,
  localState: EditorialLocalState,
): EditorialSection[] => {
  const definitions = materializeDefinitions(channels, preferences);
  const appearanceCount = new Map<string, number>();
  let previousIds = new Set<string>();
  const sections: EditorialSection[] = [];

  for (const definition of definitions) {
    const order = localOrder(definition, localState);
    const candidates = channels
      .filter((channel) => channelMatchesSection(channel, definition, preferences, localState))
      .sort((left, right) => {
        if (order) {
          const leftIndex = order.get(left.id) ?? Number.MAX_SAFE_INTEGER;
          const rightIndex = order.get(right.id) ?? Number.MAX_SAFE_INTEGER;
          if (leftIndex !== rightIndex) return leftIndex - rightIndex;
        }
        return (
          channelScore(right, definition, preferences) -
            channelScore(left, definition, preferences) || left.name.localeCompare(right.name)
        );
      });

    const isPersonalSection = definition.id === "my-list" || definition.id === "recent";
    const fresh = candidates.filter(
      (channel) => !previousIds.has(channel.id) && (appearanceCount.get(channel.id) ?? 0) < 2,
    );
    const selected = (isPersonalSection ? candidates : fresh).slice(0, definition.maxItems);

    if (selected.length < definition.maxItems) {
      const overlapLimit = Math.max(1, Math.floor(definition.maxItems / 4));
      const overlap = candidates
        .filter((channel) => !selected.some((item) => item.id === channel.id))
        .slice(0, Math.min(overlapLimit, definition.maxItems - selected.length));
      selected.push(...overlap);
    }

    if (selected.length === 0 && definition.emptyBehavior === "hide") continue;
    for (const channel of selected) {
      appearanceCount.set(channel.id, (appearanceCount.get(channel.id) ?? 0) + 1);
    }
    previousIds = new Set(selected.map((channel) => channel.id));
    sections.push({ ...definition, items: selected });
  }

  return sections;
};

export const sectionCategory = (
  section: Pick<EditorialSectionDefinition, "id" | "primaryCategory">,
): CatalogCategory | null => section.primaryCategory;
