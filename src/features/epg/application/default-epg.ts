import type { ChannelSummary } from "@/features/catalog/domain/types";
import type { EpgProvider, PublicEpgSchedule } from "../domain/types";
import { CHANNEL_EPG_MAPPING } from "../infrastructure/channel-epg-mapping";
import { FixtureEpgProvider } from "../infrastructure/fixture-provider";
import { CompositeEpgProvider, XmltvEpgProvider } from "../infrastructure/xmltv-provider";
import { EpgService, toPublicEpgSchedule } from "./epg-service";

const createDefaultProvider = (): EpgProvider => {
  const fixture = new FixtureEpgProvider();
  const xmltvUrl = process.env.EPG_XMLTV_URL?.trim();
  const allowedOrigins = (process.env.EPG_XMLTV_ALLOWED_ORIGINS ?? "https://iptv-org.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!xmltvUrl) {
    return fixture;
  }

  const xmltv = new XmltvEpgProvider({
    feedUrl: xmltvUrl,
    allowedOrigins,
  });
  return new CompositeEpgProvider([fixture, xmltv]);
};

const service = new EpgService(createDefaultProvider(), CHANNEL_EPG_MAPPING);

export const getPublicEpg = async (
  channelId: string,
  now = new Date(),
): Promise<PublicEpgSchedule> => toPublicEpgSchedule(await service.getSchedule(channelId, now));

export const attachPublicEpg = async (
  channels: readonly ChannelSummary[],
  now = new Date(),
): Promise<ChannelSummary[]> =>
  Promise.all(
    channels.map(async (channel) => ({
      ...channel,
      epg: await getPublicEpg(channel.id, now),
    })),
  );
