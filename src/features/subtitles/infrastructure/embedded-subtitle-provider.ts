"use client";

import { useEffect, useState } from "react";
import type { SubtitleTrack } from "../domain/subtitle-provider";

/**
 * Reads the embedded text tracks of a <video> element and exposes them as
 * SubtitleTracks. Updates when the track list changes.
 */
export class EmbeddedSubtitleProvider {
  constructor(private video: HTMLVideoElement) {}

  getTracks(): SubtitleTrack[] {
    return Array.from(this.video.textTracks).map((t, i) => ({
      id: `embedded:${i}`,
      label: t.label || t.language || `Piste ${i + 1}`,
      language: t.language,
      source: "embedded",
      enabled: t.mode === "showing" || t.mode === "hidden",
    }));
  }

  setEnabled(index: number, enabled: boolean): void {
    const t = this.video.textTracks[index];
    if (!t) return;
    t.mode = enabled ? "showing" : "disabled";
  }
}

export const useEmbeddedTracks = (video: HTMLVideoElement | null) => {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);

  useEffect(() => {
    if (!video) return;
    const provider = new EmbeddedSubtitleProvider(video);
    const refresh = () => setTracks(provider.getTracks());
    refresh();
    video.textTracks.addEventListener("addtrack", refresh);
    video.textTracks.addEventListener("removetrack", refresh);
    video.textTracks.addEventListener("change", refresh);
    return () => {
      video.textTracks.removeEventListener("addtrack", refresh);
      video.textTracks.removeEventListener("removetrack", refresh);
      video.textTracks.removeEventListener("change", refresh);
    };
  }, [video]);

  return tracks;
};
