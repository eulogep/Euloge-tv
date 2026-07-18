import { describe, it, expect } from "vitest";
import {
  IptvChannelArraySchema,
  IptvChannelSchema,
  IptvGuideArraySchema,
  IptvStreamSchema,
  IptvStreamArraySchema,
  parseArraySafe,
} from "@/features/catalog/infrastructure/schemas";

describe("schemas", () => {
  it("parses a valid channel", () => {
    const ch = IptvChannelSchema.parse({
      id: "x",
      name: "X",
      country: "FR",
      categories: ["news"],
      is_nsfw: false,
    });
    expect(ch.id).toBe("x");
    expect(ch.categories).toEqual(["news"]);
  });

  it("defaults is_nsfw to false when missing", () => {
    const ch = IptvChannelSchema.parse({ id: "x", name: "X" });
    expect(ch.is_nsfw).toBe(false);
  });

  it("defaults alt_names and categories to null when missing", () => {
    const ch = IptvChannelSchema.parse({ id: "x", name: "X" });
    expect(ch.alt_names).toBeNull();
    expect(ch.categories).toBeNull();
  });

  it("normalizes upstream text-list fields when they arrive as arrays", () => {
    const ch = IptvChannelSchema.parse({
      id: "x",
      name: "X",
      alt_names: ["X HD", "X Live"],
      owners: ["Owner One", "Owner Two"],
    });
    expect(ch.alt_names).toBe("X HD;X Live");
    expect(ch.owners).toBe("Owner One;Owner Two");
  });

  it("parses a valid stream", () => {
    const s = IptvStreamSchema.parse({
      channel: "x",
      url: "https://example.com/x.m3u8",
    });
    expect(s.url).toBe("https://example.com/x.m3u8");
  });

  it("accepts stream rows with null channel so normalization can skip them", () => {
    const s = IptvStreamSchema.parse({
      channel: null,
      url: "https://example.com/orphan.m3u8",
    });
    expect(s.channel).toBeNull();
  });

  it("parseArraySafe returns empty array on non-array input", () => {
    expect(parseArraySafe(IptvChannelSchema, null, "test")).toEqual([]);
    expect(parseArraySafe(IptvChannelSchema, {}, "test")).toEqual([]);
  });

  it("parseArraySafe skips invalid items, keeps valid ones", () => {
    const out = parseArraySafe(
      IptvStreamSchema,
      [
        { channel: "x", url: "https://x" },
        { channel: "y" }, // missing url — invalid
        "garbage",
        { channel: "z", url: "https://z" },
      ],
      "test",
    );
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.channel)).toEqual(["x", "z"]);
  });

  it("array schemas tolerate unknown fields and malformed channel rows", () => {
    const out = IptvChannelArraySchema.parse([
      {
        id: "ok",
        name: "Known Extra",
        unexpected_flag: "kept for forward compatibility",
      },
      { id: "bad-missing-name" },
      "garbage",
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("ok");
    expect(out[0]).toMatchObject({
      unexpected_flag: "kept for forward compatibility",
    });
  });

  it("stream arrays keep nullable channel rows and skip malformed URLs", () => {
    const out = IptvStreamArraySchema.parse([
      { channel: null, url: "https://example.com/orphan.m3u8" },
      { channel: "broken" },
      { channel: "x", url: 42 },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].channel).toBeNull();
  });

  it("guide arrays accept nullable channel references", () => {
    const out = IptvGuideArraySchema.parse([
      { channel: null, site: "example.com" },
      { channel: "tf1.fr", site: "example.com" },
    ]);

    expect(out.map((guide) => guide.channel)).toEqual([null, "tf1.fr"]);
  });
});
