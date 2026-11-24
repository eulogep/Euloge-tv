import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NAV_ITEMS } from "@/config/navigation";
import { appViewFromUrl, appViewToPath } from "@/lib/utils/app-store";
import { StreamingHubView } from "@/features/streaming/presentation/StreamingHubView";
import {
  displayHostname,
  isSafeExternalUrl,
  makeMonogram,
} from "@/features/streaming/domain/platforms";

const MOCK_TBCPL = {
  sites: [
    { name: "RiveStream", url: "https://rivestream.ru/", category: "movies", position: 7 },
    { name: "animepahe", url: "https://animepahe.pw/", category: "anime", position: 26 },
    { name: "StreamEast", url: "https://streamking.cx/", category: "livetv", position: 74 },
  ],
  fetchedAt: "2026-11-24T18:00:00.000Z",
  region: "usa",
};

describe("Streaming Hub module", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/tbcpl")) {
        return new Response(JSON.stringify(MOCK_TBCPL), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("wires Streaming into primary navigation and URL routing", () => {
    expect(NAV_ITEMS.map((item) => item.view)).toContain("streaming");
    expect(appViewToPath({ view: "streaming" })).toBe("/?view=streaming");
    expect(appViewFromUrl(new URL("https://mjtv.test/?view=streaming"))).toEqual({
      view: "streaming",
    });
  });

  it("validates external URLs and formats hostnames & monograms cleanly", () => {
    expect(isSafeExternalUrl("https://www.arte.tv/fr/")).toBe(true);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(displayHostname("https://www.arte.tv/fr/")).toBe("arte.tv");
    expect(makeMonogram("Pluto TV")).toBe("PT");
  });

  it("renders official platforms, loads /api/tbcpl portals, filters, pins and adds custom portals", async () => {
    render(<StreamingHubView />);

    expect(screen.getByRole("heading", { name: /Plateformes, cinéma/i })).toBeInTheDocument();
    expect(screen.getByText("Arte.tv")).toBeInTheDocument();
    expect(screen.getByText("Pluto TV")).toBeInTheDocument();

    // Community portals from /api/tbcpl appear
    await waitFor(() => {
      expect(screen.getByText("RiveStream")).toBeInTheDocument();
      expect(screen.getByText("animepahe")).toBeInTheDocument();
    });

    // Pin Arte.tv -> shows in Pinned dock
    fireEvent.click(screen.getByRole("button", { name: "Épingler Arte.tv" }));
    expect(screen.getByText(/Vos plateformes épinglées/i)).toBeInTheDocument();

    // Filter by Anime tab
    fireEvent.click(screen.getByRole("tab", { name: "Animés" }));
    expect(screen.getByText("Crunchyroll")).toBeInTheDocument();
    expect(screen.getByText("animepahe")).toBeInTheDocument();
    expect(screen.queryByText("Pluto TV")).not.toBeInTheDocument();

    // Search filter
    fireEvent.click(screen.getByRole("tab", { name: /Tout/i }));
    fireEvent.change(screen.getByRole("searchbox", { name: /Filtrer les plateformes/i }), {
      target: { value: "France.tv" },
    });
    expect(screen.getByText("France.tv")).toBeInTheDocument();
    expect(screen.queryByText("Pluto TV")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Effacer la recherche" }));

    // Add a custom portal
    fireEvent.click(screen.getByRole("button", { name: /Ajouter un portail/i }));
    fireEvent.change(screen.getByPlaceholderText(/Mon Ciné/i), {
      target: { value: "Jellyfin Maison" },
    });
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/exemple\.com/i), {
      target: { value: "https://media.example.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer le portail/i }));

    expect(screen.getByText("Jellyfin Maison")).toBeInTheDocument();
    expect(screen.getByText("media.example.org")).toBeInTheDocument();

    // Delete custom portal
    fireEvent.click(screen.getByRole("button", { name: "Supprimer Jellyfin Maison" }));
    expect(screen.queryByText("Jellyfin Maison")).not.toBeInTheDocument();
  });
});
