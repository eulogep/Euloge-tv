"use client";

import { z } from "zod";
import { APP_CONFIG } from "@/config/app";
import { storage } from "@/lib/storage/local";
import {
  detectBrowserFamily,
  type BrowserFamily,
} from "@/features/player/application/source-selection";
import type { ChannelHealthStatus } from "../domain/types";

export const SOURCE_REPORT_REASONS = [
  "no_playback",
  "wrong_channel",
  "wrong_logo",
  "wrong_category",
  "wrong_language",
  "unstable_source",
  "other",
] as const;

export type SourceReportReason = (typeof SOURCE_REPORT_REASONS)[number];

const SourceReportSchema = z.object({
  id: z.string(),
  channelId: z.string().min(1),
  reason: z.enum(SOURCE_REPORT_REASONS),
  createdAt: z.iso.datetime(),
  appVersion: z.string(),
  browserFamily: z.enum(["safari", "chromium", "unknown"]),
  healthStatus: z.enum([
    "healthy",
    "degraded",
    "unverified",
    "temporarily_unavailable",
    "unavailable",
    "no_source",
    "blocked_or_restricted",
    "archived",
  ]),
  message: z.string().max(500).nullable(),
});

export type SourceReport = z.infer<typeof SourceReportSchema>;

const SourceReportStoreSchema = z.object({
  version: z.literal(1),
  reports: z.array(SourceReportSchema).max(200),
});

const KEY = "mjtv:source-reports:v1";
const EMPTY = { version: 1 as const, reports: [] as SourceReport[] };

export type SourceReportRepository = {
  read: () => unknown;
  write: (value: { version: 1; reports: SourceReport[] }) => void;
};

export const localSourceReportRepository: SourceReportRepository = {
  read: () => storage.get<unknown>(KEY, EMPTY),
  write: (value) => storage.set(KEY, value),
};

export const readSourceReports = (
  repository: SourceReportRepository = localSourceReportRepository,
): SourceReport[] => {
  const parsed = SourceReportStoreSchema.safeParse(repository.read());
  return parsed.success ? parsed.data.reports : [];
};

export type CreateSourceReportInput = {
  channelId: string;
  reason: SourceReportReason;
  healthStatus: ChannelHealthStatus;
  message?: string;
  browserFamily?: BrowserFamily;
  now?: Date;
};

export const createSourceReport = (
  input: CreateSourceReportInput,
  repository: SourceReportRepository = localSourceReportRepository,
): SourceReport => {
  const report = SourceReportSchema.parse({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${input.channelId}:${Date.now()}`,
    channelId: input.channelId,
    reason: input.reason,
    createdAt: (input.now ?? new Date()).toISOString(),
    appVersion: APP_CONFIG.version,
    browserFamily: input.browserFamily ?? detectBrowserFamily(),
    healthStatus: input.healthStatus,
    message: input.message?.trim().slice(0, 500) || null,
  });
  const reports = [report, ...readSourceReports(repository)].slice(0, 200);
  repository.write({ version: 1, reports });
  return report;
};

export const exportSourceReportsJson = (
  repository: SourceReportRepository = localSourceReportRepository,
): string =>
  JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), reports: readSourceReports(repository) },
    null,
    2,
  );
