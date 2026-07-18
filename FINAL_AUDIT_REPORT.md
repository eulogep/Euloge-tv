# MJTV Final Public Audit Report

Date: 2026-07-18

## Final verdict

```text
NOT_PUBLISHED
```

The independent release candidate passed installation, formatting, linting, type checking, 101 unit tests, the production build, and 28 Playwright executions. Publication stopped because the required production runtime smoke test did not pass.

## Passed validation

- Node.js, npm, and Git are available.
- `npm ci` installed the exact lockfile dependency graph without rewriting `package-lock.json`.
- Format, lint, TypeScript, unit tests, and the cross-platform production build pass under the standard Windows npm shell.
- Standalone root, static assets, and public assets are present after the build preparation script runs.
- The favorites hook test passes without the previous React `act(...)` warning.
- Chromium desktop, Chromium mobile, WebKit desktop, and WebKit mobile pass 7/7 each in a sequential run.
- No hydration or uncaught page errors were observed.
- The health API, catalog API, web manifest, and service worker respond successfully.
- Required security headers are present on successful application and API responses.

## Publication blockers

- `/channels`, `/favorites`, `/history`, `/settings`, and `/library/import` return HTTP 404.
- The home page produces browser console errors when external logos return 403, and at least one logo is blocked by cross-origin response protection.
- Large upstream catalog resources produce Next.js data-cache size warnings.
- npm reports two moderate findings in the Next.js/PostCSS dependency chain; the only automatic fix offered is a breaking forced downgrade.
- Install scripts for esbuild, sharp, and unrs-resolver remain pending explicit approval after read-only inspection.

Resolving the missing routes changes product behavior and is outside this validation/publication task. The repository therefore remains uninitialized and unpublished.

## Export boundary

The export was sanitized to exclude existing Git metadata, recovered skills, agent state, private environment files, local databases, generated downloads, dependencies, build output, test reports, logs, and other tool artifacts.

## Security scan classification

- `SAFE_EXAMPLE`: public defaults in `.env.example`.
- `FALSE_POSITIVE`: dependency names and documentation/source comments containing secret-related words.
- `REMOVE`: private paths, internal recovery notes, generated artifacts, and local data.
- `NEEDS_HUMAN_REVIEW`: none.

No real secret was identified in the sanitized export.

## Git and CI status

- Independent Git repository: not initialized.
- Initial commit: not created.
- Remote branch: not pushed.
- GitHub Actions: not triggered.
- Existing Git history: not reintroduced.

## Physical iPhone status

Not executed. Automated mobile WebKit passed, but it is not a substitute for physical Safari/iPhone verification.
