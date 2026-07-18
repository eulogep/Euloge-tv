"use client";

import { useCallback, useEffect, useState } from "react";
import { storage } from "@/lib/storage/local";
import { APP_CONFIG } from "@/config/app";

const KEY = "mjtv:settings:v1";
const CHANGED_EVENT = "mjtv:settings-changed";

export type ThemeMode = "system" | "dark" | "light";

export type SettingsState = {
  version: 1;
  theme: ThemeMode;
  autoplayLastSource: boolean;
  showIncompatibleHttpStreams: boolean;
  preferredCountry: string | null;
  preferredLanguage: string | null;
  diagnosticMode: boolean;
  reduceAnimations: boolean;
};

export const DEFAULT_SETTINGS: SettingsState = {
  version: 1,
  theme: "system",
  autoplayLastSource: false,
  showIncompatibleHttpStreams: false,
  preferredCountry: APP_CONFIG.defaultCountry,
  preferredLanguage: APP_CONFIG.defaultLanguage,
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
  return {
    ...DEFAULT_SETTINGS,
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
    ...(typeof obj.preferredLanguage === "string" || obj.preferredLanguage === null
      ? { preferredLanguage: obj.preferredLanguage as string | null }
      : {}),
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

  return { state, hydrated, update, reset };
};
