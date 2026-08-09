import { afterEach, describe, expect, it } from "vitest";
import {
  isValidAdminAuthorization,
  readAdminAccessConfig,
} from "@/features/admin/application/access";

const originalUsername = process.env.MJTV_ADMIN_USERNAME;
const originalPassword = process.env.MJTV_ADMIN_PASSWORD;

const basicAuthorization = (credentials: string): string => {
  const bytes = new TextEncoder().encode(credentials);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
};

afterEach(() => {
  if (originalUsername === undefined) delete process.env.MJTV_ADMIN_USERNAME;
  else process.env.MJTV_ADMIN_USERNAME = originalUsername;
  if (originalPassword === undefined) delete process.env.MJTV_ADMIN_PASSWORD;
  else process.env.MJTV_ADMIN_PASSWORD = originalPassword;
});

describe("Admin V1 access", () => {
  it("fails closed when configuration is missing or too weak", () => {
    delete process.env.MJTV_ADMIN_USERNAME;
    delete process.env.MJTV_ADMIN_PASSWORD;
    expect(readAdminAccessConfig()).toBeNull();
    process.env.MJTV_ADMIN_USERNAME = "admin";
    process.env.MJTV_ADMIN_PASSWORD = "short";
    expect(readAdminAccessConfig()).toBeNull();
    process.env.MJTV_ADMIN_USERNAME = "bad:name";
    process.env.MJTV_ADMIN_PASSWORD = "long-enough-password";
    expect(readAdminAccessConfig()).toBeNull();
  });

  it("accepts only exact server-side Basic credentials", () => {
    const config = { username: "reviewer", password: "test-password-123456" };
    expect(
      isValidAdminAuthorization(`Basic ${btoa("reviewer:test-password-123456")}`, config),
    ).toBe(true);
    expect(isValidAdminAuthorization(`Basic ${btoa("reviewer:wrong-password")}`, config)).toBe(
      false,
    );
    expect(isValidAdminAuthorization(null, config)).toBe(false);
  });

  it("decodes advertised UTF-8 credentials and rejects malformed bytes", () => {
    const config = { username: "réviseur", password: "mot-de-passe-très-long" };
    expect(
      isValidAdminAuthorization(basicAuthorization("réviseur:mot-de-passe-très-long"), config),
    ).toBe(true);
    expect(isValidAdminAuthorization("Basic /w==", config)).toBe(false);
  });
});
