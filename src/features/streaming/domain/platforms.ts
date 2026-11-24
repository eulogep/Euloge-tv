import type { TbcplCategory, TbcplSite } from "@/features/catalog/infrastructure/tbcpl-client";

export type StreamingCategory =
  | "all"
  | "official"
  | "movies"
  | "anime"
  | "livetv"
  | "replay"
  | "manga"
  | "custom";

export type OfficialPlatform = {
  id: string;
  name: string;
  url: string;
  tagline: string;
  badge: string;
  region: string;
  category: Exclude<StreamingCategory, "all" | "official" | "custom">;
  accent: string;
  monogram: string;
  free: boolean;
};

export type CustomPortal = {
  id: string;
  name: string;
  url: string;
  category: Exclude<StreamingCategory, "all" | "official" | "custom">;
  addedAt: string;
};

export type StreamingDestination = {
  id: string;
  name: string;
  url: string;
  subtitle: string;
  badge: string;
  category: Exclude<StreamingCategory, "all" | "official" | "custom">;
  source: "official" | "tbcpl" | "custom";
  accent: string;
  monogram: string;
};

export const STREAMING_CATEGORIES: readonly { id: StreamingCategory; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "official", label: "Officielles" },
  { id: "movies", label: "Films & Séries" },
  { id: "replay", label: "Replay & Docs" },
  { id: "anime", label: "Animés" },
  { id: "livetv", label: "Live & Sports" },
  { id: "manga", label: "Manga" },
  { id: "custom", label: "Mes portails" },
] as const;

export const OFFICIAL_PLATFORMS: readonly OfficialPlatform[] = [
  {
    id: "official:arte",
    name: "Arte.tv",
    url: "https://www.arte.tv/fr/",
    tagline: "Cinéma d’auteur, grands documentaires, séries européennes et concerts.",
    badge: "Gratuit · Sans pub",
    region: "Europe",
    category: "replay",
    accent: "#fa481c",
    monogram: "AR",
    free: true,
  },
  {
    id: "official:francetv",
    name: "France.tv",
    url: "https://www.france.tv/",
    tagline: "Directs, séries françaises, cinéma, culture et grands événements sportifs.",
    badge: "Gratuit · Replay",
    region: "France",
    category: "replay",
    accent: "#2563eb",
    monogram: "FT",
    free: true,
  },
  {
    id: "official:pluto",
    name: "Pluto TV",
    url: "https://pluto.tv/fr/",
    tagline: "Plus de 100 chaînes thématiques cinéma, séries et films à la demande.",
    badge: "Gratuit · Sans compte",
    region: "International",
    category: "movies",
    accent: "#f5b942",
    monogram: "PL",
    free: true,
  },
  {
    id: "official:plex",
    name: "Plex Free Movies",
    url: "https://watch.plex.tv/",
    tagline: "Milliers de films, séries cultes et chaînes FAST accessibles partout.",
    badge: "Gratuit · AVOD",
    region: "Mondial",
    category: "movies",
    accent: "#e5a00d",
    monogram: "PX",
    free: true,
  },
  {
    id: "official:tv5mondeplus",
    name: "TV5MONDEplus",
    url: "https://www.tv5mondeplus.com/",
    tagline: "Cinéma, séries et documentaires francophones d’Afrique, d’Europe et du Québec.",
    badge: "Gratuit · Francophonie",
    region: "Mondial",
    category: "replay",
    accent: "#0ea5e9",
    monogram: "T5",
    free: true,
  },
  {
    id: "official:tf1plus",
    name: "TF1+",
    url: "https://www.tf1.fr/",
    tagline: "Films, fictions françaises, divertissements et streaming en continu.",
    badge: "Gratuit · AVOD",
    region: "France",
    category: "replay",
    accent: "#e11d48",
    monogram: "T1",
    free: true,
  },
  {
    id: "official:m6plus",
    name: "M6+",
    url: "https://www.6play.fr/",
    tagline: "Séries, longs-métrages, magazines et chaînes numériques thématiques.",
    badge: "Gratuit · AVOD",
    region: "France",
    category: "replay",
    accent: "#ec4899",
    monogram: "M6",
    free: true,
  },
  {
    id: "official:rakuten",
    name: "Rakuten TV Gratuit",
    url: "https://www.rakuten.tv/fr/gardens/free",
    tagline: "Catalogue cinéma gratuit et chaînes thématiques en streaming HD.",
    badge: "Gratuit · Cinéma",
    region: "Europe",
    category: "movies",
    accent: "#eab308",
    monogram: "RK",
    free: true,
  },
  {
    id: "official:rtsplay",
    name: "RTS Play",
    url: "https://www.rts.ch/play/",
    tagline: "Séries, longs-métrages, enquêtes et directs de la télévision suisse.",
    badge: "Gratuit · Suisse",
    region: "Suisse",
    category: "replay",
    accent: "#dc2626",
    monogram: "RT",
    free: true,
  },
  {
    id: "official:auvio",
    name: "RTBF Auvio",
    url: "https://auvio.rtbf.be/",
    tagline: "Cinéma, séries, sport en direct et podcasts vidéo belges.",
    badge: "Gratuit · Belgique",
    region: "Belgique",
    category: "replay",
    accent: "#8b5cf6",
    monogram: "AU",
    free: true,
  },
  {
    id: "official:toutv",
    name: "ICI TOU.TV",
    url: "https://ici.tou.tv/",
    tagline: "Fictions, séries québécoises, humour et documentaires Radio-Canada.",
    badge: "Gratuit · Canada",
    region: "Canada",
    category: "replay",
    accent: "#ef4444",
    monogram: "IC",
    free: true,
  },
  {
    id: "official:archive",
    name: "Internet Archive Cinéma",
    url: "https://archive.org/details/movies",
    tagline: "Grands classiques du cinéma, sci-fi vintage et documentaires libres.",
    badge: "Domaine public",
    region: "Mondial",
    category: "movies",
    accent: "#14b8a6",
    monogram: "IA",
    free: true,
  },
  {
    id: "official:crunchyroll",
    name: "Crunchyroll",
    url: "https://www.crunchyroll.com/fr",
    tagline: "Simulcasts japonais, shōnen, seinen et films d’animation en VOSTFR/VF.",
    badge: "Anime · Référence",
    region: "Mondial",
    category: "anime",
    accent: "#f47521",
    monogram: "CR",
    free: false,
  },
  {
    id: "official:adn",
    name: "ADN (Animation Digital)",
    url: "https://animationdigitalnetwork.com/",
    tagline: "Catalogue d’animation japonaise et franco-belge en streaming HD.",
    badge: "Anime · FR",
    region: "France",
    category: "anime",
    accent: "#38bdf8",
    monogram: "AD",
    free: false,
  },
  {
    id: "official:fifaplus",
    name: "FIFA+",
    url: "https://www.plus.fifa.com/fr/",
    tagline: "Matchs en direct du monde entier, archives Coupe du monde et docs foot.",
    badge: "Gratuit · Sport",
    region: "Mondial",
    category: "livetv",
    accent: "#3b82f6",
    monogram: "FI",
    free: true,
  },
  {
    id: "official:redbull",
    name: "Red Bull TV",
    url: "https://www.redbull.com/fr-fr/live-events",
    tagline: "Sports extrêmes, concerts live et documentaires d’aventure en direct.",
    badge: "Gratuit · Sport",
    region: "Mondial",
    category: "livetv",
    accent: "#e11d48",
    monogram: "RB",
    free: true,
  },
  {
    id: "official:twitch",
    name: "Twitch",
    url: "https://www.twitch.tv/",
    tagline: "Directs gaming, esports, musique live, talk-shows et IRL 24/7.",
    badge: "Direct · Live",
    region: "Mondial",
    category: "livetv",
    accent: "#9146ff",
    monogram: "TW",
    free: true,
  },
  {
    id: "official:youtube-live",
    name: "YouTube Live",
    url: "https://www.youtube.com/live",
    tagline: "Chaînes d’info internationales, événements sportifs et concerts en direct.",
    badge: "Direct · Mondial",
    region: "Mondial",
    category: "livetv",
    accent: "#ff0033",
    monogram: "YT",
    free: true,
  },
];

const TBCPL_ACCENTS: Record<TbcplCategory, string> = {
  movies: "#f5b942",
  anime: "#f97316",
  livetv: "#38bdf8",
  manga: "#a855f7",
  paid: "#10b981",
  apps: "#64748b",
};

const TBCPL_LABELS: Record<TbcplCategory, string> = {
  movies: "Films & Séries",
  anime: "Animés",
  livetv: "Live & Sports",
  manga: "Manga",
  paid: "Plateforme",
  apps: "Application",
};

export const displayHostname = (rawUrl: string): string => {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "");
  } catch {
    return rawUrl;
  }
};

export const makeMonogram = (name: string): string => {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
  }
  const single = words[0] ?? "ST";
  return single.slice(0, 2).toUpperCase();
};

export const isSafeExternalUrl = (raw: string): boolean => {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const mapTbcplCategory = (
  category: TbcplCategory,
): Exclude<StreamingCategory, "all" | "official" | "custom"> => {
  if (category === "movies" || category === "paid" || category === "apps") return "movies";
  if (category === "anime") return "anime";
  if (category === "manga") return "manga";
  return "livetv";
};

export const tbcplSiteToDestination = (site: TbcplSite): StreamingDestination => ({
  id: `tbcpl:${site.position}:${displayHostname(site.url)}`,
  name: site.name,
  url: site.url,
  subtitle: displayHostname(site.url),
  badge: TBCPL_LABELS[site.category] ?? "Streaming",
  category: mapTbcplCategory(site.category),
  source: "tbcpl",
  accent: TBCPL_ACCENTS[site.category] ?? "#38bdf8",
  monogram: makeMonogram(site.name),
});

export const officialToDestination = (platform: OfficialPlatform): StreamingDestination => ({
  id: platform.id,
  name: platform.name,
  url: platform.url,
  subtitle: platform.tagline,
  badge: platform.badge,
  category: platform.category,
  source: "official",
  accent: platform.accent,
  monogram: platform.monogram,
});

export const customToDestination = (portal: CustomPortal): StreamingDestination => ({
  id: portal.id,
  name: portal.name,
  url: portal.url,
  subtitle: displayHostname(portal.url),
  badge: "Mon portail",
  category: portal.category,
  source: "custom",
  accent: "#f5b942",
  monogram: makeMonogram(portal.name),
});
