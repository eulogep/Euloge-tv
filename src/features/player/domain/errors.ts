import type { PlaybackErrorCode } from "./types";

export type PlaybackErrorInfo = {
  code: PlaybackErrorCode;
  /** User-facing French message. Never exposes internal stack traces. */
  message: string;
  /** Short hint shown beneath the message. */
  hint?: string;
};

const MESSAGES: Record<PlaybackErrorCode, PlaybackErrorInfo> = {
  NETWORK: {
    code: "NETWORK",
    message: "Le flux ne répond pas actuellement.",
    hint: "Vérifiez votre connexion ou essayez une autre source.",
  },
  MANIFEST: {
    code: "MANIFEST",
    message: "Le manifeste du flux est illisible.",
    hint: "La source semble mal formée. Essayez une autre source.",
  },
  MEDIA: {
    code: "MEDIA",
    message: "Une erreur média est survenue pendant la lecture.",
    hint: "Le format pourrait ne pas être compatible avec cet appareil.",
  },
  CORS: {
    code: "CORS",
    message: "Le navigateur a bloqué la source pour des raisons de sécurité.",
    hint: "Le flux distant n'autorise pas la lecture depuis ce site.",
  },
  MIXED_CONTENT: {
    code: "MIXED_CONTENT",
    message: "Ce flux utilise HTTP et ne peut être lu sur une page HTTPS.",
    hint: "Essayez une source HTTPS.",
  },
  UNSUPPORTED_FORMAT: {
    code: "UNSUPPORTED_FORMAT",
    message: "Ce format ne peut pas être lu sur cet appareil.",
    hint: "Aucune stratégie de lecture compatible n'a été trouvée.",
  },
  CUSTOM_HEADERS_REQUIRED: {
    code: "CUSTOM_HEADERS_REQUIRED",
    message: "Ce flux nécessite des paramètres non compatibles avec le navigateur.",
    hint: "Un User-Agent ou un referer personnalisé est requis.",
  },
  GEO_RESTRICTED: {
    code: "GEO_RESTRICTED",
    message: "Cette source semble limitée à certaines régions.",
    hint: "Essayez une autre source.",
  },
  SOURCE_UNAVAILABLE: {
    code: "SOURCE_UNAVAILABLE",
    message: "La source est indisponible.",
    hint: "Essayez une autre source.",
  },
  TIMEOUT: {
    code: "TIMEOUT",
    message: "Le flux met trop de temps à répondre.",
    hint: "Réessayez ou changez de source.",
  },
  UNKNOWN: {
    code: "UNKNOWN",
    message: "Une erreur inattendue est survenue.",
    hint: "Essayez une autre source.",
  },
};

export const getErrorInfo = (code: PlaybackErrorCode): PlaybackErrorInfo => MESSAGES[code];

/**
 * Map an HLS.js error detail (string union) to a PlaybackErrorCode.
 * Reference: https://github.com/video-dev/hls.js/blob/master/docs/design.md#error-handling
 */
export const fromHlsErrorDetail = (
  type: string,
  details: string,
  fatal: boolean,
): PlaybackErrorCode => {
  if (!fatal && (type === "networkError" || type === "mediaError")) {
    // Recoverable — still classify so the diagnostic panel can show it.
    if (details.startsWith("manifest")) return "MANIFEST";
    if (details.includes("timeout")) return "TIMEOUT";
    return type === "networkError" ? "NETWORK" : "MEDIA";
  }
  switch (details) {
    case "manifestLoadError":
    case "manifestLoadTimeOut":
    case "manifestParsingError":
      return fatal ? "MANIFEST" : "MANIFEST";
    case "levelLoadError":
    case "levelLoadTimeOut":
      return "NETWORK";
    case "fragLoadError":
    case "fragLoadTimeOut":
      return fatal ? "NETWORK" : "NETWORK";
    case "bufferStalledError":
    case "bufferSeekOverHole":
      return "MEDIA";
    default:
      if (details.includes("cors") || details.includes("CORS")) return "CORS";
      if (type === "mediaError") return "MEDIA";
      if (type === "networkError") return "NETWORK";
      return "UNKNOWN";
  }
};

/**
 * Map a native HTMLMediaElement error to a PlaybackErrorCode.
 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaError/code
 */
export const fromNativeMediaError = (
  code: number | undefined,
  message: string | undefined,
): PlaybackErrorCode => {
  if (code === undefined) return "UNKNOWN";
  // MEDIA_ERR_NETWORK
  if (code === 2) return "NETWORK";
  // MEDIA_ERR_DECODE
  if (code === 3) return "MEDIA";
  // MEDIA_ERR_SRC_NOT_SUPPORTED
  if (code === 4) {
    if (message?.toLowerCase().includes("cors")) return "CORS";
    return "UNSUPPORTED_FORMAT";
  }
  return "UNKNOWN";
};
