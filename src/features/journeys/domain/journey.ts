import { z } from "zod";
import { CATALOG_CATEGORIES } from "@/features/catalog/application/taxonomy";
import type { ExplorerFilters } from "@/lib/utils/app-store";

export const MAX_JOURNEYS = 12;
export const JOURNEYS_KEY = "mjtv:journeys:v1";

const filtersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  category: z.enum(CATALOG_CATEGORIES).optional(),
  language: z
    .string()
    .regex(/^[a-z]{2,3}$/)
    .optional(),
  availability: z.enum(["recommended", "unverified", "limited", "blocked"]).optional(),
  sort: z.enum(["quality", "name", "country"]).optional(),
  source: z.enum(["iptv-org", "imported", "all"]).optional(),
});
const journeySchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(48),
  filters: filtersSchema,
});
export type Journey = z.infer<typeof journeySchema>;
export type JourneyState = { version: 1; items: Journey[] };

export function normalizeJourneyFilters(filters: ExplorerFilters): Journey["filters"] {
  return filtersSchema.parse(
    Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
    ),
  );
}

export function readJourneyState(raw: unknown): JourneyState {
  const empty: JourneyState = { version: 1, items: [] };
  if (!raw || typeof raw !== "object") return empty;
  const state = raw as Record<string, unknown>;
  if (state.version !== 1 || !Array.isArray(state.items)) return empty;
  const seen = new Set<string>();
  for (const item of state.items) {
    const parsed = journeySchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    empty.items.push(parsed.data);
    if (empty.items.length === MAX_JOURNEYS) break;
  }
  return empty;
}

export function journeyFingerprint(filters: ExplorerFilters): string {
  // URL filters are user-controlled. Invalid values must never crash rendering.
  const parsed = filtersSchema.safeParse({ ...filters, sort: filters.sort ?? "quality" });
  const normalized = parsed.success ? normalizeJourneyFilters(parsed.data) : filters;
  return JSON.stringify(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)));
}
