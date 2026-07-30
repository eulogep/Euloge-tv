# Audit de santé — EMCI TV

Date du contrôle réseau : 22 juillet 2026 à 20:31:56 UTC. Vérification des métadonnées renouvelée le 23 juillet 2026 à 01:01:14 UTC.

## Identification reproductible

| Champ                    | Valeur observée                                          |
| ------------------------ | -------------------------------------------------------- |
| Identifiant iptv-org     | `EMCITV.fr`                                              |
| Nom exact                | EMCI TV                                                  |
| Pays                     | France (`FR`)                                            |
| Langue du feed principal | français (`fra`)                                         |
| Catégorie                | `religious`                                              |
| Tags secondaires         | aucun dans l’entrée normalisée                           |
| Feed                     | `SD`, principal, format `576i`, qualité de source `288p` |
| Site déclaré             | `https://emcitv.com/direct/`                             |
| Nombre de sources        | 1                                                        |
| Origine des métadonnées  | API publique iptv-org                                    |
| Origine de la source     | dépôt GitHub tiers `Sibprod/streams`, pas le diffuseur   |

L’unique URL référencée au moment de l’audit est :

`https://raw.githubusercontent.com/Sibprod/streams/main/ressources/dm/py/hls/emciafrique.m3u8`

Elle ne contient ni clé ni jeton. L’application publique n’expose pas les notes internes de revue et l’API de santé ne renvoie aucune URL.

## Résultat

Les requêtes `HEAD` puis `GET` partiel ont toutes deux donné :

- HTTP `404 Not Found` ;
- MIME `text/plain; charset=utf-8` ;
- corps court `404: Not Found` ;
- aucun manifeste HLS valide ;
- aucune redirection.

Le suffixe suggère un flux HLS, mais la ressource n’existe plus. Un `404` reproductible sur l’unique source suffit ici à la classer `dead`; il ne s’agit pas d’un diagnostic de codec, CORS, DRM ou géoblocage.

## Navigateurs

- Safari/iOS : le test manuel communiqué sur iPhone aboutit à aucune lecture disponible.
- Chromium : aucun essai média concluant n’est possible avec cette source, car le serveur retourne `404` avant toute lecture. Le contrôle réseau est reproductible, mais aucun succès navigateur n’est revendiqué.

Verdict source : `dead`.

Verdict chaîne : `unavailable`, car son unique source connue est confirmée morte. Ce verdict est conservé dans `data/channel-source-overrides.json`; la chaîne reste explicable dans Explorer mais n’est plus éligible au hero ni aux recommandations génériques.

## Source alternative

Aucune source alternative n’a été ajoutée. L’audit n’a trouvé aucune URL publique dont l’origine, la légitimité et la stabilité pouvaient être vérifiées. MJTV ne contourne ni restriction d’accès, ni DRM, ni géoblocage et n’utilise pas de source pirate.

## Reproduction

```powershell
npm.cmd run audit:channel -- --id EMCITV.fr --timeout 8000
```

Le rapport généré dans `audit-output/` est local et ignoré par Git. Le contrôle est borné en temps et en taille ; il ne télécharge jamais un flux complet.
