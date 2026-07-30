import { beforeEach, describe, expect, it } from "vitest";
import {
  createSourceReport,
  exportSourceReportsJson,
  readSourceReports,
} from "@/features/catalog/application/source-reports";

describe("local source reports", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores a technical report locally without personal data", () => {
    const report = createSourceReport({
      channelId: "EMCITV.fr",
      reason: "no_playback",
      healthStatus: "unavailable",
      browserFamily: "safari",
      message: "  Écran noir  ",
      now: new Date("2026-07-22T12:00:00.000Z"),
    });
    expect(report).toMatchObject({
      channelId: "EMCITV.fr",
      browserFamily: "safari",
      message: "Écran noir",
    });
    expect(readSourceReports()).toHaveLength(1);
    expect(report).not.toHaveProperty("email");
    expect(report).not.toHaveProperty("ip");
  });

  it("exports an inspectable versioned JSON document", () => {
    createSourceReport({
      channelId: "demo",
      reason: "wrong_channel",
      healthStatus: "unverified",
      browserFamily: "chromium",
    });
    expect(JSON.parse(exportSourceReportsJson())).toMatchObject({
      version: 1,
      reports: [{ channelId: "demo", reason: "wrong_channel" }],
    });
  });
});
