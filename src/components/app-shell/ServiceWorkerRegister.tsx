"use client";

import { useEffect } from "react";

/**
 * Registers the service worker. Silently no-ops in dev or when unsupported.
 * The SW is intentionally minimal: app-shell cache + offline fallback.
 * It NEVER caches video segments or stream URLs.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore — SW is a progressive enhancement.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
