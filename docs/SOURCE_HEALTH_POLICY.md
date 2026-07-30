# Politique de santé et de curation des sources

## Deux observations séparées

MJTV distingue strictement :

1. **L’observation locale du lecteur** : succès ou échec constaté sur cet appareil, ce navigateur et ce réseau. Elle reste dans le stockage local `mjtv:source-memory:v2` et sert au fallback. Un échec local isolé ne modifie jamais le catalogue.
2. **La santé du catalogue** : état issu des métadonnées, d’un audit borné ou d’une revue humaine. Elle décrit ce que MJTV sait à une date donnée ; ce n’est pas une supervision mondiale en temps réel.

La projection publique contient uniquement le statut, la date, le nombre de sources, le nombre de sources confirmées et un message. Les URLs, preuves, notes de revue et historiques détaillés restent internes.

## États d’une source

- `playable` : lecture réellement confirmée, pas un simple HTTP 200.
- `unknown` : source présente mais lecture non confirmée. Un manifeste HLS valide reste `unknown` sans essai navigateur.
- `temporarily_unavailable` : échec récent après un succès connu, ou réponse transitoire.
- `unsupported_format` : manifeste ou format invalide/inexploitable.
- `invalid_url` : URL syntaxiquement invalide, protocole refusé ou destination interdite par la politique d’audit.
- `network_error` : transport impossible ou délai dépassé.
- `forbidden_or_restricted` : accès refusé (`401`, `403`, `451`) ou restriction ambiguë.
- `dead` : disparition confirmée, notamment `404` ou `410`.
- `no_source` : état de chaîne, utilisé lorsqu’aucune source active n’existe.

## États d’une chaîne

| État                      | Règle déterministe                                                                                  | Présentation                 |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| `healthy`                 | au moins une source confirmée jouable et aucun échec actif                                          | Direct confirmé              |
| `degraded`                | au moins une source jouable, mais une autre échoue ou reste limitée                                 | Disponibilité limitée        |
| `unverified`              | une source active existe mais aucune lecture n’est confirmée                                        | À vérifier                   |
| `temporarily_unavailable` | toutes les sources échouent temporairement, ou une source ayant réussi auparavant échoue maintenant | Temporairement indisponible  |
| `unavailable`             | toutes les sources actives sont confirmées mortes, invalides ou dans un format inexploitable        | Source indisponible          |
| `no_source`               | aucune source active n’est renseignée                                                               | Aucune source disponible     |
| `blocked_or_restricted`   | toutes les sources sont refusées/restreintes sans preuve suffisante d’une disparition               | Accès limité ou indisponible |
| `archived`                | retrait manuel documenté du catalogue actif                                                         | non affichée                 |

## Transitions autorisées

- Nouvelle source : `unverified`.
- Lecture navigateur confirmée ou revue équivalente : `unverified` → `healthy`.
- Échec partiel avec au moins une source jouable : `healthy` → `degraded`.
- Échec récent après succès : `healthy` ou `degraded` → `temporarily_unavailable`.
- Nouveau succès : `temporarily_unavailable` → `healthy` ou `degraded`.
- Toutes les sources mortes/invalides après audit ou revue : tout état actif → `unavailable`.
- Suppression ou désactivation de la dernière source : tout état actif → `no_source`.
- Accès uniquement refusé ou ambigu : tout état actif → `blocked_or_restricted`, jamais `dead` sans preuve.
- Ajout d’une source non vérifiée à `no_source` ou `unavailable` : → `unverified`.
- Ajout et lecture confirmée d’une source : → `healthy` ou `degraded`.
- Décision humaine documentée : tout état → `archived`; une nouvelle revue est obligatoire pour revenir dans le catalogue actif.

Une seule erreur locale ne déclenche aucune de ces transitions catalogue. Les échecs doivent être confirmés par toutes les sources, par plusieurs observations documentées ou par une revue humaine selon la nature du verdict.

## Curation éditoriale

- Le hero accepte `healthy`, puis `degraded`, puis `unverified`; il exclut tous les autres états.
- Les recommandations génériques privilégient `healthy`, puis `degraded`. `unverified` est rétrogradé.
- `temporarily_unavailable`, `unavailable`, `no_source` et `blocked_or_restricted` restent visibles dans Explorer avec un message honnête, mais ne remplissent pas les premières recommandations.
- `archived` est exclu du catalogue actif.
- Une section sans chaîne éligible est masquée. Aucune chaîne hors catégorie n’est injectée pour la remplir.
- Les sections personnelles, comme Ma liste, peuvent conserver une fiche indisponible afin de ne pas effacer le choix de l’utilisateur.

## Overrides manuels

`data/channel-source-overrides.json` est validé par Zod. Une entrée peut ajouter une source revue, désactiver une source sans effacer son historique, choisir une préférence et associer motif, date, relecteur et preuves.

Une source ajoutée doit être HTTP(S), publique, sans secret, légitime, vérifiée humainement et marquée `manuallyApproved: true`. L’outil et la politique interdisent les contournements d’accès et les sources pirates.

## Audit local et sécurité

`npm.cmd run audit:channel` et `npm.cmd run audit:channels` ne sont pas exécutés en CI. L’outil limite la concurrence à trois, le délai, les redirections et la taille de réponse. Il refuse les protocoles non HTTP(S), les identifiants dans l’URL, localhost, loopback, réseaux privés, link-local, multicast et destinations de métadonnées cloud; chaque redirection est revalidée.

L’outil effectue un `HEAD`, puis un `GET` borné pour HLS ou lorsque `HEAD` n’est pas supporté. Il ne renvoie jamais le contenu complet et ne tente aucun contournement.

## Limites

- Un manifeste valide n’établit ni codec compatible, ni lecture Safari, ni absence de restriction segment par segment.
- DNS peut changer entre résolution et connexion; l’outil réduit ce risque par validation, sans prétendre remplacer un service d’audit réseau isolé.
- L’état est un instantané et peut devenir obsolète.
- Les signalements utilisateur restent locaux dans cette version et ne changent pas automatiquement la santé catalogue.
