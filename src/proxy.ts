import { NextResponse, type NextRequest } from "next/server";
import {
  isValidAdminAuthorization,
  readAdminAccessConfig,
} from "@/features/admin/application/access";

export function proxy(request: NextRequest) {
  const config = readAdminAccessConfig();
  if (!config) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (!isValidAdminAuthorization(request.headers.get("authorization"), config)) {
    return new NextResponse("Authorization required", {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store",
        "WWW-Authenticate": 'Basic realm="MJTV Admin", charset="UTF-8"',
      },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
