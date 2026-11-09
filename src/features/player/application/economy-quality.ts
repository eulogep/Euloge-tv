export const ECONOMY_QUALITY = -2;
export const PLAYBACK_QUALITY_KEY = "mjtv:playback-quality:v1";

/** Pick up to 480p, falling back to the smallest rendition actually offered. */
export function economyLevelIndex(
  levels: ReadonlyArray<{ height?: number | null; bitrate?: number | null }>,
): number {
  const choices = levels.map((level, index) => ({
    index,
    height: level.height && level.height > 0 ? level.height : Infinity,
    bitrate: level.bitrate && level.bitrate > 0 ? level.bitrate : Infinity,
  }));
  const low = choices.filter((level) => level.height <= 480);
  if (low.length) {
    low.sort((a, b) => b.height - a.height || a.bitrate - b.bitrate);
    return low[0].index;
  }
  choices.sort((a, b) => a.height - b.height || a.bitrate - b.bitrate);
  return choices[0]?.index ?? -1;
}
