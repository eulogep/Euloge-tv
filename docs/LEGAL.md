# Cadre légal — MJTV

## Nature du service

MJTV est une plateforme personnelle de consultation de chaînes IPTV publiques diffusées sur Internet. MJTV :

- **ne fournit pas** de vidéos
- **ne stocke pas** les émissions
- **ne retransmet pas** les flux
- **ne télécharge pas** les vidéos
- **n'héberge pas** de contenu vidéo

MJTV agrège des métadonnées et des liens de flux provenant de sources externes publiques (catalogue [iptv-org](https://github.com/iptv-org/api)).

## Sources

Les liens de flux proviennent du projet public iptv-org, qui recense des chaînes diffusées publiquement sur Internet. MJTV ne contrôle pas ces sources.

## Disponibilité

- La disponibilité d'un flux n'est pas garantie.
- Le propriétaire d'un flux peut le modifier ou le retirer à tout moment.
- La présence d'une chaîne dans une liste publique ne garantit pas tous les droits d'exploitation dans tous les territoires.

## Restrictions techniques

MJTV **ne contourne pas** :

- les DRM
- les abonnements
- le géoblocage
- les restrictions d'accès

Les flux nécessitant un DRM, un abonnement, ou un géoblocage ne sont pas lisibles dans MJTV.

## Filtrage

MJTV filtre automatiquement :

- les chaînes marquées `is_nsfw: true` (contenu adulte)
- les chaînes présentes dans la blocklist d'iptv-org
- les chaînes fermées sans remplaçant
- les URLs utilisant des protocoles dangereux (`javascript:`, `data:`, `file:`, `rtmp:`, `udp:`)

## Playlists personnelles

L'utilisateur peut importer des playlists `.m3u` / `.m3u8` personnelles. Ces playlists :

- sont stockées localement dans le navigateur (IndexedDB)
- ne sont jamais envoyées au serveur
- restent sous la responsabilité de l'utilisateur

L'utilisateur s'engage à n'importer que des playlists pour lesquelles il dispose des droits nécessaires.

## Mention dans l'interface

L'interface affiche discrètement la mention :

> MJTV référence des sources externes. Disponibilité non garantie.

## Limites

MJTV n'affirme pas que tous les flux sont nécessairement légaux dans tous les territoires. La légalité d'un flux dépend du territoire de l'utilisateur, du propriétaire de la chaîne, et des accords de distribution en vigueur.
