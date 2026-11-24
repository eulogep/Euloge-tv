import { NextResponse } from "next/server";
import { fetchTbcplCatalog } from "@/features/catalog/infrastructure/tbcpl-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog = await fetchTbcplCatalog();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch {
    return NextResponse.json({ error: "TBCPL catalog unavailable" }, { status: 503 });
  }
}
