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

  it("does not publish stale state when reset interrupts initialization", async () => {
    let resolveCatalog!: (catalog: string[]) => void;
    const pending = runtime.getOrInitialize(
      () =>
        new Promise<string[]>((resolve) => {
          resolveCatalog = resolve;
        }),
    );

    runtime.reset();
    resolveCatalog(["stale"]);

    await expect(pending).resolves.toEqual(["stale"]);
    expect(runtime.getState()).toEqual({ status: "idle", catalogAvailable: false });

    await expect(runtime.getOrInitialize(async () => ["fresh"])).resolves.toEqual(["fresh"]);
    expect(runtime.getState()).toEqual({ status: "ready", catalogAvailable: true });
  });

  it("does not let a stale rejection overwrite a later ready state", async () => {
    let rejectCatalog!: (error: Error) => void;
    const stale = runtime.getOrInitialize(
      () =>
        new Promise<string[]>((_, reject) => {
          rejectCatalog = reject;
        }),
    );

    runtime.reset();
    await runtime.getOrInitialize(async () => ["fresh"]);
    rejectCatalog(new Error("stale failure"));

    await expect(stale).rejects.toThrow("stale failure");
    expect(runtime.getState()).toEqual({ status: "ready", catalogAvailable: true });
  });
});
