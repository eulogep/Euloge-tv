import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportView } from "@/features/imported-playlists/presentation/ImportView";
import type { ImportedPlaylist } from "@/features/imported-playlists/domain/types";

const mockWatch = vi.fn();
let storedPlaylists: ImportedPlaylist[] = [];

vi.mock("@/lib/utils/app-store", () => ({
  useAppStore: (selector: (s: { watch: typeof mockWatch }) => unknown) =>
    selector({ watch: mockWatch }),
}));

vi.mock("@/features/imported-playlists/infrastructure/playlist-store", () => ({
  playlistStore: {
    list: vi.fn(async () => storedPlaylists),
    save: vi.fn(async (name: string, channels: ImportedPlaylist["channels"]) => {
      const playlist: ImportedPlaylist = {
        id: `pl_${storedPlaylists.length + 1}`,
        name,
        importedAt: "2026-11-20T00:00:00.000Z",
        schemaVersion: 1,
        channelCount: channels.length,
        channels,
      };
      storedPlaylists = [playlist, ...storedPlaylists];
      return playlist;
    }),
    remove: vi.fn(async (id: string) => {
      storedPlaylists = storedPlaylists.filter((p) => p.id !== id);
    }),
    findChannel: vi.fn(async (id: string) => {
      for (const p of storedPlaylists) {
        const match = p.channels.find((c) => c.id === id);
        if (match) return match;
      }
      return null;
    }),
  },
}));

describe("ImportView", () => {
  beforeEach(() => {
    storedPlaylists = [];
    mockWatch.mockReset();
  });

  it("imports pasted M3U content, filters channels, and launches playback", async () => {
    render(<ImportView />);
    fireEvent.click(screen.getByRole("button", { name: /coller un m3u/i }));

    fireEvent.change(screen.getByLabelText(/nom de la playlist/i), {
      target: { value: "Sélection DE" },
    });
    fireEvent.change(screen.getByLabelText(/contenu #extm3u/i), {
      target: {
        value:
          '#EXTM3U\n#EXTINF:-1 tvg-country="DE" group-title="news",Tagesschau 24\nhttps://example.com/tagesschau.m3u8\n#EXTINF:-1 tvg-country="FR" group-title="culture",ARTE\nhttps://example.com/arte.m3u8\n',
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer la playlist/i }));

    await waitFor(() => {
      expect(screen.getByText("Sélection DE")).toBeInTheDocument();
      expect(screen.getByText("Tagesschau 24")).toBeInTheDocument();
      expect(screen.getByText("ARTE")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/filtrer sélection de/i), {
      target: { value: "Tagesschau" },
    });
    expect(screen.getByText("Tagesschau 24")).toBeInTheDocument();
    expect(screen.queryByText("ARTE")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /regarder tagesschau 24/i }));
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(mockWatch.mock.calls[0]![0]).toContain("Tagesschau 24");
  });
});
