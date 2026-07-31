import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  cinematicToneForChannel,
  selectCinematicFeaturedChannels,
} from "@/features/catalog/application/cinematic-featured";
import { CinematicFeaturedCarousel } from "@/features/catalog/presentation/CinematicFeaturedCarousel";
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
  bestAvailability: "playable",
  health: {
    status: "healthy",
    checkedAt: "2026-07-22T12:00:00.000Z",
    sourceCount: 1,
    playableSourceCount: 1,
    reasonCode: "recent_playable_source",
    reasonMessage: "healthy",
  },
  ...overrides,
});

const channels = [channel("Alpha"), channel("Bravo"), channel("Charlie")];

describe("cinematic featured selection", () => {
  it("keeps only centrally eligible channels", () => {
    const selected = selectCinematicFeaturedChannels([
      channel("healthy"),
      channel("no-source", { streamCount: 0, health: undefined }),
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
      channel("unavailable", {
        health: {
          status: "unavailable",
          checkedAt: null,
          sourceCount: 1,
          playableSourceCount: 0,
          reasonCode: "all_sources_failed",
          reasonMessage: "unavailable",
        },
      }),
    ]);

    expect(selected.map((item) => item.id)).toEqual(["healthy"]);
  });

  it("uses a stable MJTV tone mapping", () => {
    expect(cinematicToneForChannel("Alpha")).toBe(cinematicToneForChannel("Alpha"));
    expect(["red", "violet", "blue", "orange"]).toContain(cinematicToneForChannel("Alpha"));
  });
});

describe("CinematicFeaturedCarousel", () => {
  it("changes the active card with next and previous controls and loops", async () => {
    const user = userEvent.setup();
    render(<CinematicFeaturedCarousel channels={channels} onWatch={vi.fn()} />);

    expect(screen.getByTestId("cinematic-active-card")).toHaveTextContent("Alpha");
    await user.click(screen.getByRole("button", { name: "Chaîne précédente" }));
    expect(screen.getByTestId("cinematic-active-card")).toHaveTextContent("Charlie");
    await user.click(screen.getByRole("button", { name: "Chaîne suivante" }));
    expect(screen.getByTestId("cinematic-active-card")).toHaveTextContent("Alpha");
  });

  it("supports desktop arrow keys and mobile swipe", () => {
    render(<CinematicFeaturedCarousel channels={channels} onWatch={vi.fn()} />);
    const carousel = screen.getByTestId("cinematic-featured-carousel");

    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(screen.getByTestId("cinematic-active-card")).toHaveTextContent("Bravo");
    fireEvent.touchStart(carousel, { changedTouches: [{ clientX: 180 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 80 }] });
    expect(screen.getByTestId("cinematic-active-card")).toHaveTextContent("Charlie");
  });

  it("opens the active channel", async () => {
    const user = userEvent.setup();
    const onWatch = vi.fn();
    render(<CinematicFeaturedCarousel channels={channels} onWatch={onWatch} />);

    await user.click(screen.getByRole("button", { name: "Regarder Alpha maintenant" }));
    expect(onWatch).toHaveBeenCalledWith("Alpha");
  });

  it("renders current and next EPG content", () => {
    render(
      <CinematicFeaturedCarousel
        channels={[
          channel("EPG", {
            epg: {
              status: "available",
              currentProgram: {
                title: "Journal du soir",
                startAt: "2026-07-22T18:00:00.000Z",
                endAt: "2026-07-22T19:00:00.000Z",
              },
              nextProgram: {
                title: "Le débat",
                startAt: "2026-07-22T19:00:00.000Z",
                endAt: "2026-07-22T20:00:00.000Z",
              },
              source: { name: "Fixture", kind: "fixture" },
              updatedAt: "2026-07-22T18:30:00.000Z",
            },
          }),
        ]}
        onWatch={vi.fn()}
      />,
    );

    expect(screen.getByText("Journal du soir")).toBeVisible();
    expect(screen.getByText("Le débat")).toBeVisible();
    expect(screen.getByRole("progressbar")).toBeVisible();
  });

  it("keeps a discreet EPG fallback and exposes reduced motion preference", () => {
    render(<CinematicFeaturedCarousel channels={channels} onWatch={vi.fn()} reduceAnimations />);

    expect(screen.getByText("Programme non disponible")).toBeVisible();
    expect(screen.getByTestId("cinematic-featured-carousel")).toHaveAttribute(
      "data-reduce-motion",
      "true",
    );
  });
});
