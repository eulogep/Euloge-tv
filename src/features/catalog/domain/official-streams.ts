/** Public playback metadata linked from the broadcaster's own RTS website. */
const RTS_FEEDS = {
  "1": { channelId: "RTS1.sn", metadataId: 26, playlistPath: "/larts/rts1_all/playlist.m3u8" },
  "2": { channelId: "RTS2.sn", metadataId: 32, playlistPath: "/larts/rts2.stream/playlist.m3u8" },
  "3": { channelId: "RTS3.sn", metadataId: 42, playlistPath: "/larts/rts3/playlist.m3u8" },
  "4": { channelId: "RTS4.sn", metadataId: 51, playlistPath: "/larts/rts4/playlist.m3u8" },
} as const;

export type RtsFeedKey = keyof typeof RTS_FEEDS;

export const getRtsFeed = (key: string) =>
  Object.hasOwn(RTS_FEEDS, key) ? RTS_FEEDS[key as RtsFeedKey] : null;

export const rtsFeedForChannel = (channelId: string): RtsFeedKey | null =>
  (Object.keys(RTS_FEEDS) as RtsFeedKey[]).find((key) => RTS_FEEDS[key].channelId === channelId) ??
  null;

export const rtsMetadataUrl = (key: RtsFeedKey): string =>
  `https://tveapi.acan.group/myapiv2/directplayback/${RTS_FEEDS[key].metadataId}/json`;
