"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage/local";
import { APP_CONFIG } from "@/config/app";
import { CATALOG_CATEGORIES } from "@/features/catalog/application/taxonomy";
import type { CatalogCategory } from "@/features/catalog/domain/types";

const KEY = "mjtv:settings:v1";
const CHANGED_EVENT = "mjtv:settings-changed";

export type ThemeMode = "system" | "dark" | "light";

export type SettingsState = {
  version: 2;
  theme: ThemeMode;
  autoplayLastSource: boolean;
  showIncompatibleHttpStreams: boolean;
  preferredCountry: string | null;
  preferredLanguages: string[];
  favoriteCategories: CatalogCategory[];
  diagnosticMode: boolean;
  reduceAnimations: boolean;
};

export const DEFAULT_SETTINGS: SettingsState = {
  version: 2,
  theme: "system",
  autoplayLastSource: false,
  showIncompatibleHttpStreams: false,
  preferredCountry: APP_CONFIG.defaultCountry,
  preferredLanguages: [APP_CONFIG.defaultLanguage],
  favoriteCategories: [],
  diagnosticMode: APP_CONFIG.enableDebug,
  reduceAnimations: false,
};

export const migrateSettings = (raw: unknown): SettingsState => {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const obj = raw as Record<string, unknown>;
  const theme: ThemeMode =
    typeof obj.theme === "string" && ["system", "dark", "light"].includes(obj.theme)
      ? (obj.theme as ThemeMode)
      : DEFAULT_SETTINGS.theme;
  const preferredLanguages = Array.isArray(obj.preferredLanguages)
    ? [
        ...new Set(
          obj.preferredLanguages.filter((value): value is string => typeof value === "string"),
        ),
      ]
    : typeof obj.preferredLanguage === "string"
      ? [obj.preferredLanguage]
      : obj.preferredLanguage === null
        ? []
        : DEFAULT_SETTINGS.preferredLanguages;
  const favoriteCategories = Array.isArray(obj.favoriteCategories)
    ? obj.favoriteCategories.filter(
        (value): value is CatalogCategory =>
          typeof value === "string" && CATALOG_CATEGORIES.includes(value as CatalogCategory),
      )
    : DEFAULT_SETTINGS.favoriteCategories;
  return {
    ...DEFAULT_SETTINGS,
    version: 2,
    theme,
    ...(typeof obj.autoplayLastSource === "boolean"
      ? { autoplayLastSource: obj.autoplayLastSource }
      : {}),
    ...(typeof obj.showIncompatibleHttpStreams === "boolean"
      ? { showIncompatibleHttpStreams: obj.showIncompatibleHttpStreams }
      : {}),
    ...(typeof obj.preferredCountry === "string" || obj.preferredCountry === null
      ? { preferredCountry: obj.preferredCountry as string | null }
      : {}),
    preferredLanguages,
    favoriteCategories,
    ...(typeof obj.diagnosticMode === "boolean" ? { diagnosticMode: obj.diagnosticMode } : {}),
    ...(typeof obj.reduceAnimations === "boolean"
      ? { reduceAnimations: obj.reduceAnimations }
      : {}),
  };
};

const read = (): SettingsState => migrateSettings(storage.get<unknown>(KEY, DEFAULT_SETTINGS));

const write = (state: SettingsState): void => {
  storage.set(KEY, state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
};

export const updateSetting = <K extends keyof SettingsState>(
  key: K,
  value: SettingsState[K],
): void => {
  write({ ...read(), [key]: value });
  if (key === "diagnosticMode") {
    try {
      window.localStorage.setItem("mjtv:diagnostic", value ? "1" : "0");
    } catch {
      // ignore
    }
  }
};

export const resetSettings = (): void => {
  write(DEFAULT_SETTINGS);
};

export const resetEditorialPreferences = (): void => {
  write({
    ...read(),
    preferredCountry: DEFAULT_SETTINGS.preferredCountry,
    preferredLanguages: DEFAULT_SETTINGS.preferredLanguages,
    favoriteCategories: DEFAULT_SETTINGS.favoriteCategories,
  });
};

export const useSettings = () => {
  const [state, setState] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => setState(read());
    refresh();
    setHydrated(true);
    window.addEventListener(CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => updateSetting(key, value),
    [],
  );
  const reset = useCallback(() => resetSettings(), []);
  const resetPreferences = useCallback(() => resetEditorialPreferences(), []);

  return { state, hydrated, update, reset, resetPreferences };
};
