# ADR-003 : Stockage local-first (localStorage + IndexedDB)

## Date

2026-07-13

## Statut

Accepté

## Contexte

V1 n'a pas de compte utilisateur, pas d'authentification, pas de base de données distante. Les favoris, l'historique, les réglages et les playlists importées doivent persister entre les sessions.

## Décision

Utiliser un stockage local-first :

- **localStorage versionné** pour favoris, historique, réglages (données petites et structurées)
- **IndexedDB** (via idb-keyval) pour les playlists M3U importées (données potentiellement volumineuses)

Chaque schéma de stockage inclut un champ `version` et une fonction `migrate*` qui convertit les anciennes formes vers le schéma courant.

## Conséquences

- Les données ne sont pas synchronisées entre appareils
- Les données sont perdues si l'utilisateur vide le stockage du navigateur
- Aucune donnée personnelle n'est envoyée au serveur
- Hooks SSR-safe (hydratation après mount)

## Alternatives rejetées

- Base de données distante : nécessite authentification (hors V1)
- Cookies : trop petits pour les playlists
- File System Access API : pas supportée sur iOS Safari
