# ADR-004 : HLS natif en priorité, HLS.js en fallback

## Date

2026-07-13

## Statut

Accepté

## Contexte

Safari (macOS et iOS) supporte nativement HLS via `video.canPlayType("application/vnd.apple.mpegurl")`. Les autres navigateurs (Chrome, Firefox) ne le supportent pas et nécessitent hls.js (MediaSource Extensions).

## Décision

Stratégie de sélection (fonction pure dans `src/features/player/application/playback-strategy.ts`) :

1. Si `video.canPlayType("application/vnd.apple.mpegurl")` est `"probably"` ou `"maybe"` → **HLS natif** (Safari/iOS)
2. Sinon si `Hls.isSupported()` → **hls.js**
3. Sinon → **unsupported**

Pour MP4 : toujours natif.

## Conséquences

- Sur iPhone, la lecture utilise le HLS natif (plus performant, supporte AirPlay, PiP, fullscreen natif)
- Sur Chrome/Firefox, hls.js est chargé dynamiquement (import dynamique pour ne pas alourdir le bundle SSR)
- La stratégie est testable unitairement sans navigateur réel

## Alternatives rejetées

- Toujours utiliser hls.js : moins performant sur Safari, pas de PiP/AirPlay natif
- Toujours utiliser le HLS natif : ne fonctionne pas sur Chrome/Firefox

## Nettoyage

L'instance hls.js est détruite à chaque changement de source ou démontage (méthode `destroy()` de l'adaptateur). Les Blob URLs des sous-titres importés sont révoquées. Les listeners sont retirés. `video.load()` est appelé pour vider la source.
