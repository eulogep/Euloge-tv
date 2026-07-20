# MJTV — système d’identité visuelle

Ce document décrit l’identité visuelle premium de MJTV. Il complète l’architecture éditoriale sans modifier les règles de catalogue, de classement ou de lecture.

## Principes

- Cinématique, sombre et calme : hiérarchie nette, profondeur mesurée, aucune animation décorative agressive.
- Honnêteté de lecture : « Direct » est réservé à une source observée `playable`; sinon l’interface indique « À vérifier ».
- Mobile d’abord : cibles tactiles d’au moins 44 × 44 px, safe areas iOS, texte lisible en portrait et en paysage.
- Accessibilité : focus visible, texte courant conforme WCAG AA et réduction stricte du mouvement.
- Fonctionnalités inchangées : le hero et les variantes éditoriales sont des choix de présentation uniquement.

## Palette centrale

Les variables d’exécution sont définies dans `src/app/globals.css`.

| Rôle             | Valeur sombre | Usage                                 |
| ---------------- | ------------- | ------------------------------------- |
| Arrière-plan     | `#070711`     | Fond de l’application                 |
| Surface          | `#10101D`     | Sections et navigation                |
| Carte            | `#171728`     | Cartes de chaînes                     |
| Élevé            | `#202037`     | Contrôles, médias, détails            |
| Primaire         | `#7A5CFF`     | Action et sélection                   |
| Primaire clair   | `#A27BFF`     | Petit texte actif et focus            |
| Secondaire       | `#32D6FF`     | Accent froid et actualités            |
| Direct           | `#FF405F`     | Statut direct confirmé uniquement     |
| Succès           | `#35D59A`     | Confirmation et documentaires         |
| Texte            | `#F8F8FC`     | Texte principal                       |
| Texte secondaire | `#AAA9BC`     | Descriptions et métadonnées           |
| Subtil           | `#747386`     | Décoration non essentielle uniquement |

Contrastes mesurés sur le thème sombre : texte/fond 18,92:1, secondaire/carte 7,66:1, primaire clair/surface élevée 5,15:1 et texte sombre/primaire 4,58:1. `subtle` reste sous 4,5:1 sur les surfaces et ne doit donc jamais porter une information textuelle essentielle.

Le thème clair reste disponible. Ses variables sémantiques sont ajustées pour conserver les mêmes rôles et un contraste lisible.

## Formes, profondeur et espacement

- Rayons : `8`, `12`, `16`, `20` et `24` px via `--shape-*`; les pills utilisent `--radius-pill`.
- Ombres : `--shadow-card`, `--shadow-card-hover`, `--shadow-nav`, `--shadow-focus`.
- Largeur de page : `--space-page-x`; séparation des univers : `--space-section`.
- Les cartes utilisent une surface `card`; les sections utilisent `surface`; les contrôles détachés utilisent `surface-elevated`.

## Typographie

- `type-display` : titre du hero uniquement.
- `type-title` : titre de page ou de chaîne.
- `type-section` : titre d’un univers ou d’un état système.
- `type-eyebrow` : contexte court en capitales.
- Le texte courant reste à 14–16 px avec une hauteur de ligne généreuse. Les métadonnées ne descendent pas sous 11 px.

## Composants

### FeaturedChannelHero

Le hero choisit de façon déterministe une chaîne qui possède au moins une source et dont l’état est jouable, en vérification ou encore inconnu. Il écarte les entrées bloquées et les échecs observés, puis privilégie disponibilité, compatibilité, logo, nombre de sources et ordre lexical. Il n’effectue aucune requête et ne lance jamais la lecture automatiquement. Sans image, les initiales sont affichées dans un visuel de repli.

### ChannelCard

L’API fonctionnelle antérieure est conservée. La carte expose un statut lisible, un fallback de logo, le pays, la catégorie, les sources multiples et un bouton Ma liste de 44 px. Les états hover, pressed et focus sont courts et partagés.

### Univers éditoriaux

Douze variantes existent : actualités, divertissement, musique, sports, jeunesse, animation, anime, documentaires, culture, religieux, international et neutre. Elles ne changent que l’icône, l’accent et le halo de surface. Les filtres, scores, priorités et limites restent ceux de l’architecture éditoriale.

### Navigation basse

Les six destinations existantes sont conservées. L’état actif combine couleur, fond et indicateur supérieur, et la barre consomme les safe areas gauche, droite et basse. « Ma liste » contient les favoris distants; « Bibliothèque » contient les playlists M3U locales.

Proposition non appliquée : renommer « Bibliothèque » en « Importer » rendrait cette destination plus immédiatement distincte de « Ma liste ». Ce changement de produit doit être validé séparément avant toute modification.

### États système

Les états vide, hors-ligne, erreur, succès, chargement et fallback lecteur partagent les surfaces, rayons, couleurs sémantiques et cibles tactiles. Les détails techniques restent secondaires mais accessibles.

## Mouvement

- Rapide : 120 ms; standard : 180 ms; lent : 240 ms.
- Les effets se limitent aux changements de couleur, focus, légère élévation et progression de rail.
- `prefers-reduced-motion: reduce` et le réglage MJTV `reduceAnimations` réduisent animations, transitions et défilement fluide à une durée quasi nulle.
- Aucun autoplay, parallaxe, clignotement ou suivi utilisateur n’est introduit.

## Safe areas et contrôle iPhone Safari

Les variables `--safe-top`, `--safe-right`, `--safe-bottom` et `--safe-left` centralisent les `env(safe-area-inset-*)`. La page réserve la hauteur de la navigation fixe, y compris l’encoche basse.

Procédure manuelle recommandée sur iPhone Safari :

1. Ouvrir l’accueil en portrait puis paysage et vérifier l’absence de défilement horizontal.
2. Vérifier le hero avec et sans logo, ses deux actions, et la lisibilité du statut.
3. Balayer plusieurs rails et confirmer que les cartes se calent sans capturer le défilement vertical.
4. Ouvrir chacune des six destinations; vérifier l’indicateur actif et l’absence de chevauchement avec la barre système.
5. Ajouter puis retirer une chaîne de Ma liste depuis le hero, une carte et le lecteur.
6. Activer « Réduire les animations » puis l’option système iOS correspondante; vérifier que les transitions et défilements doux disparaissent.
7. Tester les états hors-ligne, erreur catalogue et erreur finale du lecteur.

## Contrats de validation

Les tests unitaires vérifient la sélection viable, le fallback sans image, les actions du hero, les contrastes critiques, les tokens safe area/motion, les variantes propres et les états vide/hors-ligne. Playwright couvre le hero, les univers, les rails, la navigation active, Ma liste, Explorer, le lecteur, les erreurs, le portrait/paysage et l’absence d’overflow sur Chromium et WebKit, desktop et mobile.
