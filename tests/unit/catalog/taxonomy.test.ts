import { describe, expect, it } from "vitest";
import {
  categoryLabelFr,
  normalizeCategories,
  normalizeCategory,
} from "@/features/catalog/application/taxonomy";

describe("catalog taxonomy", () => {
  it("normalizes upstream aliases to canonical categories", () => {
    expect(normalizeCategory("Actualités")).toBe("news");
    expect(normalizeCategory("documentary")).toBe("documentaries");
    expect(normalizeCategory("Généraliste")).toBe("live");
  });

  it("keeps a primary category and secondary tags", () => {
    expect(normalizeCategories(["news", "politique", "local"])).toEqual({
      primaryCategory: "news",
      categories: ["news", "local"],
      tags: ["politique"],
    });
  });

  it("uses other when no reliable category exists", () => {
    expect(normalizeCategories([]).primaryCategory).toBe("other");
  });

  it("provides French labels", () => {
    expect(categoryLabelFr("kids")).toBe("Jeunesse");
    expect(categoryLabelFr("documentaries")).toBe("Documentaires");
  });
});
