import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/catalog/application/catalog-service", () => ({
  getChannelHealthById: vi.fn(),
}));

import { GET } from "@/app/api/channels/[id]/health/route";
import { getChannelHealthById } from "@/features/catalog/application/catalog-service";

describe("GET /api/channels/[id]/health", () => {
  beforeEach(() => vi.mocked(getChannelHealthById).mockReset());

  it("returns only the minimal public projection", async () => {
    vi.mocked(getChannelHealthById).mockResolvedValue({
      status: "unavailable",
      checkedAt: "2026-07-22T12:00:00.000Z",
      lastSuccessAt: null,
      lastFailureAt: "2026-07-22T12:00:00.000Z",
      consecutiveFailures: 1,
      sourceCount: 1,
      playableSourceCount: 0,
      unknownSourceCount: 0,
      failedSourceCount: 1,
      preferredSourceId: null,
      reasonCode: "all_sources_definitively_failed",
      reasonMessage: "Toutes les sources sont indisponibles.",
      auditOrigin: "manual",
      manuallyReviewed: true,
      reviewerNote: "internal",
      nextCheckAt: null,
    });
    const response = await GET(new Request("http://localhost/api/channels/demo/health"), {
      params: Promise.resolve({ id: "demo" }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      channelId: "demo",
      status: "unavailable",
      sourceCount: 1,
      playableSourceCount: 0,
      checkedAt: "2026-07-22T12:00:00.000Z",
      message: "Toutes les sources sont indisponibles.",
    });
    expect(JSON.stringify(body)).not.toContain("reviewer");
    expect(JSON.stringify(body)).not.toContain("http");
  });

  it("returns 404 for an unknown channel", async () => {
    vi.mocked(getChannelHealthById).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/channels/missing/health"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
  });
});
