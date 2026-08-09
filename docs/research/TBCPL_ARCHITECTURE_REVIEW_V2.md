# TBCPL architecture review V2

Date de l'audit : 2026-08-09

Ce document est un audit documentaire. TBCPL est étudié comme source de motifs architecturaux et UX, jamais comme catalogue ni comme nouvelle base de MJTV. Aucun lien, flux, logo ou contenu de TBCPL n'est importé.

## Commit TBCPL analysé

- Dépôt : `https://github.com/N3rdmade/TBCPL`
- Branche par défaut observée : `main`
- Commit : `bab7e97a8bc48ce1ddbcc5ee2c4beef3f1f37166`
- Date du commit : 2026-08-07 13:43:03 UTC
- Message : `bot: auto-update broken links`
- Preuves : `.git`, `.github/workflows/link-checker.yml`, `.github/scripts/check-links.js`, `.github/scripts/update-links.js`.

L'audit porte sur ce SHA précis. Un changement ultérieur de TBCPL exige une nouvelle vérification.

## Stack TBCPL actuelle

TBCPL est une application Next.js 14.2 / React 18 / TypeScript 5 avec App Router, Tailwind CSS 4, MongoDB, Redis optionnel, GitHub OAuth et Octokit. Fuse.js, cmdk et dnd-kit soutiennent la recherche et les outils d'édition. Le build standalone est prévu pour Node 20 (`package.json`, `next.config.mjs`, `Dockerfile`).

La qualité de build est moins stricte que celle de MJTV : `next.config.mjs` active `typescript.ignoreBuildErrors` et `eslint.ignoreDuringBuilds`, et `package.json` n'expose ni lint, ni typecheck, ni tests. Le seul workflow visible contrôle les liens, sans pipeline applicatif (`next.config.mjs`, `package.json`, `.github/workflows/link-checker.yml`).

`zod` et `jose` sont déclarés mais aucun import applicatif n'a été trouvé sous `src/` au SHA audité. Leur présence ne constitue donc pas une validation ou une auth effective (`package.json`).

## Structure frontend

Le frontend est un index régionalisé de sites, pas un lecteur TV. Les routes statiques `[slug]` et `[slug]/[category]` chargent une région et une catégorie, puis composent une page avec hero, favoris, récents, filtres et sections (`src/app/[slug]/page.tsx`, `src/app/[slug]/[category]/page.tsx`, `src/components/region-page.tsx`).

Les composants sont majoritairement organisés par surface plutôt que par domaine. La région active est fournie par contexte, tandis que la navigation pays/catégorie est exprimée dans l'URL (`src/components/region-context.tsx`, `src/components/country-select.tsx`, `src/components/sidebar.tsx`).

Motifs intéressants : navigation régionale lisible, cartes statistiques simples, petits composants autonomes. Limite : la logique métier, les accès DOM directs et la présentation sont parfois couplés, notamment dans les filtres (`src/components/filter-chips.tsx`).

## Admin Panel

Le panneau `/admin-panel` comprend Dashboard, Sites, Regions, Inbox, Tools et Audit log (`src/app/admin-panel/layout.tsx`). Le dashboard calcule des métriques simples à partir des JSON et de MongoDB (`src/app/admin-panel/page.tsx`).

L'admin est entièrement mutable : édition/réordonnancement, ajout/suppression, upload de logos, traitement des demandes, remplacement d'URL et publication directe dans la branche GitHub (`src/components/admin/sites-editor.tsx`, `src/components/admin/regions-editor.tsx`, `src/components/admin/requests-inbox.tsx`, `src/components/admin/tools-panel.tsx`, `src/app/api/admin/publish/route.ts`).

À retenir pour MJTV : la séparation des surfaces Dashboard/Sites/Regions/Inbox/Audit et les vues d'inspection. À rejeter pour Admin V1 : les mutations, les outils puissants et le commit direct sur la branche configurée. L'admin MJTV doit commencer read-only.

## API

Les Route Handlers couvrent OAuth, session courante, demandes publiques, dernier commit, compteur en ligne, données admin et outils de publication (`src/app/api/auth/**`, `src/app/api/site-requests/route.ts`, `src/app/api/latest-commit/route.ts`, `src/app/api/ping/route.ts`, `src/app/api/admin/**`).

Les routes admin appellent généralement `requireAdmin`, utilisent `no-store` et valident manuellement les corps (`src/lib/auth/require-admin.ts`, `src/middleware.ts`, `src/app/api/admin/publish/route.ts`). La validation n'est toutefois pas centralisée dans des schémas partagés ; Zod n'est pas utilisé malgré sa dépendance (`package.json`, `src/app/api/admin/publish/route.ts`).

## Auth

L'auth suit un OAuth GitHub serveur : état aléatoire en cookie, échange du code, lecture de l'utilisateur, vérification du niveau de permission sur le dépôt, puis session serveur (`src/app/api/auth/github/login/route.ts`, `src/app/api/auth/github/callback/route.ts`, `src/lib/auth/github.ts`).

Les sessions sont persistées dans MongoDB ; le token GitHub est chiffré en AES-256-GCM. Le cookie est HttpOnly, Secure en production, SameSite=Lax, valable sept jours (`src/lib/auth/session.ts`, `src/lib/crypto.ts`).

Points à étudier : autorisation serveur et session opaque. Points à ne pas copier tels quels : scope OAuth `repo`, dépendance des droits admin aux droits d'écriture GitHub et conservation d'un token capable de publier. `requireAdmin` ne revérifie que l'existence de la session ; sa sémantique repose donc sur la permission enregistrée lors du login (`src/lib/auth/github.ts`, `src/lib/auth/require-admin.ts`, `src/lib/auth/session.ts`).

## Data model

La donnée principale est fichier-first : `regions.json` contient code, nom, drapeau et activation ; chaque fichier de liens contient catégories et sites avec nom, URL, logo, activation, tags, statut et description (`public/regions.json`, `public/links.json`, `public/Region-Links/*.json`, `src/lib/types.ts`).

`src/lib/data.ts` lit ces JSON depuis `public/`, masque les régions/sites désactivés pour le public et conserve une lecture non filtrée pour l'admin. Le modèle est simple, mais ne représente ni chaîne, ni source multiple, ni EPG, ni conformité, ni historique de santé (`src/lib/data.ts`, `src/lib/types.ts`).

## MongoDB

MongoDB est utilisé pour les sessions, administrateurs, audit logs, demandes de sites et un espace de cache (`src/lib/db.ts`). Les index prévus incluent SID unique, TTL de session, login GitHub unique, requêtes par statut/date, audit par date et clé de cache unique (`src/lib/db.ts`).

La fonction `ensureIndexes` existe, mais aucun appel n'a été trouvé sous `src/` au SHA audité (`src/lib/db.ts`). MongoDB n'est pas la source de vérité du catalogue : les JSON GitHub le restent (`src/lib/data.ts`, `src/lib/github/repo.ts`). Ce choix n'apporte pas de preuve que MongoDB convient au modèle relationnel futur de MJTV.

## Redis

Redis est optionnel au niveau du code : sans `REDIS_URL`, le client se désactive ; les lectures/écritures JSON échouent en mode best-effort (`src/lib/redis.ts`). Il ne sert qu'au cache partagé du dernier commit GitHub, complété par un cache mémoire et un mécanisme single-flight (`src/app/api/latest-commit/route.ts`).

Le Compose, lui, démarre Redis et conditionne le service web à son healthcheck (`docker-compose.yml`). Le motif cache facultatif et dégradation acceptable est intéressant ; son installation immédiate ne l'est pas pour MJTV.

## Docker

Le Dockerfile multi-stage installe les dépendances, construit le standalone Next.js, exécute le runtime avec un utilisateur non-root et expose le port 80 (`Dockerfile`). Le Compose ajoute limites de logs, restart policies, volume Redis et healthchecks (`docker-compose.yml`).

Le conteneur web publie directement `80:80` et Redis est interne au réseau Compose (`docker-compose.yml`). Ces motifs peuvent alimenter une phase ultérieure, après stabilisation de la persistence ; aucune Dockerisation ne doit être lancée maintenant.

## Healthcheck

Le healthcheck Docker appelle `/api/ping` (`docker-compose.yml`). Or cette route maintient un compteur de visiteurs en mémoire et chaque GET est aussi un heartbeat (`src/app/api/ping/route.ts`). Ce n'est pas un contrôle de santé pur et le healthcheck modifie la métrique.

Le workflow de liens effectue des HEAD avec délais, retries, concurrence et limite de redirections, mais désactive la validation TLS et ne qualifie que la joignabilité HTTP (`.github/scripts/check-links.js`). L'auto-update recherche des remplacements externes et peut réécrire les JSON (`.github/scripts/update-links.js`, `.github/workflows/link-checker.yml`). MJTV ne doit reprendre ni cette désactivation TLS, ni cette auto-substitution de sources.

## Recherche

La palette globale utilise cmdk et Fuse.js pour rechercher sites, catégories et régions (`src/components/command-palette.tsx`, `src/lib/data.ts`). Les filtres de page recherchent nom/tags et masquent directement les cartes/sections dans le DOM (`src/components/filter-chips.tsx`).

MJTV possède déjà Fuse.js et une recherche fuzzy pondérée avec historique (`src/features/search/SearchView.tsx` dans MJTV). Il n'y a donc aucune fonctionnalité de recherche TBCPL à transplanter.

## Filtres

TBCPL propose catégories multi-sélection, recherche locale et sélection de pays/région (`src/components/filter-chips.tsx`, `src/components/country-select.tsx`, `src/components/mobile-category-bar.tsx`). MJTV possède déjà catégories, pays, langues, disponibilité et tri dans son catalogue (`src/features/catalog/domain/types.ts` et `src/features/catalog/presentation/ExploreView.tsx` dans MJTV).

Le seul apport éventuel est UX : rendre les dimensions régionales plus visibles dans un futur admin. La logique DOM directe n'est pas à reprendre.

## Régionalisation

Les régions sont des entrées JSON activables et chaque région pointe vers un fichier de catalogue indépendant. La route utilise USA comme région par défaut et retombe sur `links.json` si un fichier régional manque (`public/regions.json`, `src/lib/data.ts`, `src/app/[slug]/page.tsx`).

Ce découpage est simple mais duplique potentiellement les sites et confond région éditoriale avec pays. MJTV doit plutôt normaliser Country/Language/Category autour de son modèle de chaîne et conserver ses jointures de catalogue.

## Favoris

Les favoris sont local-first dans `localStorage`, indexés par URL, synchronisés via événements custom et `storage` (`src/lib/favorites.ts`, `src/components/favorites-section.tsx`). L'historique récent suit le même principe et nettoie les URLs qui ne figurent plus dans les fichiers (`src/components/recently-visited.tsx`).

MJTV possède déjà des favoris par identifiant de chaîne, un historique versionné et les onglets Ma liste. Le motif est donc déjà implémenté de manière mieux adaptée au domaine MJTV (`src/features/favorites/favorites.ts`, `src/features/history/history.ts`, `src/features/favorites/MyListView.tsx` dans MJTV).

## GitHub integration

Octokit sert à vérifier les droits, lire les fichiers du dépôt, créer blobs/arbre/commit et déplacer la référence sans force (`src/lib/auth/github.ts`, `src/lib/github/client.ts`, `src/lib/github/repo.ts`). L'admin publie directement dans la branche configurée et journalise le SHA (`src/app/api/admin/publish/route.ts`).

L'idée d'une piste d'audit liée à un acteur et à un SHA est utile. La publication directe depuis l'application, avec token `repo`, est rejetée pour MJTV : elle contournerait le workflow PR/review et élargirait fortement le blast radius.

## Observability

L'observabilité TBCPL est limitée à `console.error`, à l'audit MongoDB des mutations, au compteur en ligne et aux artefacts/notifications Discord du link checker (`src/lib/redis.ts`, `src/app/api/admin/audit/route.ts`, `src/app/api/ping/route.ts`, `.github/workflows/link-checker.yml`).

Il n'existe pas de modèle structuré de santé applicative multi-service ni de traces/métriques de lecture. MJTV dispose déjà d'un `/api/health` minimal et d'un logger applicatif (`src/app/api/health/route.ts`, `src/lib/utils/logger.ts` dans MJTV). Une future évolution doit exposer des états réels sans secret ni détails internes.

## Points architecturaux intéressants

- Admin segmenté en surfaces d'inspection cohérentes (`src/app/admin-panel/layout.tsx`).
- Métriques calculées depuis les données réelles, avec fallback si Mongo est indisponible (`src/app/admin-panel/page.tsx`).
- Audit log associé à l'acteur et au commit (`src/app/api/admin/publish/route.ts`, `src/app/api/admin/audit/route.ts`).
- Sessions serveur opaques, cookies HttpOnly/SameSite et chiffrement du token (`src/lib/auth/session.ts`, `src/lib/crypto.ts`).
- Cache Redis best-effort avec cache mémoire et single-flight (`src/lib/redis.ts`, `src/app/api/latest-commit/route.ts`).
- Image standalone multi-stage et runtime non-root (`Dockerfile`).
- Outils de détection de doublons et d'inspection multi-régions (`src/lib/admin/region-scan.ts`, `src/app/api/admin/tools/find-duplicates/route.ts`).

## Patterns applicables à MJTV

- ADAPT : navigation admin par domaines, tableaux de synthèse et filtres d'inspection (`src/app/admin-panel/layout.tsx`, `src/app/admin-panel/page.tsx`).
- ADAPT : audit log structuré, mais sans publication GitHub directe (`src/app/api/admin/audit/route.ts`).
- STUDY : session serveur et autorisation centralisée (`src/lib/auth/require-admin.ts`, `src/lib/auth/session.ts`).
- ADOPT_LATER : cache Redis facultatif, jamais source de vérité (`src/lib/redis.ts`).
- ADOPT_LATER : Docker multi-stage non-root et logs bornés (`Dockerfile`, `docker-compose.yml`).
- ADAPT : inspection de doublons et normalisation pays/langue/catégorie (`src/lib/admin/region-scan.ts`, `public/regions.json`).

## Patterns déjà présents dans MJTV

- Next App Router/BFF et standalone (`src/app/api/catalog/route.ts`, `next.config.ts`).
- Fuse.js, recherche fuzzy et historique de recherche (`src/features/search/SearchView.tsx`).
- Filtres pays/langue/catégorie/disponibilité (`src/features/catalog/domain/types.ts`, `src/features/catalog/presentation/ExploreView.tsx`).
- Favoris et historique local-first versionnés (`src/features/favorites/favorites.ts`, `src/features/history/history.ts`).
- États de santé, rapports et éligibilité centralisée (`src/features/catalog/application/source-health.ts`, `src/features/catalog/application/source-reports.ts`).
- EPG current/next/later avec cache fresh/stale/unavailable (`src/features/epg/application/epg-service.ts`).
- `/api/health` sans secret (`src/app/api/health/route.ts`).
- CI qualité et Playwright Chromium/WebKit desktop/mobile (`.github/workflows/ci.yml`, `playwright.config.ts`).

## Patterns devenus inutiles depuis Mobile V3

- Nouvelle palette Fuse.js ou nouveau moteur de recherche : déjà couverts par `src/features/search/SearchView.tsx`.
- Nouveau système de favoris/récents : déjà couvert par `src/features/favorites/**`, `src/features/history/**` et `src/features/favorites/MyListView.tsx`.
- Refonte de navigation mobile, filtres et carrousel : déjà couverts par `src/components/app-shell/**` et `src/features/catalog/presentation/**`.
- Nouveau lecteur ou mini-player : l'instance autoritaire est déjà maintenue dans `src/app/page.tsx` et `src/features/player/presentation/Player.tsx`.
- Nouvelle EPG UI : déjà présente dans `src/features/epg/presentation/**`.

## Patterns à ne surtout pas reprendre

- Le catalogue et ses URLs (`public/links.json`, `public/Region-Links/*.json`).
- L'auto-remplacement de liens depuis des index tiers (`.github/scripts/update-links.js`).
- La désactivation TLS du link checker (`.github/scripts/check-links.js`).
- Le commit direct dans la branche de production depuis l'admin (`src/lib/github/repo.ts`, `src/app/api/admin/publish/route.ts`).
- Les builds qui ignorent erreurs TypeScript/ESLint (`next.config.mjs`).
- Le healthcheck qui modifie une métrique de visiteurs (`docker-compose.yml`, `src/app/api/ping/route.ts`).
- Le fetch serveur d'URL arbitraire sans défense SSRF suffisante (`src/app/api/admin/logo-from-url/route.ts`).
- Les statuts `trusted/new/down` non reliés à une preuve de mesure (`src/lib/types.ts`, `public/links.json`).

## Risques techniques

- Couplage du catalogue à des fichiers JSON publics et publication par commits directs (`src/lib/data.ts`, `src/lib/github/repo.ts`).
- Pas de tests applicatifs/lint/typecheck dans les scripts ou le workflow observés (`package.json`, `.github/workflows/link-checker.yml`).
- Build configuré pour masquer des erreurs (`next.config.mjs`).
- `ensureIndexes` non appelé dans `src/`, donc garanties d'index non démontrées (`src/lib/db.ts`).
- Rate limits et compteurs en mémoire non cohérents entre instances (`src/app/api/site-requests/route.ts`, `src/app/api/ping/route.ts`).
- Health de sites réduit à la joignabilité HTTP et pouvant accepter certains statuts non 2xx (`.github/scripts/check-links.js`).

## Risques sécurité

- `logo-from-url` effectue un fetch serveur vers une URL fournie par l'admin avec redirections suivies, sans blocage explicite de loopback, RFC1918, link-local, metadata IP ou destinations de redirection privées : risque SSRF (`src/app/api/admin/logo-from-url/route.ts`).
- Le scope OAuth `repo` et le token stocké permettent des écritures importantes ; une compromission de session a un fort impact (`src/lib/auth/github.ts`, `src/lib/auth/session.ts`, `src/lib/github/repo.ts`).
- Le middleware ajoute des en-têtes no-cache mais ne réalise pas l'autorisation ; la protection dépend de chaque handler (`src/middleware.ts`, `src/lib/auth/require-admin.ts`).
- La validation TLS est désactivée dans les scripts de vérification (`.github/scripts/check-links.js`, `.github/scripts/update-links.js`).
- Les erreurs détaillées de certaines API peuvent exposer des informations opérationnelles (`src/app/api/admin/publish/route.ts`, `src/app/api/admin/tools/purge-cache/route.ts`).

Impact MJTV : aucun. Aucun code TBCPL n'est transplanté et les protections MJTV ne sont pas modifiées.

## Risques légaux

TBCPL se décrit comme un site d'indexation et ses JSON contiennent des catégories de streaming, live TV, apps et autres liens externes (`README.md`, `public/links.json`, `public/Region-Links/*.json`). Le statut technique ou éditorial d'un lien ne prouve ni licence, ni attribution, ni droit de redistribution (`src/lib/types.ts`).

MJTV ne doit importer aucun catalogue, URL, logo ou mécanisme d'auto-remplacement TBCPL. Toute source MJTV reste soumise à la politique légale existante et à une future preuve de conformité indépendante (`docs/LEGAL.md`, `docs/SECURITY.md` dans MJTV).

## Licence

Le dépôt TBCPL contient une licence MIT, copyright 2025 N3rdmade (`LICENSE`, `README.md`). Cette licence couvre le code du dépôt, pas nécessairement les marques, logos, contenus ni droits des sites externes référencés. L'approche retenue est donc de décrire des motifs et de ne copier ni code substantiel ni données.

## Conclusion

TBCPL apporte surtout des idées d'organisation admin, d'audit, de cache optionnel et de packaging futur. MJTV possède déjà la plupart des motifs frontend utiles et une architecture TV/lecture/EPG/santé plus pertinente. La suite recommandée après validation humaine de cet audit et de la gap analysis est uniquement `feat/admin-readonly-v1`, sans mutation, auth complexe, base de données, Redis, Docker ou intégration GitHub d'écriture.
