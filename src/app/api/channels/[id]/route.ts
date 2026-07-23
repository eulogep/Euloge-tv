import { getChannelById } from "@/features/catalog/application/catalog-service";
import { jsonError, json, catalogCacheHeaders } from "@/lib/http";
import { logger } from "@/lib/utils/logger";
import { toPublicChannelDetail } from "@/features/catalog/application/source-health";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!id) {
    return jsonError(400, "VALIDATION_ERROR", "Identifiant de chaîne manquant.");
  }
  try {
    const channel = await getChannelById(id);
    if (!channel) {
      return jsonError(404, "NOT_FOUND", "Chaîne introuvable.");
    }
    return json(toPublicChannelDetail(channel), { headers: catalogCacheHeaders() });
  } catch (err) {
    logger.error("channel detail route error", {
      id,
      message: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "CHANNEL_ERROR", "Chaîne indisponible.");
  }
}
