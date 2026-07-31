import { describe, expect, it, vi } from "vitest";
import { EpgService, toPublicEpgSchedule } from "@/features/epg/application/epg-service";
import {
  calculateProgramProgress,
  selectCurrentAndNextPrograms,
} from "@/features/epg/application/programs";
import type { EpgProgram, EpgProvider, EpgProviderResult } from "@/features/epg/domain/types";

const NOW = new Date("2026-07-31T12:30:00.000Z");

const programs: EpgProgram[] = [
  {
    title: "Avant",
    startAt: "2026-07-31T11:00:00.000Z",
    endAt: "2026-07-31T12:00:00.000Z",
  },
  {
    title: "Journal",
    description: "Les titres du jour.",
    startAt: "2026-07-31T12:00:00.000Z",
    endAt: "2026-07-31T13:00:00.000Z",
  },
  {
    title: "À venir",
    startAt: "2026-07-31T13:00:00.000Z",
    endAt: "2026-07-31T14:00:00.000Z",
  },
];

const result = (updatedAt = "2026-07-31T12:25:00.000Z"): EpgProviderResult => ({
  programs,
  source: { id: "internal-provider", name: "Fixture test", kind: "fixture" },
  updatedAt,
});

const providerOf = (value: EpgProviderResult | null): EpgProvider => ({
  id: "test",
  load: vi.fn().mockResolvedValue(value),
});

describe("EPG programs", () => {
  it("detects the current and next programs", () => {
    expect(selectCurrentAndNextPrograms(programs, NOW)).toEqual({
      currentProgram: programs[1],
      nextProgram: programs[2],
    });
  });

  it.each([
    ["not started", "2026-07-31T12:00:00.000Z", 0],
    ["half", "2026-07-31T12:30:00.000Z", 50],
    ["finished", "2026-07-31T13:30:00.000Z", 100],
  ])("calculates bounded progress for a %s program", (_label, now, expected) => {
    expect(
      calculateProgramProgress("2026-07-31T12:00:00.000Z", "2026-07-31T13:00:00.000Z", now),
    ).toBe(expected);
  });

  it.each([
    ["invalid start", "invalid", "2026-07-31T13:00:00.000Z"],
    ["invalid end", "2026-07-31T12:00:00.000Z", "invalid"],
    ["reversed interval", "2026-07-31T13:00:00.000Z", "2026-07-31T12:00:00.000Z"],
  ])("returns zero for %s", (_label, startAt, endAt) => {
    expect(calculateProgramProgress(startAt, endAt, NOW)).toBe(0);
  });
});

describe("EpgService", () => {
  it("returns an available schedule with current and next programs", async () => {
    const service = new EpgService(providerOf(result()), { "channel-1": "epg-1" });
    const schedule = await service.getSchedule("channel-1", NOW);

    expect(schedule.status).toBe("available");
    expect(schedule.currentProgram?.title).toBe("Journal");
    expect(schedule.nextProgram?.title).toBe("À venir");
  });

  it("keeps a missing program explicit instead of inventing one", async () => {
    const service = new EpgService(providerOf({ ...result(), programs: [] }), {
      "channel-1": "epg-1",
    });

    const schedule = await service.getSchedule("channel-1", NOW);
    expect(schedule.currentProgram).toBeNull();
    expect(schedule.nextProgram).toBeNull();
  });

  it("marks old but displayable data as stale", async () => {
    const service = new EpgService(
      providerOf(result("2026-07-31T11:00:00.000Z")),
      { "channel-1": "epg-1" },
      { freshForMs: 15 * 60 * 1000, staleForMs: 2 * 60 * 60 * 1000 },
    );

    expect((await service.getSchedule("channel-1", NOW)).status).toBe("stale");
  });

  it("returns unknown for an unmapped channel without calling the provider", async () => {
    const provider = providerOf(result());
    const service = new EpgService(provider, {});

    const schedule = await service.getSchedule("missing", NOW);
    expect(schedule.status).toBe("unknown");
    expect(schedule.epgChannelId).toBeNull();
    expect(provider.load).not.toHaveBeenCalled();
  });

  it("turns an unresponsive provider into a non-blocking timeout state", async () => {
    const provider: EpgProvider = {
      id: "slow",
      load: vi.fn(() => new Promise<EpgProviderResult | null>(() => undefined)),
    };
    const service = new EpgService(provider, { "channel-1": "epg-1" }, { requestTimeoutMs: 5 });

    await expect(service.getSchedule("channel-1", NOW)).resolves.toMatchObject({
      status: "unavailable",
      errorCode: "timeout",
    });
  });

  it("evicts the oldest entry when the bounded cache is full", async () => {
    const provider = providerOf(result());
    const service = new EpgService(
      provider,
      { "channel-1": "epg-1", "channel-2": "epg-2" },
      { maxEntries: 1 },
    );

    await service.getSchedule("channel-1", NOW);
    await service.getSchedule("channel-2", NOW);
    await service.getSchedule("channel-1", NOW);
    expect(provider.load).toHaveBeenCalledTimes(3);
  });

  it("projects only the public allow-list", async () => {
    const service = new EpgService(providerOf(result()), { "channel-1": "epg-private" });
    const internal = await service.getSchedule("channel-1", NOW);
    const projection = toPublicEpgSchedule(internal);
    const serialized = JSON.stringify(projection);

    expect(projection.currentProgram?.title).toBe("Journal");
    expect(serialized).not.toMatch(/epg-private|internal-provider|errorCode|channelId/);
    expect(Object.keys(projection).sort()).toEqual(
      ["currentProgram", "nextProgram", "source", "status", "updatedAt"].sort(),
    );
  });
});
