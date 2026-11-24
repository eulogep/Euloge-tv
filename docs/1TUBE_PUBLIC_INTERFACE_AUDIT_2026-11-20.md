# Étude publique de 1Tube pour MJTV

Date : 20 novembre 2026  
Portée : observation passive de ressources publiquement accessibles, sans connexion, contournement, interception TLS, déobfuscation agressive ni extraction de flux vidéo.

## Verdict

1Tube peut servir de **référence d’interface et de structuration des métadonnées**, mais pas de fournisseur de lecture pour MJTV.

L’intégration directe de ses lecteurs, torrents, domaines d’embed ou API privées contredirait les décisions déjà prises dans MJTV : absence de proxy vidéo, lecture directe de sources autorisées, validation des données externes et séparation claire entre catalogue et lecteur.

La meilleure adaptation est un nouveau périmètre **VOD métadonnées uniquement** : TMDB côté serveur pour les fiches, et bandes-annonces YouTube officielles lorsque TMDB en référence une. Les chaînes IPTV et leur lecteur restent inchangés.

## Éléments vérifiés

### Surface publique

- Le site est une application Next.js utilisant le Pages Router.
- Les pages publiques observées comprennent notamment `/`, `/movies`, `/tv-shows`, `/search`, `/shawts`, `/live-tv` et `/watch/<id>`.
- La page `/watch/1585` utilise bien un identifiant compatible avec TMDB.
- Les images de catalogue sont chargées depuis `image.tmdb.org`.
- Le HTML public expose des métadonnées Open Graph générées par `/api/og` et `/api/og/list`.
- Les bundles JavaScript publics référencent des routes de découverte, recherche, détails, recommandations, vidéos et saisons.
- Les endpoints Open Graph testés renvoient une image PNG, pas des données JSON de catalogue.
- Les bundles publics référencent aussi plusieurs lecteurs tiers et services torrent. Ils ne doivent pas devenir des dépendances de MJTV.

### Correction par rapport à l’hypothèse initiale

Le `robots.txt` observé le 20 novembre 2026 **ne contient pas** de règle `Disallow: /api/`. Il autorise l’indexation générale et ajoute des signaux Cloudflare limitant certains usages d’IA. L’affirmation précédente sur `/api/` n’est donc pas vérifiée dans l’état actuel du site.

## Ce qui est réutilisable dans MJTV

### 1. Modèle de navigation

- fiche accessible par identifiant stable ;
- séparation films, séries et recherche ;
- recommandations liées à la fiche courante ;
- affichage distinct des saisons et épisodes ;
- bande-annonce comme média promotionnel séparé du contenu principal.

### 2. Architecture de données recommandée

Créer un bounded context `src/features/vod/` indépendant de `catalog/` :

```text
src/features/vod/
  domain/
    types.ts
  infrastructure/
    tmdb-client.ts
    schemas.ts
  application/
    vod-service.ts
    recommendations.ts
  presentation/
    VodHomeView.tsx
    VodDetailView.tsx
```

Le token TMDB reste exclusivement côté serveur. Le navigateur consomme une projection publique minimale via le BFF Next.js.

Routes proposées :

```text
GET /api/vod/discover?type=movie&page=1
GET /api/vod/search?q=...
GET /api/vod/:type/:id
GET /api/vod/:type/:id/recommendations
```

Pour une série, les saisons et épisodes sont récupérés à la demande afin de ne pas gonfler le premier payload.

### 3. Contrat de lecture sûr

Le nouveau catalogue VOD ne doit pas transmettre d’URL de film ou d’épisode complet au lecteur IPTV existant.

La première version doit accepter uniquement :

- les bandes-annonces YouTube officielles référencées par TMDB ;
- des fichiers vidéo locaux explicitement choisis par l’utilisateur ;
- éventuellement des URLs personnelles importées localement, soumises aux filtres de protocole existants.

## Ce qu’il ne faut pas intégrer

- domaines d’embed découverts dans les bundles de 1Tube ;
- catalogues torrent ou trackers ;
- extraction de `.m3u8` ou `.mp4` depuis le lecteur tiers ;
- contournement de Cloudflare, d’un contrôle d’accès, d’un abonnement, d’un DRM, d’un géoblocage ou d’une politique CORS ;
- proxy vidéo côté serveur ;
- copie des bundles, textes, visuels ou assets de 1Tube.

Ces éléments créeraient une dépendance fragile et opaque, ainsi qu’un conflit direct avec `docs/adr/002-no-video-proxy.md` et `docs/SECURITY.md`.

## Pourquoi mitmproxy, Frida et les déobfuscateurs n’ont pas été utilisés

Ils ne sont pas nécessaires pour répondre au besoin légitime de MJTV : comprendre la navigation publique et le modèle de métadonnées. Les ressources HTML et JavaScript publiques suffisent.

Les employer pour extraire ou contourner la logique d’un lecteur tiers augmenterait le risque sans améliorer l’architecture cible. Ils restent pertinents uniquement pour diagnostiquer un logiciel ou un trafic que MJ contrôle et est autorisé à tester.

## Plan d’intégration réversible

### Étape 1 — Spike local isolé

Critères de succès :

- aucun changement dans `features/player` ;
- aucune URL de lecture tierce ;
- token TMDB absent du bundle client ;
- résultats validés par Zod ;
- recherche et fiche détaillée fonctionnelles avec fixtures déterministes ;
- tests unitaires du mapping TMDB vers le domaine MJTV.

### Étape 2 — Navigation

Ajouter une destination VOD derrière un feature flag local désactivé par défaut. Conserver la SPA actuelle tant que la contrainte de sandbox décrite dans `docs/ARCHITECTURE.md` s’applique.

### Étape 3 — Bande-annonce

Créer un composant dédié à l’embed YouTube `youtube-nocookie.com`. Ne pas réutiliser le lecteur IPTV pour un iframe.

### Étape 4 — Validation

Exécuter :

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Puis ajouter des scénarios Playwright : recherche, fiche film, fiche série, épisode sans média, token absent du navigateur et feature flag désactivé.

## État du dépôt au début de l’étude

Le dépôt était déjà fortement modifié sur la branche `fix/start-playback-on-watch`, avec des fichiers suivis modifiés ou supprimés et plusieurs fichiers non suivis. Aucun de ces changements existants n’a été écrasé.

Le présent document est le seul artefact ajouté par cette étude.

## Décision à prendre avant implémentation

L’ajout d’un domaine VOD et de routes API modifie l’architecture et la surface fonctionnelle de MJTV. Il faut donc valider explicitement l’une des deux options :

1. **Recommandée :** TMDB pour les métadonnées + bandes-annonces officielles + médias locaux/personnels uniquement.
2. **Alternative limitée :** ne reprendre que les motifs d’interface dans le catalogue TV actuel, sans nouveau domaine VOD.
