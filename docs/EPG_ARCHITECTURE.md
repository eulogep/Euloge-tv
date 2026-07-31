# Architecture EPG de MJTV

## Objectif

Cette première version ajoute le programme actuel et le programme suivant sans rendre le
catalogue ou la lecture dépendants d’un service réseau. L’EPG est un enrichissement
progressif : une chaîne reste visible et lisible même si son guide est absent, périmé ou en
erreur.

La version initiale utilise uniquement un provider fixture local. Elle ne télécharge aucun
guide et n’ajoute aucune source vidéo.

## Modèle

Le modèle central se trouve dans `src/features/epg/domain/types.ts`.

- `EpgProgram` contient un titre, une description optionnelle et des dates ISO 8601 de début
  et de fin.
- `EpgSchedule` est le modèle interne. Il contient l’identifiant MJTV, l’identifiant EPG,
  les programmes actuel et suivant, la source, la date de mise à jour, l’état et, si
  nécessaire, un code d’erreur technique.
- `PublicEpgSchedule` est une projection explicite et minimale.
- Les états sont `available`, `stale`, `unavailable` et `unknown`.

Les dates sont échangées en ISO 8601 avec un fuseau explicite. Les comparaisons reposent sur
des timestamps UTC ; l’affichage convertit seulement les horaires dans le fuseau du
navigateur.

## Détection et progression

`selectCurrentAndNextPrograms` :

1. rejette les entrées dont le titre ou les dates sont invalides ;
2. trie les programmes par date de début ;
3. considère un programme actuel lorsque `startAt <= now < endAt` ;
4. sélectionne ensuite le premier programme qui commence après sa fin.

`calculateProgramProgress(startAt, endAt, now)` est une fonction pure. Elle retourne :

- `0` avant le début ;
- une valeur proportionnelle pendant le programme ;
- `100` après la fin ;
- `0` pour une date invalide ou un intervalle nul/inversé.

Le résultat est toujours borné entre 0 et 100.

## Association chaîne vers EPG

Le mapping explicite se trouve dans
`src/features/epg/infrastructure/channel-epg-mapping.ts`.

La clé est l’identifiant canonique MJTV/iptv-org de la chaîne. La valeur est l’identifiant
attendu par le provider EPG. Le nom affiché de la chaîne n’est jamais utilisé comme
identifiant implicite : il peut changer, être traduit ou être partagé par plusieurs
chaînes.

Chaque nouvelle correspondance doit être revue manuellement et testée. Le mapping n’est
jamais inclus dans les réponses publiques.

## Provider

L’interface `EpgProvider` est indépendante de React, de Next.js et du catalogue. Un provider
reçoit :

- un identifiant EPG validé ;
- un `AbortSignal` ;
- l’heure de référence.

Il renvoie des programmes, une source et une date de mise à jour.

`FixtureEpgProvider` est la seule implémentation active. Ses créneaux de trente minutes sont
calculés de façon déterministe, sans accès réseau. Le mapping initial la réserve à
`demo-fr`, identifiant de démonstration absent du catalogue public : aucun programme
synthétique n’est donc présenté comme le vrai guide d’une chaîne publique. Elle garantit un
comportement stable dans les tests.

## Cache et fraîcheur

`EpgService` possède un cache mémoire borné :

- fraîcheur par défaut : 15 minutes ;
- période stale affichable : 6 heures ;
- timeout provider : 1,5 seconde ;
- maximum : 128 chaînes ;
- maximum : 96 programmes par chaîne ;
- éviction : entrée la plus ancienne.

Une donnée fraîche est `available`. Une donnée plus ancienne que la fenêtre de fraîcheur,
mais encore dans la fenêtre stale, est affichée avec l’état `stale`. Au-delà, elle devient
`unavailable`.

Si un rafraîchissement échoue, une valeur en cache encore affichable est conservée et
marquée `stale`. Sans valeur exploitable, le service retourne un état indisponible. Une
erreur EPG ne remonte donc jamais jusqu’au catalogue ou au lecteur.

## Projection publique

Les routes du catalogue et de détail attachent `PublicEpgSchedule`. Cette projection expose
uniquement :

- le programme actuel ;
- le programme suivant ;
- le nom et le type public de la source ;
- la date de mise à jour ;
- l’état.

Elle n’expose pas :

- l’identifiant EPG interne ;
- l’identifiant technique du provider ;
- les codes d’erreur ;
- le contenu du mapping ;
- des URL privées ;
- des diagnostics ou métadonnées d’audit.

## Présentation

`EpgNowNext` est partagé par les cartes et la page de lecture. Lorsque le programme actuel
est disponible, il affiche :

- `En direct : [titre]` ;
- l’horaire début–fin ;
- une barre de progression accessible ;
- `À suivre : [titre]` lorsqu’il existe.

Sans programme actuel exploitable, le composant affiche seulement `Programme non
disponible`. La chaîne et ses actions restent présentes. Sur mobile, les titres sont limités
à deux lignes, les horaires restent sur une ligne courte et le composant respecte la largeur
de son conteneur.

## Gestion des erreurs

Les payloads sont validés avant leur mise en cache. Un programme sans titre, avec une date
illisible ou une fin antérieure au début est rejeté. Le service distingue les timeouts, les
erreurs provider et les payloads invalides dans son modèle interne, mais ne publie pas ces
détails.

Le provider reçoit toujours un signal d’annulation et le service applique son propre
timeout. Aucun échec EPG ne bloque le rendu du catalogue, l’ouverture d’une chaîne ou la
lecture.

## Ajouter une vraie source plus tard

Une source légitime telle qu’un flux XMLTV autorisé peut être ajoutée sans modifier l’UI :

1. vérifier la licence, les conditions d’utilisation et la provenance du guide ;
2. créer un nouveau provider qui implémente `EpgProvider` ;
3. utiliser uniquement HTTPS et une origine explicitement autorisée ;
4. appliquer le timeout et le `AbortSignal` transmis ;
5. limiter la taille téléchargée et le nombre de programmes conservés ;
6. valider strictement le schéma, les dates, les titres et les identifiants ;
7. ne jamais journaliser de token, d’URL privée ou de payload complet ;
8. compléter le mapping uniquement avec des associations revues ;
9. conserver `FixtureEpgProvider` pour les tests afin que la CI reste indépendante du
   réseau ;
10. ajouter des tests de timeout, de payload invalide, de cache stale et de repli.

Un provider distant ne doit jamais devenir une condition de démarrage ou de lecture de
MJTV.

## Limites de la première version

- La fixture n’est pas un guide éditorial réel.
- Seules les chaînes explicitement mappées reçoivent un programme.
- Le cache est local au processus Next.js et n’est pas partagé entre instances.
- Aucun rafraîchissement en arrière-plan n’est lancé hors requête.
- Les changements de programme sont visibles au prochain chargement du catalogue ou de la
  fiche chaîne.
