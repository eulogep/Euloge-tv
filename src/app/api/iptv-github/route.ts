import { NextResponse } from "next/server";
import { fetchIptvGithubCountryStreams, listIptvGithubCountries } from "@/features/catalog/infrastructure/iptv-github-client";
import { parseM3uStreamsToImportedChannels } from "./helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");

  if (!country) {
    const countries = await listIptvGithubCountries();
    return NextResponse.json({ countries });
  }

  const streams = await fetchIptvGithubCountryStreams(country);
  const channels = parseM3uStreamsToImportedChannels(streams, country);
  return NextResponse.json({ country, channels, count: channels.length }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
