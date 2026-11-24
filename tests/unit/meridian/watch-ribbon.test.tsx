import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WatchRibbon } from "@/features/meridian/presentation/WatchRibbon";

const mockWatch = vi.fn();

vi.mock("@/lib/utils/app-store", () => ({
  useAppStore: (selector: (s: { watch: typeof mockWatch }) => unknown) =>
    selector({ watch: mockWatch }),
}));

vi.mock("@/features/history/history", () => ({
  useHistory: () => ({
    state: {
      version: 1 as const,
      entries: [
        { channelId: "arte.fr", sourceId: null, watchedAt: "2026-11-20T03:00:00.000Z" },
        { channelId: "france24.fr", sourceId: null, watchedAt: "2026-11-20T02:00:00.000Z" },
      ],
    },
    hydrated: true,
    push: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock("@/features/meridian/presentation/Voyage", () => ({
  VoyagePanel: () => null,
}));

vi.mock("@/features/meridian/presentation/Rendezvous", () => ({
  RendezvousBanner: () => null,
  RendezvousInvite: () => null,
}));

describe("WatchRibbon", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockWatch.mockReset();
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [
              { id: "arte.fr", name: "ARTE", countryCode: "FR", streamCount: 1 },
              { id: "france24.fr", name: "France 24", countryCode: "FR", streamCount: 1 },
            ],
            total: 2,
            filters: { countries: [], categories: [], languages: [] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("supports jumping to the previously watched channel and random channel", async () => {
    render(
      <WatchRibbon
        channelId="arte.fr"
        channelName="ARTE"
        countryCode="FR"
        timeZone="Europe/Paris"
        city="Paris"
      />,
    );

    const prevBtn = screen.getByRole("button", { name: /chaîne regardée précédemment/i });
    fireEvent.click(prevBtn);
    expect(mockWatch).toHaveBeenCalledWith("france24.fr");

    const randomBtn = screen.getByRole("button", { name: /chaîne aléatoire du pays/i });
    await waitFor(() => expect(randomBtn).not.toBeDisabled());
    fireEvent.click(randomBtn);
    expect(mockWatch).toHaveBeenCalledWith("france24.fr");
  });
});
