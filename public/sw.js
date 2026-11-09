// MJTV service worker — minimal app-shell cache + offline fallback.
// NEVER caches video segments (.m3u8, .ts, .m4s, .mp4) or stream URLs.
// Video traffic always goes straight to the network.

const CACHE_NAME = "mjtv-shell-v4";
const SHELL_ASSETS = ["/", "/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

const VIDEO_EXTENSIONS = [".m3u8", ".ts", ".m4s", ".mp4", ".m4a", ".aac"];
const VIDEO_HOSTS_HINTS = ["m3u8", "ts/", "m4s", "mp4"];

const canCacheResponse = (response) =>
  response.ok && !/\b(no-store|private)\b/i.test(response.headers.get("cache-control") || "");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Best-effort — ignore failures on individual assets.
      await Promise.allSettled(
        SHELL_ASSETS.map(async (url) => {
          const response = await fetch(url);
          if (canCacheResponse(response)) await cache.put(url, response);
        }),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

const isVideoRequest = (url) => {
  const path = url.pathname.toLowerCase();
  if (VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;
  if (VIDEO_HOSTS_HINTS.some((hint) => path.includes(hint))) return true;
  return false;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Catalog/API data and administration always use the network. Never keep
  // private responses or a stale copy of source availability in the shell cache.
  if (
    req.cache === "no-store" ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/admin" ||
    url.pathname.startsWith("/admin/")
  ) {
    return;
  }

  // Never intercept Range requests (video segments).
  if (req.headers.get("range")) return;

  // Never touch cross-origin video.
  if (isVideoRequest(url)) {
    return; // Let the browser handle it directly.
  }

  // Same-origin navigations: network-first, fallback to offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (canCacheResponse(res)) {
            const copy = res.clone();
            caches
              .open(CACHE_NAME)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/offline.html"))),
    );
    return;
  }

  // Same-origin static assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (canCacheResponse(res) && res.type === "basic") {
              const copy = res.clone();
              caches
                .open(CACHE_NAME)
                .then((c) => c.put(req, copy))
                .catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
      }),
    );
  }
});
