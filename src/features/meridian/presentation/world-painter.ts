import type { Stop } from "../domain/atlas";
import { localClock } from "../domain/places";
import {
  skyRgb,
  solarElevation,
  sunPosition,
  wrapLongitude,
  type SunPosition,
} from "../domain/solar";

export const MAP_NORTH = 72;
export const MAP_SOUTH = -58;
const MAP_LATITUDES = MAP_NORTH - MAP_SOUTH;

export const latitudeToY = (latitude: number, height: number): number =>
  ((MAP_NORTH - latitude) / MAP_LATITUDES) * height;

/**
 * One pixel per degree of the Earth, lit by the real sun. Rebuilt once a minute;
 * the visible terminator is the true curve of dawn and dusk across the planet.
 */
export const paintDaylight = (canvas: HTMLCanvasElement, sun: SunPosition): void => {
  canvas.width = 360;
  canvas.height = MAP_LATITUDES;
  const context = canvas.getContext("2d");
  if (!context) return;
  const image = context.createImageData(360, MAP_LATITUDES);
  for (let y = 0; y < MAP_LATITUDES; y++) {
    const latitude = MAP_NORTH - y - 0.5;
    for (let x = 0; x < 360; x++) {
      const [r, g, b] = skyRgb(solarElevation(sun, latitude, x - 180 + 0.5));
      const offset = (y * 360 + x) * 4;
      image.data[offset] = r;
      image.data[offset + 1] = g;
      image.data[offset + 2] = b;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
};

const lightRadius = (count: number): number => 1 + Math.min(3.2, Math.log10(count + 1) * 1.05);

/** Broadcasters as lights on the planet: warm at night, dark ink against the day. */
export const paintLight = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  elevation: number,
): void => {
  const radius = lightRadius(count);
  const night = elevation < -2;
  if (night) {
    context.fillStyle = "rgb(255 214 130 / 22%)";
    context.beginPath();
    context.arc(x, y, radius * 2.6, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = night ? "#ffe9b8" : "rgb(9 11 20 / 72%)";
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};

export const paintSun = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void => {
  const glow = context.createRadialGradient(x, y, radius * 0.4, x, y, radius * 4.5);
  glow.addColorStop(0, "rgb(255 244 200 / 75%)");
  glow.addColorStop(1, "rgb(255 244 200 / 0%)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius * 4.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff4c8";
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};

export type DialFrame = {
  width: number;
  height: number;
  needle: number;
  now: Date;
  stops: readonly Stop[];
  cities: readonly Stop[];
  activeId: string | null;
  daylight: HTMLCanvasElement;
  scaleHeight: number;
  pixelsPerDegree: number;
};

const SCALE_INK = "#07080f";

/** Paint the dial: the lit Earth above, the graduated tuning scale below. */
export const paintDial = (context: CanvasRenderingContext2D, frame: DialFrame): void => {
  const { width, height, needle, now, stops, cities, activeId, daylight } = frame;
  const { scaleHeight, pixelsPerDegree: ppd } = frame;
  const mapHeight = height - scaleHeight;
  const sun = sunPosition(now);
  const xOf = (longitude: number): number => width / 2 + wrapLongitude(longitude - needle) * ppd;

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  // The Earth wraps around: draw as many 360° tiles as the width requires.
  const leftLongitude = needle - width / 2 / ppd;
  const firstX = -((((leftLongitude + 180) % 360) + 360) % 360) * ppd;
  for (let x = firstX; x < width; x += 360 * ppd) {
    context.drawImage(daylight, x, 0, 360 * ppd, mapHeight);
  }

  for (const stop of stops) {
    const x = xOf(stop.place.longitude);
    if (x < -8 || x > width + 8) continue;
    const y = latitudeToY(stop.place.latitude, mapHeight);
    paintLight(
      context,
      x,
      y,
      stop.count,
      solarElevation(sun, stop.place.latitude, stop.place.longitude),
    );
  }

  const sunX = xOf(sun.subsolarLongitude);
  if (sunX > -80 && sunX < width + 80) {
    paintSun(context, sunX, latitudeToY(sun.declination, mapHeight), mapHeight > 150 ? 9 : 7);
  }

  // Tuning scale
  const top = mapHeight;
  context.fillStyle = SCALE_INK;
  context.fillRect(0, top, width, scaleHeight);
  context.fillStyle = "rgb(255 255 255 / 24%)";
  const firstDegree = Math.floor(needle - width / 2 / ppd);
  const lastDegree = Math.ceil(needle + width / 2 / ppd);
  for (let degree = firstDegree; degree <= lastDegree; degree++) {
    const major = degree % 15 === 0;
    const middle = degree % 5 === 0;
    if (!middle && ppd < 5) continue;
    const x = Math.round(width / 2 + (degree - needle) * ppd);
    context.fillRect(x, top, 1, major ? 11 : middle ? 7 : 4);
  }

  for (const stop of stops) {
    const x = xOf(stop.place.longitude);
    if (x < -2 || x > width + 2) continue;
    const active = stop.id === activeId;
    context.fillStyle = active ? "#ffc53d" : "rgb(255 197 61 / 62%)";
    context.fillRect(
      Math.round(x),
      top,
      active ? 2 : 1,
      active ? 16 : 5 + Math.log10(stop.count + 1) * 3,
    );
  }

  // Printed city names, skipping whichever would overlap a higher-priority one.
  const fontSize = scaleHeight > 52 ? 11 : 10;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  const taken: [number, number][] = [];
  for (const stop of cities) {
    const x = xOf(stop.place.longitude);
    if (x < -60 || x > width + 60) continue;
    const name = stop.place.city.toUpperCase();
    context.font = `700 ${fontSize}px "Anybody Variable", "Arial Narrow", sans-serif`;
    const half = context.measureText(name).width / 2 + 7;
    if (taken.some(([from, to]) => x + half > from && x - half < to)) continue;
    taken.push([x - half, x + half]);
    context.fillStyle = stop.id === activeId ? "#ffc53d" : "rgb(244 241 232 / 88%)";
    context.fillText(name, x, top + scaleHeight - 19);
    context.font = `500 ${fontSize - 1}px "Martian Mono Variable", ui-monospace, monospace`;
    context.fillStyle = "rgb(244 241 232 / 58%)";
    context.fillText(localClock(now, stop.place.timeZone).label, x, top + scaleHeight - 6);
  }
};
