# ADR-001 : Next.js BFF pour le catalogue IPTV-org

## Date

2026-07-13

## Statut

Accepté

## Contexte

Le catalogue iptv-org contient des milliers de chaînes, flux, logos, etc. Le télécharger entièrement dans le navigateur dégraderait l'expérience utilisateur (taille, parsing, mémoire).

## Décision

Implémenter un Backend for Frontend (BFF) en Next.js qui :

- fetch et cache le catalogue iptv-org côté serveur (revalidation 6h)
- normalise les données (jointures, filtres, ranking)
- expose une API paginée `/api/catalog` avec filtres
- ne renvoie jamais le catalogue brut au navigateur

## Conséquences

- Le navigateur ne télécharge que des pages de 40 chaînes
- Le serveur consomme de la mémoire pour le catalogue normalisé (cache module-level)
- L'API est typée et validée par Zod

## Alternatives rejetées

- Téléchargement direct côté client : trop volumineux
- Base de données (Prisma/SQLite) : surdimensionnée pour V1
- Redis : non requis en V1
