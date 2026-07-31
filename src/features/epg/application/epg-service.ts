import type {
  EpgProvider,
  EpgProviderResult,
  EpgSchedule,
  PublicEpgSchedule,
} from "../domain/types";
import { isValidProgram, selectCurrentAndNextPrograms } from "./programs";

export type EpgChannelMapping = Readonly<Record<string, string>>;

export type EpgServiceOptions = {
  freshForMs: number;
  staleForMs: number;
  requestTimeoutMs: number;
  maxEntries: number;
  maxProgramsPerChannel: number;
};

type CacheEntry = {
  result: EpgProviderResult;
  fetchedAt: number;
};

const DEFAULT_OPTIONS: EpgServiceOptions = {
  freshForMs: 15 * 60 * 1000,
  staleForMs: 6 * 60 * 60 * 1000,
  requestTimeoutMs: 1_500,
  maxEntries: 128,
  maxProgramsPerChannel: 96,
};

const unavailableSchedule = (
  channelId: string,
  epgChannelId: string | null,
  status: EpgSchedule["status"],
  errorCode?: EpgSchedule["errorCode"],
): EpgSchedule => ({
  channelId,
  epgChannelId,
  currentProgram: null,
  nextProgram: null,
  source: null,
  updatedAt: null,
  status,
  ...(errorCode ? { errorCode } : {}),
});

export class EpgService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly options: EpgServiceOptions;

  constructor(
    private readonly provider: EpgProvider,
    private readonly mapping: EpgChannelMapping,
    options: Partial<EpgServiceOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async getSchedule(channelId: string, now = new Date()): Promise<EpgSchedule> {
    const epgChannelId = this.mapping[channelId];
    if (!epgChannelId) return unavailableSchedule(channelId, null, "unknown");

    const cached = this.cache.get(channelId);
    if (cached && now.getTime() - cached.fetchedAt <= this.options.freshForMs) {
      return this.scheduleFromResult(channelId, epgChannelId, cached.result, now);
    }

    try {
      const result = await this.loadWithTimeout(epgChannelId, now);
      if (!result || !this.isValidResult(result)) {
        return this.fallback(channelId, epgChannelId, cached, now, "invalid_payload");
      }
      const boundedResult = {
        ...result,
        programs: result.programs.slice(0, this.options.maxProgramsPerChannel),
      };
      this.setCache(channelId, { result: boundedResult, fetchedAt: now.getTime() });
      return this.scheduleFromResult(channelId, epgChannelId, boundedResult, now);
    } catch (error) {
      const code =
        error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_error";
      return this.fallback(channelId, epgChannelId, cached, now, code);
    }
  }

  private async loadWithTimeout(
    epgChannelId: string,
    now: Date,
  ): Promise<EpgProviderResult | null> {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new DOMException("EPG provider timeout", "AbortError"));
      }, this.options.requestTimeoutMs);
    });
    try {
      return await Promise.race([
        this.provider.load(epgChannelId, { signal: controller.signal, now }),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private isValidResult(result: EpgProviderResult): boolean {
    return (
      result.source.id.trim().length > 0 &&
      result.source.name.trim().length > 0 &&
      Number.isFinite(Date.parse(result.updatedAt)) &&
      result.programs.every(isValidProgram)
    );
  }

  private scheduleFromResult(
    channelId: string,
    epgChannelId: string,
    result: EpgProviderResult,
    now: Date,
  ): EpgSchedule {
    const age = Math.max(0, now.getTime() - Date.parse(result.updatedAt));
    if (age > this.options.staleForMs) {
      return unavailableSchedule(channelId, epgChannelId, "unavailable");
    }
    const { currentProgram, nextProgram } = selectCurrentAndNextPrograms(result.programs, now);
    return {
      channelId,
      epgChannelId,
      currentProgram,
      nextProgram,
      source: result.source,
      updatedAt: result.updatedAt,
      status: age > this.options.freshForMs ? "stale" : "available",
    };
  }

  private fallback(
    channelId: string,
    epgChannelId: string,
    cached: CacheEntry | undefined,
    now: Date,
    errorCode: NonNullable<EpgSchedule["errorCode"]>,
  ): EpgSchedule {
    if (cached) {
      const cachedSchedule = this.scheduleFromResult(channelId, epgChannelId, cached.result, now);
      if (cachedSchedule.status !== "unavailable") {
        return { ...cachedSchedule, status: "stale", errorCode };
      }
    }
    return unavailableSchedule(channelId, epgChannelId, "unavailable", errorCode);
  }

  private setCache(channelId: string, entry: CacheEntry): void {
    this.cache.delete(channelId);
    this.cache.set(channelId, entry);
    while (this.cache.size > this.options.maxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
  }
}

export const toPublicEpgSchedule = (schedule: EpgSchedule): PublicEpgSchedule => ({
  currentProgram: schedule.currentProgram,
  nextProgram: schedule.nextProgram,
  source: schedule.source ? { name: schedule.source.name, kind: schedule.source.kind } : null,
  updatedAt: schedule.updatedAt,
  status: schedule.status,
});
