import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LiveMosaicWall } from "@/features/catalog/presentation/LiveMosaicWall";
import { LivePulseStrip } from "@/features/catalog/presentation/LivePulseStrip";
import { ZapperDrawer } from "@/features/player/presentation/ZapperDrawer";
import type { ChannelSummary } from "@/features/catalog/domain/types";

vi.mock("@/features/imported-playlists/infrastructure/playlist-store", () => ({
  playlistStore: {
    list: vi.fn(async () => []),
  },
}));

vi.mock("@/features/favorites/favorites", () => ({
  useFavorites: () => ({ state: { version: 1, channelIds: ["rts1"] } }),
}));

const makeChannel = (id: string, name: string): ChannelSummary => ({
  id,
  name,
  alternativeNames: [],
  countryCode: "SN",
  countryName: "Sénégal",
  countryFlag: "🇸🇳",
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
    checkedAt: "2026-11-24T12:00:00.000Z",
    sourceCount: 1,
    playableSourceCount: 1,
    reasonCode: "recent_playable_source",
    reasonMessage: "healthy",
  },
});

const CHANNELS = [
  makeChannel("rts1", "RTS 1"),
  makeChannel("rts2", "RTS 2"),
  makeChannel("arte", "ARTE"),
  makeChannel("france24", "France 24"),
];

describe("Studio broadcast features (Mosaic, Pulse Strip, Zapper)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ items: CHANNELS, total: 4, filters: { countries: [], categories: [], languages: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  });

  it("LiveMosaicWall renders 4 screens, switches audio focus, toggles 2-screen mode, and expands a channel", () => {
    const onExpand = vi.fn();
    const onClose = vi.fn();
    render(<LiveMosaicWall channels={CHANNELS} onExpand={onExpand} onClose={onClose} />);

    expect(screen.getByTestId("mosaic-tile-0")).toHaveAttribute("data-audio-active", "true");
    expect(screen.getByTestId("mosaic-tile-3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Activer le son sur RTS 2/i }));
    expect(screen.getByTestId("mosaic-tile-1")).toHaveAttribute("data-audio-active", "true");
    expect(screen.getByTestId("mosaic-tile-0")).toHaveAttribute("data-audio-active", "false");

    fireEvent.click(screen.getByRole("button", { name: /Ouvrir ARTE en plein écran/i }));
    expect(onExpand).toHaveBeenCalledWith("arte");

    fireEvent.click(screen.getByRole("button", { name: /2 écrans/i }));
    expect(screen.queryByTestId("mosaic-tile-2")).not.toBeInTheDocument();
  });

  it("LivePulseStrip launches direct watch and mosaic control room", () => {
    const onWatch = vi.fn();
    const onOpenMosaic = vi.fn();
    render(
      <LivePulseStrip channels={CHANNELS} onWatch={onWatch} onOpenMosaic={onOpenMosaic} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Zapper en direct sur RTS 1/i }));
    expect(onWatch).toHaveBeenCalledWith("rts1");

    fireEvent.click(screen.getByRole("button", { name: /Ouvrir la Régie Mosaïque 4 écrans/i }));
    expect(onOpenMosaic).toHaveBeenCalledTimes(1);
  });

  it("ZapperDrawer loads channels, filters by query, and tunes on click", async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <ZapperDrawer open currentChannelId="rts1" onSelect={onSelect} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText("France 24")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Filtrer une chaîne/i), {
      target: { value: "France" },
    });
    expect(screen.getByText("France 24")).toBeInTheDocument();
    expect(screen.queryByText("RTS 2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /France 24/i }));
    expect(onSelect).toHaveBeenCalledWith("france24");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
