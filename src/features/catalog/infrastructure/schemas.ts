import { z } from "zod";
import { logger } from "@/lib/utils/logger";

/**
 * Zod schemas for the iptv-org public API.
 * Reference: https://github.com/iptv-org/api
 * Each schema uses `z.looseObject` so unknown extra keys are kept (not
 * rejected), so an upstream field addition does not crash the whole pipeline.
 * In zod v4, `z.looseObject` replaces the old `z.object({}).passthrough()`.
 */
const loose = <T extends z.ZodRawShape>(shape: T) => z.looseObject(shape);
const safeArray = <T>(schema: z.ZodType<T>, label: string) =>
  z.unknown().transform((value) => parseArraySafe(schema, value, label));

const textListField = z
  .union([z.string(), z.array(z.string())])
  .nullable()
  .default(null)
  .transform((value) => {
    if (Array.isArray(value)) {
      const joined = value
        .map((item) => item.trim())
        .filter(Boolean)
        .join(";");
      return joined || null;
    }
    return value;
  });

const channelRefField = z.string().nullable().default(null);

/**
 * Parse an unknown value as an array of T, skipping invalid items.
 * Returns an empty array on non-array input — never throws.
 * This is the safety net for the iptv-org fetch pipeline: a single malformed
 * entry never poisons the whole dataset.
 */
export const parseArraySafe = <T>(schema: z.ZodType<T>, value: unknown, label: string): T[] => {
  if (!Array.isArray(value)) {
    logger.warn("parseArraySafe: non-array input", { label });
    return [];
  }
  const out: T[] = [];
  for (const item of value) {
    const result = schema.safeParse(item);
    if (result.success) {
      out.push(result.data);
    } else {
      logger.warn("parseArraySafe: invalid item skipped", {
        label,
        issues: result.error.issues.length,
      });
    }
  }
  return out;
};

export const IptvChannelSchema = loose({
  id: z.string(),
  name: z.string(),
  alt_names: textListField,
  network: z.string().nullable().default(null),
  owners: textListField,
  country: z.string().nullable().default(null),
  subdivision: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  categories: z.array(z.string()).nullable().default(null),
  is_nsfw: z.boolean().default(false),
  launched: z.string().nullable().default(null),
  closed: z.string().nullable().default(null),
  replaced_by: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
});

export const IptvStreamSchema = loose({
  channel: channelRefField,
  feed: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  url: z.string(),
  display_order: z.string().optional().nullable(),
  quality: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
});

export const IptvFeedSchema = loose({
  id: z.string(),
  channel: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  is_main: z.boolean().optional().default(false),
});

export const IptvLogoSchema = loose({
  id: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  feed: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  url: z.string(),
  filepath: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  in_use: z.boolean().optional().default(true),
  is_horizontal: z.boolean().optional().default(false),
});

export const IptvCountrySchema = loose({
  name: z.string(),
  code: z.string(),
  languages: z.array(z.string()).optional().default([]),
  flag: z.string().optional().nullable(),
});

export const IptvCategorySchema = loose({
  id: z.string(),
  name: z.string(),
});

export const IptvLanguageSchema = loose({
  name: z.string(),
  code: z.string(),
});

export const IptvGuideSchema = loose({
  channel: channelRefField,
  site: z.string().optional().nullable(),
  site_id: z.string().optional().nullable(),
  site_name: z.string().optional().nullable(),
  lang: z.string().optional().nullable(),
});

export const IptvBlocklistSchema = loose({
  channel: z.string(),
  ref: z.string().optional().nullable(),
});

export const IptvChannelArraySchema = safeArray(IptvChannelSchema, "channels");
export const IptvStreamArraySchema = safeArray(IptvStreamSchema, "streams");
export const IptvFeedArraySchema = safeArray(IptvFeedSchema, "feeds");
export const IptvLogoArraySchema = safeArray(IptvLogoSchema, "logos");
export const IptvCountryArraySchema = safeArray(IptvCountrySchema, "countries");
export const IptvCategoryArraySchema = safeArray(IptvCategorySchema, "categories");
export const IptvLanguageArraySchema = safeArray(IptvLanguageSchema, "languages");
export const IptvGuideArraySchema = safeArray(IptvGuideSchema, "guides");
export const IptvBlocklistArraySchema = safeArray(IptvBlocklistSchema, "blocklist");

export type IptvChannel = z.infer<typeof IptvChannelSchema>;
export type IptvStream = z.infer<typeof IptvStreamSchema>;
export type IptvFeed = z.infer<typeof IptvFeedSchema>;
export type IptvLogo = z.infer<typeof IptvLogoSchema>;
export type IptvCountry = z.infer<typeof IptvCountrySchema>;
export type IptvCategory = z.infer<typeof IptvCategorySchema>;
export type IptvLanguage = z.infer<typeof IptvLanguageSchema>;
export type IptvGuide = z.infer<typeof IptvGuideSchema>;
export type IptvBlocklist = z.infer<typeof IptvBlocklistSchema>;
