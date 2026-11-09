import { z } from "zod";
import { CATALOG_CATEGORIES } from "@/features/catalog/application/taxonomy";
import {
  JOURNEYS_KEY,
  MAX_JOURNEYS,
  journeyFingerprint,
  readJourneyState,
  type Journey,
} from "@/features/journeys/domain/journey";
import { addFavorite } from "@/features/favorites/favorites";
import { updateSetting } from "@/features/settings/settings";

/**
 * Carry a viewer's choices to another device with no account and no server: they
 * travel in the fragment of a link, which browsers never send over the network.
 * It is a one-time copy, not a live sync. Opening a link changes nothing until the
 * viewer accepts, because anyone can craft one.
 */

const MAX_ENCODED = 24_000;

const payloadSchema = z.object({
  v: z.literal(1),
  favorites: z.array(z.string().min(1).max(200)).max(500),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  languages: z
    .array(z.string().regex(/^[a-z]{2,3}$/))
    .max(20)
    .optional(),
  categories: z.array(z.enum(CATALOG_CATEGORIES)).max(30).optional(),
  journeys: z.array(z.unknown()).max(MAX_JOURNEYS).optional(),
});

export type TransferPayload = z.infer<typeof payloadSchema>;

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): string => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
};

export const encodeTransfer = (payload: TransferPayload): string =>
  toBase64Url(JSON.stringify(payload));

/** Null for anything that is not exactly a valid transfer. */
export const decodeTransfer = (encoded: string): TransferPayload | null => {
  if (!encoded || encoded.length > MAX_ENCODED) return null;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(fromBase64Url(encoded)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const transferUrl = (origin: string, payload: TransferPayload): string =>
  `${origin}/#transfer=${encodeTransfer(payload)}`;

export const transferJourneys = (payload: TransferPayload): Journey[] =>
  readJourneyState({ version: 1, items: payload.journeys ?? [] }).items;

const readStoredJourneys = (): Journey[] => {
  try {
    return readJourneyState(JSON.parse(localStorage.getItem(JOURNEYS_KEY) ?? "null")).items;
  } catch {
    return [];
  }
};

export const collectTransfer = (input: {
  favorites: readonly string[];
  country: string | null;
  languages: readonly string[];
  categories: readonly (typeof CATALOG_CATEGORIES)[number][];
}): TransferPayload => ({
  v: 1,
  favorites: [...input.favorites].slice(0, 500),
  country: input.country,
  languages: [...input.languages],
  categories: [...input.categories],
  journeys: readStoredJourneys(),
});

/** Adds to what is already here: importing never removes a favourite or an entry. */
export const applyTransfer = (payload: TransferPayload): void => {
  payload.favorites.forEach(addFavorite);
  if (payload.country !== undefined) updateSetting("preferredCountry", payload.country);
  if (payload.languages) updateSetting("preferredLanguages", payload.languages);
  if (payload.categories) updateSetting("favoriteCategories", payload.categories);

  const incoming = transferJourneys(payload);
  if (incoming.length === 0) return;
  const current = readStoredJourneys();
  const known = new Set(current.map((journey) => journeyFingerprint(journey.filters)));
  const merged = [
    ...current,
    ...incoming.filter((journey) => !known.has(journeyFingerprint(journey.filters))),
  ].slice(0, MAX_JOURNEYS);
  localStorage.setItem(JOURNEYS_KEY, JSON.stringify({ version: 1, items: merged }));
  window.dispatchEvent(new Event("mjtv:journeys-changed"));
};
