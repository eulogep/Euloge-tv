import { APP_CONFIG } from "@/config/app";
import { getCatalogRuntimeState } from "@/features/catalog/application/catalog-service";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const catalog = getCatalogRuntimeState();
  return json({
    status: catalog.status === "failed" ? "degraded" : "ok",
    date: new Date().toISOString(),
    version: APP_CONFIG.version,
    catalogAvailable: catalog.catalogAvailable,
    catalogStatus: catalog.status,
  });
}
