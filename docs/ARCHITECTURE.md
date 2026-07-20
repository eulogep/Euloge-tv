# Architecture — MJTV

## Vue d'ensemble

MJTV est une application Next.js 16 (App Router) construite en architecture feature-first avec séparation claire entre domaine, application, infrastructure et présentation.

```
Sources IPTV-org externes
        │
        ▼
Infrastructure adapters
- iptv-org client (fetch + cache Next.js)
- Zod schemas
        │
        ▼
Application services
- Normalisation (filtres, ranking, jointures)
- Catalog service (query, getById)
        │
        ▼
Next.js Backend for Frontend
- /api/catalog (pagination, cache, validation)
- /api/channels/:id
- /api/health
        │
        ▼
Application React (SPA)
- Catalogue, recherche, filtres
- Lecteur HLS
- Favoris, historique, réglages
- Sous-titres, import M3U
        │
        ▼
iPhone Safari / PWA / navigateurs desktop
```

## Contrainte sandbox

L'environnement sandbox n'expose que la route `/` à l'utilisateur. MJTV est donc construit en SPA : la navigation entre les vues (accueil, chaînes, favoris, historique, réglages, watch, import) se fait par état client (zustand store `src/lib/utils/app-store.ts`).

Les routes API (`/api/*`) sont autorisées et nécessaires pour le BFF.

## Domaine

Le modèle interne (`src/features/catalog/domain/types.ts`) est découplé du format brut d'iptv-org. Une évolution de l'API iptv-org n'impacte que les schémas et la normalisation, pas le reste de l'application.

## Lecteur

Le lecteur (`src/features/player/`) suit une machine d'états explicite (`idle → loading → ready → playing → paused → buffering → switching-source → error → ended`). La stratégie de lecture est choisie par une fonction pure :

1. HLS : si `video.canPlayType("application/vnd.apple.mpegurl")` est truthy → HLS natif (Safari/iOS)
2. Sinon : si `Hls.isSupported()` → hls.js
3. Sinon : tentative native directe pour les sources HTTPS dont le MIME ou l’extension restent
   inconnus; le navigateur confirme ou rejette réellement la lecture.

Avant la lecture, un probe HEAD borné collecte le statut HTTP et le MIME lorsqu’ils sont exposés par
CORS. Son échec CORS n’empêche pas la lecture native. Le fallback parcourt un plan de sources unique,
sans reboucler, et n’affiche l’erreur finale qu’après épuisement.

Le cleanup détruit l'instance hls.js, révoque les Blob URLs, retire les listeners, et appelle `video.load()` à chaque changement de source ou démontage.

## Persistance

- `localStorage` versionné pour favoris, historique, réglages
- `IndexedDB` (via idb-keyval) pour les playlists M3U importées
- Hooks SSR-safe (hydratation après mount)

## PWA

- `src/app/manifest.ts` — manifeste configurable
- `public/sw.js` — service worker minimal (cache shell + offline, jamais vidéo)
- `public/offline.html` — page hors ligne brandée
- Métadonnées iOS dans `src/app/layout.tsx`

## Sécurité

- CSP stricte dans `next.config.ts`
- Validation Zod de toutes les données externes
- Aucun proxy générique
- Aucun `dangerouslySetInnerHTML`

Voir `docs/SECURITY.md`.
