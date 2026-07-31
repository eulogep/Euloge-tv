import type { ChannelSummary } from "@/features/catalog/domain/types";
import type { PublicEpgSchedule } from "../domain/types";
import { CHANNEL_EPG_MAPPING } from "../infrastructure/channel-epg-mapping";
import { FixtureEpgProvider } from "../infrastructure/fixture-provider";
import { EpgService, toPublicEpgSchedule } from "./epg-service";

const service = new EpgService(new FixtureEpgProvider(), CHANNEL_EPG_MAPPING);

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
