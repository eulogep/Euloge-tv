import { getChannelHealthById } from "@/features/catalog/application/catalog-service";
import { json, jsonError, catalogCacheHeaders } from "@/lib/http";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!id) return jsonError(400, "VALIDATION_ERROR", "Identifiant de chaîne manquant.");
  try {
    const health = await getChannelHealthById(id);
    if (!health) return jsonError(404, "NOT_FOUND", "Chaîne introuvable.");
    return json(
      {
        channelId: id,
        status: health.status,
        sourceCount: health.sourceCount,
        playableSourceCount: health.playableSourceCount,
        checkedAt: health.checkedAt,
        message: health.reasonMessage,
      },
      { headers: catalogCacheHeaders() },
    );
  } catch (error) {
    logger.error("channel health route error", {
      id,
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonError(500, "CHANNEL_HEALTH_ERROR", "État de santé indisponible.");
  }
}
