import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_SETTINGS, migrateSettings } from "@/features/settings/settings";

describe("settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults for empty input", () => {
    const s = migrateSettings(null);
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for partial input", () => {
    const s = migrateSettings({ theme: "light" });
    expect(s.theme).toBe("light");
    expect(s.autoplayLastSource).toBe(false);
    expect(s.diagnosticMode).toBe(false);
  });

  it("coerces invalid theme to default", () => {
    const s = migrateSettings({ theme: "rainbow" });
    expect(s.theme).toBe("system");
  });

  it("recovers from corrupted data", () => {
    const s = migrateSettings("garbage");
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("migrates the legacy preferred language to the new list", () => {
    const s = migrateSettings({ preferredCountry: "FR", preferredLanguage: "fra" });
    expect(s.preferredCountry).toBe("FR");
    expect(s.preferredLanguages).toEqual(["fra"]);
    expect(s.version).toBe(2);
  });

  it("handles null preferred values", () => {
    const s = migrateSettings({ preferredCountry: null, preferredLanguage: null });
    expect(s.preferredCountry).toBeNull();
    expect(s.preferredLanguages).toEqual([]);
  });

  it("keeps valid category preferences and drops unknown values", () => {
    const s = migrateSettings({ favoriteCategories: ["news", "rainbow", "music"] });
    expect(s.favoriteCategories).toEqual(["news", "music"]);
  });
});
