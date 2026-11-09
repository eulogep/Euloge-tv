import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTransfer,
  collectTransfer,
  decodeTransfer,
  encodeTransfer,
  transferUrl,
  type TransferPayload,
} from "@/features/transfer/transfer";
import { JOURNEYS_KEY } from "@/features/journeys/domain/journey";

const payload: TransferPayload = {
  v: 1,
  favorites: ["RTS1.sn", "TéléÉté.fr"],
  country: "SN",
  languages: ["fra"],
  categories: ["news"],
  journeys: [{ id: "a", name: "Sénégal", filters: { country: "SN" } }],
};

const readFavorites = () =>
  (
    JSON.parse(localStorage.getItem("mjtv:favorites:v1") ?? '{"channelIds":[]}') as {
      channelIds: string[];
    }
  ).channelIds;

describe("carrying choices to another device", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips accents through a link fragment", () => {
    expect(decodeTransfer(encodeTransfer(payload))).toEqual(payload);
    const url = new URL(transferUrl("https://mjtv.test", payload));
    expect(url.search).toBe("");
    expect(url.hash.startsWith("#transfer=")).toBe(true);
  });

  it("rejects anything that is not exactly a transfer", () => {
    const encode = (value: unknown) => btoa(JSON.stringify(value));
    for (const bad of [
      "",
      "not base64 !!",
      btoa("not json"),
      encode({ v: 2, favorites: [] }),
      encode({ v: 1, favorites: "RTS1.sn" }),
      encode({ v: 1, favorites: [], country: "<script>" }),
      encode({ v: 1, favorites: [], categories: ["nope"] }),
      "x".repeat(30_000),
    ]) {
      expect(decodeTransfer(bad), bad.slice(0, 30)).toBeNull();
    }
  });

  it("drops malformed journeys rather than storing them", () => {
    applyTransfer({ v: 1, favorites: [], journeys: [{ id: 1 }, { nonsense: true }] });
    expect(localStorage.getItem(JOURNEYS_KEY)).toBeNull();
  });

  it("adds to what is already here and never removes anything", () => {
    localStorage.setItem("mjtv:favorites:v1", JSON.stringify({ version: 1, channelIds: ["mine"] }));
    localStorage.setItem(
      JOURNEYS_KEY,
      JSON.stringify({
        version: 1,
        items: [{ id: "x", name: "Déjà là", filters: { country: "SN", sort: "quality" } }],
      }),
    );
    applyTransfer({
      ...payload,
      journeys: [
        { id: "dup", name: "Doublon", filters: { country: "SN" } },
        { id: "new", name: "Nouvelle", filters: { country: "FR" } },
      ],
    });
    expect(readFavorites()).toEqual(["mine", "RTS1.sn", "TéléÉté.fr"]);
    const journeys = JSON.parse(localStorage.getItem(JOURNEYS_KEY)!).items as { name: string }[];
    expect(journeys.map((journey) => journey.name)).toEqual(["Déjà là", "Nouvelle"]);
  });

  it("collects the saved journeys into the payload", () => {
    localStorage.setItem(JOURNEYS_KEY, JSON.stringify({ version: 1, items: payload.journeys }));
    const collected = collectTransfer({
      favorites: ["a"],
      country: null,
      languages: [],
      categories: [],
    });
    expect(collected.journeys).toHaveLength(1);
    expect(decodeTransfer(encodeTransfer(collected))).toEqual(collected);
  });
});
