/** Display helpers: localised (French) country/language names and flag emoji. */

const safeDisplayNames = (type: "region" | "language"): Intl.DisplayNames | null => {
  try {
    return new Intl.DisplayNames(["fr"], { type, fallback: "none" });
  } catch {
    return null;
  }
};

const regionNames = safeDisplayNames("region");
const languageNames = safeDisplayNames("language");

const capitalize = (value: string): string =>
  value.charAt(0).toLocaleUpperCase("fr") + value.slice(1);

/** French country name for an ISO 3166-1 alpha-2 code, or `fallback` when unknown. */
export const countryDisplayName = (code: string, fallback: string): string => {
  if (!/^[A-Za-z]{2}$/.test(code)) return fallback;
  try {
    return regionNames?.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
};

/** French language name for an ISO 639 code (e.g. `fra` → "Français"), or `fallback`. */
export const languageDisplayName = (code: string, fallback: string): string => {
  if (!/^[A-Za-z]{2,3}$/.test(code)) return fallback;
  try {
    const name = languageNames?.of(code.toLowerCase());
    return name && name.toLowerCase() !== code.toLowerCase() ? capitalize(name) : fallback;
  } catch {
    return fallback;
  }
};

/** Flag emoji from an ISO 3166-1 alpha-2 code, or an empty string. */
export const flagEmoji = (code: string): string =>
  /^[A-Za-z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)))
    : "";
