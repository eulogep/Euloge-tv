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

  it("preserves preferred country/language when string", () => {
    const s = migrateSettings({ preferredCountry: "FR", preferredLanguage: "fra" });
    expect(s.preferredCountry).toBe("FR");
    expect(s.preferredLanguage).toBe("fra");
  });

  it("handles null preferred values", () => {
    const s = migrateSettings({ preferredCountry: null, preferredLanguage: null });
    expect(s.preferredCountry).toBeNull();
    expect(s.preferredLanguage).toBeNull();
  });
});
