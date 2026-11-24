import type { CSSProperties } from "react";
import type { CatalogCategory } from "@/features/catalog/domain/types";

/**
 * Studio atmospheric backdrops for every channel card.
 * Each channel receives a deterministic, refined multi-layered cinema aurora mesh
 * tinted by its category palette — rich studio depth, never loud retro stripes.
 */

const CATEGORY_INKS: Record<CatalogCategory, readonly [string, string, string]> = {
  live: ["#140a12", "#e11d48", "#fb923c"],
  news: ["#0a1529", "#0284c7", "#38bdf8"],
  sports: ["#1d0a0f", "#dc2626", "#f59e0b"],
  music: ["#1b0b26", "#c026d3", "#f472b6"],
  movies: ["#160f24", "#d97706", "#fbbf24"],
  series: ["#11132e", "#6366f1", "#a78bfa"],
  kids: ["#0a2224", "#0d9488", "#facc15"],
  animation: ["#210e1f", "#e11d48", "#fb923c"],
  anime: ["#170c2e", "#9333ea", "#f472b6"],
  documentaries: ["#081e1b", "#059669", "#34d399"],
  culture: ["#1e140a", "#d97706", "#fbbf24"],
  religious: ["#0d1d26", "#0284c7", "#fde68a"],
  entertainment: ["#210d1b", "#db2777", "#fb923c"],
  lifestyle: ["#1b160b", "#ca8a04", "#fde047"],
  local: ["#121722", "#475569", "#94a3b8"],
  international: ["#081d26", "#0891b2", "#2dd4bf"],
  radio: ["#190d28", "#7c3aed", "#c084fc"],
  other: ["#111522", "#334155", "#64748b"],
};

export const hashSeed = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

export const mireStyle = (seed: string, category: CatalogCategory = "other"): CSSProperties => {
  const hash = hashSeed(seed);
  const [base, primary, glow] = CATEGORY_INKS[category] ?? CATEGORY_INKS.other;

  const x1 = 12 + (hash % 76);
  const y1 = 10 + ((hash >>> 7) % 62);
  const x2 = 15 + ((hash >>> 13) % 72);
  const y2 = 30 + ((hash >>> 19) % 60);
  const angle = 115 + ((hash >>> 24) % 90);
  const r1 = 58 + ((hash >>> 4) % 24);
  const r2 = 52 + ((hash >>> 10) % 26);

  return {
    backgroundColor: base,
    backgroundImage: [
      `radial-gradient(ellipse ${r1}% ${r1 + 14}% at ${x1}% ${y1}%, color-mix(in srgb, ${primary} 54%, transparent), transparent 72%)`,
      `radial-gradient(ellipse ${r2}% ${r2 + 12}% at ${x2}% ${y2}%, color-mix(in srgb, ${glow} 34%, transparent), transparent 70%)`,
      `linear-gradient(${angle}deg, rgb(255 255 255 / 7%) 0%, transparent 45%, rgb(0 0 0 / 38%) 100%)`,
    ].join(", "),
  };
};
