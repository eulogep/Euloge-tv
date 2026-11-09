"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared minute tick for every clock and sky colour on screen, aligned on
 * the minute so they all turn together. The snapshot is 0 during server render
 * and hydration: callers draw a neutral state until the real time is known.
 */

let now = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const schedule = () => {
  const delay = 60_000 - (Date.now() % 60_000) + 50;
  timer = setTimeout(() => {
    now = Date.now();
    listeners.forEach((listener) => listener());
    schedule();
  }, delay);
};

const refresh = () => {
  if (document.visibilityState !== "visible") return;
  const current = Date.now();
  if (Math.floor(current / 60_000) === Math.floor(now / 60_000)) return;
  now = current;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  if (listeners.size === 0) {
    now = Date.now();
    schedule();
    document.addEventListener("visibilitychange", refresh);
  }
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = null;
      document.removeEventListener("visibilitychange", refresh);
    }
  };
};

/** Milliseconds since epoch, or 0 until the client has mounted. */
export const useNow = (): number =>
  useSyncExternalStore(
    subscribe,
    () => now,
    () => 0,
  );
