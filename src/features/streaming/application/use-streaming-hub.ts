"use client";

import { useCallback, useEffect, useState } from "react";
import type { TbcplCatalog } from "@/features/catalog/infrastructure/tbcpl-client";
import { isSafeExternalUrl, type CustomPortal, type StreamingCategory } from "../domain/platforms";

const PINS_KEY = "mjtv:streaming:pins:v1";
const RECENT_KEY = "mjtv:streaming:recent:v1";
const CUSTOM_KEY = "mjtv:streaming:custom:v1";
const MAX_RECENT = 8;

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or quota exceeded
  }
};

export function useStreamingHub() {
  const [pins, setPins] = useState<string[]>(() => readJson<string[]>(PINS_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => readJson<string[]>(RECENT_KEY, []));
  const [customPortals, setCustomPortals] = useState<CustomPortal[]>(() =>
    readJson<CustomPortal[]>(CUSTOM_KEY, []),
  );
  const [tbcpl, setTbcpl] = useState<TbcplCatalog | null>(null);
  const [loadingPortals, setLoadingPortals] = useState(true);
  const [portalsError, setPortalsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingPortals(true);
      setPortalsError(null);
      try {
        const res = await fetch("/api/tbcpl");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TbcplCatalog;
        if (!cancelled) setTbcpl(data);
      } catch {
        if (!cancelled) setPortalsError("Répertoire communautaire temporairement indisponible.");
      } finally {
        if (!cancelled) setLoadingPortals(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePin = useCallback((id: string) => {
    setPins((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev];
      writeJson(PINS_KEY, next);
      return next;
    });
  }, []);

  const recordLaunch = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, MAX_RECENT);
      writeJson(RECENT_KEY, next);
      return next;
    });
  }, []);

  const addCustomPortal = useCallback(
    (
      name: string,
      url: string,
      category: Exclude<StreamingCategory, "all" | "official" | "custom">,
    ): { ok: true } | { ok: false; error: string } => {
      const cleanName = name.trim();
      const normalizedUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      if (cleanName.length < 2) {
        return { ok: false, error: "Indiquez un nom de plateforme (2 caractères minimum)." };
      }
      if (!isSafeExternalUrl(normalizedUrl)) {
        return { ok: false, error: "Adresse invalide (utilisez https://…)." };
      }
      const portal: CustomPortal = {
        id: `custom:${Date.now().toString(36)}`,
        name: cleanName,
        url: normalizedUrl,
        category,
        addedAt: new Date().toISOString(),
      };
      setCustomPortals((prev) => {
        const next = [portal, ...prev];
        writeJson(CUSTOM_KEY, next);
        return next;
      });
      return { ok: true };
    },
    [],
  );

  const removeCustomPortal = useCallback((id: string) => {
    setCustomPortals((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeJson(CUSTOM_KEY, next);
      return next;
    });
    setPins((prev) => {
      if (!prev.includes(id)) return prev;
      const next = prev.filter((item) => item !== id);
      writeJson(PINS_KEY, next);
      return next;
    });
    setRecent((prev) => {
      if (!prev.includes(id)) return prev;
      const next = prev.filter((item) => item !== id);
      writeJson(RECENT_KEY, next);
      return next;
    });
  }, []);

  return {
    pins,
    recent,
    customPortals,
    tbcpl,
    loadingPortals,
    portalsError,
    togglePin,
    recordLaunch,
    addCustomPortal,
    removeCustomPortal,
  };
}
