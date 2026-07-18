"use client";

import { logger } from "@/lib/utils/logger";
import { ValidationError } from "@/lib/errors";
import { APP_CONFIG } from "@/config/app";

/**
 * Validates and exposes a locally-selected WebVTT file as a Blob URL.
 * The file is NEVER uploaded to the server. The Blob URL must be revoked
 * by the caller (the Player component tracks it in `blobUrlsRef`).
 */
export const LocalWebVttProvider = {
  async createTrack(file: File): Promise<string> {
    if (file.size > APP_CONFIG.maxSubtitleBytes) {
      throw new ValidationError(
        `Fichier VTT trop volumineux (max ${APP_CONFIG.maxSubtitleBytes} octets).`,
      );
    }
    const text = await file.text();
    if (!text.trim().startsWith("WEBVTT")) {
      throw new ValidationError(
        "Le fichier ne commence pas par WEBVTT. Format non pris en charge.",
      );
    }
    const blob = new Blob([text], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    logger.info("VTT subtitle loaded", { size: file.size, name: file.name });
    return url;
  },
};
