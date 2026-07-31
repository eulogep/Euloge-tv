import { z } from "zod";
import { queryCatalogService } from "@/features/catalog/application/catalog-service";
import { jsonError, json, catalogCacheHeaders } from "@/lib/http";
import { logger } from "@/lib/utils/logger";
import { attachPublicEpg } from "@/features/epg/application/default-epg";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const QuerySchema = z.object({
  q: optionalQueryValue(z.string().trim()),
  country: optionalQueryValue(z.string().trim()),
  category: optionalQueryValue(z.string().trim()),
  language: optionalQueryValue(z.string().trim()),
  availability: optionalQueryValue(z.enum(["recommended", "unverified", "limited", "blocked"])),
  sort: optionalQueryValue(z.enum(["quality", "name", "country"])),
  cursor: optionalQueryValue(z.string()),
  limit: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).max(100).default(40)),
  source: optionalQueryValue(z.enum(["iptv-org", "imported", "all"])),
});

function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function optionalQueryValue<T extends z.ZodType>(schema: T) {
  return z.preprocess(emptyStringToUndefined, schema.optional());
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return json(
      {
        error: {
          code: "INVALID_CATALOG_QUERY",
          message: "Les paramètres du catalogue sont invalides.",
          fields: parsed.error.issues.map((issue) => ({
            field: issue.path.join(".") || "query",
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }
  try {
    const result = await queryCatalogService({
      q: parsed.data.q,
      country: parsed.data.country,
      category: parsed.data.category,
      language: parsed.data.language,
      availability: parsed.data.availability,
      sort: parsed.data.sort,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
      source: parsed.data.source,
    });
    const items = await attachPublicEpg(result.items);
    return json(
      {
        items,
        nextCursor: result.nextCursor,
        total: result.total,
        filters: result.filters,
        generatedAt: new Date().toISOString(),
      },
      { headers: catalogCacheHeaders() },
    );
  } catch (err) {
    logger.error("catalog route error", {
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "CATALOG_ERROR", "Catalogue indisponible.");
  }
}
