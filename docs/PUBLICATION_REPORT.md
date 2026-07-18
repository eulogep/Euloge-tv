# MJTV Public Publication Report

Date: 2026-07-18

## Final verdict

```text
PUBLISHED_CI_FAILED
```

The independent repository was published successfully on `main`. The GitHub Actions quality job passed, while both Playwright jobs failed before running browser tests because their isolated workspaces attempt to start `.next/standalone/server.js` without first running the production build.

## Publication target

- Public repository: <https://github.com/eulogep/Euloge-tv>
- Published branch: `main`
- Initial release candidate commit SHA: `5f7be7b453d63dc40d6720c83ff1d9cad29c0152`
- Initial commit: `feat: initial MJTV release candidate`

## Toolchain and package management

- Official package manager: npm
- Lockfile: `package-lock.json`
- Node.js: `v24.18.0`
- npm: `11.16.0`
- Git: `2.55.0.windows.3`
- Reproducible install: PASS (`npm ci`, 808 packages, 394.02 seconds)
- Lockfile integrity: PASS (SHA-256 unchanged)
- npm audit summary: two moderate vulnerabilities reported; no forced audit fix was applied

## Local quality gate

| Command                           | Exit | Status | Tests | Duration |
| --------------------------------- | ---: | ------ | ----: | -------: |
| `npm.cmd run format:check`        |    0 | PASS   |     - |   3.19 s |
| `npm.cmd run lint`                |    0 | PASS   |     - |   7.40 s |
| `npm.cmd run typecheck`           |    0 | PASS   |     - |   5.14 s |
| `npm.cmd run test`                |    0 | PASS   |   101 |   5.80 s |
| `npm.cmd run build`               |    0 | PASS   |     - |  19.75 s |
| `npm run test:e2e -- --workers=1` |    0 | PASS   |    28 |  34.04 s |

The production build is now cross-platform. `scripts/prepare-standalone.mjs` uses only `node:fs` and `node:path` to copy `.next/static` and `public` into the standalone output. The Windows build passed with the standard npm shell, and `.next/standalone`, `.next/standalone/.next/static`, and `.next/standalone/public` were all verified.

The favorites hook test also passed without the previous React `act(...)` warning; the state-changing mutation is now executed inside `act` rather than masking the warning.

## Dependency audit and install scripts

`npm.cmd audit` reported two moderate findings in one dependency chain:

- `postcss <8.5.10` is affected by GHSA-qx2v-qp2m-jg93 (unescaped `</style>` in CSS stringify output).
- The affected PostCSS copy is nested under the installed Next.js package, so npm also reports `next` as depending on the vulnerable version.

npm only proposed `npm audit fix --force`, which would install `next@9.3.3` and introduce a breaking major-version change. No forced fix was applied.

The read-only `npm.cmd approve-scripts --allow-scripts-pending` inspection reported:

- `esbuild@0.28.1` — `postinstall: node install.js`
- `sharp@0.34.5` — `install: node install/check.js || npm run build`
- `unrs-resolver@1.12.2` — `postinstall: node postinstall.js`

No script was approved or denied. `package.json` and `package-lock.json` hashes were unchanged by the inspection.

## End-to-end matrix

| Project          | Status | Result |
| ---------------- | ------ | ------ |
| Chromium desktop | PASS   | 7/7    |
| Chromium mobile  | PASS   | 7/7    |
| WebKit desktop   | PASS   | 7/7    |
| WebKit mobile    | PASS   | 7/7    |

An initial eight-worker run passed 24/28 and showed a Chromium page crash. Chromium then passed 7/7 with one worker, followed by a complete sequential 28/28 pass.

## Runtime smoke

| Path                    | Status | Response type               |
| ----------------------- | -----: | --------------------------- |
| `/`                     |    200 | `text/html`                 |
| `/channels`             |    404 | `text/html`                 |
| `/favorites`            |    404 | `text/html`                 |
| `/history`              |    404 | `text/html`                 |
| `/settings`             |    404 | `text/html`                 |
| `/library/import`       |    404 | `text/html`                 |
| `/api/health`           |    200 | `application/json`          |
| `/api/catalog?limit=1`  |    200 | `application/json`          |
| `/manifest.webmanifest` |    200 | `application/manifest+json` |
| `/sw.js`                |    200 | `application/javascript`    |

Observed runtime details:

- Hydration errors: none.
- Uncaught page errors: none.
- Console errors on `/`: external logo requests returned 403; one logo request was blocked by browser cross-origin protection.
- Server errors: none observed.
- Server warnings: several large upstream iptv-org JSON responses exceed the Next.js data-cache item limit.
- Security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options` were present on successful application/API responses.
- Service worker headers: `Service-Worker-Allowed: /` and `Cache-Control: no-cache, no-store, must-revalidate`.

## Secret and export scan

Result: PASS after sanitization.

Classification:

- `SAFE_EXAMPLE`: `.env.example` contains documented public defaults.
- `FALSE_POSITIVE`: dependency names containing `token` in `package-lock.json`.
- `FALSE_POSITIVE`: documentation and source comments discussing secrets, passwords, or URL-token redaction.
- `REMOVE`: private absolute paths, internal history/agent notes, generated download artifacts, and a local SQLite data file.
- `NEEDS_HUMAN_REVIEW`: none.

Excluded from publication:

```text
.git/
skills/
.agent/
.agents/
.codex/
node_modules/
.next/
coverage/
playwright-report/
test-results/
.env
.env.local
tool-results/
upload/
generated download artifacts
local database files
```

## GitHub Actions

- Workflow triggered: PASS
- Format: PASS
- Lint: PASS
- Typecheck: PASS
- Unit tests: PASS
- Build: PASS
- Chromium: FAIL
- Mobile Chromium: FAIL
- WebKit: FAIL
- Mobile WebKit: FAIL

Run: <https://github.com/eulogep/Euloge-tv/actions/runs/29655459292>

The format/lint/typecheck/test/build job completed successfully. The Chromium and WebKit browser installations also succeeded. Both E2E execution steps then stopped with `Process from config.webServer was not able to start. Exit code: 1`.

Root cause: GitHub Actions jobs use isolated workspaces. The E2E jobs run `npm ci` and install their browser, but do not run `npm run build`; consequently `.next/standalone/server.js`, required by the configured production web server, is absent. The browser assertions did not run, so the four FAIL statuses describe CI preparation failure rather than failed browser behavior.

## Physical iPhone status

`NOT_EXECUTED`. Automated mobile WebKit does not replace physical Safari/iPhone validation.

## Known limitations

- Five direct section URLs return 404 even though equivalent client-side views are reachable through in-app navigation.
- Several external logos can return 403 or be blocked by browser cross-origin protections.
- Large upstream catalog resources exceed the Next.js per-item data-cache limit.
- The two moderate npm audit findings remain open because the only suggested automatic fix is a breaking forced downgrade.
- Three dependency install scripts remain pending explicit approval after inspection.
- The GitHub Actions E2E jobs need to build the standalone application (or consume a build artifact) before starting Playwright's production web server.
- External streams can be unavailable, geoblocked, blocked by CORS, or rejected as mixed content.
- Physical iPhone/Safari behavior has not been verified during this attempt.

## Rollback procedure

To roll back without rewriting history, revert the report-only follow-up commit first, then revert the initial release candidate commit `5f7be7b453d63dc40d6720c83ff1d9cad29c0152`. Do not force-push.
