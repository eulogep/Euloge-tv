import type { CSSProperties } from "react";
import type { CatalogCategory } from "@/features/catalog/domain/types";

/**
 * A "mire" is the test card a channel shows when nothing else is on air. Every
 * channel gets its own, drawn from its id: the pattern tells channels apart,
 * the colours name its category. Plain CSS gradients, so a wall of a hundred
 * cards costs no extra DOM and no request.
 */

const CATEGORY_INKS: Record<CatalogCategory, readonly [string, string]> = {
  live: ["#3a1408", "#ff8a4d"],
  news: ["#0e2a6b", "#7fd3f2"],
  sports: ["#6e1505", "#ff6a3c"],
  music: ["#4a0e57", "#ff7ac6"],
  movies: ["#2a0f3d", "#ffc53d"],
  series: ["#131a4a", "#b79bff"],
  kids: ["#0b4a3a", "#ffe14d"],
  animation: ["#5a1a2e", "#ff9e7a"],
  anime: ["#1e1147", "#ff8fd8"],
  documentaries: ["#0f3b2e", "#9fe6b8"],
  culture: ["#4a2a08", "#ffb35a"],
  religious: ["#123a45", "#e8e2c8"],
  entertainment: ["#3d0b2e", "#ffb14d"],
  lifestyle: ["#3e3209", "#f2e08a"],
  local: ["#20242e", "#c5ccda"],
  international: ["#08343f", "#65e0d6"],
  radio: ["#2b1036", "#d59bff"],
  other: ["#1c2030", "#9aa6c4"],
};

export const hashSeed = (seed: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

type Pattern = (a: string, b: string, h: number) => { image: string; size?: string };

const PATTERNS: readonly Pattern[] = [
  // Colour bars
  (a, b, h) => ({
    image: `repeating-linear-gradient(${h % 2 ? 90 : 0}deg, ${b} 0 ${8 + (h % 5) * 2}%, ${a} 0 ${22 + (h % 7) * 2}%)`,
  }),
  // Target rings
  (a, b, h) => ({
    image: `repeating-radial-gradient(circle at ${20 + (h % 60)}% ${30 + (h % 40)}%, ${a} 0 ${9 + (h % 5)}%, ${b} 0 ${12 + (h % 5)}%)`,
  }),
  // Rising sun
  (a, b, h) => ({
    image: `repeating-conic-gradient(from ${h % 40}deg at ${25 + (h % 50)}% 100%, ${a} 0 8deg, ${b} 0 16deg)`,
  }),
  // Checker
  (a, b, h) => ({
    image: `conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0)`,
    size: `${16 + (h % 4) * 6}% ${28 + (h % 4) * 10}%`,
  }),
  // Woven diagonals
  (a, b, h) => ({
    image: `repeating-linear-gradient(${45 + (h % 4) * 45}deg, ${a} 0 10px, ${b} 0 ${13 + (h % 5)}px)`,
  }),
  // Scales
  (a, b, h) => ({
    image: `radial-gradient(circle at 0 100%, ${b} 0 ${48 + (h % 3)}%, ${a} 0 ${62 + (h % 5)}%, ${b} 0 ${70 + (h % 3)}%, ${a} 0)`,
    size: `${18 + (h % 3) * 6}% ${32 + (h % 3) * 10}%`,
  }),
  // Horizon lines
  (a, b, h) => ({
    image: `linear-gradient(${a} 0 ${44 + (h % 16)}%, ${b} 0 ${48 + (h % 16)}%, ${a} 0 ${58 + (h % 16)}%, ${b} 0 ${64 + (h % 16)}%, ${a} 0 ${74 + (h % 12)}%, ${b} 0)`,
  }),
  // Halftone
  (a, b, h) => ({
    image: `radial-gradient(circle, ${b} ${24 + (h % 4) * 4}%, ${a} ${26 + (h % 4) * 4}%)`,
    size: `${9 + (h % 3) * 3}% ${16 + (h % 3) * 5}%`,
  }),
];

export const mireStyle = (seed: string, category: CatalogCategory = "other"): CSSProperties => {
  const hash = hashSeed(seed);
  const [a, b] = CATEGORY_INKS[category] ?? CATEGORY_INKS.other;
  const { image, size } = PATTERNS[hash % PATTERNS.length]!(a, b, hash >>> 4);
  return {
    backgroundColor: a,
    backgroundImage: image,
    ...(size ? { backgroundSize: size } : {}),
  };
};
