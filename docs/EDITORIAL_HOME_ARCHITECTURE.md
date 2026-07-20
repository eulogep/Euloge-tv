# Architecture de l’accueil éditorial

## Objectif

L’accueil MJTV présente le catalogue comme une suite d’univers éditoriaux lisibles plutôt que comme
une grille unique. Il reste un point d’entrée vers des chaînes en direct : la recherche détaillée, les
filtres et le tri restent dans la vue **Explorer**.

Le système ne géolocalise pas précisément l’utilisateur, ne contacte pas de service de recommandation
et n’ajoute aucun mécanisme d’engagement trompeur. Les seuls signaux personnels sont le pays, les
langues et les catégories choisis manuellement, ainsi que Ma liste et l’historique stockés localement.

## Modèle de section

`EditorialSectionDefinition` est défini dans `src/features/catalog/domain/editorial.ts`. Chaque section
possède :

- `id`, `title` et `subtitle` ;
- `primaryCategory` et, si nécessaire, `optionalTags`, `optionalCountry` ou `optionalLanguage` ;
- `priority` et `maxItems` ;
- `visualVariant` ;
- `emptyBehavior`, actuellement limité à `hide`.

Les définitions par défaut couvrent Pour vous, le pays préféré, Actualités, Divertissement, Musique,
Sports, Jeunesse, Animation, Anime, Documentaires, Culture, Religion, Local, International, Radios,
Ma liste et les chaînes regardées récemment. Une section sans résultat n’est jamais rendue.

## Construction et ordre

`buildEditorialSections` est une fonction pure. Elle reçoit des `ChannelSummary`, les préférences et
l’état local. Son résultat peut donc être testé sans navigateur ni réseau.

Le classement applique les règles suivantes :

1. exclure toute chaîne sans source ;
2. favoriser une disponibilité explicitement `playable` ;
3. rétrograder les disponibilités inconnues, limitées ou confirmées inutilisables ;
4. respecter la catégorie principale de la section ;
5. utiliser les catégories favorites pour remonter les univers concernés ;
6. utiliser le pays et les langues préférés comme signaux secondaires ;
7. départager de manière stable par le nom.

La section « populaire » est un classement de qualité du catalogue dans le pays choisi. MJTV ne
dispose pas de statistiques d’audience et ne prétend donc pas mesurer une popularité réelle.

## Préférences utilisateur

Les réglages version 2 conservent :

- `preferredCountry` ;
- `preferredLanguages` ;
- `favoriteCategories`.

La migration transforme l’ancien champ unique `preferredLanguage` en liste. La clé de stockage des
favoris (`mjtv:favorites:v1`) ne change pas : « Ma liste » est un nouveau libellé d’expérience, pas une
rupture du format de données. Une action dédiée réinitialise seulement les préférences éditoriales ;
la réinitialisation complète des réglages reste disponible.

## Variantes visuelles

La présentation prend en charge `news`, `entertainment`, `music`, `kids`, `animation`,
`documentaries`, `culture`, `international` et `neutral`. Chaque variante ne change que l’accent,
l’icône, un halo léger et le séparateur. Les cartes gardent la même structure, les mêmes couleurs de
surface et la même identité sombre dans tous les univers.

## Rails et accessibilité

`ChannelRail` utilise le défilement horizontal natif :

- geste tactile et `scroll-snap` progressif ;
- flèches gauche/droite, Origine et Fin au clavier ;
- boutons précédent/suivant visibles sur les écrans de bureau ;
- région nommée et indicateur de progression exposé aux technologies d’assistance ;
- cartes et images chargées paresseusement ;
- mouvement instantané lorsque la réduction des animations est activée.

Les rails sont contenus dans leur section et l’accueil masque seulement son débordement résiduel : il
n’existe pas de scroll horizontal global. Le shell et la navigation continuent d’utiliser les safe areas
iOS.

## Stratégie anti-doublons

Le générateur essaie d’abord des chaînes absentes de la section précédente et limite normalement une
chaîne à deux apparitions dans les univers génériques. Si une section manquerait de contenu, au plus un
quart de sa capacité peut réutiliser des éléments voisins, même avec un très petit catalogue. Ma liste et
l’historique sont exemptés de la limite globale
pour ne jamais masquer un choix explicite de l’utilisateur, tout en essayant eux aussi les éléments non
adjacents en premier.

## Explorer

Le bouton « Voir tout » ouvre la vue Explorer avec le pays, la langue ou la catégorie de la section.
Explorer conserve la recherche et la pagination et ajoute un filtre de disponibilité probable ainsi que
les tris par qualité, nom et pays. Le filtre de disponibilité s’appuie sur les observations connues et la
compatibilité des sources ; une source inconnue n’est jamais présentée comme garantie.

## Limites

- L’accueil utilise une charge bornée à 100 résumés, complétée uniquement par les éléments locaux
  manquants de Ma liste ou de l’historique.
- La disponibilité observée par le lecteur reste locale ; le serveur ne sonde pas massivement les flux.
- Les métadonnées iptv-org peuvent être incomplètes. Une catégorie vide est masquée au lieu d’être
  remplie par une classification inventée à partir du nom.
- Les catégories favorites influencent l’ordre mais ne rendent aucun contenu inaccessible dans Explorer.
