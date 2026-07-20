import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/catalog/application/catalog-service", () => ({
  queryCatalogService: vi.fn(),
}));

import { GET } from "@/app/api/catalog/route";
import { queryCatalogService } from "@/features/catalog/application/catalog-service";

const serviceResult = {
  items: [],
  nextCursor: null,
  total: 0,
  filters: { countries: [], categories: [], languages: [] },
};

const request = (query = "") => new Request(`http://localhost/api/catalog${query}`);

describe("GET /api/catalog", () => {
  beforeEach(() => {
    vi.mocked(queryCatalogService).mockReset().mockResolvedValue(serviceResult);
  });

  it("accepts an absent availability", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(queryCatalogService).toHaveBeenCalledWith(
      expect.objectContaining({ availability: undefined, limit: 40 }),
    );
  });

  it("normalizes an empty availability to undefined", async () => {
    const response = await GET(request("?availability=&sort=quality&limit=40"));

    expect(response.status).toBe(200);
    expect(queryCatalogService).toHaveBeenCalledWith(
      expect.objectContaining({ availability: undefined, sort: "quality", limit: 40 }),
    );
  });

  it("accepts a valid availability", async () => {
    const response = await GET(request("?availability=recommended"));

    expect(response.status).toBe(200);
    expect(queryCatalogService).toHaveBeenCalledWith(
      expect.objectContaining({ availability: "recommended" }),
    );
  });

  it("returns a structured 400 response for an invalid availability", async () => {
    const response = await GET(request("?availability=online"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_CATALOG_QUERY",
        message: "Les paramètres du catalogue sont invalides.",
        fields: [expect.objectContaining({ field: "availability" })],
      },
    });
    expect(JSON.stringify(body)).not.toContain("stack");
    expect(queryCatalogService).not.toHaveBeenCalled();
  });

  it("accepts a valid category", async () => {
    const response = await GET(request("?category=news"));

    expect(response.status).toBe(200);
    expect(queryCatalogService).toHaveBeenCalledWith(expect.objectContaining({ category: "news" }));
  });

  it("accepts a valid combination", async () => {
    const response = await GET(
      request(
        "?q=France+24&country=FR&category=news&language=fra&availability=recommended&source=iptv-org&sort=name&limit=20",
      ),
    );

    expect(response.status).toBe(200);
    expect(queryCatalogService).toHaveBeenCalledWith({
      q: "France 24",
      country: "FR",
      category: "news",
      language: "fra",
      availability: "recommended",
      source: "iptv-org",
      sort: "name",
      cursor: undefined,
      limit: 20,
    });
  });
});
