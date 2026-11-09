# Rétablissement de sources francophones et africaines

Vérification du 30 octobre 2026. Périmètre : sources publiques de diffuseurs,
sans contournement d'authentification, de restriction géographique ou de DRM.

## Sources rétablies

| Chaîne                               | Provenance officielle                                                             | Intégration                                      |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| RTS 1, RTS 2, RTS 3, RTS 4 (Sénégal) | https://www.rts.sn/tv/rts-1 et les métadonnées de lecture référencées par ce site | Métadonnées publiques résolues par le navigateur |
| Bénin TV Junior                      | https://srtb.bj/directbenintvjuniors/ → lecteur Streamakaci officiel              | HLS officiel statique                            |

Les signatures temporaires RTS ne sont pas enregistrées dans le catalogue.
Le navigateur interroge uniquement les quatre identifiants officiels autorisés et
valide strictement le domaine, le port et le chemin de lecture. Les liens restent
en mémoire pendant 30 secondes ; les requêtes de métadonnées ne sont pas stockées.
Les médias restent servis directement par le diffuseur. Aucun paramètre utilisateur
ne choisit un hôte. Le contrat public indique `resolver: "rts"` avec l'URL stable
et publique de métadonnées, jamais une signature de lecture.

La vérification Vercel a montré que les liens obtenus côté serveur sont refusés
au navigateur (HTTP 403), contrairement aux liens obtenus directement par le
navigateur. L'intégration finale respecte donc la résolution côté spectateur.
L'ancienne route de redirection serveur a été retirée.

## Preuves locales

Chromium, lecteur MJTV compilé en production, APIs réelles, sans interception,
le 30 octobre à 16:08 UTC : les cinq chaînes décodent des images et avancent de
plus de 1,5 seconde. Résolutions observées : RTS 1/2/4 en 1920×1080,
RTS 3 et Bénin TV Junior en 1280×720. La qualité peut varier avec l'adaptation HLS.

Correction associée : préférer HLS.js sur Chromium même lorsque la prise en
charge native est annoncée. Le lecteur natif Chromium restait bloqué sur le
manifeste DVR de Bénin TV Junior. Safari conserve sa stratégie native.

Validation : lint, TypeScript, compilation, 307 tests unitaires et 59 tests de
parcours Chromium réussis. Safari/iOS et les autres régions ne sont pas validés.

## Vérification Vercel

Déploiement `dpl_8XLmpoMyZxTpM8sBMkY6gyLABrEC`, état READY, environnement
production, Next.js 16.4.3. Paquet public de 143 fichiers contrôlés par empreinte,
issu du workspace basé sur `779feab` avec les modifications locales validées.

Le 30 octobre à 16:12:21 UTC, les cinq chaînes ont été lues dans le lecteur de ce
déploiement : progression supérieure à 1,5 seconde et images décodées pour chaque
flux. Le contrôle attend le chargement puis lance une seule lecture. RTS 1/2/4
en 1920×1080 ; RTS 3 et Bénin TV Junior en 1280×720.

API de santé : 200. Administration et API administrateur sans autorisation : 404.
Ancienne route serveur RTS : 404. Recherche des erreurs d'exécution Vercel entre
16:00:52 et 16:10:52 UTC : aucun enregistrement de niveau erreur. Ce contrôle
ponctuel ne valide pas une surveillance continue ni les autres régions.

## Sources encore manquantes

EMCI TV diffuse actuellement via des lecteurs Dailymotion officiels ; les anciennes
adresses HLS ne fonctionnent plus. Aucun lien temporaire extrait n'a été figé.
Le flux publié par AraBel renvoie une erreur. BF1 utilise aussi un lecteur
Dailymotion. Plusieurs autres sites examinés sont en maintenance, injoignables
ou ne fournissent pas de flux directement intégrable.

Ces chaînes ne sont pas déclarées rétablies. Un bouton « Ouvrir le site de la
chaîne » est proposé lorsqu'une fiche sans source possède une adresse HTTP(S)
valide. Le catalogue contient encore de nombreuses fiches sans source : ce lot
ne prétend pas les avoir toutes corrigées.

Après promotion, contrôle de l'adresse publique https://mjtv-iota.vercel.app à
2026-10-30T16:13:21.919Z : les cinq fiches répondent 200 avec une source et un état
healthy ; les cinq vidéos sont également décodées et progressent dans Chromium.
