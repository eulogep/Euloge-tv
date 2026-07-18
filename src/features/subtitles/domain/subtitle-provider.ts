export type SubtitleTrack = {
  id: string;
  label: string;
  language: string | null;
  /** For embedded tracks: the TextTrack index. For local VTT: a blob URL. */
  source: "embedded" | "local-vtt";
  enabled: boolean;
};

export type SubtitleRequest = {
  channelId: string;
  languageCode: string | null;
};

/**
 * Extensible interface — a future XMLTV / AI transcription provider can
 * implement this without touching the UI layer.
 */
export interface SubtitleProvider {
  getTracks(input: SubtitleRequest): Promise<SubtitleTrack[]>;
}
