import { logger } from "@/lib/utils/logger";

export type TbcplCategory = "movies" | "anime" | "manga" | "livetv" | "paid" | "apps";

export type TbcplSite = {
  name: string;
  url: string;
  category: TbcplCategory;
  position: number;
};

export type TbcplCatalog = {
  sites: TbcplSite[];
  fetchedAt: string;
  region: string;
};

const TBCPL_URL = "https://tbcplus.com/usa/";
const TIMEOUT_MS = 10_000;

/** Hardcoded fallback catalog — Live TV & Sports from TBCPL USA, scraped 2026-11-20. */
const TBCPL_FALLBACK: TbcplSite[] = [
  { name: "DaddyLive", url: "https://dlive.sx/", category: "livetv", position: 67 },
  { name: "DAMITV", url: "https://ondemand.st/", category: "livetv", position: 68 },
  { name: "Streamed.PK", url: "https://streamed.pk/", category: "livetv", position: 69 },
  { name: "Sport+", url: "https://en97.sportplus.watch/", category: "livetv", position: 70 },
  { name: "TheTvApp", url: "https://thetvapp.plus/", category: "livetv", position: 71 },
  { name: "NTVStream", url: "https://ntv.cx", category: "livetv", position: 72 },
  { name: "PublicIPTV", url: "https://publiciptv.com/", category: "livetv", position: 73 },
  { name: "StreamEast", url: "https://streamking.cx/", category: "livetv", position: 74 },
  { name: "iStreamEast", url: "https://streameast.cool/", category: "livetv", position: 75 },
  { name: "SportSurge", url: "https://v2.sportsurge.net/", category: "livetv", position: 76 },
  { name: "TV Garden", url: "https://famelack.com/", category: "livetv", position: 77 },
  { name: "RiveStream Sports", url: "https://rivestream.ru/livesports/", category: "livetv", position: 78 },
  { name: "Sportsbite", url: "https://sportsbite.org/", category: "livetv", position: 79 },
  { name: "Stmify", url: "https://stmify.com/", category: "livetv", position: 80 },
  { name: "ppv.to", url: "https://ppv.st/", category: "livetv", position: 81 },
  { name: "goalzen", url: "https://www.goalzen.site/", category: "livetv", position: 82 },
  { name: "freetvgarden", url: "https://freetvgarden.com/", category: "livetv", position: 83 },
  { name: "1Shows", url: "https://www.1shows.org/livetv", category: "livetv", position: 1 },
  { name: "1Flex", url: "https://www.1flex.org/", category: "movies", position: 2 },
  { name: "1Tube", url: "https://www.1tube.org/", category: "movies", position: 3 },
  { name: "FMovies", url: "https://fmovies-hd.to/home/", category: "movies", position: 23 },
  { name: "RiveStream", url: "https://rivestream.ru/", category: "movies", position: 7 },
  { name: "animepahe", url: "https://animepahe.pw/", category: "anime", position: 26 },
  { name: "Anikoto", url: "https://anikototv.to", category: "anime", position: 27 },
  { name: "MangaFire", url: "https://mangafire.to/home", category: "manga", position: 55 },
  { name: "Comick", url: "https://comick.dev/", category: "manga", position: 49 },
];

function categorizeTbcplItem(position: number): TbcplCategory {
  if (position <= 24) return "movies";
  if (position <= 43) return "anime";
  if (position <= 66) return "manga";
  if (position <= 83) return "livetv";
  if (position <= 95) return "paid";
  return "apps";
}

function extractJsonLd(html: string): TbcplSite[] {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    const graph = JSON.parse(match[1]);
    const nodes: unknown[] = Array.isArray(graph) ? graph : (graph["@graph"] ?? []);
    const listNode = nodes.find(
      (n): n is { "@type": string; itemListElement: unknown[] } =>
        typeof n === "object" &&
        n !== null &&
        (n as Record<string, unknown>)["@type"] === "ItemList",
    );
    if (!listNode) return [];
    return listNode.itemListElement
      .filter(
        (item): item is { position: number; name: string; url: string } =>
          typeof item === "object" && item !== null,
      )
      .map((item) => ({
        name: String(item.name ?? ""),
        url: String(item.url ?? ""),
        position: Number(item.position ?? 0),
        category: categorizeTbcplItem(Number(item.position ?? 0)),
      }))
      .filter((s) => s.name && s.url.startsWith("http"));
  } catch {
    return [];
  }
}

let cache: TbcplCatalog | null = null;
let inflight: Promise<TbcplCatalog> | null = null;

export async function fetchTbcplCatalog(): Promise<TbcplCatalog> {
  if (cache) return cache;
  if (inflight) return inflight;

  const fetchPromise = (async (): Promise<TbcplCatalog> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(TBCPL_URL, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MJTV/1.0)" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const sites = extractJsonLd(html);
      if (sites.length === 0) throw new Error("JSON-LD parse returned 0 items");
      const catalog: TbcplCatalog = {
        sites,
        fetchedAt: new Date().toISOString(),
        region: "usa",
      };
      cache = catalog;
      logger.info("tbcpl catalog fetched", { count: sites.length });
      return catalog;
    } catch (err) {
      logger.warn("tbcpl fetch failed, using fallback", {
        message: err instanceof Error ? err.message : String(err),
      });
      const fallback: TbcplCatalog = {
        sites: TBCPL_FALLBACK,
        fetchedAt: new Date().toISOString(),
        region: "usa",
      };
      cache = fallback;
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  })();

  inflight = fetchPromise;
  try {
    return await fetchPromise;
  } finally {
    if (inflight === fetchPromise) inflight = null;
  }
}

export function getTbcplByCategory(
  catalog: TbcplCatalog,
  category: TbcplCategory,
): TbcplSite[] {
  return catalog.sites
    .filter((s) => s.category === category)
    .sort((a, b) => a.position - b.position);
}

/** Test-only. */
export const __resetTbcplCache = (): void => {
  cache = null;
  inflight = null;
};
