import { z } from "zod";
import overridesJson from "../../../../data/channel-source-overrides.json";
import { createUnknownSourceAvailability } from "../domain/types";
import type { NormalizedChannel, NormalizedStream, SourceCatalogHealth } from "../domain/types";
import { calculateChannelHealth, createUnverifiedSourceHealth } from "../application/source-health";

const HttpUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP(S) URLs are allowed");

const AddedSourceSchema = z.object({
  id: z.string().min(1),
  url: HttpUrlSchema,
  title: z.string().min(1),
  quality: z.string().nullable().default(null),
  label: z.string().nullable().default(null),
  kind: z.enum(["hls", "mp4", "unknown"]).default("unknown"),
  sourceOrigin: z.string().min(1),
  manuallyApproved: z.literal(true),
  priority: z.number().int().min(0).max(1000).default(50),
});

const SourceHealthOverrideSchema = z
  .object({
    sourceId: z.string().min(1).optional(),
    sourceUrl: HttpUrlSchema.optional(),
    status: z.enum([
      "playable",
      "unknown",
      "temporarily_unavailable",
      "unsupported_format",
      "invalid_url",
      "network_error",
      "forbidden_or_restricted",
      "dead",
    ]),
    checkedAt: z.iso.datetime(),
    lastSuccessAt: z.iso.datetime().nullable().default(null),
    responseStatus: z.number().int().min(100).max(599).nullable().default(null),
    contentType: z.string().nullable().default(null),
    manifestValid: z.boolean().nullable().default(null),
    failureReason: z.string().nullable().default(null),
  })
  .refine((value) => value.sourceId || value.sourceUrl, {
    message: "sourceId or sourceUrl is required",
  });

const ChannelSourceOverrideSchema = z.object({
  channelId: z.string().min(1),
  addSources: z.array(AddedSourceSchema).default([]),
  disableSources: z.array(z.string().min(1)).default([]),
  preferredSource: z.string().nullable().default(null),
  sourceHealth: z.array(SourceHealthOverrideSchema).default([]),
  archived: z.boolean().default(false),
  reason: z.string().min(1),
  reviewedAt: z.iso.datetime(),
  reviewer: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  notes: z.string().nullable().default(null),
});

export const ChannelSourceOverridesSchema = z.object({
  version: z.literal(1),
  entries: z.array(ChannelSourceOverrideSchema),
});

export type ChannelSourceOverride = z.infer<typeof ChannelSourceOverrideSchema>;
export type ChannelSourceOverrides = z.infer<typeof ChannelSourceOverridesSchema>;

export const parseChannelSourceOverrides = (value: unknown): ChannelSourceOverrides =>
  ChannelSourceOverridesSchema.parse(value);

const overrides = parseChannelSourceOverrides(overridesJson);
const overrideByChannel = new Map(overrides.entries.map((entry) => [entry.channelId, entry]));

const detectKind = (url: string): NormalizedStream["kind"] => {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "hls";
  if (/\.(?:mp4|webm|ogv)(?:\?|$)/.test(lower)) return "mp4";
  return "unknown";
};

const compatibilityFor = (
  protocol: NormalizedStream["protocol"],
  kind: NormalizedStream["kind"],
): NormalizedStream["browserCompatibility"] => {
  if (protocol === "http") return "limited";
  if (protocol !== "https") return "blocked";
  return kind === "unknown" ? "unknown" : "preferred";
};

const healthFromOverride = (
  base: SourceCatalogHealth,
  override: z.infer<typeof SourceHealthOverrideSchema>,
): SourceCatalogHealth => ({
  ...base,
  status: override.status,
  checkedAt: override.checkedAt,
  lastSuccessAt:
    override.status === "playable"
      ? (override.lastSuccessAt ?? override.checkedAt)
      : override.lastSuccessAt,
  lastFailureAt:
    override.status === "playable" || override.status === "unknown" ? null : override.checkedAt,
  responseStatus: override.responseStatus,
  contentType: override.contentType,
  manifestValid: override.manifestValid,
  failureReason: override.failureReason,
});

export const applyChannelSourceOverrideEntry = (
  channel: NormalizedChannel,
  override: ChannelSourceOverride | null,
): NormalizedChannel => {
  const upstream = channel.streams.map((stream) => ({
    ...stream,
    sourceOrigin: stream.sourceOrigin ?? "iptv-org",
    catalogHealth: stream.catalogHealth ?? createUnverifiedSourceHealth(stream),
  }));
  if (!override) {
    return { ...channel, streams: upstream, health: calculateChannelHealth(upstream) };
  }

  const disabled = new Set(override.disableSources);
  const streams = upstream.map((stream) => {
    const isDisabled = disabled.has(stream.id) || disabled.has(stream.url);
    return {
      ...stream,
      disabled: isDisabled,
      catalogHealth: {
        ...(stream.catalogHealth ?? createUnverifiedSourceHealth(stream)),
        disabled: isDisabled,
      },
    };
  });

  for (const added of override.addSources) {
    const parsed = new URL(added.url);
    const protocol: NormalizedStream["protocol"] = parsed.protocol === "https:" ? "https" : "http";
    const kind = added.kind === "unknown" ? detectKind(added.url) : added.kind;
    streams.push({
      id: added.id,
      url: added.url,
      title: added.title,
      quality: added.quality,
      label: added.label,
      feedId: null,
      protocol,
      kind,
      requiresReferrer: false,
      requiresCustomUserAgent: false,
      browserCompatibility: compatibilityFor(protocol, kind),
      availability: createUnknownSourceAvailability(),
      sourceOrigin: added.sourceOrigin,
      manuallyApproved: true,
      disabled: false,
      priority: added.priority,
      catalogHealth: createUnverifiedSourceHealth({
        sourceOrigin: added.sourceOrigin,
        manuallyApproved: true,
        disabled: false,
        priority: added.priority,
      }),
    });
  }

  const observed = streams.map((stream) => {
    const match = override.sourceHealth.find(
      (health) => health.sourceId === stream.id || health.sourceUrl === stream.url,
    );
    if (!match) return stream;
    return {
      ...stream,
      catalogHealth: healthFromOverride(
        stream.catalogHealth ?? createUnverifiedSourceHealth(stream),
        match,
      ),
    };
  });
  observed.sort(
    (left, right) =>
      Number(left.id !== override.preferredSource) -
        Number(right.id !== override.preferredSource) ||
      (left.priority ?? 100) - (right.priority ?? 100),
  );
  return {
    ...channel,
    streams: observed,
    health: calculateChannelHealth(observed, {
      archived: override.archived,
      preferredSourceId: override.preferredSource,
      auditOrigin: "manual",
      manuallyReviewed: true,
      reviewerNote: override.notes,
    }),
  };
};

export const applyChannelSourceOverride = (channel: NormalizedChannel): NormalizedChannel =>
  applyChannelSourceOverrideEntry(channel, overrideByChannel.get(channel.id) ?? null);

export const getChannelSourceOverride = (channelId: string): ChannelSourceOverride | null =>
  overrideByChannel.get(channelId) ?? null;
