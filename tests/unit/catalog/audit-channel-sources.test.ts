import { describe, expect, it } from "vitest";
import {
  createAuditArtifacts,
  redactAuditUrl,
  type ChannelAudit,
} from "../../../scripts/audit-channel-sources";

const checkedAt = "2026-07-30T12:00:00.000Z";

describe("audit output URL redaction", () => {
  it("removes encoded credentials, sensitive query values and fragments", () => {
    const value =
      "https://user%40mail.example:p%40ss%3Aword@media.example/live.m3u8?token=query-secret#fragment-secret";

    expect(redactAuditUrl(value)).toBe("https://media.example/live.m3u8");
  });

  it("redacts every serialized output before JSON, Markdown or console use", () => {
    const sourceSecret = "source-password";
    const redirectSecret = "redirect-password";
    const audits: ChannelAudit[] = [
      {
        channel: {
          id: "demo",
          name: "Demo",
          country: "FR",
          categories: ["news"],
        },
        status: "audited",
        sources: [
          {
            id: "demo:1",
            url: `https://audit-user:${sourceSecret}@media.example/live.m3u8?token=query-secret#fragment-secret`,
            status: "unknown",
            checkedAt,
            responseStatus: 200,
            contentType: "application/vnd.apple.mpegurl",
            streamType: "hls",
            manifestValid: true,
            failureReason: "manifest_valid_playback_unconfirmed",
            redirectedTo: `https://redirect-user:${redirectSecret}@cdn.example/live.m3u8?signature=redirect-query`,
          },
        ],
      },
    ];

    const artifacts = createAuditArtifacts(audits, checkedAt);
    for (const output of [artifacts.json, artifacts.markdown, artifacts.consoleOutput]) {
      for (const secret of [
        "audit-user",
        sourceSecret,
        "query-secret",
        "fragment-secret",
        "redirect-user",
        redirectSecret,
        "redirect-query",
      ]) {
        expect(output).not.toContain(secret);
      }
      expect(output).toContain("https://media.example/live.m3u8");
      expect(output).toContain("https://cdn.example/live.m3u8");
    }
  });
});
