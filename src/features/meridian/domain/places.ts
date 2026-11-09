/**
 * Where each catalog country broadcasts from: one reference city, its
 * coordinates and its IANA time zone. Countries spanning several zones use
 * their main media city, and the interface always names that city, so the
 * clock it shows is never presented as true for a whole country.
 */

export type Place = {
  code: string;
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

const RAW: Record<string, readonly [string, number, number, string]> = {
  AD: ["Andorre-la-Vieille", 42.5, 1.5, "Europe/Andorra"],
  AE: ["Dubaï", 25.2, 55.3, "Asia/Dubai"],
  AF: ["Kaboul", 34.5, 69.2, "Asia/Kabul"],
  AG: ["Saint John's", 17.1, -61.8, "America/Antigua"],
  AI: ["The Valley", 18.2, -63.1, "America/Anguilla"],
  AL: ["Tirana", 41.3, 19.8, "Europe/Tirane"],
  AM: ["Erevan", 40.2, 44.5, "Asia/Yerevan"],
  AO: ["Luanda", -8.8, 13.2, "Africa/Luanda"],
  AR: ["Buenos Aires", -34.6, -58.4, "America/Argentina/Buenos_Aires"],
  AS: ["Pago Pago", -14.3, -170.7, "Pacific/Pago_Pago"],
  AT: ["Vienne", 48.2, 16.4, "Europe/Vienna"],
  AU: ["Sydney", -33.9, 151.2, "Australia/Sydney"],
  AW: ["Oranjestad", 12.5, -70, "America/Aruba"],
  AX: ["Mariehamn", 60.1, 19.9, "Europe/Mariehamn"],
  AZ: ["Bakou", 40.4, 49.9, "Asia/Baku"],
  BA: ["Sarajevo", 43.9, 18.4, "Europe/Sarajevo"],
  BB: ["Bridgetown", 13.1, -59.6, "America/Barbados"],
  BD: ["Dacca", 23.8, 90.4, "Asia/Dhaka"],
  BE: ["Bruxelles", 50.8, 4.4, "Europe/Brussels"],
  BF: ["Ouagadougou", 12.4, -1.5, "Africa/Ouagadougou"],
  BG: ["Sofia", 42.7, 23.3, "Europe/Sofia"],
  BH: ["Manama", 26.2, 50.6, "Asia/Bahrain"],
  BI: ["Gitega", -3.4, 29.9, "Africa/Bujumbura"],
  BJ: ["Cotonou", 6.4, 2.4, "Africa/Porto-Novo"],
  BM: ["Hamilton", 32.3, -64.8, "Atlantic/Bermuda"],
  BN: ["Bandar Seri Begawan", 4.9, 114.9, "Asia/Brunei"],
  BO: ["La Paz", -16.5, -68.1, "America/La_Paz"],
  BQ: ["Kralendijk", 12.2, -68.3, "America/Kralendijk"],
  BR: ["São Paulo", -23.5, -46.6, "America/Sao_Paulo"],
  BS: ["Nassau", 25.1, -77.3, "America/Nassau"],
  BT: ["Thimphou", 27.5, 89.6, "Asia/Thimphu"],
  BW: ["Gaborone", -24.6, 25.9, "Africa/Gaborone"],
  BY: ["Minsk", 53.9, 27.6, "Europe/Minsk"],
  BZ: ["Belmopan", 17.3, -88.8, "America/Belize"],
  CA: ["Montréal", 45.5, -73.6, "America/Toronto"],
  CD: ["Kinshasa", -4.3, 15.3, "Africa/Kinshasa"],
  CF: ["Bangui", 4.4, 18.6, "Africa/Bangui"],
  CG: ["Brazzaville", -4.3, 15.2, "Africa/Brazzaville"],
  CH: ["Genève", 46.2, 6.1, "Europe/Zurich"],
  CI: ["Abidjan", 5.3, -4, "Africa/Abidjan"],
  CK: ["Avarua", -21.2, -159.8, "Pacific/Rarotonga"],
  CL: ["Santiago", -33.4, -70.7, "America/Santiago"],
  CM: ["Douala", 4, 9.7, "Africa/Douala"],
  CN: ["Pékin", 39.9, 116.4, "Asia/Shanghai"],
  CO: ["Bogota", 4.7, -74.1, "America/Bogota"],
  CR: ["San José", 9.9, -84.1, "America/Costa_Rica"],
  CU: ["La Havane", 23.1, -82.4, "America/Havana"],
  CV: ["Praia", 14.9, -23.5, "Atlantic/Cape_Verde"],
  CW: ["Willemstad", 12.1, -68.9, "America/Curacao"],
  CY: ["Nicosie", 35.2, 33.4, "Asia/Nicosia"],
  CZ: ["Prague", 50.1, 14.4, "Europe/Prague"],
  DE: ["Berlin", 52.5, 13.4, "Europe/Berlin"],
  DJ: ["Djibouti", 11.6, 43.1, "Africa/Djibouti"],
  DK: ["Copenhague", 55.7, 12.6, "Europe/Copenhagen"],
  DM: ["Roseau", 15.3, -61.4, "America/Dominica"],
  DO: ["Saint-Domingue", 18.5, -69.9, "America/Santo_Domingo"],
  DZ: ["Alger", 36.8, 3.1, "Africa/Algiers"],
  EC: ["Quito", -0.2, -78.5, "America/Guayaquil"],
  EE: ["Tallinn", 59.4, 24.8, "Europe/Tallinn"],
  EG: ["Le Caire", 30, 31.2, "Africa/Cairo"],
  EH: ["Laâyoune", 27.1, -13.2, "Africa/El_Aaiun"],
  ER: ["Asmara", 15.3, 38.9, "Africa/Asmara"],
  ES: ["Madrid", 40.4, -3.7, "Europe/Madrid"],
  ET: ["Addis-Abeba", 9, 38.7, "Africa/Addis_Ababa"],
  FI: ["Helsinki", 60.2, 24.9, "Europe/Helsinki"],
  FJ: ["Suva", -18.1, 178.4, "Pacific/Fiji"],
  FK: ["Stanley", -51.7, -57.9, "Atlantic/Stanley"],
  FM: ["Palikir", 6.9, 158.2, "Pacific/Pohnpei"],
  FO: ["Tórshavn", 62, -6.8, "Atlantic/Faroe"],
  FR: ["Paris", 48.9, 2.4, "Europe/Paris"],
  GA: ["Libreville", 0.4, 9.5, "Africa/Libreville"],
  GB: ["Londres", 51.5, -0.1, "Europe/London"],
  GD: ["Saint-Georges", 12.1, -61.7, "America/Grenada"],
  GE: ["Tbilissi", 41.7, 44.8, "Asia/Tbilisi"],
  GF: ["Cayenne", 4.9, -52.3, "America/Cayenne"],
  GH: ["Accra", 5.6, -0.2, "Africa/Accra"],
  GI: ["Gibraltar", 36.1, -5.4, "Europe/Gibraltar"],
  GL: ["Nuuk", 64.2, -51.7, "America/Nuuk"],
  GM: ["Banjul", 13.5, -16.6, "Africa/Banjul"],
  GN: ["Conakry", 9.6, -13.6, "Africa/Conakry"],
  GP: ["Pointe-à-Pitre", 16.2, -61.5, "America/Guadeloupe"],
  GQ: ["Malabo", 3.8, 8.8, "Africa/Malabo"],
  GR: ["Athènes", 38, 23.7, "Europe/Athens"],
  GT: ["Guatemala", 14.6, -90.5, "America/Guatemala"],
  GU: ["Hagåtña", 13.5, 144.8, "Pacific/Guam"],
  GW: ["Bissau", 11.9, -15.6, "Africa/Bissau"],
  GY: ["Georgetown", 6.8, -58.2, "America/Guyana"],
  HK: ["Hong Kong", 22.3, 114.2, "Asia/Hong_Kong"],
  HN: ["Tegucigalpa", 14.1, -87.2, "America/Tegucigalpa"],
  HR: ["Zagreb", 45.8, 16, "Europe/Zagreb"],
  HT: ["Port-au-Prince", 18.5, -72.3, "America/Port-au-Prince"],
  HU: ["Budapest", 47.5, 19, "Europe/Budapest"],
  ID: ["Jakarta", -6.2, 106.8, "Asia/Jakarta"],
  IE: ["Dublin", 53.3, -6.3, "Europe/Dublin"],
  IL: ["Tel-Aviv", 32.1, 34.8, "Asia/Jerusalem"],
  IN: ["New Delhi", 28.6, 77.2, "Asia/Kolkata"],
  IQ: ["Bagdad", 33.3, 44.4, "Asia/Baghdad"],
  IR: ["Téhéran", 35.7, 51.4, "Asia/Tehran"],
  IS: ["Reykjavik", 64.1, -21.9, "Atlantic/Reykjavik"],
  IT: ["Rome", 41.9, 12.5, "Europe/Rome"],
  JM: ["Kingston", 18, -76.8, "America/Jamaica"],
  JO: ["Amman", 31.9, 35.9, "Asia/Amman"],
  JP: ["Tokyo", 35.7, 139.7, "Asia/Tokyo"],
  KE: ["Nairobi", -1.3, 36.8, "Africa/Nairobi"],
  KG: ["Bichkek", 42.9, 74.6, "Asia/Bishkek"],
  KH: ["Phnom Penh", 11.6, 104.9, "Asia/Phnom_Penh"],
  KI: ["Tarawa", 1.3, 173, "Pacific/Tarawa"],
  KM: ["Moroni", -11.7, 43.3, "Indian/Comoro"],
  KN: ["Basseterre", 17.3, -62.7, "America/St_Kitts"],
  KP: ["Pyongyang", 39, 125.8, "Asia/Pyongyang"],
  KR: ["Séoul", 37.6, 127, "Asia/Seoul"],
  KW: ["Koweït", 29.4, 48, "Asia/Kuwait"],
  KY: ["George Town", 19.3, -81.4, "America/Cayman"],
  KZ: ["Almaty", 43.2, 76.9, "Asia/Almaty"],
  LA: ["Vientiane", 18, 102.6, "Asia/Vientiane"],
  LB: ["Beyrouth", 33.9, 35.5, "Asia/Beirut"],
  LC: ["Castries", 14, -61, "America/St_Lucia"],
  LI: ["Vaduz", 47.1, 9.5, "Europe/Vaduz"],
  LK: ["Colombo", 6.9, 79.9, "Asia/Colombo"],
  LR: ["Monrovia", 6.3, -10.8, "Africa/Monrovia"],
  LS: ["Maseru", -29.3, 27.5, "Africa/Maseru"],
  LT: ["Vilnius", 54.7, 25.3, "Europe/Vilnius"],
  LU: ["Luxembourg", 49.6, 6.1, "Europe/Luxembourg"],
  LV: ["Riga", 56.9, 24.1, "Europe/Riga"],
  LY: ["Tripoli", 32.9, 13.2, "Africa/Tripoli"],
  MA: ["Casablanca", 33.6, -7.6, "Africa/Casablanca"],
  MC: ["Monaco", 43.7, 7.4, "Europe/Monaco"],
  MD: ["Chișinău", 47, 28.9, "Europe/Chisinau"],
  ME: ["Podgorica", 42.4, 19.3, "Europe/Podgorica"],
  MG: ["Antananarivo", -18.9, 47.5, "Indian/Antananarivo"],
  MK: ["Skopje", 42, 21.4, "Europe/Skopje"],
  ML: ["Bamako", 12.6, -8, "Africa/Bamako"],
  MM: ["Rangoun", 16.8, 96.2, "Asia/Yangon"],
  MN: ["Oulan-Bator", 47.9, 106.9, "Asia/Ulaanbaatar"],
  MO: ["Macao", 22.2, 113.5, "Asia/Macau"],
  MP: ["Saipan", 15.2, 145.8, "Pacific/Saipan"],
  MQ: ["Fort-de-France", 14.6, -61.1, "America/Martinique"],
  MR: ["Nouakchott", 18.1, -16, "Africa/Nouakchott"],
  MS: ["Brades", 16.8, -62.2, "America/Montserrat"],
  MT: ["La Valette", 35.9, 14.5, "Europe/Malta"],
  MU: ["Port-Louis", -20.2, 57.5, "Indian/Mauritius"],
  MV: ["Malé", 4.2, 73.5, "Indian/Maldives"],
  MW: ["Lilongwe", -14, 33.8, "Africa/Blantyre"],
  MX: ["Mexico", 19.4, -99.1, "America/Mexico_City"],
  MY: ["Kuala Lumpur", 3.1, 101.7, "Asia/Kuala_Lumpur"],
  MZ: ["Maputo", -26, 32.6, "Africa/Maputo"],
  NA: ["Windhoek", -22.6, 17.1, "Africa/Windhoek"],
  NC: ["Nouméa", -22.3, 166.5, "Pacific/Noumea"],
  NE: ["Niamey", 13.5, 2.1, "Africa/Niamey"],
  NG: ["Lagos", 6.5, 3.4, "Africa/Lagos"],
  NI: ["Managua", 12.1, -86.3, "America/Managua"],
  NL: ["Amsterdam", 52.4, 4.9, "Europe/Amsterdam"],
  NO: ["Oslo", 59.9, 10.8, "Europe/Oslo"],
  NP: ["Katmandou", 27.7, 85.3, "Asia/Kathmandu"],
  NR: ["Yaren", -0.5, 166.9, "Pacific/Nauru"],
  NU: ["Alofi", -19.1, -169.9, "Pacific/Niue"],
  NZ: ["Auckland", -36.8, 174.8, "Pacific/Auckland"],
  OM: ["Mascate", 23.6, 58.4, "Asia/Muscat"],
  PA: ["Panama", 9, -79.5, "America/Panama"],
  PE: ["Lima", -12, -77, "America/Lima"],
  PF: ["Papeete", -17.5, -149.6, "Pacific/Tahiti"],
  PG: ["Port Moresby", -9.4, 147.2, "Pacific/Port_Moresby"],
  PH: ["Manille", 14.6, 121, "Asia/Manila"],
  PK: ["Karachi", 24.9, 67, "Asia/Karachi"],
  PL: ["Varsovie", 52.2, 21, "Europe/Warsaw"],
  PM: ["Saint-Pierre", 46.8, -56.2, "America/Miquelon"],
  PR: ["San Juan", 18.5, -66.1, "America/Puerto_Rico"],
  PS: ["Ramallah", 31.9, 35.2, "Asia/Hebron"],
  PT: ["Lisbonne", 38.7, -9.1, "Europe/Lisbon"],
  PW: ["Ngerulmud", 7.5, 134.6, "Pacific/Palau"],
  PY: ["Asunción", -25.3, -57.6, "America/Asuncion"],
  QA: ["Doha", 25.3, 51.5, "Asia/Qatar"],
  RE: ["Saint-Denis", -20.9, 55.5, "Indian/Reunion"],
  RO: ["Bucarest", 44.4, 26.1, "Europe/Bucharest"],
  RS: ["Belgrade", 44.8, 20.5, "Europe/Belgrade"],
  RU: ["Moscou", 55.8, 37.6, "Europe/Moscow"],
  RW: ["Kigali", -1.9, 30.1, "Africa/Kigali"],
  SA: ["Riyad", 24.7, 46.7, "Asia/Riyadh"],
  SB: ["Honiara", -9.4, 160, "Pacific/Guadalcanal"],
  SC: ["Victoria", -4.6, 55.5, "Indian/Mahe"],
  SD: ["Khartoum", 15.6, 32.5, "Africa/Khartoum"],
  SE: ["Stockholm", 59.3, 18.1, "Europe/Stockholm"],
  SG: ["Singapour", 1.4, 103.8, "Asia/Singapore"],
  SH: ["Jamestown", -15.9, -5.7, "Atlantic/St_Helena"],
  SI: ["Ljubljana", 46.1, 14.5, "Europe/Ljubljana"],
  SK: ["Bratislava", 48.1, 17.1, "Europe/Bratislava"],
  SL: ["Freetown", 8.5, -13.2, "Africa/Freetown"],
  SM: ["Saint-Marin", 43.9, 12.4, "Europe/San_Marino"],
  SN: ["Dakar", 14.7, -17.5, "Africa/Dakar"],
  SO: ["Mogadiscio", 2, 45.3, "Africa/Mogadishu"],
  SR: ["Paramaribo", 5.9, -55.2, "America/Paramaribo"],
  SS: ["Djouba", 4.9, 31.6, "Africa/Juba"],
  ST: ["São Tomé", 0.3, 6.7, "Africa/Sao_Tome"],
  SV: ["San Salvador", 13.7, -89.2, "America/El_Salvador"],
  SX: ["Philipsburg", 18, -63, "America/Lower_Princes"],
  SY: ["Damas", 33.5, 36.3, "Asia/Damascus"],
  SZ: ["Mbabane", -26.3, 31.1, "Africa/Mbabane"],
  TC: ["Cockburn Town", 21.5, -71.1, "America/Grand_Turk"],
  TD: ["N'Djamena", 12.1, 15, "Africa/Ndjamena"],
  TG: ["Lomé", 6.1, 1.2, "Africa/Lome"],
  TH: ["Bangkok", 13.8, 100.5, "Asia/Bangkok"],
  TJ: ["Douchanbé", 38.6, 68.8, "Asia/Dushanbe"],
  TL: ["Dili", -8.6, 125.6, "Asia/Dili"],
  TM: ["Achgabat", 37.9, 58.4, "Asia/Ashgabat"],
  TN: ["Tunis", 36.8, 10.2, "Africa/Tunis"],
  TO: ["Nuku'alofa", -21.1, -175.2, "Pacific/Tongatapu"],
  TR: ["Istanbul", 41, 29, "Europe/Istanbul"],
  TT: ["Port-d'Espagne", 10.7, -61.5, "America/Port_of_Spain"],
  TV: ["Funafuti", -8.5, 179.2, "Pacific/Funafuti"],
  TW: ["Taipei", 25, 121.5, "Asia/Taipei"],
  TZ: ["Dar es Salam", -6.8, 39.3, "Africa/Dar_es_Salaam"],
  UA: ["Kyiv", 50.5, 30.5, "Europe/Kyiv"],
  UG: ["Kampala", 0.3, 32.6, "Africa/Kampala"],
  UK: ["Londres", 51.5, -0.1, "Europe/London"],
  US: ["New York", 40.7, -74, "America/New_York"],
  UY: ["Montevideo", -34.9, -56.2, "America/Montevideo"],
  UZ: ["Tachkent", 41.3, 69.3, "Asia/Tashkent"],
  VA: ["Vatican", 41.9, 12.45, "Europe/Vatican"],
  VC: ["Kingstown", 13.2, -61.2, "America/St_Vincent"],
  VE: ["Caracas", 10.5, -66.9, "America/Caracas"],
  VG: ["Road Town", 18.4, -64.6, "America/Tortola"],
  VI: ["Charlotte-Amélie", 18.3, -64.9, "America/St_Thomas"],
  VN: ["Hanoï", 21, 105.9, "Asia/Ho_Chi_Minh"],
  VU: ["Port-Vila", -17.7, 168.3, "Pacific/Efate"],
  WF: ["Mata-Utu", -13.3, -176.2, "Pacific/Wallis"],
  WS: ["Apia", -13.8, -171.8, "Pacific/Apia"],
  XK: ["Pristina", 42.7, 21.2, "Europe/Belgrade"],
  YE: ["Sanaa", 15.4, 44.2, "Asia/Aden"],
  YT: ["Mamoudzou", -12.8, 45.2, "Indian/Mayotte"],
  ZA: ["Johannesburg", -26.2, 28, "Africa/Johannesburg"],
  ZM: ["Lusaka", -15.4, 28.3, "Africa/Lusaka"],
  ZW: ["Harare", -17.8, 31, "Africa/Harare"],
};

export const PLACES: ReadonlyMap<string, Place> = new Map(
  Object.entries(RAW).map(([code, [city, latitude, longitude, timeZone]]) => [
    code,
    { code, city, latitude, longitude, timeZone },
  ]),
);

/**
 * Other time zones of the countries that span several. A dial stop here is about
 * the hour in that city; the channels offered remain the country's own.
 */
const EXTRA_RAW: Record<string, readonly (readonly [string, number, number, string])[]> = {
  US: [
    ["Chicago", 41.9, -87.6, "America/Chicago"],
    ["Denver", 39.7, -105, "America/Denver"],
    ["Los Angeles", 34.1, -118.2, "America/Los_Angeles"],
    ["Anchorage", 61.2, -149.9, "America/Anchorage"],
    ["Honolulu", 21.3, -157.9, "Pacific/Honolulu"],
  ],
  CA: [["Vancouver", 49.3, -123.1, "America/Vancouver"]],
  MX: [["Tijuana", 32.5, -117, "America/Tijuana"]],
  BR: [["Manaus", -3.1, -60, "America/Manaus"]],
  RU: [
    ["Novossibirsk", 55, 82.9, "Asia/Novosibirsk"],
    ["Vladivostok", 43.1, 131.9, "Asia/Vladivostok"],
  ],
  CD: [["Lubumbashi", -11.7, 27.5, "Africa/Lubumbashi"]],
  ID: [["Jayapura", -2.5, 140.7, "Asia/Jayapura"]],
  AU: [["Perth", -31.9, 115.9, "Australia/Perth"]],
};

const placesByCountry = new Map<string, Place[]>();

/** Every place a country can be tuned at, its reference city first. Stable identities. */
export const placesOf = (code: string): Place[] => {
  const cached = placesByCountry.get(code);
  if (cached) return cached;
  const main = PLACES.get(code);
  if (!main) return [];
  const places = [
    main,
    ...(EXTRA_RAW[code] ?? []).map(([city, latitude, longitude, timeZone]) => ({
      code,
      city,
      latitude,
      longitude,
      timeZone,
    })),
  ];
  placesByCountry.set(code, places);
  return places;
};

const zoneOffsets = new Map<string, number>();
const OFFSET_REFERENCE = new Date("2026-01-15T12:00:00Z");

/** Minutes ahead of UTC on a fixed date: good enough to compare zones of one country. */
const zoneOffset = (timeZone: string): number => {
  let offset = zoneOffsets.get(timeZone);
  if (offset === undefined) {
    const { hour, minute } = localClock(OFFSET_REFERENCE, timeZone);
    const delta = hour * 60 + minute - 12 * 60;
    offset = delta > 840 ? delta - 1440 : delta < -720 ? delta + 1440 : delta;
    zoneOffsets.set(timeZone, offset);
  }
  return offset;
};

/** The dial stop of a country closest to a channel's published time zone. */
export const placeForZone = (code: string, timeZone: string | null | undefined): Place | null => {
  const places = placesOf(code);
  const main = places[0] ?? null;
  if (!timeZone || places.length < 2) return main;
  const exact = places.find((place) => place.timeZone === timeZone);
  if (exact) return exact;
  const target = zoneOffset(timeZone);
  let best = main;
  let bestDistance = Infinity;
  for (const place of places) {
    const distance = Math.abs(zoneOffset(place.timeZone) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = place;
    }
  }
  return best;
};

/**
 * The name to print beside a clock set to `timeZone`. A national channel can publish
 * a zone far from any dial stop, and that clock must never be attributed to the stop.
 */
export const zoneCity = (
  code: string | null,
  timeZone: string | null | undefined,
): string | null => {
  const place = code ? placeForZone(code, timeZone) : null;
  if (!timeZone || place?.timeZone === timeZone) return place?.city ?? null;
  return timeZone.split("/").pop()?.replace(/_/g, " ") ?? null;
};

export const placeOf = (code: string | null | undefined): Place | null =>
  code ? (PLACES.get(code.toUpperCase()) ?? null) : null;

/** Cities printed on the dial, the way shortwave receivers print theirs. */
export const DIAL_CITIES: readonly string[] = [
  "US",
  "CA",
  "MX",
  "CO",
  "PE",
  "BR",
  "AR",
  "HT",
  "SN",
  "CI",
  "MA",
  "ML",
  "ES",
  "UK",
  "FR",
  "BJ",
  "NG",
  "CM",
  "DZ",
  "IT",
  "CD",
  "TN",
  "DE",
  "ZA",
  "EG",
  "TR",
  "KE",
  "RU",
  "SA",
  "AE",
  "IR",
  "PK",
  "IN",
  "BD",
  "TH",
  "VN",
  "CN",
  "HK",
  "PH",
  "KR",
  "JP",
  "AU",
  "NZ",
];

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

const clockFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = clockFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    clockFormatters.set(timeZone, formatter);
  }
  return formatter;
};

export type LocalClock = { hour: number; minute: number; label: string };

export const localClock = (date: Date, timeZone: string): LocalClock => {
  let hour = 0;
  let minute = 0;
  try {
    for (const part of clockFormatter(timeZone).formatToParts(date)) {
      if (part.type === "hour") hour = Number(part.value);
      if (part.type === "minute") minute = Number(part.value);
    }
  } catch {
    hour = date.getUTCHours();
    minute = date.getUTCMinutes();
  }
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
};
