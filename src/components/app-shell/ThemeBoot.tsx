"use client";

import { useEffect } from "react";
import {
  solarElevation,
  sunPosition,
  wrapLongitude,
  worldBandGradient,
} from "@/features/meridian/domain/solar";

type Theme = "sun" | "system" | "dark" | "light";

/** The viewer's own sky, estimated from their clock: no geolocation involved. */
const viewerElevation = (date: Date): number =>
  solarElevation(sunPosition(date), 30, wrapLongitude(-date.getTimezoneOffset() / 4));

/**
 * Applies the theme class on <html> and keeps the live identity values current:
 * the band of daylight across the world and the sun in the logo.
 */
export function ThemeBoot() {
  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      let theme: Theme = "sun";
      try {
        const raw = window.localStorage.getItem("mjtv:settings:v1");
        if (raw) {
          const parsed = JSON.parse(raw) as { theme?: Theme };
          if (["sun", "system", "dark", "light"].includes(parsed.theme ?? "")) {
            theme = parsed.theme!;
          }
        }
      } catch {
        // An unreadable preference falls back to the sun.
      }
      const now = new Date();
      const elevation = viewerElevation(now);
      const root = document.documentElement;
      const resolved =
        theme === "sun"
          ? elevation > -3
            ? "light"
            : "dark"
          : theme === "system"
            ? systemTheme.matches
              ? "light"
              : "dark"
            : theme;
      root.classList.remove("dark", "light");
      root.classList.add(resolved);
      root.style.setProperty("--sky-band", worldBandGradient(now));
      // 0 is high between the peaks; 16 has set behind them.
      const sunset = Math.max(0, Math.min(16, 8 - elevation * 0.8));
      root.style.setProperty("--logo-sun-y", `${sunset.toFixed(1)}px`);
    };
    applyTheme();
    const minute = window.setInterval(applyTheme, 60_000);
    window.addEventListener("mjtv:settings-changed", applyTheme);
    window.addEventListener("storage", applyTheme);
    systemTheme.addEventListener("change", applyTheme);
    return () => {
      window.clearInterval(minute);
      window.removeEventListener("mjtv:settings-changed", applyTheme);
      window.removeEventListener("storage", applyTheme);
      systemTheme.removeEventListener("change", applyTheme);
    };
  }, []);
  return null;
}
