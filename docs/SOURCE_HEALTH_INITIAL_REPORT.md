# Rapport initial de santé du catalogue

Audit borné exécuté le 23 juillet 2026 à 01:01:14 UTC avec :

```powershell
npm.cmd run audit:channels -- --ids AraBel.fr,EMCITV.fr,EMCITVAfrique.cd,EMCITVAmerica.ca,EMCITVEurope.fr,France24.fr,TV5MondeInfo.fr --timeout 8000
```

Le corpus est volontairement petit : cinq cas suspects et deux témoins. Aucun retry agressif ni téléchargement de flux complet n’a été réalisé.

## Synthèse

| État de chaîne            | Nombre |
| ------------------------- | -----: |
| Chaînes auditées          |      7 |
| `healthy`                 |      0 |
| `degraded`                |      0 |
| `unverified`              |      2 |
| `temporarily_unavailable` |      0 |
| `unavailable`             |      4 |
| `no_source`               |      1 |
| `blocked_or_restricted`   |      0 |

`healthy` reste à zéro parce que cet outil de transport ne prétend jamais confirmer la lecture navigateur. Les deux témoins avec manifeste valide demeurent donc honnêtement `unverified`.

## Résultats par chaîne

| Chaîne                               | Verdict       | Observation                                                                                              |
| ------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------- |
| AraBel (`AraBel.fr`)                 | `unavailable` | source unique, HTTP 404                                                                                  |
| EMCI TV (`EMCITV.fr`)                | `unavailable` | source unique, HTTP 404                                                                                  |
| EMCI TV Afrique (`EMCITVAfrique.cd`) | `no_source`   | aucune source iptv-org                                                                                   |
| EMCI TV America (`EMCITVAmerica.ca`) | `unavailable` | source unique, HTTP 404                                                                                  |
| EMCI TV Europe (`EMCITVEurope.fr`)   | `unavailable` | source unique, HTTP 404                                                                                  |
| France 24 (`France24.fr`)            | `unverified`  | plusieurs manifestes HLS valides; deux sources ont répondu 403; lecture navigateur non testée par le CLI |
| TV5Monde Info (`TV5MondeInfo.fr`)    | `unverified`  | manifeste HLS valide; lecture navigateur non testée par le CLI                                           |

Les observations mortes d’AraBel, EMCI TV, EMCI TV America et EMCI TV Europe sont conservées dans les overrides curatés. EMCI TV Afrique obtient naturellement `no_source` puisque le normaliseur conserve désormais les fiches sans flux valide.

## Recommandations

1. Exclure les quatre chaînes `unavailable` et la chaîne `no_source` du hero et des recommandations génériques.
2. Les garder visibles et explicables dans Explorer, sauf décision d’archivage distincte.
3. Ne promouvoir France 24 ou TV5Monde Info vers `healthy` qu’après lecture confirmée sur les navigateurs ciblés.
4. Rechercher une source alternative uniquement auprès du diffuseur ou d’un distributeur autorisé et documenter la revue.
5. Réauditer les cas 404 lors d’une future mise à jour iptv-org, sans scan global automatique en CI.

## Limites

- Sept chaînes ne représentent pas le catalogue complet.
- Le contrôle valide le transport et la structure initiale d’un manifeste, pas les segments, codecs, DRM, CORS ni la continuité du direct.
- Les résultats dépendent du réseau et de l’instant de mesure.
- Les réponses `403` sont classées comme restriction ambiguë, jamais comme source morte.
- Les rapports bruts restent dans `audit-output/`, répertoire local ignoré par Git.
