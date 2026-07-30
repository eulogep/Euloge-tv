import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FeaturedChannelHero,
  selectFeaturedChannel,
} from "@/features/catalog/presentation/FeaturedChannelHero";
import type { ChannelSummary } from "@/features/catalog/domain/types";

const channel = (id: string, overrides: Partial<ChannelSummary> = {}): ChannelSummary => ({
  id,
  name: id,
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: "🇫🇷",
  languageCodes: ["fra"],
  primaryCategory: "news",
  categories: ["news"],
  tags: [],
  logoUrl: null,
  websiteUrl: null,
  isNsfw: false,
  streamCount: 1,
  bestCompatibility: "preferred",
  bestAvailability: "unknown",
  ...overrides,
});

describe("featured channel hero", () => {
  it("selects a viable source deterministically and rejects blocked entries", () => {
    const featured = selectFeaturedChannel([
      channel("blocked", { bestCompatibility: "blocked", bestAvailability: "playable" }),
      channel("unknown", { streamCount: 4 }),
      channel("live", { bestAvailability: "playable" }),
    ]);

    expect(featured?.id).toBe("live");
    expect(selectFeaturedChannel([])).toBeNull();
    expect(
      selectFeaturedChannel([channel("offline", { bestAvailability: "network_error" })]),
    ).toBeNull();
  });

  it("uses central catalog health as authority over a stale local network error", () => {
    const centrallyHealthy = channel("centrally-healthy", {
      bestAvailability: "network_error",
      health: {
        status: "healthy",
        checkedAt: "2026-07-22T12:00:00.000Z",
        sourceCount: 1,
        playableSourceCount: 1,
        reasonCode: "recent_playable_source",
        reasonMessage: "healthy",
      },
    });

    expect(selectFeaturedChannel([centrallyHealthy])).toBe(centrallyHealthy);
  });

  it("excludes archived entries from the hero", () => {
    expect(
      selectFeaturedChannel([
        channel("archived", {
          health: {
            status: "archived",
            checkedAt: null,
            sourceCount: 1,
            playableSourceCount: 0,
            reasonCode: "manual_archive",
            reasonMessage: "archived",
          },
        }),
      ]),
    ).toBeNull();
  });

  it("renders a no-image fallback and keeps watch and Ma liste actions functional", async () => {
    const user = userEvent.setup();
    const onWatch = vi.fn();
    const onToggleMyList = vi.fn();

    render(
      <FeaturedChannelHero
        channel={channel("Demo France", { bestAvailability: "playable" })}
        isInMyList={false}
        onWatch={onWatch}
        onToggleMyList={onToggleMyList}
      />,
    );

    expect(screen.getByTestId("featured-channel-fallback")).toHaveTextContent("DF");
    expect(screen.getByText("Direct confirmé")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Regarder Demo France" }));
    await user.click(screen.getByRole("button", { name: "Ma liste" }));
    expect(onWatch).toHaveBeenCalledWith("Demo France");
    expect(onToggleMyList).toHaveBeenCalledWith("Demo France");
  });
});
