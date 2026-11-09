import { getNormalizedCatalog } from "@/features/catalog/application/catalog-service";
import { buildAtlas } from "@/features/meridian/application/build-atlas";
import { catalogCacheHeaders, json, jsonError } from "@/lib/http";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/** Every tunable country with its best few channels, so the dial can zap without a request per channel. */
export async function GET(): Promise<Response> {
  try {
    const atlas = buildAtlas(await getNormalizedCatalog());
    return json(atlas, { headers: catalogCacheHeaders() });
  } catch (err) {
    logger.error("atlas route error", {
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "ATLAS_ERROR", "Atlas indisponible.");
  }
}
