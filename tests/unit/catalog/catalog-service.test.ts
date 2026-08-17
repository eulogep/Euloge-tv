import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogRuntime } from "@/features/catalog/application/catalog-runtime";

describe("catalog service initialization", () => {
  let runtime: CatalogRuntime<string[]>;

  beforeEach(() => {
    runtime = new CatalogRuntime((catalog) => catalog.length > 0);
  });

  it("shares one catalog load between concurrent callers", async () => {
    let resolveCatalog!: (catalog: string[]) => void;
    const initialize = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          resolveCatalog = resolve;
        }),
    );

    const first = runtime.getOrInitialize(initialize);
    const second = runtime.getOrInitialize(initialize);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(runtime.getState().status).toBe("initializing");

    resolveCatalog([]);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
    expect(runtime.getState().status).toBe("ready");
  });

  it("clears a rejected initialization so a later call can retry", async () => {
    const initialize = vi
      .fn<() => Promise<string[]>>()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce([]);

    await expect(runtime.getOrInitialize(initialize)).rejects.toThrow("temporary failure");
    expect(runtime.getState().status).toBe("failed");

    await expect(runtime.getOrInitialize(initialize)).resolves.toEqual([]);
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(runtime.getState().status).toBe("ready");
  });
});
