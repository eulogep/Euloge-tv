# Admin V1 access boundary

Admin V1 is an internal, read-only inspection surface. It is protected in `src/proxy.ts` before an admin page or admin API route is rendered.

## Temporary mechanism

The server reads `MJTV_ADMIN_USERNAME` and `MJTV_ADMIN_PASSWORD`. The password must contain at least 16 characters. When either value is absent or invalid, `/admin` and `/api/admin/*` fail closed with `404`. When configuration exists but the HTTP Basic credentials are absent or incorrect, the server returns `401` with a Basic authentication challenge.

These variables are server-only: they must be supplied by the deployment secret store and must never use a `NEXT_PUBLIC_` prefix. No value is committed to Git. HTTP Basic authentication must only be used behind HTTPS.

This boundary is intentionally small and replaceable. It is not user authentication, role management, or a long-term authorization system.

## Security properties and limits

- Authorization is evaluated server-side for every matched request.
- The boundary is fail-closed and does not depend on client state.
- Responses are marked private and `no-store`.
- Admin projections redact URL user information, query strings, and fragments.
- Admin V1 is read-only and exposes no mutation endpoint.
- Source reports remain browser-local; the Reports page only reads the current browser's storage.
- Credentials can be revoked only by changing deployment configuration.
- There is no individual identity, role, session expiry, audit log, rate limit, or CSRF layer in V1.

The future reviewed security architecture should replace this boundary with server-side identity and role authorization, secure HttpOnly sessions, expiration, rate limiting, audit logging, and CSRF protection before any admin mutation is introduced.

## Rollback

Revert the Admin V1 commits or leave both server variables unset. No database, cache, catalogue, DNS, Cloudflare, or user data migration is involved.
