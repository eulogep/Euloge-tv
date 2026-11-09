# MJTV Horizons — édition personnelle

Date : 31 octobre 2026.

## Produit livré

La signature « À chacun son horizon » prolonge l’identité Horizons : ivoire, vert profond,
citron, typographie éditoriale et illustration originale du téléviseur-paysage.
L’accueil ajoute un point de départ personnel et une navigation par chapitres.
Le dernier direct est une chaîne à rouvrir en direct, jamais une reprise fictive à un
instant passé. Le compteur des favoris utilise les données locales réelles.

Le **carnet d’escales** permet d’enregistrer, nommer, retrouver, renommer et retirer
une exploration. Pays, catégorie, langue, recherche, disponibilité, source et tri sont
conservés. Une sélection identique remplace son entrée au lieu de créer des doublons.
Le carnet est accessible dans l’accueil et Explorer. Un échec du stockage est visible
et n’est jamais présenté comme une sauvegarde réussie.

La **recherche rapide** combine désormais une requête dans le catalogue complet avec
les suggestions approchantes de la sélection initiale. Les réponses anciennes sont
annulées quand la recherche change. Le lien vers le catalogue permet de parcourir
tous les résultats avec la pagination existante. En cas d’échec réseau, la portée
limitée des suggestions est annoncée et un bouton permet de réessayer.

La **minuterie** propose 15, 30, 60 ou 90 minutes. Elle ferme le lecteur à échéance,
y compris en mode réduit, et libère la vidéo. Changer de source ne réinitialise pas le
délai. Fermer le lecteur annule la minuterie. Elle reste propre à la session et ne se
réactive pas après rechargement. En cas de suspension du navigateur par le système,
le délai est revérifié au retour de l’onglet ; aucun navigateur ne garantit une
exécution JavaScript à la seconde près pendant la suspension du système.

## Architecture et possibilités d’évolution

- `features/journeys/domain` définit le contrat versionné du carnet et valide ses entrées.
- `features/journeys/application` gère la persistance locale et la synchronisation des vues.
- `features/journeys/presentation` expose les composants réutilisables de sauvegarde et de carnet.
- Les escales réutilisent `ExplorerFilters` et le catalogue existant : aucun flux signé,
  mot de passe ou média n’est stocké dans le carnet.
- Le carnet est limité à 12 entrées pour garder une interface maîtrisable. Cette limite
  est centralisée. L’évolution du schéma exige une migration explicite.
- La minuterie est un état de session distinct, avec un cycle de vie unique dans la coque
  de l’application et des contrôles dans le lecteur.
- Les styles du carnet sont isolés dans un module CSS ; les tokens Horizons restent partagés.

Extensions possibles, **non implémentées dans cette livraison** : collections de plusieurs
chaînes, export/import du carnet avec validation, synchronisation facultative entre appareils,
collections éditoriales issues d’un CMS, recherche approchante dans tout le catalogue et
guide TV enrichi par des fournisseurs autorisés. Chaque ajout peut s’appuyer sur les contrats
existants, avec ses tests, ses règles de disponibilité et ses propres migrations.

Un produit maintenable n’a pas une capacité littéralement infinie : les volumes, les licences,
les coûts et la qualité des sources restent des contraintes. MJTV référence des sources
externes ; une chaîne affichée au catalogue n’est pas une garantie de lecture partout.

## Vérification

- `npm run check` : lint, TypeScript et 322 tests unitaires réussis.
- Cas nouveaux : validation et déduplication du carnet, échec de stockage, données illisibles,
  saturation, renommage, suppression, minuterie en mode réduit, fermeture manuelle et retour
  d’un onglet suspendu.
- Lecture réelle locale RTS 1 : décodage 854 × 480, 46 images décodées, progression temporelle,
  préférence économie restaurée après rechargement, retour à Auto.
- Captures initiales : 1 440 px clair/sombre, 390 et 320 px ; image chargée et aucun débordement.
- Les tests de parcours utilisent des données déterministes ; la lecture réelle est vérifiée
  séparément. Safari/iOS sur appareil physique n’a pas été vérifié dans cette livraison.

La publication est préparée depuis une liste explicite de fichiers publics dans un répertoire
isolé. Les secrets, fichiers d’environnement, tests et scripts d’audit sont exclus du paquet.

Vérification finale locale :

- Build Next.js de production réussi.
- 65 parcours Chromium réussis (suite complète), plus 4 nouveaux parcours en émulation mobile Chromium.
- Revue React : hooks sans condition, nettoyage des événements et minuteries, annulation des recherches
  obsolètes, validation des données persistées, noms accessibles et contrôles au clavier.
- Paquet public de 154 fichiers (1 995 435 octets) : chemins et empreintes SHA-1 du `vercel --dry`
  comparés au manifeste SHA-256 de la préparation ; aucun fichier supplémentaire.
- Manifestes d’audit locaux : `/private/tmp/mjtv-personal-manifest.json` et
  `/private/tmp/mjtv-personal-dry.json`.
