import { describe, expect, it, vi } from "vitest";
import {
  decodeXmlText,
  parseXmltvPrograms,
  parseXmltvTimestamp,
} from "@/features/epg/infrastructure/xmltv-parser";
import {
  CompositeEpgProvider,
  XmltvEpgProvider,
} from "@/features/epg/infrastructure/xmltv-provider";
import { FixtureEpgProvider } from "@/features/epg/infrastructure/fixture-provider";
import { EpgService } from "@/features/epg/application/epg-service";

const SAMPLE_XMLTV = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="iptv-org/epg">
  <channel id="France24.fr">
    <display-name>France 24</display-name>
  </channel>
  <programme start="20260731120000 +0000" stop="20260731123000 +0000" channel="France24.fr">
    <title lang="fr">Le Journal &amp; l&#39;Économie</title>
    <desc lang="fr"><![CDATA[Toute l'actualité internationale en direct.]]></desc>
  </programme>
  <programme start="20260731143000 +0200" stop="20260731150000 +0200" channel="France24.fr">
    <title lang="fr">Débat du jour</title>
    <desc lang="fr">Analyse avec nos invités.</desc>
  </programme>
  <programme start="20260731160000 +0000" stop="20260731150000 +0000" channel="France24.fr">
    <title lang="fr">Intervalle inversé invalide</title>
  </programme>
</tv>`;

describe("XMLTV parser", () => {
  it("parses XMLTV timestamps with UTC and timezone offsets", () => {
    expect(parseXmltvTimestamp("20260731120000 +0000")).toBe("2026-07-31T12:00:00.000Z");
    expect(parseXmltvTimestamp("20260731143000 +0200")).toBe("2026-07-31T12:30:00.000Z");
    expect(parseXmltvTimestamp("20260731070000 -0500")).toBe("2026-07-31T12:00:00.000Z");
    expect(parseXmltvTimestamp("invalid")).toBeNull();
  });

  it("decodes XML entities and CDATA safely", () => {
    expect(decodeXmlText("Le Journal &amp; l&#39;Économie &lt;Direct&gt;")).toBe(
      "Le Journal & l'Économie <Direct>",
    );
    expect(decodeXmlText("<![CDATA[Édition spéciale]]>")).toBe("Édition spéciale");
  });

  it("extracts valid sorted programs per channel and skips reversed intervals", () => {
    const byChannel = parseXmltvPrograms(SAMPLE_XMLTV);
    const programs = byChannel.get("France24.fr");

    expect(programs).toBeDefined();
    expect(programs).toHaveLength(2);
    expect(programs?.[0]).toEqual({
      title: "Le Journal & l'Économie",
      description: "Toute l'actualité internationale en direct.",
      startAt: "2026-07-31T12:00:00.000Z",
      endAt: "2026-07-31T12:30:00.000Z",
    });
    expect(programs?.[1]?.title).toBe("Débat du jour");
  });
});

describe("XmltvEpgProvider & EpgService integration", () => {
  const NOW = new Date("2026-07-31T12:15:00.000Z");

  it("loads XMLTV schedules from an allowed HTTPS origin and integrates with EpgService", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(SAMPLE_XMLTV, {
        status: 200,
        headers: { "content-type": "application/xml" },
      }),
    );

    const provider = new XmltvEpgProvider({
      feedUrl: "https://iptv-org.github.io/epg/guides/fr.xml",
      allowedOrigins: ["https://iptv-org.github.io"],
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const service = new EpgService(provider, {
      "France24.fr": "xmltv:France24.fr",
    });

    const schedule = await service.getSchedule("France24.fr", NOW);
    expect(schedule.status).toBe("available");
    expect(schedule.currentProgram?.title).toBe("Le Journal & l'Économie");
    expect(schedule.nextProgram?.title).toBe("Débat du jour");
    expect(schedule.source?.kind).toBe("remote");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTTPS or unlisted origins and falls back to unavailable", async () => {
    const fetchMock = vi.fn();
    const provider = new XmltvEpgProvider({
      feedUrl: "http://untrusted.example.com/guide.xml",
      allowedOrigins: ["https://iptv-org.github.io"],
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const service = new EpgService(provider, { "France24.fr": "xmltv:France24.fr" });
    const schedule = await service.getSchedule("France24.fr", NOW);

    expect(schedule.status).toBe("unavailable");
    expect(schedule.errorCode).toBe("provider_error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized XMLTV payloads exceeding maxBytes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(SAMPLE_XMLTV, {
        status: 200,
        headers: { "content-length": "9999999" },
      }),
    );

    const provider = new XmltvEpgProvider({
      feedUrl: "https://iptv-org.github.io/epg/guides/fr.xml",
      allowedOrigins: ["https://iptv-org.github.io"],
      maxBytes: 256,
      fetchFn: fetchMock as unknown as typeof fetch,
    });

    const service = new EpgService(provider, { "France24.fr": "xmltv:France24.fr" });
    const schedule = await service.getSchedule("France24.fr", NOW);

    expect(schedule.status).toBe("unavailable");
    expect(schedule.errorCode).toBe("provider_error");
  });

  it("routes fixture:* to FixtureEpgProvider and xmltv:* to XmltvEpgProvider via CompositeEpgProvider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(SAMPLE_XMLTV, { status: 200 }));
    const composite = new CompositeEpgProvider([
      new FixtureEpgProvider(),
      new XmltvEpgProvider({
        feedUrl: "https://iptv-org.github.io/epg/guides/fr.xml",
        allowedOrigins: ["https://iptv-org.github.io"],
        fetchFn: fetchMock as unknown as typeof fetch,
      }),
    ]);

    const service = new EpgService(composite, {
      "demo-fr": "fixture:demo-fr",
      "France24.fr": "xmltv:France24.fr",
    });

    const fixtureSchedule = await service.getSchedule("demo-fr", NOW);
    expect(fixtureSchedule.status).toBe("available");
    expect(fixtureSchedule.source?.kind).toBe("fixture");

    const xmltvSchedule = await service.getSchedule("France24.fr", NOW);
    expect(xmltvSchedule.status).toBe("available");
    expect(xmltvSchedule.source?.kind).toBe("remote");
  });
});
