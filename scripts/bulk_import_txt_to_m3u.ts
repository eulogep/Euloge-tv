import * as fs from "fs";
import * as path from "path";

interface ScanEntry {
  server?: string;
  user?: string;
  pass?: string;
  m3u?: string;
  epg?: string;
  geo?: string;
  plan?: string;
  status?: string;
}

const FORBIDDEN_REGEXES = [
  /PoseidoXun(?:Bot)?/gi,
  /(?:н\s*ι\s*т\s*н\s*υ\s*η\s*т\s*є\s*ʀ|hit\s*hunter)/gi,
  /(?:ᴄ\s*ᴏ\s*ᴍ\s*ʙ\s*ᴏ\s*ꜱ\s*ᴄ\s*ᴀ\s*ɴ\s*ɴ\s*ᴇ\s*ʀ|combo\s*scanner)/gi,
];

export function sanitizeForbidden(val: string): string {
  if (!val) return "";
  let clean = val;
  for (const regex of FORBIDDEN_REGEXES) {
    clean = clean.replace(regex, "");
  }
  return clean.replace(/\s+/g, " ").trim();
}

function extractHostname(serverUrl: string | undefined): string {
  if (!serverUrl) return "Serveur IPTV";
  try {
    const url = new URL(serverUrl.trim());
    return url.hostname;
  } catch {
    return (
      serverUrl
        .replace(/^https?:\/\//i, "")
        .replace(/[:/].*$/, "")
        .trim() || "Serveur IPTV"
    );
  }
}

function cleanUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/[.,;()\[\]{}]+$/, "");
}

function isMediaUrl(u: string): boolean {
  const lower = u.toLowerCase();
  const nonMedia = [
    "bit.ly",
    "manus.ai",
    "mjtv.app",
    "google.com",
    "github.com",
    "t.me",
    "discord",
    "whatsapp",
    "twitter.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
  ];
  if (nonMedia.some((domain) => lower.includes(domain))) return false;
  return (
    lower.includes(".m3u") ||
    lower.includes(".m3u8") ||
    lower.includes(".ts") ||
    lower.includes("get.php")
  );
}

function parseKingScanFile(
  content: string,
  filename: string,
  seenUrls: Set<string>,
): string[] {
  const lines = content.split(/\r?\n/);
  const extinfLines: string[] = [];
  let current: ScanEntry = {};

  const flush = () => {
    let targetM3u = current.m3u;
    if (!targetM3u && current.server && current.user && current.pass) {
      const srv = current.server.replace(/\/+$/, "");
      targetM3u = `${srv}/get.php?username=${encodeURIComponent(current.user)}&password=${encodeURIComponent(current.pass)}&type=m3u_plus&output=ts`;
    }

    if (targetM3u && targetM3u.startsWith("http")) {
      const cleanU = cleanUrl(targetM3u);
      if (!seenUrls.has(cleanU) && isMediaUrl(cleanU)) {
        seenUrls.add(cleanU);
        const host = sanitizeForbidden(
          extractHostname(current.server) || path.basename(filename, ".txt"),
        );
        const user = sanitizeForbidden(current.user || "Compte IPTV");
        const planClean = current.plan
          ? sanitizeForbidden(current.plan.replace(/[^\w\s]/gi, "").trim())
          : "";
        const title = `${host} — ${user}${planClean ? ` (${planClean})` : ""}`;
        const country =
          current.geo && current.geo.includes("United States") ? "US" : "";

        extinfLines.push(
          `#EXTINF:-1 tvg-id="${user}" tvg-name="${user}" group-title="${host}" tvg-country="${country}",${title}`,
        );
        extinfLines.push(cleanU);
      }
    }
    current = {};
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes("╰──") || trimmed.includes("╭──")) {
      flush();
      continue;
    }
    if (trimmed.includes("Servidor →")) {
      current.server = trimmed.split("Servidor →")[1]?.trim();
    } else if (trimmed.includes("Usuario →")) {
      current.user = trimmed.split("Usuario →")[1]?.trim();
    } else if (trimmed.includes("Contraseña →")) {
      current.pass = trimmed.split("Contraseña →")[1]?.trim();
    } else if (trimmed.includes("📎M3U →")) {
      current.m3u = trimmed.split("📎M3U →")[1]?.trim();
    } else if (trimmed.includes("📺EPG →")) {
      current.epg = trimmed.split("📺EPG →")[1]?.trim();
    } else if (trimmed.includes("Geo →")) {
      current.geo = trimmed.split("Geo →")[1]?.trim();
    } else if (trimmed.includes("Planes →")) {
      current.plan = trimmed.split("Planes →")[1]?.trim();
    }
  }
  flush();
  return extinfLines;
}

function parseHitHunterFile(
  content: string,
  filename: string,
  seenUrls: Set<string>,
): string[] {
  const blocks = content.split(/╭───✦|╰───✦/);
  const extinfLines: string[] = [];

  for (const b of blocks) {
    const mUser = b.match(/ᴜꜱᴇʀ\s*:\s*([^\r\n]+)/i);
    const mPass = b.match(/ᴩᴀꜱꜱ\s*:\s*([^\r\n]+)/i);
    const mSrv = b.match(/ꜱᴇʀᴠᴇʀ\s*:\s*([^\r\n]+)/i);

    if (mUser && mPass && mSrv) {
      const user = sanitizeForbidden(mUser[1]?.trim() || "");
      const pass = mPass[1]?.trim() || "";
      const srv = mSrv[1]?.trim().replace(/\/+$/, "") || "";

      if (srv.startsWith("http") && user && pass) {
        const m3uUrl = cleanUrl(
          `${srv}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus&output=ts`,
        );
        if (!seenUrls.has(m3uUrl) && isMediaUrl(m3uUrl)) {
          seenUrls.add(m3uUrl);
          const host = sanitizeForbidden(
            extractHostname(srv) || path.basename(filename, ".txt"),
          );
          const title = `${host} — ${user}`;
          extinfLines.push(
            `#EXTINF:-1 tvg-id="${user}" tvg-name="${user}" group-title="${host}",${title}`,
          );
          extinfLines.push(m3uUrl);
        }
      }
    }
  }

  return extinfLines;
}

function parseVegetaFile(
  content: string,
  filename: string,
  seenUrls: Set<string>,
): string[] {
  const blocks = content.split(/================ \d+ ================/);
  const extinfLines: string[] = [];

  for (const b of blocks) {
    const mM3u = b.match(/Link M3U\s*[➤:]\s*([^\r\n]+)/i);
    const mSrv = b.match(/(?:Server|Servidor)\s*[➤:]\s*([^\r\n]+)/i);
    const mUser = b.match(/(?:Utente|Usuario)\s*[➤:]\s*([^\r\n]+)/i);
    const mPass = b.match(/(?:Password|Contraseña)\s*[➤:]\s*([^\r\n]+)/i);

    let m3uUrl = mM3u ? cleanUrl(mM3u[1]?.trim() || "") : "";
    const user = sanitizeForbidden(mUser ? mUser[1]?.trim() || "Compte" : "Compte");
    const srv = mSrv ? mSrv[1]?.trim().replace(/\/+$/, "") || "" : "";
    const pass = mPass ? mPass[1]?.trim() || "" : "";

    if (!m3uUrl && srv.startsWith("http") && user && pass) {
      m3uUrl = cleanUrl(
        `${srv}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus`,
      );
    }

    if (m3uUrl && m3uUrl.startsWith("http")) {
      if (!seenUrls.has(m3uUrl) && isMediaUrl(m3uUrl)) {
        seenUrls.add(m3uUrl);
        const host = sanitizeForbidden(
          extractHostname(srv || m3uUrl) || path.basename(filename, ".txt"),
        );
        const title = `${host} — ${user}`;
        extinfLines.push(
          `#EXTINF:-1 tvg-id="${user}" tvg-name="${user}" group-title="${host}",${title}`,
        );
        extinfLines.push(m3uUrl);
      }
    }
  }

  return extinfLines;
}

function parsePanelAttackFile(
  content: string,
  filename: string,
  seenUrls: Set<string>,
): string[] {
  const blocks = content.split(/╔═✦|╚═✦/);
  const extinfLines: string[] = [];

  for (const b of blocks) {
    const mM3u = b.match(/M3U Link:\s*([^\r\n]+)/i);
    const mUser = b.match(/Username:\s*([^\r\n]+)/i);
    const mSrv = b.match(/(?:Real URL|Panel URL):\s*([^\r\n]+)/i);
    const mPass = b.match(/Password:\s*([^\r\n]+)/i);

    let m3uUrl = mM3u ? cleanUrl(mM3u[1]?.trim() || "") : "";
    const user = sanitizeForbidden(mUser ? mUser[1]?.trim() || "Compte" : "Compte");
    const srv = mSrv ? mSrv[1]?.trim().replace(/\/+$/, "") || "" : "";
    const pass = mPass ? mPass[1]?.trim() || "" : "";

    if (!m3uUrl && srv.startsWith("http") && user && pass) {
      m3uUrl = cleanUrl(
        `${srv}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus`,
      );
    }

    if (m3uUrl && m3uUrl.startsWith("http")) {
      if (!seenUrls.has(m3uUrl) && isMediaUrl(m3uUrl)) {
        seenUrls.add(m3uUrl);
        const host = sanitizeForbidden(
          extractHostname(srv || m3uUrl) || path.basename(filename, ".txt"),
        );
        const title = `${host} — ${user}`;
        extinfLines.push(
          `#EXTINF:-1 tvg-id="${user}" tvg-name="${user}" group-title="${host}",${title}`,
        );
        extinfLines.push(m3uUrl);
      }
    }
  }

  return extinfLines;
}

function extractGenericUrls(
  content: string,
  filename: string,
  seenUrls: Set<string>,
): string[] {
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const matches = content.match(urlRegex) || [];
  const lines: string[] = [];

  for (const raw of matches) {
    const u = cleanUrl(raw);
    if (!seenUrls.has(u) && isMediaUrl(u)) {
      seenUrls.add(u);
      const host = sanitizeForbidden(
        extractHostname(u) || path.basename(filename, ".txt"),
      );
      const userMatch = u.match(/username=([^&]+)/i);
      const user = sanitizeForbidden(
        userMatch ? decodeURIComponent(userMatch[1]) : "Flux",
      );
      const title = `${host} — ${user}`;
      lines.push(
        `#EXTINF:-1 tvg-id="${user}" tvg-name="${user}" group-title="${host}",${title}`,
      );
      lines.push(u);
    }
  }
  return lines;
}

function collectTextFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== "node_modules" &&
        entry.name !== ".git" &&
        entry.name !== ".next" &&
        entry.name !== "source glm5"
      ) {
        results.push(...collectTextFiles(fullPath));
      }
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".txt") &&
      !entry.name.toLowerCase().startsWith("secret")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function buildLocalPlaylist(): {
  totalEntries: number;
  filePath: string;
  m3uContent: string;
} {
  const repoRoot = process.cwd();
  const seenUrls = new Set<string>();
  const allLines: string[] = ["#EXTM3U"];

  // Collect txt files from root and from "liste des chaine"
  const candidateFiles: string[] = [];

  // 1. Files in repo root
  const rootFiles = fs
    .readdirSync(repoRoot)
    .filter((f) => f.endsWith(".txt") && !f.toLowerCase().startsWith("secret"))
    .map((f) => path.join(repoRoot, f));
  candidateFiles.push(...rootFiles);

  // 2. Files in "liste des chaine"
  const listeDir = path.join(repoRoot, "liste des chaine");
  if (fs.existsSync(listeDir)) {
    candidateFiles.push(...collectTextFiles(listeDir));
  }

  // De-duplicate candidate files
  const uniqueFiles = Array.from(new Set(candidateFiles));

  for (const filePath of uniqueFiles) {
    const filename = path.basename(filePath);
    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    if (content.includes("K̲I̲N̲G̲S̲C̲A̲N̲") || content.includes("📎M3U")) {
      allLines.push(...parseKingScanFile(content, filename, seenUrls));
    } else if (
      content.includes("нιт нυηтєʀ") ||
      content.includes("ꜱᴄᴀɴᴛʏᴩᴇ") ||
      content.includes("ᴜꜱᴇʀ :")
    ) {
      allLines.push(...parseHitHunterFile(content, filename, seenUrls));
    } else if (content.includes("VEGETA TV") || content.includes("Link M3U")) {
      allLines.push(...parseVegetaFile(content, filename, seenUrls));
    } else if (
      content.includes("M3U PANEL ATTACK") ||
      content.includes("M3U Link:")
    ) {
      allLines.push(...parsePanelAttackFile(content, filename, seenUrls));
    } else {
      allLines.push(...extractGenericUrls(content, filename, seenUrls));
    }
  }

  const outDir = path.join(repoRoot, "generated");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "generated-playlist.m3u");
  const m3uContent = allLines.join("\n");
  fs.writeFileSync(outPath, m3uContent, "utf-8");

  // Also sync to imported-playlists infrastructure generated-playlist if needed
  const infraOut = path.join(
    repoRoot,
    "src/features/imported-playlists/infrastructure/generated-playlist.m3u",
  );
  try {
    fs.writeFileSync(infraOut, m3uContent, "utf-8");
  } catch {
    // Non-blocking
  }

  const totalEntries = allLines.filter((l) => l.startsWith("#EXTINF")).length;
  console.log(
    `Generated playlist with ${totalEntries} entries at ${outPath} (${(Buffer.byteLength(m3uContent, "utf-8") / 1024 / 1024).toFixed(2)} MB)`,
  );
  return { totalEntries, filePath: outPath, m3uContent };
}

if (process.argv[1]?.endsWith("bulk_import_txt_to_m3u.ts")) {
  buildLocalPlaylist();
}
