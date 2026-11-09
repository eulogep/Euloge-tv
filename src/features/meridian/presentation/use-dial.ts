"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import type { Stop } from "../domain/atlas";
import { DIAL_CITIES } from "../domain/places";
import { sunPosition, wrapLongitude } from "../domain/solar";
import { paintDaylight, paintDial } from "./world-painter";

type Options = {
  stops: readonly Stop[];
  initialId: () => string | null;
  now: number;
  reduceMotion: boolean;
  onSettle?: (stop: Stop) => void;
};

type Dial = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  /** Stop nearest the needle, updated as it moves. */
  stop: Stop | null;
  /** False while the needle is travelling. */
  settled: boolean;
  needle: number;
  tuneTo: (id: string) => void;
  step: (direction: -1 | 1) => void;
  dialHandlers: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  };
};

const TAP_SLOP_PX = 6;
const scaleHeightFor = (width: number): number => (width < 640 ? 48 : 58);
const pixelsPerDegreeFor = (width: number): number =>
  width < 640 ? 4.2 : Math.max(width / 200, 5);

/** Survives navigation so coming back from a channel returns to the same place on the dial. */
let lastTunedId: string | null = null;

/** A slight pull towards big broadcasters, so a coarse flick lands somewhere rich. */
const nearestStop = (stops: readonly Stop[], longitude: number): Stop | null => {
  let best: Stop | null = null;
  let bestScore = Infinity;
  for (const stop of stops) {
    const score =
      Math.abs(wrapLongitude(stop.place.longitude - longitude)) - Math.log10(stop.count + 1) * 0.2;
    if (score < bestScore) {
      bestScore = score;
      best = stop;
    }
  }
  return best;
};

/** The viewer's own meridian, estimated from their clock: no geolocation involved. */
const viewerLongitude = (): number => wrapLongitude(-new Date().getTimezoneOffset() / 4);

export const useDial = ({ stops, initialId, now, reduceMotion, onSettle }: Options): Dial => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const daylightRef = useRef<HTMLCanvasElement | null>(null);
  const needleRef = useRef(viewerLongitude());
  const velocityRef = useRef(0);
  const targetRef = useRef<{ longitude: number; id: string } | null>(null);
  const frameRef = useRef<number | null>(null);
  const loopRef = useRef<() => void>(() => {});
  const sizeRef = useRef({ width: 0, height: 0 });
  const activeIdRef = useRef<string | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    startX: number;
    time: number;
    moved: boolean;
  } | null>(null);
  const nowRef = useRef(now);
  const onSettleRef = useRef(onSettle);
  const initialIdRef = useRef(initialId);
  const [stop, setStop] = useState<Stop | null>(null);
  const [settled, setSettled] = useState(false);
  const [needle, setNeedle] = useState(0);

  useEffect(() => {
    onSettleRef.current = onSettle;
    initialIdRef.current = initialId;
  }, [initialId, onSettle]);

  const cities = useMemo(() => {
    const order = new Map(DIAL_CITIES.map((code, index) => [code, index]));
    return stops
      .filter((item) => order.has(item.code))
      .sort((a, b) => b.count - a.count || order.get(a.code)! - order.get(b.code)!);
  }, [stops]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const daylight = daylightRef.current;
    const { width, height } = sizeRef.current;
    if (!canvas || !daylight || width === 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = canvas.width / width;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintDial(context, {
      width,
      height,
      needle: needleRef.current,
      now: new Date(nowRef.current || Date.now()),
      stops,
      cities,
      activeId: activeIdRef.current,
      daylight,
      scaleHeight: scaleHeightFor(width),
      pixelsPerDegree: pixelsPerDegreeFor(width),
    });
  }, [cities, stops]);

  const setSpeed = useCallback((speed: number) => {
    rootRef.current?.style.setProperty("--dial-speed", Math.min(1, speed / 2.4).toFixed(3));
  }, []);

  const showStop = useCallback((next: Stop | null) => {
    if (!next || next.id === activeIdRef.current) return;
    activeIdRef.current = next.id;
    setStop(next);
  }, []);

  const settleOn = useCallback(
    (next: Stop | null) => {
      if (!next) return;
      needleRef.current = next.place.longitude;
      velocityRef.current = 0;
      targetRef.current = null;
      lastTunedId = next.id;
      activeIdRef.current = next.id;
      setStop(next);
      setSettled(true);
      setNeedle(next.place.longitude);
      setSpeed(0);
      onSettleRef.current?.(next);
    },
    [setSpeed],
  );

  const loop = useCallback(() => {
    frameRef.current = null;
    const before = needleRef.current;
    let running = false;

    if (dragRef.current) {
      running = true;
    } else if (targetRef.current) {
      const delta = wrapLongitude(targetRef.current.longitude - needleRef.current);
      if (Math.abs(delta) < 0.04) {
        const id = targetRef.current.id;
        settleOn(stops.find((item) => item.id === id) ?? null);
      } else {
        needleRef.current = wrapLongitude(needleRef.current + delta * 0.13);
        running = true;
      }
    } else if (Math.abs(velocityRef.current) > 0.05) {
      needleRef.current = wrapLongitude(needleRef.current + velocityRef.current);
      velocityRef.current *= 0.94;
      running = true;
    } else {
      const next = nearestStop(stops, needleRef.current);
      if (next) {
        targetRef.current = { longitude: next.place.longitude, id: next.id };
        running = true;
      }
    }

    const speed = Math.abs(wrapLongitude(needleRef.current - before));
    if (running) {
      setSpeed(speed);
      if (targetRef.current) {
        showStop(stops.find((item) => item.id === targetRef.current?.id) ?? null);
      } else {
        showStop(nearestStop(stops, needleRef.current));
      }
    }
    paint();
    if (running) frameRef.current = requestAnimationFrame(() => loopRef.current());
  }, [paint, setSpeed, settleOn, showStop, stops]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(() => {
    setSettled(false);
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => loopRef.current());
    }
  }, []);

  const tuneTo = useCallback(
    (id: string) => {
      const next = stops.find((item) => item.id === id);
      if (!next) return;
      if (reduceMotion) {
        settleOn(next);
        paint();
        return;
      }
      velocityRef.current = 0;
      targetRef.current = { longitude: next.place.longitude, id: next.id };
      start();
    },
    [paint, reduceMotion, settleOn, start, stops],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      if (stops.length === 0) return;
      const anchor = targetRef.current?.id ?? activeIdRef.current;
      const index = stops.findIndex((item) => item.id === anchor);
      const next = stops[(index + direction + stops.length) % stops.length];
      if (next) tuneTo(next.id);
    },
    [stops, tuneTo],
  );

  // Keep the canvas sharp and sized to its box.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      paint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  // Daylight only changes with the minute.
  useEffect(() => {
    nowRef.current = now;
    if (!now) return;
    daylightRef.current ??= document.createElement("canvas");
    paintDaylight(daylightRef.current, sunPosition(new Date(now)));
    paint();
  }, [now, paint]);

  // Printed labels need the real fonts to measure correctly.
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) paint();
    });
    return () => {
      cancelled = true;
    };
  }, [paint]);

  // Never outlive the component; a strict-mode remount picks up any travel in progress.
  useEffect(() => {
    if (targetRef.current && frameRef.current === null) start();
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [start]);

  // First tuning: glide from the viewer's own meridian to where it is 20 h.
  const tunedOnce = useRef(false);
  useEffect(() => {
    if (tunedOnce.current || stops.length === 0 || !now) return;
    tunedOnce.current = true;
    const remembered = lastTunedId && stops.find((item) => item.id === lastTunedId);
    if (remembered) {
      settleOn(remembered);
      paint();
      return;
    }
    const id = initialIdRef.current();
    if (id) tuneTo(id);
  }, [now, paint, settleOn, stops, tuneTo]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || stops.length === 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        startX: event.clientX,
        time: event.timeStamp,
        moved: false,
      };
      targetRef.current = null;
      velocityRef.current = 0;
      start();
    },
    [start, stops.length],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(event.clientX - drag.startX) > TAP_SLOP_PX) drag.moved = true;
    if (!drag.moved) return;
    const ppd = pixelsPerDegreeFor(sizeRef.current.width);
    needleRef.current = wrapLongitude(needleRef.current - dx / ppd);
    const elapsed = Math.max(1, event.timeStamp - drag.time);
    // Degrees per 16 ms frame, kept for the throw when the finger lifts.
    velocityRef.current = (-dx / ppd / elapsed) * 16;
    drag.x = event.clientX;
    drag.time = event.timeStamp;
  }, []);

  const release = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      if (!drag.moved) {
        // A tap tunes to whatever is printed under the finger.
        const box = event.currentTarget.getBoundingClientRect();
        const ppd = pixelsPerDegreeFor(sizeRef.current.width);
        const longitude = needleRef.current + (event.clientX - box.left - box.width / 2) / ppd;
        const next = nearestStop(stops, longitude);
        if (next) tuneTo(next.id);
        return;
      }
      if (reduceMotion || event.timeStamp - drag.time > 90) velocityRef.current = 0;
      velocityRef.current = Math.max(-5, Math.min(5, velocityRef.current));
      start();
    },
    [reduceMotion, start, stops, tuneTo],
  );

  return {
    canvasRef,
    rootRef,
    stop,
    settled,
    needle,
    tuneTo,
    step,
    dialHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
    },
  };
};
