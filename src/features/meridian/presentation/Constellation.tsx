"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Clock8, Compass, Shuffle } from "lucide-react";
import { countryDisplayName, flagEmoji } from "@/features/catalog/presentation/display-names";
import { useNow } from "../application/use-now";
import type { FilterOption } from "@/features/catalog/domain/types";
import { localClock, placeOf, placesOf, type Place } from "../domain/places";
import { dayPhase, solarElevation, sunPosition, wrapLongitude } from "../domain/solar";
import {
  getLandDots,
  greatCircleArc,
  projectOrtho,
  shortestAngleDelta,
  WORLD_LANDMASSES,
} from "../domain/world-geometry";

type Light = { id: string; code: string; name: string; count: number; place: Place };

type Props = {
  countries: readonly FilterOption[];
  selected: string | null;
  visited: readonly string[];
  onSelect: (code: string) => void;
};

const HIT_RADIUS_PX = 24;
const fract = (value: number): number => value - Math.floor(value);
const STARS: readonly { x: number; y: number; r: number; a: number }[] = Array.from(
  { length: 84 },
  (_, i) => {
    const s1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const s2 = Math.sin(i * 93.9898 + 19.13) * 24634.6345;
    const s3 = Math.sin(i * 41.13 + 3.7) * 15731.743;
    return {
      x: fract(s1),
      y: fract(s2),
      r: 0.55 + fract(s3) * 1.15,
      a: 0.16 + fract(s1 * 7) * 0.46,
    };
  },
);

const clampLat = (lat: number): number => Math.max(-58, Math.min(58, lat));

const globeMetrics = (width: number, height: number) => {
  const compact = width < 520;
  return {
    cx: width / 2,
    cy: compact ? height * 0.43 : height / 2,
    radius: Math.min(width * 0.42, height * (compact ? 0.36 : 0.43)),
  };
};

/**
 * Interactive 3D orthographic Earth globe for the Carnet d'escales.
 * Real-time day/night terminator, vector continents + illuminated land stipple,
 * 3D elevated geodesic flight arcs between visited stops, drag inertia, and fly-to camera.
 */
export function Constellation({ countries, selected, visited, onSelect }: Props) {
  const now = useNow();
  const stops = useMemo<Light[]>(
    () =>
      countries
        .filter((country) => country.count > 0)
        .flatMap((country) =>
          placesOf(country.value).map((place) => ({
            id: `${country.value}:${place.city}`,
            code: country.value,
            name: country.label,
            count: country.count,
            place,
          })),
        ),
    [countries],
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<Light | null>(null);
  const [dragging, setDragging] = useState(false);

  // Camera & physics refs (zero React re-renders during 60 fps spin)
  const camRef = useRef({
    lon: 12,
    lat: 16,
    velLon: 0,
    velLat: 0,
    targetLon: null as number | null,
    targetLat: null as number | null,
  });
  const pointerRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const hoverRef = useRef<Light | null>(null);
  hoverRef.current = hover;

  // Measure container responsively
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    sync();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", sync);
      return () => window.removeEventListener("resize", sync);
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Fly camera smoothly to newly selected country
  useEffect(() => {
    if (!selected) return;
    const place = placeOf(selected);
    if (!place) return;
    camRef.current.targetLon = place.longitude;
    camRef.current.targetLat = clampLat(place.latitude * 0.72);
    camRef.current.velLon = 0;
    camRef.current.velLat = 0;
  }, [selected]);

  // Precompute 3D great-circle flight arcs between consecutive visited stops
  const visitedArcs = useMemo(() => {
    const places = visited.map((code) => placeOf(code)).filter((p): p is Place => Boolean(p));
    const arcs: ReturnType<typeof greatCircleArc>[] = [];
    for (let i = 1; i < places.length; i++) {
      const from = places[i - 1]!;
      const to = places[i]!;
      arcs.push(greatCircleArc(from.latitude, from.longitude, to.latitude, to.longitude, 30));
    }
    return arcs;
  }, [visited]);

  const landDots = useMemo(() => getLandDots(), []);

  // Main 60 fps 3D rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !now || size.width === 0 || size.height === 0) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);

    const date = new Date(now);
    const sun = sunPosition(date);
    const primeMeridianLon = wrapLongitude(sun.subsolarLongitude + 120);
    const stamped = new Set(visited);

    // Precompute real-time solar elevation for every land dot once per minute
    const dotElevations = new Float32Array(landDots.length);
    for (let i = 0; i < landDots.length; i++) {
      const dot = landDots[i]!;
      dotElevations[i] = solarElevation(sun, dot.lat, dot.lon);
    }

    let frame = 0;
    const draw = (time: number) => {
      const cam = camRef.current;
      const isDragging = pointerRef.current.active;

      if (!isDragging) {
        if (cam.targetLon !== null && cam.targetLat !== null) {
          const dLon = shortestAngleDelta(cam.lon, cam.targetLon);
          const dLat = cam.targetLat - cam.lat;
          if (reduceMotion || (Math.abs(dLon) < 0.15 && Math.abs(dLat) < 0.15)) {
            cam.lon = wrapLongitude(cam.targetLon);
            cam.lat = cam.targetLat;
            cam.targetLon = null;
            cam.targetLat = null;
          } else {
            cam.lon = wrapLongitude(cam.lon + dLon * 0.11);
            cam.lat = clampLat(cam.lat + dLat * 0.11);
          }
        } else {
          if (Math.abs(cam.velLon) > 0.01 || Math.abs(cam.velLat) > 0.01) {
            cam.lon = wrapLongitude(cam.lon + cam.velLon);
            cam.lat = clampLat(cam.lat + cam.velLat);
            cam.velLon *= 0.93;
            cam.velLat *= 0.91;
          } else if (!reduceMotion && !hoverRef.current && !selected) {
            // Gentle ambient orbital drift
            cam.lon = wrapLongitude(cam.lon + 0.085);
          }
        }
      }

      const w = size.width;
      const h = size.height;
      const { cx, cy, radius } = globeMetrics(w, h);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Deep orbital cosmos background + subtle stars
      const bg = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, Math.max(w, h) * 0.72);
      bg.addColorStop(0, "#0c1324");
      bg.addColorStop(0.55, "#070a14");
      bg.addColorStop(1, "#04060c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const star of STARS) {
        ctx.fillStyle = `rgb(226 232 240 / ${star.a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Real-time sun projection in camera frame for atmospheric lighting
      const sunProj = projectOrtho(sun.declination, sun.subsolarLongitude, cam.lat, cam.lon, cx, cy, radius);
      const sunDirX = (sunProj.x - cx) / (radius || 1);
      const sunDirY = (sunProj.y - cy) / (radius || 1);

      // Outer Rayleigh atmospheric halo
      const haloX = cx + sunDirX * radius * 0.24;
      const haloY = cy + sunDirY * radius * 0.24;
      const halo = ctx.createRadialGradient(haloX, haloY, radius * 0.84, cx, cy, radius * 1.32);
      halo.addColorStop(0, "rgb(56 189 248 / 32%)");
      halo.addColorStop(0.45, "rgb(37 99 235 / 16%)");
      halo.addColorStop(0.75, "rgb(245 185 66 / 5%)");
      halo.addColorStop(1, "rgb(7 10 20 / 0%)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
      ctx.fill();

      // 3. Ocean sphere base with spherical day/night shading
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const lightX = cx + sunDirX * radius * 0.52;
      const lightY = cy + sunDirY * radius * 0.52;
      const ocean = ctx.createRadialGradient(
        lightX,
        lightY,
        radius * 0.08,
        cx,
        cy,
        radius * 1.18,
      );
      if (sunProj.z > -0.25) {
        ocean.addColorStop(0, "#153d73");
        ocean.addColorStop(0.46, "#0d2347");
        ocean.addColorStop(0.78, "#091328");
        ocean.addColorStop(1, "#050812");
      } else {
        ocean.addColorStop(0, "#0b1a36");
        ocean.addColorStop(0.55, "#070e1f");
        ocean.addColorStop(1, "#04060d");
      }
      ctx.fillStyle = ocean;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      // 4. Delicate 3D orbital graticule (parallels & meridians)
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = "rgb(148 163 184 / 9%)";
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lon = -180; lon <= 180; lon += 6) {
          const p = projectOrtho(lat, lon, cam.lat, cam.lon, cx, cy, radius);
          if (p.z > 0) {
            if (!pen) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            pen = true;
          } else {
            pen = false;
          }
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lat = -84; lat <= 84; lat += 6) {
          const p = projectOrtho(lat, lon, cam.lat, cam.lon, cx, cy, radius);
          if (p.z > 0) {
            if (!pen) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            pen = true;
          } else {
            pen = false;
          }
        }
        ctx.stroke();
      }

      // Live 20:00 Prime-Time Meridian dashed gold arc + subtle "20 h" marker
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgb(245 185 66 / 46%)";
      ctx.beginPath();
      let primePen = false;
      for (let lat = -78; lat <= 78; lat += 4) {
        const p = projectOrtho(lat, primeMeridianLon, cam.lat, cam.lon, cx, cy, radius);
        if (p.z > 0) {
          if (!primePen) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          primePen = true;
        } else {
          primePen = false;
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const primeBadge = projectOrtho(56, primeMeridianLon, cam.lat, cam.lon, cx, cy, radius);
      if (primeBadge.z > 0.25) {
        ctx.font = '600 9.5px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = "rgb(252 211 77 / 78%)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("20 h", primeBadge.x, primeBadge.y - 8);
      }
      ctx.restore();

      // 5. Crisp 3D continental vector outlines
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgb(125 211 252 / 34%)";
      for (const poly of WORLD_LANDMASSES) {
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= poly.length; i++) {
          const [lon, lat] = poly[i % poly.length]!;
          const p = projectOrtho(lat, lon, cam.lat, cam.lon, cx, cy, radius);
          if (p.z > 0.01) {
            if (!pen) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            pen = true;
          } else {
            pen = false;
          }
        }
        ctx.stroke();
      }

      // 6. Solar-illuminated Fibonacci land stipple dots (Day azure / Twilight amber / Night slate)
      const dotBaseR = Math.max(1.1, radius * 0.0085);
      for (let i = 0; i < landDots.length; i++) {
        const dot = landDots[i]!;
        const p = projectOrtho(dot.lat, dot.lon, cam.lat, cam.lon, cx, cy, radius);
        if (p.z <= 0.02) continue;
        const elev = dotElevations[i]!;
        const depthAlpha = 0.38 + p.z * 0.62;
        if (elev > 10) {
          ctx.fillStyle = `rgb(147 212 255 / ${(0.64 * depthAlpha).toFixed(2)})`;
        } else if (elev > -6) {
          // Glowing sunrise/sunset twilight terminator!
          ctx.fillStyle = `rgb(255 178 88 / ${(0.82 * depthAlpha).toFixed(2)})`;
        } else {
          ctx.fillStyle = `rgb(112 138 188 / ${(0.42 * depthAlpha).toFixed(2)})`;
        }
        const r = dotBaseR * (0.68 + p.z * 0.42);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle inner specular rim inside sphere
      const rim = ctx.createRadialGradient(cx, cy, radius * 0.84, cx, cy, radius);
      rim.addColorStop(0, "rgb(56 189 248 / 0%)");
      rim.addColorStop(0.85, "rgb(56 189 248 / 8%)");
      rim.addColorStop(1, "rgb(186 230 253 / 34%)");
      ctx.fillStyle = rim;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      // Crisp orbital outer border ring
      ctx.strokeStyle = "rgb(148 197 255 / 22%)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 7. 3D Elevated Geodesic Flight Arcs connecting visited escales!
      const packetT = reduceMotion ? 0.5 : (time * 0.00038) % 1;
      for (const arc of visitedArcs) {
        const traceArc = () => {
          ctx.beginPath();
          let pen = false;
          for (const pt of arc) {
            const p = projectOrtho(pt.lat, pt.lon, cam.lat, cam.lon, cx, cy, radius, pt.altitude);
            if (p.z > -0.08) {
              if (!pen) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
              pen = true;
            } else {
              pen = false;
            }
          }
        };

        // Soft golden flight-corridor glow
        traceArc();
        ctx.strokeStyle = "rgb(245 185 66 / 22%)";
        ctx.lineWidth = 5;
        ctx.stroke();

        // Crisp luminous flight trajectory
        traceArc();
        ctx.strokeStyle = "rgb(252 211 77 / 88%)";
        ctx.lineWidth = 1.85;
        ctx.stroke();

        // Travelling luminous light packet along the flight arc
        const idx = Math.min(arc.length - 1, Math.floor(packetT * arc.length));
        const pkt = arc[idx]!;
        const pp = projectOrtho(pkt.lat, pkt.lon, cam.lat, cam.lon, cx, cy, radius, pkt.altitude);
        if (pp.z > 0) {
          ctx.fillStyle = "rgb(252 211 77 / 38%)";
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, 6.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fffbeb";
          ctx.beginPath();
          ctx.arc(pp.x, pp.y, 2.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 8. Broadcaster city beacons on the visible hemisphere
      const pulsePhase = reduceMotion ? 0.4 : (time * 0.0022) % 1;
      const sizeScale = Math.min(1, Math.max(0.6, radius / 205));
      let activeLabel: { x: number; y: number; text: string } | null = null;

      for (const stop of stops) {
        const p = projectOrtho(
          stop.place.latitude,
          stop.place.longitude,
          cam.lat,
          cam.lon,
          cx,
          cy,
          radius,
        );
        if (p.z <= 0.04) continue;

        const isVisited = stamped.has(stop.code);
        const isFocused = stop.code === selected || stop.id === hoverRef.current?.id;
        const baseR =
          (1.15 + Math.min(1.85, Math.log10(stop.count + 1) * 0.78)) *
          (0.72 + p.z * 0.32) *
          sizeScale;

        // Soft beacon aura
        const glowColor = isFocused
          ? "rgb(244 63 94 / 46%)"
          : isVisited
            ? "rgb(245 185 66 / 38%)"
            : "rgb(56 189 248 / 21%)";
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseR * (isFocused ? 2.6 : 2.0), 0, Math.PI * 2);
        ctx.fill();

        // Core city dot
        ctx.fillStyle = isFocused ? "#fff" : isVisited ? "#ffd166" : "#e0f2fe";
        ctx.beginPath();
        ctx.arc(p.x, p.y, isFocused ? baseR * 1.35 : baseR, 0, Math.PI * 2);
        ctx.fill();

        if (isVisited && !isFocused) {
          ctx.strokeStyle = "#f5b942";
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseR + 3.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (isFocused) {
          // Animated pulsing radar ring
          ctx.strokeStyle = `rgb(244 63 94 / ${(1 - pulsePhase * 0.85).toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseR + 4 + pulsePhase * 12, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "#f5b942";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, baseR + 4.5, 0, Math.PI * 2);
          ctx.stroke();

          if (!activeLabel || stop.id === hoverRef.current?.id) {
            activeLabel = {
              x: p.x,
              y: p.y - baseR - 14,
              text: `${stop.place.city} · ${localClock(date, stop.place.timeZone).label}`,
            };
          }
        }
      }

      // 9. Floating glass pill tag above active/hovered city
      if (activeLabel) {
        ctx.font = '600 11px "Instrument Sans Variable", ui-sans-serif, sans-serif';
        const tw = ctx.measureText(activeLabel.text).width;
        const padX = 10;
        const boxW = tw + padX * 2;
        const boxH = 24;
        const bx = Math.max(10, Math.min(w - boxW - 10, activeLabel.x - boxW / 2));
        const by = Math.max(10, activeLabel.y - boxH);

        ctx.fillStyle = "rgb(9 12 22 / 88%)";
        ctx.strokeStyle = "rgb(245 185 66 / 55%)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 999);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(activeLabel.text, bx + boxW / 2, by + boxH / 2 + 0.5);
      }

      if (!reduceMotion) {
        frame = requestAnimationFrame(draw);
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [landDots, now, selected, size, stops, visited, visitedArcs]);

  const stopAt = useCallback(
    (clientX: number, clientY: number, target: HTMLCanvasElement): Light | null => {
      const box = target.getBoundingClientRect();
      const px = clientX - box.left;
      const py = clientY - box.top;
      const { cx, cy, radius } = globeMetrics(box.width, box.height);
      const cam = camRef.current;

      let best: Light | null = null;
      let bestDistance = HIT_RADIUS_PX ** 2;
      for (const stop of stops) {
        const p = projectOrtho(
          stop.place.latitude,
          stop.place.longitude,
          cam.lat,
          cam.lon,
          cx,
          cy,
          radius,
        );
        if (p.z <= 0.05) continue;
        const dx = p.x - px;
        const dy = p.y - py;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = stop;
        }
      }
      return best;
    },
    [stops],
  );

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    camRef.current.targetLon = null;
    camRef.current.targetLat = null;
    camRef.current.velLon = 0;
    camRef.current.velLat = 0;
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const ptr = pointerRef.current;
    if (ptr.active) {
      const dx = event.clientX - ptr.lastX;
      const dy = event.clientY - ptr.lastY;
      if (Math.hypot(event.clientX - ptr.startX, event.clientY - ptr.startY) > 6) {
        ptr.moved = true;
      }
      ptr.lastX = event.clientX;
      ptr.lastY = event.clientY;
      const sensitivity = 0.36;
      camRef.current.lon = wrapLongitude(camRef.current.lon - dx * sensitivity);
      camRef.current.lat = clampLat(camRef.current.lat + dy * sensitivity * 0.8);
      camRef.current.velLon = -dx * sensitivity * 0.65;
      camRef.current.velLat = dy * sensitivity * 0.45;
      return;
    }
    setHover(stopAt(event.clientX, event.clientY, event.currentTarget));
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const ptr = pointerRef.current;
    const wasTap = ptr.active && !ptr.moved;
    ptr.active = false;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (wasTap) {
      const picked = stopAt(event.clientX, event.clientY, event.currentTarget);
      if (picked) onSelect(picked.code);
    }
  };

  const flyToPrimeTime = () => {
    if (!now) return;
    const sun = sunPosition(new Date(now));
    camRef.current.targetLon = wrapLongitude(sun.subsolarLongitude + 120);
    camRef.current.targetLat = 18;
  };

  const spinSurprise = () => {
    if (stops.length === 0) return;
    const unvisited = stops.filter((s) => !visited.includes(s.code) && s.code !== selected);
    const pool = unvisited.length > 0 ? unvisited : stops.filter((s) => s.code !== selected);
    const chosen = (pool.length > 0 ? pool : stops)[
      Math.floor(Math.random() * (pool.length > 0 ? pool : stops).length)
    ];
    if (!chosen) return;
    // Give a dramatic spin before settling on the chosen destination
    camRef.current.lon = wrapLongitude(chosen.place.longitude - 135);
    camRef.current.targetLon = chosen.place.longitude;
    camRef.current.targetLat = clampLat(chosen.place.latitude * 0.72);
    onSelect(chosen.code);
  };

  const shown = hover ?? stops.find((stop) => stop.code === selected) ?? null;
  const countryCount = useMemo(() => new Set(stops.map((stop) => stop.code)).size, [stops]);
  const shownPhase = useMemo(() => {
    if (!shown || !now) return null;
    return dayPhase(sunPosition(new Date(now)), shown.place.latitude, shown.place.longitude);
  }, [now, shown]);

  return (
    <figure className="md-constellation md-globe-stage">
      <div className="md-globe-viewport">
        <canvas
          ref={canvasRef}
          data-testid="constellation"
          data-stops={countryCount}
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            if (!pointerRef.current.active) setHover(null);
          }}
          style={{ cursor: dragging ? "grabbing" : hover ? "pointer" : "grab" }}
        />

        {/* Subtle top-left hint badge */}
        <div className="md-globe-hint" aria-hidden>
          <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Glisser pour tourner · Cliquer une ville</span>
        </div>

        {/* Floating quick-action pills */}
        <div className="md-globe-controls">
          <button
            type="button"
            onClick={flyToPrimeTime}
            className="md-globe-btn"
            aria-label="Tourner le globe vers 20 h"
          >
            <Clock8 className="h-3.5 w-3.5" aria-hidden />
            <span>20 h</span>
          </button>
          <button
            type="button"
            onClick={spinSurprise}
            disabled={stops.length === 0}
            className="md-globe-btn md-globe-btn-accent"
            aria-label="Lancer le globe vers une destination surprise"
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            <span>Destination surprise</span>
          </button>
        </div>
      </div>

      <figcaption>
        {shown && now ? (
          <>
            <strong>
              <span className="mr-1.5" aria-hidden>
                {flagEmoji(shown.code)}
              </span>
              {countryDisplayName(shown.code, shown.name)}
            </strong>
            <span>
              {localClock(new Date(now), shown.place.timeZone).label} à {shown.place.city}
              {shownPhase ? ` · ${shownPhase}` : ""} ·{" "}
              {shown.count.toLocaleString("fr-FR")} {shown.count > 1 ? "chaînes" : "chaîne"}
            </span>
          </>
        ) : (
          <span>
            {stops.length > 0
              ? `${countryCount} pays à l’antenne sur le globe, dans la lumière de cette minute.`
              : "Le globe s’allume…"}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
