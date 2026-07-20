import { z } from "zod";
import { queryCatalogService } from "@/features/catalog/application/catalog-service";
import { jsonError, json, catalogCacheHeaders } from "@/lib/http";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const QuerySchema = z.object({
  q: z.string().trim().optional(),
  country: z.string().trim().optional(),
  category: z.string().trim().optional(),
  language: z.string().trim().optional(),
  availability: z.enum(["recommended", "unverified", "limited", "blocked"]).optional(),
  sort: z.enum(["quality", "name", "country"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  source: z.enum(["iptv-org", "imported", "all"]).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", parsed.error.message);
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
    return json(
      {
        items: result.items,
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
