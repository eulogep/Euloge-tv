import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/catalog/application/catalog-service", () => ({
  getCatalogRuntimeState: vi.fn(),
  getNormalizedCatalog: vi.fn(),
}));

import { GET } from "@/app/api/health/route";
import {
  getCatalogRuntimeState,
  getNormalizedCatalog,
} from "@/features/catalog/application/catalog-service";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.mocked(getCatalogRuntimeState).mockReturnValue({
      status: "idle",
      catalogAvailable: false,
    });
    vi.mocked(getNormalizedCatalog).mockReset();
  });

  it("reports the catalog runtime state without initializing the catalog", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        status: "ok",
        catalogAvailable: false,
        catalogStatus: "idle",
      }),
    );
    expect(getNormalizedCatalog).not.toHaveBeenCalled();
  });

  it("reports a previous catalog failure as degraded without retrying it", async () => {
    vi.mocked(getCatalogRuntimeState).mockReturnValue({
      status: "failed",
      catalogAvailable: false,
    });

    const response = await GET();

    expect(await response.json()).toEqual(
      expect.objectContaining({ status: "degraded", catalogStatus: "failed" }),
    );
    expect(getNormalizedCatalog).not.toHaveBeenCalled();
  });
});
