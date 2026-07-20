import { describe, expect, it } from "vitest";
import { buildCatalogSearchParams } from "@/features/catalog/presentation/use-catalog";

describe("buildCatalogSearchParams", () => {
  it("serializes a query without filters", () => {
    expect(buildCatalogSearchParams({ limit: 40 })).toBe("sort=quality&limit=40");
  });

  it("serializes a category filter", () => {
    expect(buildCatalogSearchParams({ category: "news", limit: 40 })).toBe(
      "category=news&sort=quality&limit=40",
    );
  });

  it("serializes an availability filter", () => {
    expect(buildCatalogSearchParams({ availability: "recommended", limit: 40 })).toBe(
      "availability=recommended&sort=quality&limit=40",
    );
  });

  it("serializes several filters in a stable order", () => {
    expect(
      buildCatalogSearchParams({
        q: "France 24",
        country: "FR",
        category: "news",
        language: "fra",
        availability: "recommended",
        sort: "name",
        limit: 20,
      }),
    ).toBe(
      "q=France+24&country=FR&category=news&language=fra&availability=recommended&sort=name&limit=20",
    );
  });

  it("omits empty optional values", () => {
    const params = buildCatalogSearchParams({
      q: "  ",
      country: "",
      category: "",
      language: "",
      limit: 40,
    });

    expect(params).toBe("sort=quality&limit=40");
    expect(params).not.toMatch(/(?:q|country|category|language|availability|source)=/);
  });

  it("encodes Unicode characters", () => {
    expect(buildCatalogSearchParams({ q: "Télé Québec", limit: 40 })).toBe(
      "q=T%C3%A9l%C3%A9+Qu%C3%A9bec&sort=quality&limit=40",
    );
  });

  it("trims useful values and encodes spaces", () => {
    expect(buildCatalogSearchParams({ q: "  BBC World  ", limit: 40 })).toBe(
      "q=BBC+World&sort=quality&limit=40",
    );
  });

  it("encodes the cursor through URLSearchParams", () => {
    expect(buildCatalogSearchParams({ limit: 40 }, "next/page?country=FR&offset=40")).toBe(
      "sort=quality&limit=40&cursor=next%2Fpage%3Fcountry%3DFR%26offset%3D40",
    );
  });

  it("serializes the optional source", () => {
    expect(buildCatalogSearchParams({ source: "iptv-org", limit: 40 })).toBe(
      "source=iptv-org&sort=quality&limit=40",
    );
  });

  it("preserves valid sort and limit values", () => {
    expect(buildCatalogSearchParams({ sort: "country", limit: 100 })).toBe(
      "sort=country&limit=100",
    );
  });
});
