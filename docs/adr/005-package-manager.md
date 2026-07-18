# ADR 005 - Package manager

## Context

MJTV previously had `bun.lock` and Bun-oriented documentation/CI, but the current release-candidate environment does not have Bun installed. All verified quality gates in the continuation audit ran successfully with Node.js and npm.

The project also needs a reproducible lockfile that supports `npm ci` and `npm audit`.

## Decision

Use npm as the official package manager.

The release-candidate lockfile is `package-lock.json`.

## Why npm

- Node.js and npm are already available in the validation environment.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and Chromium Playwright tests pass locally.
- The production standalone server runs with Node.js.
- GitHub Actions supports `npm ci` and dependency caching directly.
- `npm audit` requires an npm lockfile.

## Alternative rejected

Bun was rejected for this release candidate because it is not installed in the current environment. Keeping Bun as the official tool would make local verification unreproducible here.

## Migration risks

- The generated npm lockfile may resolve exact transitive versions differently than the previous Bun lockfile.
- `npm ci` may remove packages that only existed in `node_modules` but were not declared in `package.json`.
- CI cache behavior changes from Bun to npm.

## Rollback

Restore `bun.lock`, remove `package-lock.json`, and revert npm-specific documentation/CI changes in a dedicated rollback commit.

## Verification

The migration is accepted only after:

- `npm ci`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- available Playwright projects
- `npm audit`
