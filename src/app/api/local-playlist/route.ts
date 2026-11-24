import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request?: Request) {
  try {
    const repoRoot = process.cwd();
    const infraGenerated = path.join(
      repoRoot,
      "src",
      "features",
      "imported-playlists",
      "infrastructure",
      "generated-playlist.m3u",
    );

    const url = request?.url ? new URL(request.url) : null;
    const onlyCount = url?.searchParams.get("stats") === "true";

    let m3uContent = "";
    let totalEntries = 0;

    if (fs.existsSync(infraGenerated)) {
      m3uContent = fs.readFileSync(infraGenerated, "utf-8");
      totalEntries = m3uContent.split("\n").filter((l) => l.startsWith("#EXTINF")).length;
    }

    if (onlyCount) {
      return NextResponse.json({
        ok: true,
        name: "Playlists locales",
        count: totalEntries,
      });
    }

    return NextResponse.json({
      ok: true,
      name: "Playlists locales",
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
