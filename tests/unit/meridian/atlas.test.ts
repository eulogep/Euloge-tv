import { describe, expect, it } from "vitest";
import {
  atlasFromSummaries,
  primeTimeStop,
  stopsAtHour,
  stopsFromAtlas,
  worldMoments,
  type Atlas,
} from "@/features/meridian/domain/atlas";
import { localClock, PLACES, placeOf } from "@/features/meridian/domain/places";
import type { ChannelSummary } from "@/features/catalog/domain/types";

const CATALOG_COUNTRIES =
  "US IN RU BR CN DE ES IT CA UK FR MX CO CL AR SE PE TR UA ID RS PL DO NL NG KR RO JP TH BO GR ZA GH EC PK VN VE IR AU HU CD SA CH PY KE GT HN UY BG PT IQ CZ AL PH BE AE IL CR TW MN HK AT CM NP EG NI SK SI ET UG BA SN FI GE TZ KZ LK NO SG SV HR IE BD EE QA DK UZ NZ PR XK CI MK BJ MM MD JO PA MY AM CY SR ZM AO HT MZ LT MG ML LB DZ KH AF CU BY AZ TT TG LV PS GN BF JM GY KG ME SD MA SY TN LY RW KW LA MV IS SO CG LU YE BZ ZW LR NE GA MW AW MR SL BI TJ MT BS MQ MU LC MO SX NA BB GP PG GU TD CV RE SS GQ GD BW BQ FJ VI WS TM DJ BM GM CW AS VA OM BH SC KY YT LI CK KN MC TL GF GL KP FO VG AG VC NC PF TO DM BN SB VU TC AI BT SZ CF MP PW AD ER FM GI TV KM KI GW SM AX FK MS LS NR SH EH PM NU ST WF".split(
    " ",
  );

const atlas = (...codes: string[]): Atlas => ({
  generatedAt: "2026-01-01T00:00:00.000Z",
  countries: codes.map((code) => ({
    code,
    name: code,
    count: 10,
    stations: [{ id: `${code}-1`, name: code, logoUrl: null, category: "news", health: "healthy" }],
  })),
});

const summary = (id: string, countryCode: string | null, status = "healthy"): ChannelSummary =>
  ({
    id,
    name: id,
    alternativeNames: [],
    countryCode,
    countryName: countryCode,
    countryFlag: null,
    languageCodes: [],
    primaryCategory: "news",
    categories: ["news"],
    tags: [],
    logoUrl: null,
    websiteUrl: null,
    isNsfw: false,
    streamCount: 1,
    bestCompatibility: "preferred",
    health: {
      status,
      checkedAt: null,
      sourceCount: 1,
      playableSourceCount: 1,
      reasonCode: "x",
      reasonMessage: "x",
    },
  }) as ChannelSummary;

describe("places", () => {
  it("knows every country the catalog broadcasts from", () => {
    expect(CATALOG_COUNTRIES.filter((code) => !placeOf(code))).toEqual([]);
  });

  it("only uses time zones the runtime can read, and plausible coordinates", () => {
    for (const place of PLACES.values()) {
      expect(() => new Intl.DateTimeFormat("en", { timeZone: place.timeZone })).not.toThrow();
      expect(Math.abs(place.latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(place.longitude)).toBeLessThanOrEqual(180);
    }
  });

  it("reads the official clock of a place, daylight saving included", () => {
    expect(localClock(new Date("2026-07-01T18:30:00Z"), "Europe/Paris").label).toBe("20:30");
    expect(localClock(new Date("2026-01-01T19:30:00Z"), "Europe/Paris").label).toBe("20:30");
    expect(localClock(new Date("2026-01-01T20:05:00Z"), "Africa/Dakar").label).toBe("20:05");
  });
});

describe("the dial's stops", () => {
  it("orders stops west to east and drops countries with nothing to tune", () => {
    const stops = stopsFromAtlas({
      ...atlas("JP", "SN", "FR"),
      countries: [
        ...atlas("JP", "SN", "FR").countries,
        { code: "BE", name: "BE", count: 3, stations: [] },
      ],
    });
    expect(stops.map((stop) => stop.code)).toEqual(["SN", "FR", "JP"]);
  });

  it("drops countries without a known place", () => {
    expect(stopsFromAtlas(atlas("ZZ"))).toEqual([]);
  });

  it("builds a fallback atlas from loaded channels, ignoring unplayable ones", () => {
    const fallback = atlasFromSummaries([
      summary("a", "FR"),
      summary("b", "FR", "unavailable"),
      summary("c", null),
      summary("d", "SN"),
    ]);
    expect(fallback.countries.map((country) => [country.code, country.stations.length])).toEqual([
      ["FR", 1],
      ["SN", 1],
    ]);
  });
});

describe("it is always 20 h somewhere", () => {
  const stops = stopsFromAtlas(atlas(...CATALOG_COUNTRIES));

  it("finds a place near 20 h at every hour of the year's extremes", () => {
    for (const month of ["01", "07"]) {
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date(`2026-${month}-15T${String(hour).padStart(2, "0")}:10:00Z`);
        const stop = primeTimeStop(stops, date);
        expect(stop, date.toISOString()).not.toBeNull();
        const clock = localClock(date, stop!.place.timeZone);
        const minutes = clock.hour * 60 + clock.minute;
        expect(
          Math.abs(minutes - 20 * 60 - 30),
          `${stop!.code} ${clock.label}`,
        ).toBeLessThanOrEqual(90);
      }
    }
  });

  it("gives the first word to MJTV's own audience when several share the hour", () => {
    const date = new Date("2026-01-15T20:10:00Z");
    expect(stopsAtHour(stops, date, 20)[0]?.code).toMatch(/^(SN|CI|BF|ML|TG|GH|GN)$/);
  });

  it("fills four moments of the day with real local times", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    const moments = worldMoments(stops, date);
    expect(moments.map((moment) => moment.id)).toEqual(["reveil", "midi", "vingt-heures", "nuit"]);
    for (const moment of moments) {
      expect(moment.stops.length).toBeGreaterThan(0);
      for (const stop of moment.stops) {
        const { hour } = localClock(date, stop.place.timeZone);
        const distance = Math.abs(hour - moment.hour);
        expect(Math.min(distance, 24 - distance), `${moment.id} ${stop.code}`).toBeLessThanOrEqual(
          2,
        );
      }
    }
  });

  it("leaves a moment empty rather than claim the wrong hour", () => {
    const lonely = stopsFromAtlas(atlas("FR"));
    const moments = worldMoments(lonely, new Date("2026-01-15T03:00:00Z"));
    expect(moments.flatMap((moment) => moment.stops)).toEqual([]);
  });

  it("still answers when the catalog only covers one time zone", () => {
    const lonely = stopsFromAtlas(atlas("FR"));
    expect(primeTimeStop(lonely, new Date("2026-01-15T03:00:00Z"))?.code).toBe("FR");
  });
});
