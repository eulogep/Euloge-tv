import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChannelCard } from "@/components/layout/ChannelCard";
import type { ChannelSummary } from "@/features/catalog/domain/types";

const archivedChannel: ChannelSummary = {
  id: "archived",
  name: "Chaîne Archive",
  alternativeNames: [],
  countryCode: "FR",
  countryName: "France",
  countryFlag: null,
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
    status: "archived",
    checkedAt: null,
    sourceCount: 1,
    playableSourceCount: 0,
    reasonCode: "manual_archive",
    reasonMessage: "archived",
  },
};

describe("ChannelCard", () => {
  it("keeps an archived entry visible but disables every open target", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ChannelCard channel={archivedChannel} onOpen={onOpen} />);

    expect(screen.getByText("Archivée")).toBeVisible();
    const mediaButton = screen.getByRole("button", {
      name: "Chaîne Archive — chaîne archivée",
    });
    const titleButton = screen.getByRole("button", { name: "Chaîne Archive" });
    expect(mediaButton).toBeDisabled();
    expect(titleButton).toBeDisabled();
    await user.click(mediaButton);
    await user.click(titleButton);
    expect(onOpen).not.toHaveBeenCalled();
  });
  it("exposes playback, favorite and EPG progress state accessibly", () => {
    const channel: ChannelSummary = {
      ...archivedChannel,
      id: "healthy",
      name: "Chaîne Active",
      health: {
        status: "healthy",
        checkedAt: "2026-08-01T12:00:00.000Z",
        sourceCount: 1,
        playableSourceCount: 1,
        reasonCode: "recent_playable_source",
        reasonMessage: "healthy",
      },
      epg: {
        status: "available",
        currentProgram: {
          title: "Journal",
          startAt: "2026-08-01T12:00:00.000Z",
          endAt: "2026-08-01T13:00:00.000Z",
        },
        nextProgram: null,
        source: { name: "Fixture", kind: "fixture" },
        updatedAt: "2026-08-01T12:15:00.000Z",
      },
    };
    const { rerender } = render(<ChannelCard channel={channel} isFavorite compact />);
    expect(
      screen.getByRole("button", { name: "Ouvrir Chaîne Active — Dans Ma liste" }),
    ).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Progression du programme en cours" }),
    ).toBeVisible();

    rerender(<ChannelCard channel={channel} active compact />);
    expect(
      screen.getByRole("button", { name: "Ouvrir Chaîne Active — Lecture en cours" }),
    ).toBeVisible();
  });

  it("does not expose stale program payloads for unavailable EPG", () => {
    const channel: ChannelSummary = {
      ...archivedChannel,
      id: "epg-unavailable",
      name: "EPG indisponible",
      health: undefined,
      epg: {
        status: "unavailable",
        currentProgram: {
          title: "Ancien programme",
          startAt: "2026-08-01T12:00:00.000Z",
          endAt: "2026-08-01T13:00:00.000Z",
        },
        nextProgram: null,
        source: { name: "Fixture", kind: "fixture" },
        updatedAt: "2026-08-01T12:15:00.000Z",
      },
    };
    render(<ChannelCard channel={channel} compact />);
    expect(screen.getByText("Programme non disponible")).toBeVisible();
    expect(screen.queryByText("Ancien programme")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
