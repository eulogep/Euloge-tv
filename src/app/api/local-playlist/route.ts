import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { buildLocalPlaylist } from "../../../../scripts/bulk_import_txt_to_m3u";

export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  try {
    const repoRoot = process.cwd();
    const localGenerated = path.join(repoRoot, "generated", "generated-playlist.m3u");
    const infraGenerated = path.join(
      repoRoot,
      "src",
      "features",
      "imported-playlists",
      "infrastructure",
      "generated-playlist.m3u",
    );

    const url = request?.url ? new URL(request.url) : null;
    const forceRebuild = url?.searchParams.get("refresh") === "true";
    const onlyCount = url?.searchParams.get("stats") === "true";

    let m3uContent = "";
    let totalEntries = 0;

    const targetPath = fs.existsSync(localGenerated)
      ? localGenerated
      : fs.existsSync(infraGenerated)
        ? infraGenerated
        : null;

    if (!forceRebuild && targetPath && fs.existsSync(targetPath)) {
      m3uContent = fs.readFileSync(targetPath, "utf-8");
      totalEntries = m3uContent.split("\n").filter((l) => l.startsWith("#EXTINF")).length;
    } else {
      const built = buildLocalPlaylist();
      m3uContent = built.m3uContent;
      totalEntries = built.totalEntries;
    }

    if (onlyCount) {
      return NextResponse.json({
        ok: true,
        name: "Playlists locales (Liste de chaînes)",
        count: totalEntries,
      });
    }

    return NextResponse.json({
      ok: true,
      name: "Playlists locales (Liste de chaînes)",
      count: totalEntries,
      m3u: m3uContent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erreur interne",
      },
      { status: 500 },
    );
  }
}
