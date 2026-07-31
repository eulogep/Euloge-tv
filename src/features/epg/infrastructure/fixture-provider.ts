import type { EpgProgram, EpgProvider, EpgProviderResult } from "../domain/types";

const SLOT_MS = 30 * 60 * 1000;

const TITLES = [
  {
    title: "Le journal en direct",
    description: "Les principaux titres et les dernières informations.",
  },
  {
    title: "Météo et analyses",
    description: "Prévisions et décryptage de l’actualité.",
  },
  {
    title: "Le grand entretien",
    description: "Une personnalité répond aux questions de la rédaction.",
  },
  {
    title: "L’actualité internationale",
    description: "Le point sur les événements dans le monde.",
  },
] as const;

const seedOf = (value: string): number =>
  [...value].reduce((seed, character) => seed + character.charCodeAt(0), 0);

const programsAround = (epgChannelId: string, now: Date): EpgProgram[] => {
  const slotStart = Math.floor(now.getTime() / SLOT_MS) * SLOT_MS;
  const seed = seedOf(epgChannelId);
  return [-1, 0, 1, 2].map((offset) => {
    const copy = TITLES[(seed + Math.floor(slotStart / SLOT_MS) + offset) % TITLES.length]!;
    const startAt = new Date(slotStart + offset * SLOT_MS);
    return {
      ...copy,
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + SLOT_MS).toISOString(),
    };
  });
};

/**
 * Deterministic local provider used by the first EPG iteration and by tests.
 * It performs no network request and can later be replaced behind EpgProvider.
 */
export class FixtureEpgProvider implements EpgProvider {
  readonly id = "mjtv-fixture";

  async load(
    epgChannelId: string,
    { signal, now }: { signal: AbortSignal; now: Date },
  ): Promise<EpgProviderResult | null> {
    if (signal.aborted) throw new DOMException("EPG request aborted", "AbortError");
    if (!epgChannelId.startsWith("fixture:")) return null;
    const updatedAt = new Date(Math.floor(now.getTime() / SLOT_MS) * SLOT_MS).toISOString();
    return {
      programs: programsAround(epgChannelId, now),
      source: {
        id: this.id,
        name: "Guide MJTV de démonstration",
        kind: "fixture",
      },
      updatedAt,
    };
  }
}
