# Audit de fiabilité de lecture

Date de l’audit reproductible : 20 juillet 2026.

## Cause racine observée pour AraBel

Le catalogue public iptv-org référence une seule source HLS HTTPS pour `AraBel.fr`. Au moment de
l’audit, cette URL répond `404 Not Found` à une requête HEAD et GET.

Sur Safari/iOS, le flux HLS est confié au lecteur média natif. Une ressource HLS absente peut alors
remonter comme `MEDIA_ERR_SRC_NOT_SUPPORTED` (`code 4`) sans exposer le statut HTTP au JavaScript.
L’ancienne implémentation traduisait systématiquement ce code en `UNSUPPORTED_FORMAT`. Le message
décrivait donc le symptôme Safari, pas la cause HTTP observée.

AraBel ne possède actuellement aucune deuxième source dans iptv-org. Le fallback ne peut pas
inventer une source valide; il peut seulement classifier correctement l’échec et éviter une fausse
promesse de compatibilité.

## Architecture de lecture

Le lecteur choisit une stratégie par source :

1. HLS natif lorsque `video.canPlayType("application/vnd.apple.mpegurl")` renvoie `maybe` ou
   `probably` — cas normal de Safari et iOS;
2. hls.js lorsque Media Source Extensions sont disponibles — cas normal de Chromium;
3. lecture vidéo native pour MP4 et autres MIME `video/*`;
4. tentative native directe pour une URL HTTPS de type inconnu;
5. rejet explicite des sources HTTP sur une page HTTPS, des protocoles non HTTP(S), des sources qui
   exigent des en-têtes navigateur impossibles, et des formats déjà confirmés incompatibles.

Le MIME détecté par une requête HEAD est prioritaire lorsqu’il est accessible. L’extension de l’URL
reste un fallback, car de nombreux diffuseurs bloquent HEAD ou CORS tout en autorisant la lecture
native.

## Modèle de disponibilité

Chaque source possède un état parmi :

- `unknown`
- `checking`
- `playable`
- `temporarily_unavailable`
- `unsupported_format`
- `network_error`
- `forbidden_or_restricted`
- `invalid_url`
- `timeout`

Les diagnostics mémorisent aussi `lastCheckedAt`, `failureReason`, `responseStatus`,
`detectedContentType`, `playbackStrategy` et la compatibilité constatée pour Safari, Chromium ou un
navigateur inconnu.

`forbidden_or_restricted` est volontairement ambigu. Un `401`, `403` ou `451` ne prouve pas à lui
seul une restriction géographique.

## Sélection et fallback

L’ordre est déterministe :

1. source confirmée compatible avec le navigateur courant;
2. HLS HTTPS;
3. source ayant fonctionné récemment;
4. source inconnue;
5. source confirmée incompatible uniquement comme dernier recours lorsqu’aucune autre n’existe.

Chaque source du plan est essayée une seule fois au niveau du lecteur. hls.js conserve sa récupération
interne unique pour une erreur réseau ou média. Un `Set` d’identifiants empêche tout retour implicite
à la source 1. Avant une bascule, l’instance hls.js est détruite, l’attribut `src` est retiré, le média
est rechargé et les Blob URLs sont révoquées.

L’erreur finale n’apparaît qu’après épuisement du plan. L’interface indique la bascule en cours, le
nombre de sources essayées, puis propose Réessayer, Choisir une autre source et Retour aux chaînes.
Le code technique reste dans une zone secondaire.

## Limites Safari/iOS

- Safari pilote lui-même HLS et ne révèle pas toujours le statut HTTP ou le MIME responsable d’une
  erreur média.
- Une requête HEAD CORS peut échouer alors que la lecture native fonctionne. Un échec de probe CORS
  reste donc `unknown` et n’interdit pas la tentative média.
- iOS peut différer l’autoplay, le plein écran, Picture-in-Picture et le décodage selon la version,
  le codec et les réglages de l’appareil.
- Une URL en `404`, un manifeste invalide, un codec absent, une politique CORS, du mixed content ou
  une restriction du diffuseur ne peuvent pas être réparés côté MJTV.

MJTV ne crée ni proxy vidéo, ni contournement géographique, ni substitution d’en-têtes privés.

## Risques restants

- La disponibilité d’un flux public varie après la génération du catalogue.
- Certains serveurs ne prennent pas en charge HEAD ou renvoient un MIME générique.
- Un `403` reste indécidable sans information explicite du diffuseur.
- Les observations de lecture sont locales au navigateur et ne constituent pas une supervision
  globale.
- Une chaîne ne disposant que d’une source morte, comme AraBel pendant cet audit, reste illisible tant
  que le fournisseur de données n’a pas corrigé ou remplacé son URL.

## Tests ajoutés

Les fixtures sont locales et déterministes :

- ordre des sources et mémoire par navigateur;
- fallback vers la deuxième source;
- épuisement complet et absence de boucle;
- HLS Safari compatible et incompatible;
- URL invalide, timeout, `404`, `403` ambigu et probe CORS;
- nettoyage entre deux sources;
- succès après fallback, erreur finale et choix manuel en Playwright;
- exécution des mêmes scénarios sous Chromium, WebKit et leurs profils mobiles.
