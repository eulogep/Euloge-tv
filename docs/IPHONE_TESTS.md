# Mobile and iPhone Test Evidence

Date: 2026-07-18

## Automated results

The complete Playwright suite passed with one worker against the production build:

| Target                    | Status | Result |
| ------------------------- | ------ | ------ |
| Chromium desktop          | PASS   | 7/7    |
| Chromium mobile (Pixel 5) | PASS   | 7/7    |
| WebKit desktop            | PASS   | 7/7    |
| WebKit mobile (iPhone 13) | PASS   | 7/7    |

The first highly parallel run passed 24/28 and produced a Chromium page crash. Re-running Chromium alone with one worker passed 7/7, and the full sequential run then passed 28/28. No test or browser project was skipped.

## Physical device status

Physical iPhone/Safari testing was not executed during this publication attempt. Playwright's iPhone profile validates the WebKit viewport and browser behavior but does not replace testing on real iOS hardware.

## Suggested physical checklist

- Add the PWA to the Home Screen from Safari.
- Verify standalone launch, safe areas, orientation, and bottom navigation.
- Verify video playback behavior on a known legal HLS stream.
- Verify offline shell behavior without caching video segments.
- Import a local M3U file and a local WebVTT subtitle.
- Confirm that favorites, history, and settings persist after relaunch.
