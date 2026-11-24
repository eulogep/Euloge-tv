import { describe, expect, it } from "vitest";
import {
  classifyChannelProvenance,
  extractDatabaseMetadata,
  filterChannelsBySourceOrigin,
} from "@/features/catalog/application/source-provenance";

describe("classifyChannelProvenance", () => {
  it("classifies local user-imported M3U channels as user_imported", () => {
    const info = classifyChannelProvenance({
      id: "imported:1700000:0:tf1",
      streamCount: 1,
      bestAvailability: "playable",
    });

    expect(info.tier).toBe("user_imported");
    expect(info.label).toBe("Playlist personnelle");
    expect(info.isUserLocal).toBe(true);
    expect(info.redistributable).toBe(false);
  });

  it("classifies official broadcaster channels (e.g. RTS) as official_broadcaster", () => {
    const info = classifyChannelProvenance({
      id: "RTS1.sn",
      streamCount: 1,
      bestAvailability: "playable",
    });

    expect(info.tier).toBe("official_broadcaster");
    expect(info.label).toBe("Diffuseur officiel");
    expect(info.redistributable).toBe(true);
  });

  it("classifies healthy public catalog channels as verified_public", () => {
    const info = classifyChannelProvenance({
      id: "France24.fr",
      streamCount: 1,
      bestAvailability: "playable",
      health: {
        status: "healthy",
        checkedAt: "2026-07-31T12:00:00.000Z",
        sourceCount: 1,
        playableSourceCount: 1,
        reasonCode: "recent_playable_source",
        reasonMessage: "ok",
      },
    });

    expect(info.tier).toBe("verified_public");
    expect(info.label).toBe("Flux public vérifié");
    expect(info.redistributable).toBe(false);
  });

  it("classifies unverified public catalog channels as public_unverified", () => {
    const info = classifyChannelProvenance({
      id: "Unknown.tv",
      streamCount: 1,
      bestAvailability: "unknown",
    });

    expect(info.tier).toBe("public_unverified");
    expect(info.label).toBe("Catalogue public");
  });
});

describe("extractDatabaseMetadata", () => {
  it("extracts network, owners, subdivision, launchedYear, and language names", () => {
    const meta = extractDatabaseMetadata(
      {
        network: "France Médias Monde",
        owners: "État français; France Télévisions",
        subdivision: "FR-IDF",
        launched: "2006-12-06",
      },
      ["fra", "eng"],
      [
        { code: "fra", name: "French" },
        { code: "eng", name: "English" },
      ],
    );

    expect(meta).toEqual({
      network: "France Médias Monde",
      owners: ["État français", "France Télévisions"],
      subdivision: "FR-IDF",
      launchedYear: 2006,
      languageNames: ["French", "English"],
    });
  });
});

describe("filterChannelsBySourceOrigin", () => {
  const sample = [{ id: "France24.fr" }, { id: "imported:123:0:MyChannel" }];

  it("filters iptv-org vs imported channels", () => {
    expect(filterChannelsBySourceOrigin(sample, "iptv-org")).toEqual([{ id: "France24.fr" }]);
    expect(filterChannelsBySourceOrigin(sample, "imported")).toEqual([
      { id: "imported:123:0:MyChannel" },
    ]);
    expect(filterChannelsBySourceOrigin(sample, "all")).toHaveLength(2);
  });
});
