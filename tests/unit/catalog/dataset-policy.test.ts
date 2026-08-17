import { describe, expect, it } from "vitest";
import { assertRequiredDatasetAvailable } from "@/features/catalog/infrastructure/dataset-policy";

describe("iptv-org dataset policy", () => {
  it.each([
    { channels: [], streams: [{}], missing: "channels" },
    { channels: [{}], streams: [], missing: "streams" },
    { channels: [], streams: [], missing: "channels, streams" },
  ])("rejects an unavailable required dataset: $missing", ({ channels, streams, missing }) => {
    expect(() => assertRequiredDatasetAvailable({ channels, streams })).toThrow(missing);
  });

  it("accepts a catalog with both required datasets", () => {
    expect(() => assertRequiredDatasetAvailable({ channels: [{}], streams: [{}] })).not.toThrow();
  });
});
