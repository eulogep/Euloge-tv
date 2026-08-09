import { beforeEach, describe, expect, it } from "vitest";
import { formatEpgTime } from "@/features/epg/presentation/EpgGuideView";
import { appViewFromUrl, appViewToPath, useAppStore } from "@/lib/utils/app-store";

describe("Mobile V3 follow-up navigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useAppStore.setState({
      view: { view: "home" },
      canGoBack: false,
      activePlayerChannelId: null,
      playerMode: null,
    });
  });

  it("round-trips My List tabs and restores legacy links", () => {
    expect(appViewFromUrl(new URL("https://mjtv.test/?view=favorites"))).toEqual({
      view: "my-list",
      tab: "favorites",
    });
    expect(appViewFromUrl(new URL("https://mjtv.test/?view=history"))).toEqual({
      view: "my-list",
      tab: "history",
    });
    expect(appViewToPath({ view: "my-list", tab: "history" })).toBe("/?view=my-list&tab=history");
  });

  it("keeps goFavorites and goHistory distinct", () => {
    useAppStore.getState().goHistory();
    expect(useAppStore.getState().view).toEqual({ view: "my-list", tab: "history" });
    expect(window.location.search).toBe("?view=my-list&tab=history");

    useAppStore.getState().goFavorites();
    expect(useAppStore.getState().view).toEqual({ view: "my-list", tab: "favorites" });
    expect(window.location.search).toBe("?view=my-list&tab=favorites");
  });

  it("formats EPG guide times in the deterministic Paris timezone", () => {
    expect(formatEpgTime("2026-01-15T12:00:00.000Z")).toBe("13:00");
    expect(formatEpgTime("2026-07-15T12:00:00.000Z")).toBe("14:00");
  });
});
