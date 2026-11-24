import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportView } from "@/features/imported-playlists/presentation/ImportView";
import type { ImportedPlaylist } from "@/features/imported-playlists/domain/types";
import { GET } from "@/app/api/local-playlist/route";

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
        importedAt: "2026-11-24T00:00:00.000Z",
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

describe("Local Playlist Integration", () => {
  beforeEach(() => {
    storedPlaylists = [];
    mockWatch.mockReset();
    vi.restoreAllMocks();
  });

  it("API /api/local-playlist returns generated M3U playlist", async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.count).toBeGreaterThan(0);
    expect(data.m3u).toContain("#EXTM3U");
    expect(data.m3u).toContain("#EXTINF");
  });

  it("ImportView allows 1-click import of local playlist", async () => {
    const mockM3u =
      '#EXTM3U\n#EXTINF:-1 tvg-id="ch1" group-title="Local",Chaîne Scan 1\nhttp://example.com/stream1.m3u8\n';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        name: "Playlists locales",
        count: 1,
        m3u: mockM3u,
      }),
    } as Response);

    render(<ImportView />);
    const importBtn = screen.getByRole("button", { name: /importer les listes locales/i });
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText("Playlists locales")).toBeInTheDocument();
      expect(screen.getByText("Chaîne Scan 1")).toBeInTheDocument();
    });
  });
});
