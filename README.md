# MJTV

Plateforme personnelle de consultation de chaînes IPTV publiques diffusées sur Internet.

MJTV agrège des métadonnées et des liens de flux externes (catalogue [iptv-org](https://github.com/iptv-org/api)). Le navigateur récupère les flux vidéo directement depuis leur origine. Le serveur MJTV ne héberge, ne télécharge, ne retransmet et n'enregistre aucune vidéo.

## Aperçu

- Interface sombre, premium, pensée pour l'iPhone (Safari + PWA)
- Catalogue IPTV-org normalisé, filtré (NSFW et blocklist exclus), classé par compatibilité
- Recherche insensible à la casse, filtres par pays / catégorie / langue
- Lecteur HLS natif sur Safari/iOS, fallback HLS.js sur les autres navigateurs
- Favoris, historique (50 entrées max), réglages persistants (localStorage versionné)
- Sous-titres intégrés + import local de fichiers .vtt
- Import local de playlists .m3u / .m3u8 (stockées dans IndexedDB, jamais envoyées au serveur)
- PWA installable depuis Safari, écran hors ligne, aucune mise en cache vidéo

## Architecture

```
src/
  app/              # App Router — route unique `/` (SPA) + routes API
  components/       # app-shell, layout, feedback
  config/           # app.ts, env.ts, navigation.ts
  features/         # catalog, player, favorites, history, settings, subtitles, imported-playlists
  lib/              # errors, http, storage, utils, logger
```

Le catalogue est normalisé côté serveur (Next.js BFF) et paginé via `/api/catalog`. Le navigateur ne télécharge jamais le catalogue brut iptv-org complet.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS 4 + shadcn/ui (primitives) + composants personnalisés
- hls.js (lecteur HLS), idb-keyval (IndexedDB), zustand (état SPA)
- zod (validation), lucide-react (icônes)
- Vitest + Testing Library (unitaires), Playwright (E2E)

## Prérequis

- Node.js 22 ou version LTS plus récente
- npm 11+

## Installation

```bash
npm ci
cp .env.example .env.local
```

## Variables d'environnement

| Variable                       | Description                | Défaut  |
| ------------------------------ | -------------------------- | ------- |
| `NEXT_PUBLIC_APP_NAME`         | Nom de l'application       | `MJTV`  |
| `NEXT_PUBLIC_DEFAULT_COUNTRY`  | Code pays préféré          | `FR`    |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | Code langue préféré        | `fra`   |
| `NEXT_PUBLIC_ENABLE_DEBUG`     | Mode diagnostic            | `false` |
| `NEXT_PUBLIC_ENABLE_EPG`       | EPG (V1 : désactivé)       | `false` |
| `IPTV_DATA_REVALIDATE_SECONDS` | Cache serveur du catalogue | `21600` |

## Commandes

```bash
npm run dev          # Serveur de développement
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (unitaires)
npm run test:e2e     # Playwright (E2E)
npm run format       # Prettier
npm run check        # lint + typecheck + test
```

## Tests

- **Unitaires** : 101 tests Vitest couvrent la normalisation du catalogue, le parseur M3U, la machine d'états du lecteur, la stratégie de lecture, la persistance (favoris, historique, réglages), les sous-titres, le service worker et les schémas Zod.
- **E2E** : 7 scénarios Playwright par projet interceptent les routes API avec des fixtures déterministes. Chromium, Chromium mobile, WebKit et WebKit mobile passent localement en exécution séquentielle (28/28).

## PWA — Installation sur iPhone

1. Ouvrir MJTV dans Safari
2. Taper le bouton Partager
3. « Sur l'écran d'accueil »
4. Ouvrir depuis l'icône — mode standalone, safe areas respectées

Le service worker met en cache le shell de l'application (HTML, CSS, JS, icônes) mais **jamais** les segments vidéo (`.m3u8`, `.ts`, `.m4s`, `.mp4`) ni les requêtes Range.

## Import M3U

1. Onglet « Bibliothèque »
2. Sélectionner un fichier `.m3u` ou `.m3u8` local
3. Le fichier est parsé dans le navigateur et stocké dans IndexedDB
4. Les protocoles dangereux (`javascript:`, `data:`, `file:`, `rtmp:`, `udp:`) sont refusés
5. Les flux nécessitant un referer ou un User-Agent personnalisé sont marqués `limited`

Aucune donnée de playlist n'est envoyée au serveur.

## Limites connues

- Les flux externes peuvent être indisponibles, géobloqués ou bloqués par CORS
- Les flux HTTP sont bloqués en HTTPS (mixed content) — classés `limited`
- Les flux nécessitant des headers personnalisés ne sont pas lisibles (limitation navigateur)
- L'EPG est différé (interface préparée, implémentation V1 retourne `unavailable`)
- La disponibilité des sous-titres dépend du flux

## Sécurité

- Validation Zod de toutes les données externes
- Aucun `dangerouslySetInnerHTML`
- Aucun proxy générique, aucun endpoint `fetch?url=`
- CSP stricte (voir `next.config.ts`)
- Headers : `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`
- Liens externes avec `rel="noopener noreferrer"`
- Aucun secret côté client

Voir `docs/SECURITY.md`.

## Cadre légal

- MJTV ne fournit pas de vidéos
- MJTV ne stocke pas les émissions
- MJTV ne retransmet pas les flux
- Les liens viennent de sources externes publiques
- Leur disponibilité n'est pas garantie
- Leur présence dans une liste publique ne garantit pas tous les droits d'exploitation
- MJTV ne contourne pas les restrictions (DRM, géoblocage, abonnement)
- MJTV filtre les contenus NSFW et les entrées bloquées
- L'utilisateur reste responsable des playlists personnelles qu'il importe

Voir `docs/LEGAL.md`.

## Roadmap

- V1 (actuelle) : catalogue, lecteur, favoris, historique, M3U, sous-titres, PWA
- V1.1 : sélection de piste audio, source automatique recommandée
- V2 : EPG (XMLTV), authentification optionnelle, synchronisation multi-appareils

## Statut réel du projet

- Architecture : complète
- Lecteur : fonctionnel (HLS natif + HLS.js, fallback MP4, erreurs typées, cleanup)
- Tests unitaires : 101/101 passent
- Tests E2E : 28/28 passent en exécution séquentielle
- Lint : propre
- Typecheck : propre
- Build : validé localement
- Déploiement : prêt pour Vercel ou tout hébergement Next.js compatible
