# Open Source Inventory

Current inventory from `package.json` after dependency cleanup.

## Production dependencies

| Dependency               | Purpose                                                           | Version            |
| ------------------------ | ----------------------------------------------------------------- | ------------------ |
| `next`                   | Next.js app framework and production server                       | `^16.1.1`          |
| `react`, `react-dom`     | React UI runtime                                                  | `^19.0.0`          |
| `hls.js`                 | Browser HLS playback fallback when native playback is unavailable | `^1.6.16`          |
| `zustand`                | Lightweight client state for playback/navigation flows            | `^5.0.6`           |
| `idb-keyval`             | IndexedDB persistence for local playlists and app data            | `^6.3.0`           |
| `zod`                    | Runtime validation for iptv-org, settings, M3U, and API inputs    | `^4.0.2`           |
| `lucide-react`           | UI icons                                                          | `^0.525.0`         |
| `clsx`, `tailwind-merge` | Utility class composition                                         | `^2.1.1`, `^3.3.1` |
| `sharp`                  | Next.js image optimization support                                | `^0.34.3`          |

## Development dependencies

| Dependency                                                                                    | Purpose                             | Version                                   |
| --------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| `typescript`                                                                                  | Static type checking                | `^5`                                      |
| `eslint`, `eslint-config-next`                                                                | Linting with Next.js rules          | `^9`, `^16.1.1`                           |
| `vitest`, `@vitest/ui`                                                                        | Unit tests                          | `^4.1.10`                                 |
| `@playwright/test`                                                                            | E2E and mobile viewport tests       | `^1.61.1`                                 |
| `prettier`, `prettier-plugin-tailwindcss`                                                     | Formatting                          | `^3.9.5`, `^0.8.0`                        |
| `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`                                       | CSS pipeline and utility animations | `^4`, `^4`, `^1.3.5`                      |
| `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | Component/unit test DOM helpers     | `^29.1.1`, `^16.3.2`, `^6.9.1`, `^14.6.1` |
| `tsx`                                                                                         | TypeScript script execution         | `^4.23.0`                                 |
| `@types/react`, `@types/react-dom`                                                            | React TypeScript types              | `^19`, `^19`                              |

## Removed or confirmed absent

The following were checked because they were identified as unused in the earlier audit. They are absent from the current `package.json`:

`next-auth`, `next-intl`, `@reactuses/core`, `z-ai-web-dev-sdk`, `@tanstack/react-query`, `prisma`, `@prisma/client`, `@dnd-kit/*`, `recharts`, `react-markdown`, `react-syntax-highlighter`, and Radix UI runtime packages.

## Audit

The official package manager is npm. The dependency audit result is recorded in `FINAL_AUDIT_REPORT.md` for the current release-candidate lockfile.
