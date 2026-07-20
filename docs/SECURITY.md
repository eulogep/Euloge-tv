# Security - MJTV

## Principles

- MJTV aggregates public IPTV metadata and external stream URLs.
- MJTV does not host, download, proxy, or retransmit video streams.
- No generic `fetch?url=...` video proxy exists.
- Optional source checks are browser-side HEAD requests with a short timeout. They never relay media
  through the MJTV server.

## Data validation

External iptv-org data is validated in `src/features/catalog/infrastructure/schemas.ts`.

The parser is item-safe: malformed rows are skipped or normalized without discarding the whole endpoint. Runtime smoke on 2026-07-18 confirmed that `/api/catalog?limit=1` returns a successful JSON response with current iptv-org data.

## Protocol filtering

Only browser-usable HTTP(S) streams are allowed into the normalized catalog. Dangerous protocols are rejected in `src/features/catalog/application/normalize.ts`:

- `javascript:`
- `data:`
- `file:`
- `rtmp:`
- `udp:`
- `rtsp:`
- `mms:`

## Production CSP

Runtime smoke confirmed this production CSP on `/`, `/api/catalog`, and `/sw.js`:

```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
media-src 'self' blob: https:;
connect-src 'self' https:;
font-src 'self' data:;
object-src 'none';
base-uri 'self';
frame-ancestors 'none'
```

`unsafe-eval` is not present in production. It is present only in the development policy in `next.config.ts` for Next.js development tooling.

`unsafe-inline` remains for Next/Tailwind runtime style compatibility and should be revisited only with nonce/hash support.

## Headers confirmed in runtime smoke

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` as above
- `Service-Worker-Allowed: /` on `/sw.js`
- `Cache-Control: no-cache, no-store, must-revalidate` on `/sw.js`

## Service worker

`public/sw.js` explicitly avoids caching:

- `.m3u8`
- `.ts`
- `.m4s`
- `.mp4`
- `.m4a`
- `.aac`
- requests with `Range`
- cross-origin video/media-like requests

Unit tests for service-worker routing passed in the 125-test suite.

## User data

- Favorites, history, and settings are local-first.
- Imported M3U playlists are stored locally.
- Local subtitle files are read locally and are not sent to the server.

## Remaining limits

- MJTV cannot guarantee external stream uptime.
- MJTV cannot bypass browser CORS or mixed-content restrictions.
- A forbidden response is reported as `forbidden_or_restricted`; MJTV never claims a geographic
  restriction without explicit evidence.
- Physical iPhone/Safari rendering was confirmed by the project owner; individual external streams
  remain dependent on their URL, MIME, codec and broadcaster policy.
- Direct URLs for client-side sections (`/channels`, `/favorites`, `/history`, `/settings`, and `/library/import`) currently return 404 and must be resolved before publication.
- Some external logo origins return 403 or are blocked by browser cross-origin protections; the application must tolerate missing logos.
