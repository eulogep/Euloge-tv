import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  auditSources,
  type SourceAuditResult,
} from "../src/features/catalog/application/source-audit";

const IPTV_ORG_CHANNELS = "https://iptv-org.github.io/api/channels.json";
const IPTV_ORG_STREAMS = "https://iptv-org.github.io/api/streams.json";
const USER_AGENT = "MJTV-Source-Audit/1.0 (+https://github.com/eulogep/Euloge-tv)";

type UpstreamChannel = {
  id: string;
  name: string;
  country: string | null;
  categories: string[];
};

type UpstreamStream = {
  channel: string | null;
  url: string;
  quality?: string | null;
};

type ChannelAudit = {
  channel: UpstreamChannel;
  status: "no_source" | "audited";
  sources: SourceAuditResult[];
};

const valueAfter = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const parseIds = (args: string[]): string[] => {
  const values = [valueAfter(args, "--id"), valueAfter(args, "--ids")]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)];
};

const sanitizeUrl = (value: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "[invalid URL]";
  }
};

const fetchJson = async <T>(url: string, timeoutMs: number): Promise<T> => {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`metadata_http_${response.status}`);
  return (await response.json()) as T;
};

const toMarkdown = (audits: readonly ChannelAudit[], checkedAt: string): string => {
  const lines = [
    "# MJTV channel source audit",
    "",
    `Generated: ${checkedAt}`,
    "",
    "> A valid HTTP response or HLS manifest does not prove browser playback. Results are",
    "> transport-level observations only and must be completed by browser checks.",
    "",
  ];
  for (const audit of audits) {
    lines.push(`## ${audit.channel.name} (${audit.channel.id})`, "");
    if (audit.status === "no_source") {
      lines.push("- Verdict: `no_source`", "");
      continue;
    }
    for (const source of audit.sources) {
      lines.push(
        `- Source: ${sanitizeUrl(source.url)}`,
        `  - Status: \`${source.status}\``,
        `  - HTTP: ${source.responseStatus ?? "none"}`,
        `  - Content-Type: ${source.contentType ?? "unknown"}`,
        `  - HLS manifest: ${source.manifestValid === null ? "not checked" : source.manifestValid}`,
        `  - Reason: ${source.failureReason ?? "none"}`,
        `  - Redirect: ${sanitizeUrl(source.redirectedTo) ?? "none"}`,
      );
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const ids = parseIds(args);
  if (ids.length === 0) {
    throw new Error("Provide --id CHANNEL_ID or --ids ID_ONE,ID_TWO");
  }
  const timeoutMs = Number(valueAfter(args, "--timeout") ?? 5_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 250 || timeoutMs > 30_000) {
    throw new Error("--timeout must be between 250 and 30000 milliseconds");
  }
  const outputDir = path.resolve(valueAfter(args, "--output-dir") ?? "audit-output");
  const [channels, streams] = await Promise.all([
    fetchJson<UpstreamChannel[]>(IPTV_ORG_CHANNELS, Math.max(timeoutMs, 10_000)),
    fetchJson<UpstreamStream[]>(IPTV_ORG_STREAMS, Math.max(timeoutMs, 10_000)),
  ]);
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));
  const audits: ChannelAudit[] = [];
  for (const id of ids) {
    const channel = channelById.get(id);
    if (!channel) throw new Error(`Unknown iptv-org channel: ${id}`);
    const candidates = streams.filter((stream) => stream.channel === id);
    const sources = await auditSources(
      candidates.map((stream, index) => ({ id: `${id}:${index + 1}`, url: stream.url })),
      { timeoutMs, concurrency: 3 },
    );
    audits.push({ channel, status: sources.length === 0 ? "no_source" : "audited", sources });
  }

  const checkedAt = new Date().toISOString();
  const safeAudits = audits.map((audit) => ({
    ...audit,
    sources: audit.sources.map((source) => ({
      ...source,
      url: sanitizeUrl(source.url) ?? source.url,
      redirectedTo: sanitizeUrl(source.redirectedTo),
    })),
  }));
  const stamp = checkedAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(outputDir, `source-audit-${stamp}.json`),
      `${JSON.stringify({ checkedAt, audits: safeAudits }, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(outputDir, `source-audit-${stamp}.md`),
      toMarkdown(safeAudits, checkedAt),
      "utf8",
    ),
  ]);
  process.stdout.write(`${toMarkdown(safeAudits, checkedAt)}Output directory: ${outputDir}\n`);
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Source audit failed: ${message}\n`);
  process.exitCode = 1;
});
