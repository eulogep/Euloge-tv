import { describe, expect, it } from "vitest";
import {
  buildSourceAttemptPlan,
  nextUnattemptedSourceIndex,
  rankSources,
} from "@/features/player/application/source-selection";
import {
  createUnknownSourceAvailability,
  type NormalizedStream,
  type SourceAvailability,
} from "@/features/catalog/domain/types";

const stream = (id: string, overrides: Partial<NormalizedStream> = {}): NormalizedStream => ({
  id,
  url: `https://example.com/${id}.mp4`,
  title: id,
  quality: null,
  label: null,
  feedId: null,
  protocol: "https",
  kind: "mp4",
  requiresReferrer: false,
  requiresCustomUserAgent: false,
  browserCompatibility: "preferred",
  availability: createUnknownSourceAvailability(),
  ...overrides,
});

const observed = (overrides: Partial<SourceAvailability>): SourceAvailability => ({
  ...createUnknownSourceAvailability(),
  ...overrides,
  compatibility: {
    ...createUnknownSourceAvailability().compatibility,
    ...overrides.compatibility,
  },
});

describe("source selection", () => {
  it("falls back to the second source after the first attempt", () => {
    const sources = [stream("first"), stream("second")];
    expect(nextUnattemptedSourceIndex(sources, new Set(["first"]))).toBe(1);
  });

  it("returns no source after every source is exhausted", () => {
    const sources = [stream("first"), stream("second")];
    expect(nextUnattemptedSourceIndex(sources, new Set(["first", "second"]))).toBeNull();
  });

  it("does not loop back to an already attempted source", () => {
    const sources = [stream("first"), stream("second")];
    const attempted = new Set(["first", "second"]);
    expect(nextUnattemptedSourceIndex(sources, attempted)).toBeNull();
    expect(nextUnattemptedSourceIndex(sources, attempted)).toBeNull();
  });

  it("uses browser confirmation, HTTPS HLS, then recent success", () => {
    const confirmed = stream("confirmed");
    const hls = stream("hls", { kind: "hls", url: "https://example.com/live.m3u8" });
    const recent = stream("recent");
    const observations = {
      confirmed: observed({
        compatibility: { safari: "compatible", chromium: "unknown", unknown: "unknown" },
      }),
      recent: observed({ status: "playable", lastCheckedAt: "2026-07-19T00:00:00.000Z" }),
    };

    expect(
      rankSources([recent, hls, confirmed], "safari", observations, Date.parse("2026-07-20")).map(
        (source) => source.id,
      ),
    ).toEqual(["confirmed", "hls", "recent"]);
  });

  it("excludes a confirmed Safari-incompatible source when another source is relevant", () => {
    const incompatible = stream("bad");
    const fallback = stream("fallback", { kind: "unknown", url: "https://example.com/live" });
    const plan = buildSourceAttemptPlan([incompatible, fallback], "safari", {
      bad: observed({
        status: "unsupported_format",
        compatibility: { safari: "incompatible", chromium: "unknown", unknown: "unknown" },
      }),
    });
    expect(plan.map((source) => source.id)).toEqual(["fallback"]);
  });

  it("keeps one last-resort source when every source is confirmed incompatible", () => {
    const only = stream("only");
    const plan = buildSourceAttemptPlan([only], "safari", {
      only: observed({
        status: "unsupported_format",
        compatibility: { safari: "incompatible", chromium: "unknown", unknown: "unknown" },
      }),
    });
    expect(plan).toHaveLength(1);
  });
});
