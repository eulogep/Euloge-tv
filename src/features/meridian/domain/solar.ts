/**
 * The sun is the only decoration Méridien allows itself: every colour derived
 * here is the real sky at a real place, right now. NOAA low-precision formulas,
 * accurate to well under a degree, which is plenty for a colour.
 */

const RAD = Math.PI / 180;

export type SunPosition = {
  /** Latitude where the sun is overhead, in degrees. */
  declination: number;
  /** Longitude where the sun is overhead, in degrees within [-180, 180). */
  subsolarLongitude: number;
};

export const wrapLongitude = (longitude: number): number =>
  ((((longitude + 180) % 360) + 360) % 360) - 180;

export const sunPosition = (date: Date): SunPosition => {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - startOfYear) / 86_400_000;
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const declination =
    (0.006918 -
      0.399912 * Math.cos(g) +
      0.070257 * Math.sin(g) -
      0.006758 * Math.cos(2 * g) +
      0.000907 * Math.sin(2 * g) -
      0.002697 * Math.cos(3 * g) +
      0.00148 * Math.sin(3 * g)) /
    RAD;
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  return {
    declination,
    subsolarLongitude: wrapLongitude(-(utcMinutes + equationOfTime - 720) / 4),
  };
};

/** Height of the sun above the horizon at a place, in degrees. */
export const solarElevation = (sun: SunPosition, latitude: number, longitude: number): number => {
  const lat = latitude * RAD;
  const decl = sun.declination * RAD;
  const hourAngle = (longitude - sun.subsolarLongitude) * RAD;
  return (
    Math.asin(
      Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle),
    ) / RAD
  );
};

export type Rgb = readonly [number, number, number];

/** Elevation in degrees → sky colour. Deliberately saturated at the horizon. */
const SKY_RAMP: readonly (readonly [number, Rgb])[] = [
  [-90, [6, 8, 26]],
  [-18, [9, 12, 38]],
  [-12, [20, 22, 72]],
  [-7, [58, 36, 112]],
  [-3, [146, 52, 116]],
  [-0.5, [235, 84, 74]],
  [2, [255, 138, 56]],
  [6, [255, 190, 92]],
  [12, [188, 214, 196]],
  [24, [116, 194, 226]],
  [50, [58, 158, 226]],
  [90, [44, 136, 214]],
];

export const skyRgb = (elevation: number): Rgb => {
  for (let index = 1; index < SKY_RAMP.length; index++) {
    const [upper, top] = SKY_RAMP[index]!;
    if (elevation > upper) continue;
    const [lower, bottom] = SKY_RAMP[index - 1]!;
    const t = upper === lower ? 0 : Math.max(0, (elevation - lower) / (upper - lower));
    return [
      Math.round(bottom[0] + (top[0] - bottom[0]) * t),
      Math.round(bottom[1] + (top[1] - bottom[1]) * t),
      Math.round(bottom[2] + (top[2] - bottom[2]) * t),
    ];
  }
  return SKY_RAMP[SKY_RAMP.length - 1]![1];
};

export const skyCss = (elevation: number): string => {
  const [r, g, b] = skyRgb(elevation);
  return `rgb(${r} ${g} ${b})`;
};

export const skyAt = (date: Date, latitude: number, longitude: number): string =>
  skyCss(solarElevation(sunPosition(date), latitude, longitude));

export type DayPhase = "nuit" | "aube" | "matin" | "plein jour" | "après-midi" | "crépuscule";

export const dayPhase = (sun: SunPosition, latitude: number, longitude: number): DayPhase => {
  const elevation = solarElevation(sun, latitude, longitude);
  // A place west of the subsolar point has not reached its noon yet.
  const morning = wrapLongitude(longitude - sun.subsolarLongitude) < 0;
  if (elevation < -10) return "nuit";
  if (elevation < 4) return morning ? "aube" : "crépuscule";
  if (elevation > 45) return "plein jour";
  return morning ? "matin" : "après-midi";
};

/** A world's-eye gradient, west to east, used by the thin bands across the UI. */
export const worldBandGradient = (date: Date, latitude = 12): string => {
  const sun = sunPosition(date);
  const stops: string[] = [];
  for (let longitude = -180; longitude <= 180; longitude += 15) {
    stops.push(skyCss(solarElevation(sun, latitude, longitude)));
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};

const relativeLuminance = ([r, g, b]: Rgb): number => {
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** Slightly more extreme than the brand ink and paper: type on a raw sky gets no help. */
export const SKY_INK: Rgb = [5, 6, 12];
export const SKY_PAPER: Rgb = [255, 255, 255];
const INK_LUMINANCE = relativeLuminance(SKY_INK);
const PAPER_LUMINANCE = relativeLuminance(SKY_PAPER);

/** Whichever of the two brand inks reads best on this sky. Always above WCAG AA. */
export const inkForSky = (elevation: number): "ink" | "paper" => {
  const sky = relativeLuminance(skyRgb(elevation));
  const onInk = (sky + 0.05) / (INK_LUMINANCE + 0.05);
  const onPaper = (PAPER_LUMINANCE + 0.05) / (sky + 0.05);
  return onInk >= onPaper ? "ink" : "paper";
};
