"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExplorerFilters } from "@/lib/utils/app-store";
import {
  JOURNEYS_KEY,
  MAX_JOURNEYS,
  journeyFingerprint,
  normalizeJourneyFilters,
  readJourneyState,
  type JourneyState,
} from "../domain/journey";

const CHANGED = "mjtv:journeys-changed";
const read = (): JourneyState =>
  readJourneyState(JSON.parse(localStorage.getItem(JOURNEYS_KEY) ?? "null"));

export function useJourneys() {
  const [state, setState] = useState<JourneyState>({ version: 1, items: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        setState(read());
        setError(null);
      } catch {
        setError("Le carnet ne peut pas être lu sur cet appareil.");
      }
      setReady(true);
    };
    refresh();
    window.addEventListener(CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const mutate = useCallback((change: (current: JourneyState) => JourneyState): boolean => {
    try {
      const next = change(read());
      localStorage.setItem(JOURNEYS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGED));
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "full"
          ? `Votre carnet contient déjà ${MAX_JOURNEYS} escales. Retirez-en une pour en ajouter une autre.`
          : "Modification non enregistrée. Le stockage de cet appareil est indisponible.",
      );
      return false;
    }
  }, []);

  const save = (name: string, filters: ExplorerFilters) => {
    if (!name.trim() || name.trim().length > 48) {
      setError("Choisissez un nom de 1 à 48 caractères.");
      return false;
    }
    return mutate((current) => {
      const normalized = normalizeJourneyFilters(filters);
      const existing = current.items.find(
        (item) => journeyFingerprint(item.filters) === journeyFingerprint(normalized),
      );
      if (!existing && current.items.length >= MAX_JOURNEYS) throw new Error("full");
      const next = {
        id: existing?.id ?? crypto.randomUUID(),
        name: name.trim(),
        filters: normalized,
      };
      return {
        version: 1,
        items: [next, ...current.items.filter((item) => item.id !== existing?.id)],
      };
    });
  };
  const rename = (id: string, name: string) => {
    if (!name.trim() || name.trim().length > 48) {
      setError("Choisissez un nom de 1 à 48 caractères.");
      return false;
    }
    return mutate((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, name: name.trim() } : item)),
    }));
  };
  const remove = (id: string) =>
    mutate((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  return { items: state.items, ready, error, save, rename, remove };
}
