import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { hashSeed, mireStyle } from "@/features/meridian/domain/mire";
import { ChannelMire } from "@/features/meridian/presentation/ChannelMire";

describe("mires", () => {
  it("draws the same card for the same channel, every time", () => {
    expect(mireStyle("RTS1.sn", "news")).toEqual(mireStyle("RTS1.sn", "news"));
    expect(hashSeed("RTS1.sn")).toBe(hashSeed("RTS1.sn"));
  });

  it("tells channels apart and carries the category in its colour", () => {
    const images = new Set(
      Array.from(
        { length: 40 },
        (_, index) => mireStyle(`channel-${index}`, "news").backgroundImage,
      ),
    );
    expect(images.size).toBeGreaterThan(20);
    expect(mireStyle("x", "news").backgroundColor).not.toBe(
      mireStyle("x", "sports").backgroundColor,
    );
  });

  it("falls back to a neutral card for an unknown category", () => {
    expect(mireStyle("x", "nope" as never).backgroundColor).toBe(
      mireStyle("x", "other").backgroundColor,
    );
  });

  it("holds the channel's initials until a logo arrives, and keeps them if it never does", () => {
    render(
      <ChannelMire channelId="a" name="Radio Télé" logoUrl={null} fallbackTestId="fallback" />,
    );
    expect(screen.getByTestId("fallback")).toHaveTextContent("RT");
  });
});
