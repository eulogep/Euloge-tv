import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const originalUsername = process.env.MJTV_ADMIN_USERNAME;
const originalPassword = process.env.MJTV_ADMIN_PASSWORD;

afterEach(() => {
  if (originalUsername === undefined) delete process.env.MJTV_ADMIN_USERNAME;
  else process.env.MJTV_ADMIN_USERNAME = originalUsername;
  if (originalPassword === undefined) delete process.env.MJTV_ADMIN_PASSWORD;
  else process.env.MJTV_ADMIN_PASSWORD = originalPassword;
});

describe("Admin V1 proxy responses", () => {
  it("returns a private no-store 404 when access configuration is absent", () => {
    delete process.env.MJTV_ADMIN_USERNAME;
    delete process.env.MJTV_ADMIN_PASSWORD;
    const response = proxy(new NextRequest("https://mjtv.test/admin"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("www-authenticate")).toBeNull();
  });

  it("returns the UTF-8 challenge and no-store on unauthorized requests", () => {
    process.env.MJTV_ADMIN_USERNAME = "admin";
    process.env.MJTV_ADMIN_PASSWORD = "long-test-password";
    const response = proxy(new NextRequest("https://mjtv.test/api/admin/snapshot"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("www-authenticate")).toBe(
      'Basic realm="MJTV Admin", charset="UTF-8"',
    );
  });

  it("keeps authorized admin responses private and does not echo credentials", () => {
    process.env.MJTV_ADMIN_USERNAME = "admin";
    process.env.MJTV_ADMIN_PASSWORD = "long-test-password";
    const authorization = `Basic ${btoa("admin:long-test-password")}`;
    const response = proxy(
      new NextRequest("https://mjtv.test/admin", {
        headers: { authorization },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(JSON.stringify([...response.headers])).not.toContain(authorization);
  });
});
