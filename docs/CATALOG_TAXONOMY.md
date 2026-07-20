# Taxonomie et qualité du catalogue

## Catégories canoniques

| Identifiant     | Libellé français |
| --------------- | ---------------- |
| `live`          | Direct           |
| `news`          | Actualités       |
| `sports`        | Sports           |
| `music`         | Musique          |
| `movies`        | Films            |
| `series`        | Séries           |
| `kids`          | Jeunesse         |
| `animation`     | Animation        |
| `anime`         | Anime            |
| `documentaries` | Documentaires    |
| `culture`       | Culture          |
| `religious`     | Religieux        |
| `entertainment` | Divertissement   |
| `lifestyle`     | Art de vivre     |
| `local`         | Local            |
| `international` | International    |
| `radio`         | Radio            |
| `other`         | Autre            |

Une chaîne possède une `primaryCategory`, une liste de catégories canoniques et des `tags`
secondaires. Les catégories provenant de métadonnées structurées sont prioritaires. Un nom de chaîne
n’est pas utilisé pour inventer une catégorie lorsqu’une métadonnée fiable existe.

## Normalisation

Les identifiants et libellés connus convergent vers la même valeur : `general` et `généraliste`
deviennent `live`, `actualité` devient `news`, et `documentary` devient `documentaries`. Une valeur
inconnue est conservée comme tag; si aucune catégorie connue n’existe, la catégorie principale est
`other`.

Les filtres et les sections utilisent toujours les identifiants canoniques. Les libellés français sont
ajoutés seulement à la présentation.

## Score interne

Le score n’est ni affiché dans les cartes ni ajouté comme champ public de l’API. Il sert uniquement à
ordonner les résultats. Il valorise :

- au moins une source;
- une source HTTPS;
- HLS HTTPS;
- plusieurs sources;
- un succès local récent lorsqu’il est connu;
- un logo;
- un pays et une langue renseignés;
- une catégorie canonique autre que `other`;
- des métadonnées complètes.

Une chaîne dont toutes les sources sont confirmées invalides, incompatibles, indisponibles ou refusées
reçoit une forte pénalité. Une source encore inconnue n’est pas déclarée fonctionnelle : la carte
affiche « À vérifier » plutôt qu’une promesse « HD ».

## Chaînes liées

Le classement exclut toujours la chaîne courante et combine, dans cet ordre d’influence :

1. même catégorie principale;
2. langue commune;
3. même pays;
4. présence d’une source potentiellement viable;
5. tags communs;
6. qualité des métadonnées.

Le candidat final est choisi par score décroissant, puis par nom pour obtenir un résultat stable. Une
chaîne française d’actualités doit donc précéder une chaîne afghane musicale sans rapport, même si
cette dernière arrive plus tôt dans le jeu de données amont.

## Disponibilité et limites

Le catalogue serveur ne sonde pas toutes les URL distantes : ce serait lent, instable et proche d’un
proxy générique. Les observations précises sont collectées au moment de la lecture dans le navigateur
et restent locales. Un état `unknown` signifie « non vérifié », jamais « disponible ».
