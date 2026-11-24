import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiveView } from "@/features/catalog/presentation/LiveView";
import type { ChannelSummary } from "@/features/catalog/domain/types";

const mockWatch = vi.fn();

vi.mock("@/lib/utils/app-store", () => ({
  useAppStore: (selector: (s: { watch: typeof mockWatch }) => unknown) =>
    selector({ watch: mockWatch }),
}));

vi.mock("@/features/favorites/favorites", () => ({
  useFavorites: () => ({ has: () => false, toggle: vi.fn() }),
}));

const sampleChannel: ChannelSummary = {
  id: "arte.fr",
  name: "ARTE",
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: "🇫🇷",
  languageCodes: ["fra"],
  primaryCategory: "culture",
  categories: ["culture"],
  tags: [],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streamCount: 1,
  bestCompatibility: "preferred",
};

vi.mock("@/features/catalog/presentation/use-catalog", () => ({
  useCatalog: () => ({
    items: [sampleChannel],
    loading: false,
    error: null,
  }),
}));

describe("LiveView", () => {
  beforeEach(() => {
    mockWatch.mockReset();
  });

  it("renders a random channel button that launches playback", () => {
    render(<LiveView />);
    const randomBtn = screen.getByRole("button", { name: /chaîne aléatoire/i });
    fireEvent.click(randomBtn);
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(mockWatch).toHaveBeenCalledWith("arte.fr");
  });
});
