# MJTV — Horizons

Identité originale conçue pour MJTV, autour de la découverte des télévisions
francophones, africaines et internationales. Ce travail ne prétend pas démontrer
une unicité mondiale du style.

## Direction

Vert pin, papier ivoire et citron. Composition éditoriale asymétrique, cadre
photographique, titres Bricolage Grotesque et accents Instrument Serif italiques.
Les petites indications utilisent Martian Mono. Polices servies localement depuis
les dépendances existantes, sans nouveau service tiers.

L'accueil conserve ses fonctions de découverte, son carrousel, les favoris et
l'historique. Les catégories sont rapprochées de l'ouverture. Les nouvelles
escales Sénégal, Bénin, Congo RDC et France ouvrent le catalogue avec un filtre
pays réel et un retour à l'accueil. Aucun nombre de chaînes fictif n'est affiché.
Les surfaces, la navigation et les écrans secondaires reprennent cette identité.

Le zoom navigateur est autorisé. Un lien d'évitement mène au contenu principal.
Les deux thèmes, les zones de sécurité mobiles et les préférences de réduction
des animations sont conservés.

## Visuel

Fichier : `public/artwork/horizons-portal.webp` (environ 217 Kio).
Génération avec l'outil intégré Image Gen, puis conversion WebP pour le projet.
Il s'agit d'une œuvre d'accueil imaginaire, pas d'une image de programme ou d'un
diffuseur réel. L'original est conservé hors du paquet public ; seul le WebP est
servi par l'application.

Prompt de génération :

> Create one original premium editorial still-life artwork for MJTV Horizons, a French and African live television discovery web app. This is a FINISHED ART ASSET, not a web page or UI mockup. Vertical portrait 4:5 composition. A surreal sculptural analog television / portal, a thick beautifully crafted ivory ceramic rounded rectangular frame, with a deep forest green case and one translucent burnt-orange acrylic tuning dial. The screen opens into a sunlit impossible coastal landscape with terracotta dunes, a winding dark emerald river, an immense pale yellow sun, and a tiny distant green palm. An electric citron yellow thin orbit ring passes physically around the object, as if transmitting a signal. Architectural minimalism with tactile real ceramic, grainy handmade paper, subtle photographic film grain, beautiful crisp late-afternoon directional shadows. Dark forest green cyclorama background (#143c32), ivory and warm clay surfaces, citron accents (#deef8c). Object centered with generous breathing room, occupies about 70% of frame. sophisticated independent culture magazine art direction, slightly playful but mature, exquisite studio lighting and dimensional materials, elegant and sculptural rather than cute. No people, no logos, no lettering, no text, no UI, no captions, no typography, no watermarks. Strong graphic silhouette, restricted palette, not neon, not a generic gradient, no floating feature icons. This will fill the right half of a large editorial website hero, image must hold up on mobile and desktop.

## Vérifications

- Lint, TypeScript, build : PASS.
- 312 tests unitaires, dont les contrastes des palettes finales : PASS.
- 61 parcours Chromium, dont les escales et le lien clavier : PASS.
- Captures à 1440 pixels en clair et sombre, 390 et 320 pixels en clair : aucun
  débordement horizontal et image chargée.
- Explorateur examiné après chargement complet.
- Lecture RTS 1 réelle en 854×480, progression vidéo et images décodées,
  mémorisation après rechargement et retour Auto : PASS.
- Revue React : données statiques hors rendu, clés stables, boutons sémantiques,
  image optimisée, aucune requête supplémentaire pour les escales.
- Safari/iOS réels : non validés pour cette refonte.

Publication préparée depuis un paquet isolé de 147 fichiers publics, contrôlés
par empreintes. Aucun fichier d'environnement, original privé ou rapport d'audit
n'est inclus dans le paquet.

## Publication vérifiée

Production READY : dpl_4qrZSAiD3GYBMpZ5uSpidsf1cpZ5, Next.js 16.4.3.
Adresse : https://mjtv-iota.vercel.app.
Parcours public confirmé à 2026-10-31T12:02:27.708Z : accueil Horizons, escale
Sénégal, carte RTS réelle, retour à l'accueil et configuration de zoom autorisée.
Les captures des deux thèmes et des mobiles sont également validées sur Vercel.
API de santé 200, ressources graphiques et manifeste 200, administration sans
autorisation 404. Aucun journal d'erreur serveur entre 11:51:49 et 12:01:49 UTC.
Audit npm des seules dépendances de production : aucune vulnérabilité connue.
Le build signale séparément 15 alertes modérées dans les dépendances de développement,
qui n'ont pas été modifiées par cette refonte.
