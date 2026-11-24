"use client";

import { Grid2x2, Play } from "lucide-react";
import type { ChannelSummary } from "../domain/types";
import { healthStatusOf } from "../application/source-health";

type Props = {
  channels: readonly ChannelSummary[];
  onWatch: (channelId: string) => void;
  onOpenMosaic: () => void;
};

/**
 * Whisper-quiet live broadcast ribbon right under the hero:
 * instant 1-click zapping into verified live channels + direct launch into the 4-screen Mosaic Wall.
 */
export function LivePulseStrip({ channels, onWatch, onOpenMosaic }: Props) {
  const verified = channels.filter((c) => healthStatusOf(c) === "healthy").slice(0, 10);
  const picks = verified.length >= 3 ? verified : channels.slice(0, 8);
  if (picks.length === 0) return null;

  return (
    <section
      className="md-pulse-strip"
      aria-label="En direct sur la planète"
      data-testid="live-pulse-strip"
    >
      <div className="md-pulse-strip-lead">
        <span className="md-pulse" aria-hidden />
        <span>ON AIR</span>
      </div>

      <ul className="md-pulse-strip-track no-scrollbar">
        {picks.map((channel) => (
          <li key={channel.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onWatch(channel.id)}
              className="md-pulse-pill"
              aria-label={`Zapper en direct sur ${channel.name}`}
            >
              {channel.countryFlag && <span aria-hidden>{channel.countryFlag}</span>}
              <span className="truncate">{channel.name}</span>
              <Play className="h-3 w-3 shrink-0 fill-current opacity-65" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onOpenMosaic}
        className="md-pulse-mosaic"
        aria-label="Ouvrir la Régie Mosaïque 4 écrans"
      >
        <Grid2x2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Régie 4 écrans</span>
      </button>
    </section>
  );
}
