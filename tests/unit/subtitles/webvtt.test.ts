import { describe, it, expect, vi } from "vitest";
import { LocalWebVttProvider } from "@/features/subtitles/infrastructure/local-webvtt-provider";
import { ValidationError } from "@/lib/errors";

describe("LocalWebVttProvider", () => {
  it("creates a blob URL for a valid VTT file", async () => {
    const file = new File(["WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello\n"], "sub.vtt", {
      type: "text/vtt",
    });
    const url = await LocalWebVttProvider.createTrack(file);
    expect(url).toMatch(/^blob:/);
  });

  it("rejects an invalid VTT file", async () => {
    const file = new File(["not vtt"], "sub.vtt", { type: "text/vtt" });
    await expect(LocalWebVttProvider.createTrack(file)).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an empty file", async () => {
    const file = new File([""], "sub.vtt", { type: "text/vtt" });
    await expect(LocalWebVttProvider.createTrack(file)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("URL.createObjectURL / revokeObjectURL", () => {
  it("is stubbed in the test environment", () => {
    expect(URL.createObjectURL).toBeDefined();
    expect(URL.revokeObjectURL).toBeDefined();
    expect(vi.mocked(URL.createObjectURL)).toBeDefined();
  });
});
