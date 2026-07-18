import { APP_CONFIG } from "@/config/app";
import { getNormalizedCatalog } from "@/features/catalog/application/catalog-service";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let catalogAvailable = false;
  try {
    const catalog = await getNormalizedCatalog();
    catalogAvailable = catalog.length > 0;
  } catch {
    catalogAvailable = false;
  }
  return json({
    status: catalogAvailable ? "ok" : "degraded",
    date: new Date().toISOString(),
    version: APP_CONFIG.version,
    catalogAvailable,
  });
}
