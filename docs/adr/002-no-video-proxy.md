# ADR-002 : Pas de proxy vidéo

## Date

2026-07-13

## Statut

Accepté

## Contexte

Certains flux IPTV peuvent être bloqués par CORS ou par mixed content (HTTP sur page HTTPS). Un proxy vidéo côté serveur pourrait contourner ces limitations.

## Décision

Ne **pas** implémenter de proxy vidéo. Le serveur MJTV ne reçoit, ne télécharge, ne retransmet aucun segment vidéo. Le navigateur fetch les flux directement depuis leur origine.

## Conséquences

- Certains flux ne seront pas lisibles (CORS strict côté serveur distant)
- Les flux HTTP ne seront pas lisibles sur une page HTTPS (mixed content)
- La bande passante du serveur MJTV reste minimale
- Aucune responsabilité légale sur la retransmission

## Alternatives rejetées

- Proxy vidéo générique : risque légal, bande passante, responsabilité
- Proxy par liste blanche : complexité et maintenance

## Sécurité

Aucun endpoint `fetch?url=...` n'est exposé. Les routes API ne renvoient que des métadonnées (catalogue, détail de chaîne, santé).
