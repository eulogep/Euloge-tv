import { describe, it, expect } from "vitest";
import {
  parseM3u,
  toImportedChannel,
} from "@/features/imported-playlists/infrastructure/m3u-parser";
import { readFileSync } from "node:fs";
import path from "node:path";

const sample = readFileSync(
  path.join(process.cwd(), "tests/fixtures/playlists/sample.m3u"),
  "utf8",
);

const crlfPath = path.join(process.cwd(), "tests/fixtures/playlists/crlf.m3u");
const crlf = readFileSync(crlfPath, "utf8");

describe("parseM3u", () => {
  it("parses a valid playlist", () => {
    const r = parseM3u(sample);
    expect(r.entries.length).toBe(4); // 4 valid entries (javascript/rtmp/foo rejected)
  });

  it("extracts EXTINF attributes", () => {
    const r = parseM3u(sample);
    const tf1 = r.entries.find((e) => e.tvgId === "tf1");
    expect(tf1).toBeDefined();
    expect(tf1!.name).toBe("TF1 HD");
    expect(tf1!.logo).toBe("https://example.com/tf1.png");
    expect(tf1!.countryCode).toBe("FR");
    expect(tf1!.languageCode).toBe("fra");
    expect(tf1!.group).toBe("Généraliste");
  });

  it("detects referrer requirement", () => {
    const r = parseM3u(sample);
    const ref = r.entries.find((e) => e.referrer);
    expect(ref).toBeDefined();
    expect(ref!.referrer).toBe("https://example.com/");
    expect(ref!.requiresReferrer).toBe(true);
  });

  it("detects custom user agent requirement", () => {
    const r = parseM3u(sample);
    const ua = r.entries.find((e) => e.userAgent);
    expect(ua).toBeDefined();
    expect(ua!.userAgent).toBe("CustomUA/1.0");
    expect(ua!.requiresCustomUserAgent).toBe(true);
  });

  it("rejects dangerous protocols", () => {
    const r = parseM3u(sample);
    expect(r.entries.find((e) => e.url.startsWith("javascript:"))).toBeUndefined();
    expect(r.entries.find((e) => e.url.startsWith("rtmp:"))).toBeUndefined();
    expect(r.rejected.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects unknown protocols (foo://)", () => {
    const r = parseM3u(sample);
    expect(r.entries.find((e) => e.url.startsWith("foo:"))).toBeUndefined();
  });

  it("handles CRLF line endings", () => {
    const r = parseM3u(crlf);
    expect(r.entries.length).toBe(2);
    expect(r.entries[0].name).toBe("Channel1");
    expect(r.entries[1].name).toBe("Channel2");
  });

  it("handles an empty file", () => {
    const r = parseM3u("");
    expect(r.entries).toEqual([]);
    expect(r.rejected).toEqual([]);
  });

  it("handles a partially valid file", () => {
    const partial = `#EXTM3U
#EXTINF:-1 tvg-id="ok",OK
https://example.com/ok.m3u8
#EXTINF:-1,Missing URL
`;
    const r = parseM3u(partial);
    expect(r.entries.length).toBe(1);
    expect(r.rejected.length).toBe(1);
  });

  it("never executes file content", () => {
    const malicious = `#EXTM3U
#EXTINF:-1,<script>alert(1)</script>
https://example.com/x.m3u8
`;
    const r = parseM3u(malicious);
    expect(r.entries.length).toBe(1);
    expect(r.entries[0].name).toBe("<script>alert(1)</script>");
    // The parser does NOT evaluate the string — it just stores it.
  });
});

describe("toImportedChannel", () => {
  it("converts a parsed entry to an ImportedChannel", () => {
    const r = parseM3u(sample);
    const tf1 = r.entries[0];
    const channel = toImportedChannel(tf1, "pl1", 0);
    expect(channel.name).toBe(tf1.name);
    expect(channel.streams).toHaveLength(1);
    expect(channel.streams[0].kind).toBe("hls");
    expect(channel.streams[0].protocol).toBe("https");
  });

  it("marks referrer-required streams as limited", () => {
    const r = parseM3u(sample);
    const ref = r.entries.find((e) => e.requiresReferrer)!;
    const channel = toImportedChannel(ref, "pl1", 0);
    expect(channel.streams[0].browserCompatibility).toBe("limited");
  });
});
