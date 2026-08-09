import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/features/admin/application/admin-snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAdminSnapshot(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
