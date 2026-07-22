import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_EDITORIAL_SECTIONS } from "@/features/catalog/application/editorial-sections";

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
};

const contrast = (left: string, right: string): number => {
  const a = relativeLuminance(left);
  const b = relativeLuminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe("premium visual identity", () => {
  it("keeps critical text combinations above WCAG AA", () => {
    expect(contrast("#F8F8FC", "#070711")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#AAA9BC", "#171728")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#A27BFF", "#202037")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#070711", "#7A5CFF")).toBeGreaterThanOrEqual(4.5);
  });

  it("centralizes safe-area and reduced-motion contracts", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    for (const token of [
      "--safe-top",
      "--safe-right",
      "--safe-bottom",
      "--safe-left",
      "--duration-fast: 120ms",
      "--duration-base: 180ms",
      "--duration-slow: 240ms",
      "prefers-reduced-motion: reduce",
      'data-reduce-motion="true"',
    ]) {
      expect(css).toContain(token);
    }
  });

  it("assigns distinct visual variants to sports, anime and religious sections", () => {
    const variants = Object.fromEntries(
      DEFAULT_EDITORIAL_SECTIONS.map((section) => [section.id, section.visualVariant]),
    );
    expect(variants.sports).toBe("sports");
    expect(variants.anime).toBe("anime");
    expect(variants.religious).toBe("religious");
  });

  it("allows bottom navigation labels to wrap up to 2 lines without truncation", () => {
    const bottomNavTsx = readFileSync(
      resolve(process.cwd(), "src/components/app-shell/BottomNav.tsx"),
      "utf8",
    );
    expect(bottomNavTsx).toContain("line-clamp-2");
    expect(bottomNavTsx).toContain("break-words");
    expect(bottomNavTsx).not.toContain("max-w-full truncate");
  });
});
