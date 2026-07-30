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
});
