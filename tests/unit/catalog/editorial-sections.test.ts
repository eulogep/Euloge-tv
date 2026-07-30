import { describe, expect, it } from "vitest";
import { buildEditorialSections } from "@/features/catalog/application/editorial-sections";
import type { CatalogCategory, ChannelSummary } from "@/features/catalog/domain/types";

const channel = (
  id: string,
  category: CatalogCategory,
  countryCode = "FR",
  overrides: Partial<ChannelSummary> = {},
): ChannelSummary => ({
  id,
  name: id,
  alternativeNames: [],
  countryCode,
  countryName: countryCode === "FR" ? "France" : "United States",
  countryFlag: null,
  languageCodes: countryCode === "FR" ? ["fra"] : ["eng"],
  primaryCategory: category,
  categories: [category],
  tags: [],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streamCount: 1,
  bestCompatibility: "preferred",
  bestAvailability: "unknown",
  ...overrides,
});

const preferences = {
  preferredCountry: "FR",
  preferredLanguages: ["fra"],
  favoriteCategories: [] as CatalogCategory[],
};

const localState = { myListChannelIds: [] as string[], history: [] as { channelId: string }[] };

describe("editorial sections", () => {
  it("generates populated default sections and hides empty sections", () => {
    const sections = buildEditorialSections(
      [channel("info", "news"), channel("music", "music")],
      preferences,
      localState,
    );

    expect(sections.map((section) => section.id)).toContain("for-you");
    expect(sections.map((section) => section.id)).toContain("news");
    expect(sections.map((section) => section.id)).toContain("music");
    expect(sections.map((section) => section.id)).not.toContain("documentaries");
    expect(sections.every((section) => section.items.length > 0)).toBe(true);
  });

  it("puts the preferred-country section near the beginning", () => {
    const sections = buildEditorialSections(
      [channel("fr", "news", "FR"), channel("us", "news", "US")],
      preferences,
      localState,
    );

    const countryIndex = sections.findIndex((section) => section.id === "popular-country");
    expect(countryIndex).toBeGreaterThanOrEqual(0);
    expect(countryIndex).toBeLessThanOrEqual(2);
    expect(sections[countryIndex].items.every((item) => item.countryCode === "FR")).toBe(true);
  });

  it("raises favorite categories above the generic selection", () => {
    const sections = buildEditorialSections(
      [channel("info", "news"), channel("song", "music")],
      { ...preferences, preferredLanguages: [], favoriteCategories: ["music"] },
      localState,
    );

    expect(sections.findIndex((section) => section.id === "music")).toBeLessThan(
      sections.findIndex((section) => section.id === "for-you"),
    );
  });

  it("prioritizes known playable sources over unverified ones", () => {
    const sections = buildEditorialSections(
      [
        channel("unknown", "news"),
        channel("playable", "news", "FR", { bestAvailability: "playable" }),
      ],
      preferences,
      localState,
    );

    expect(sections.find((section) => section.id === "news")?.items[0].id).toBe("playable");
  });

  it("avoids excessive duplicates between neighboring sections", () => {
    const catalog = Array.from({ length: 20 }, (_, index) =>
      channel(`news-${index}`, "news", index % 2 === 0 ? "FR" : "US"),
    );
    const sections = buildEditorialSections(catalog, preferences, localState);

    for (let index = 1; index < sections.length; index += 1) {
      const previous = new Set(sections[index - 1].items.map((item) => item.id));
      const overlap = sections[index].items.filter((item) => previous.has(item.id));
      expect(overlap.length).toBeLessThanOrEqual(
        Math.max(1, Math.floor(sections[index].maxItems / 4)),
      );
    }
  });

  it("preserves every catalog entry stored in Ma liste", () => {
    const catalog = [channel("saved-a", "news"), channel("saved-b", "music")];
    const sections = buildEditorialSections(catalog, preferences, {
      ...localState,
      myListChannelIds: ["saved-b", "saved-a"],
    });

    expect(
      sections.find((section) => section.id === "my-list")?.items.map((item) => item.id),
    ).toEqual(["saved-b", "saved-a"]);
  });

  it("blocks archived entries from Ma liste, history and recommendation sections", () => {
    const archived = channel("archived", "news", "FR", {
      health: {
        status: "archived",
        checkedAt: null,
        sourceCount: 1,
        playableSourceCount: 0,
        reasonCode: "manual_archive",
        reasonMessage: "archived",
      },
    });
    const sections = buildEditorialSections([archived], preferences, {
      myListChannelIds: ["archived"],
      history: [{ channelId: "archived" }],
    });

    expect(sections.flatMap((section) => section.items)).not.toContainEqual(archived);
  });

  it("excludes stale healthy entries with no streams from recommendation sections", () => {
    const staleHealthy = channel("stale-healthy", "news", "FR", {
      streamCount: 0,
      health: {
        status: "healthy",
        checkedAt: null,
        sourceCount: 0,
        playableSourceCount: 0,
        reasonCode: "stale_health",
        reasonMessage: "stale",
      },
    });

    const sections = buildEditorialSections([staleHealthy], preferences, localState);

    expect(sections.flatMap((section) => section.items)).not.toContainEqual(staleHealthy);
  });
});
