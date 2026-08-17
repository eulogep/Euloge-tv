export type CatalogRuntimeStatus = "idle" | "initializing" | "ready" | "failed";

export class CatalogRuntime<T> {
  private generation = 0;
  private value: T | null = null;
  private inflight: Promise<T> | null = null;
  private status: CatalogRuntimeStatus = "idle";

  constructor(private readonly isAvailable: (value: T) => boolean) {}

  getState(): { status: CatalogRuntimeStatus; catalogAvailable: boolean } {
    return {
      status: this.status,
      catalogAvailable: this.value !== null && this.isAvailable(this.value),
    };
  }

  async getOrInitialize(initialize: () => Promise<T>): Promise<T> {
    if (this.value !== null) return this.value;
    if (this.inflight) return this.inflight;

    const generation = this.generation;
    this.status = "initializing";
    const initialization = initialize().then((value) => {
      if (this.generation === generation) {
        this.value = value;
        this.status = "ready";
      }
      return value;
    });
    this.inflight = initialization;

    try {
      return await initialization;
    } catch (error) {
      if (this.generation === generation) this.status = "failed";
      throw error;
    } finally {
      if (this.inflight === initialization) this.inflight = null;
    }
  }

  reset(): void {
    this.generation += 1;
    this.value = null;
    this.inflight = null;
    this.status = "idle";
  }
}
