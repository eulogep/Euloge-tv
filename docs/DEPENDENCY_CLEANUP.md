# Dependency Cleanup

## Decision

Dead provider and dependency cleanup is complete for the packages identified in the stabilization prompt.

`AppProviders` is no longer present in `src/`, and there are no remaining imports of `QueryClientProvider`, `ThemeProvider`, `useQuery`, `useMutation`, or `@tanstack/react-query`.

## Package decisions

| Package                    | Imported? | Used indirectly? | Runtime/dev | Safe to remove? | Decision       | Evidence                                                  |
| -------------------------- | --------- | ---------------- | ----------- | --------------- | -------------- | --------------------------------------------------------- |
| `next-auth`                | No        | No               | Runtime     | Yes             | Removed        | No auth routes, providers, or imports in `src/`.          |
| `next-intl`                | No        | No               | Runtime     | Yes             | Removed        | No i18n routing or imports in `src/`.                     |
| `@reactuses/core`          | No        | No               | Runtime     | Yes             | Removed        | No hook imports.                                          |
| `z-ai-web-dev-sdk`         | No        | No               | Runtime     | Yes             | Removed        | No AI SDK setup/imports.                                  |
| `@tanstack/react-query`    | No        | No               | Runtime     | Yes             | Removed        | Dead `AppProviders` removed; app uses direct fetch/state. |
| `prisma`, `@prisma/client` | No        | No               | Runtime/dev | Yes             | Removed        | No active database layer in app code.                     |
| `@dnd-kit/*`               | No        | No               | Runtime     | Yes             | Removed        | No drag/drop UI.                                          |
| `recharts`                 | No        | No               | Runtime     | Yes             | Removed        | No chart rendering.                                       |
| `react-markdown`           | No        | No               | Runtime     | Yes             | Removed        | No markdown rendering.                                    |
| `react-syntax-highlighter` | No        | No               | Runtime     | Yes             | Removed        | No code-highlighting views.                               |
| Radix UI packages          | No        | No               | Runtime     | Yes             | Removed/absent | Current UI does not import Radix primitives.              |

## Current active runtime dependencies

The current runtime dependency set is intentionally small: `next`, `react`, `react-dom`, `hls.js`, `zustand`, `idb-keyval`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`, and `sharp`.

## Verification

- `grep` for provider/query symbols in `src` and tests returned no matches.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS, 98/98 tests.
- `npm run build`: PASS after removing the build-time Google Fonts dependency.
