import type { IptvStream } from "@/features/catalog/infrastructure/schemas";
import type { ImportedChannel } from "@/features/imported-playlists/domain/types";
import { createUnknownSourceAvailability } from "@/features/catalog/domain/types";
import { detectKind } from "@/features/catalog/application/normalize";

export function parseM3uStreamsToImportedChannels(
  streams: IptvStream[],
  countryCode: string,
): ImportedChannel[] {
  return streams.map((s, i) => {
    const url = s.url;
    const kind = detectKind(url);
    const protocol = url.startsWith("https://") ? "https" : "http";
    const id = `github:${countryCode}:${i}:${s.channel}`;
    const name = s.title ?? s.channel ?? `Chaîne ${i + 1}`;
    return {
      id,
      name,
      logoUrl: null,
      countryCode: countryCode.length === 2 ? countryCode.toUpperCase() : null,
      categories: [],
      languageCodes: [],
      sourceUrl: url,
      requiresReferrer: false,
      requiresCustomUserAgent: false,
      streams: [
        {
          id: `${id}:stream`,
          url,
          title: name,
          quality: s.quality ?? null,
          label: s.label ?? null,
          feedId: null,
          protocol,
          kind,
          requiresReferrer: false,
          requiresCustomUserAgent: false,
          browserCompatibility:
            protocol === "http" ? "limited" : kind === "unknown" ? "unknown" : "preferred",
          availability: createUnknownSourceAvailability(),
        },
      ],
    } satisfies ImportedChannel;
  });
}
