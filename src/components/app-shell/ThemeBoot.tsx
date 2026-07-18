"use client";

import { useEffect } from "react";

/**
 * Applies the theme class on <html> based on stored settings.
 * Runs only on the client to avoid SSR mismatch.
 */
export function ThemeBoot() {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("mjtv:settings:v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { theme?: "system" | "dark" | "light" };
      const theme = parsed.theme ?? "dark";
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      if (theme === "system") {
        const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
        root.classList.add(prefersLight ? "light" : "dark");
      } else {
        root.classList.add(theme);
      }
    } catch {
      // ignore
    }
  }, []);
  return null;
}
