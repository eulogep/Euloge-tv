"use client";

import { useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/settings";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (listener: () => void): (() => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

/** True when either the system or the MJTV setting asks for stillness. */
export const useReducedMotion = (): boolean => {
  const { state } = useSettings();
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return system || state.reduceAnimations;
};
