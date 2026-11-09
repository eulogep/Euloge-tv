# MJTV — Méridien

> **Il est toujours 20 h quelque part.**

Ce document décrit l'identité de MJTV et les fonctions qu'elle a fait naître. Il s'adresse à toute
personne qui modifie l'interface. Il ne prétend pas démontrer une unicité mondiale : il explique une
idée et les règles qui la gardent cohérente.

## L'idée

MJTV donne accès aux télévisions de 231 pays. Une interface de streaming classe ce genre de catalogue
par genre, derrière un carrousel. Méridien part de ce qu'aucune plateforme fermée ne peut raconter : à
cet instant, quelque part, on se lève, et ailleurs on s'installe pour le journal du soir.

La seule décoration de l'interface est donc **la vraie position du soleil**, calculée en direct.

## Le langage

| Élément | Règle                                                                                         |
| ------- | --------------------------------------------------------------------------------------------- |
| Cadran  | La carte jour/nuit réelle de la Terre, graduée comme un poste à ondes courtes. Aiguille fixe. |
| Ciel    | Le haut de l'accueil prend la couleur du ciel de la ville accordée, quel que soit le thème.   |
| Horloge | L'heure locale est le titre. Le chiffre s'élargit avec la vitesse de l'aiguille.              |
| Mires   | Chaque chaîne a sa mire : le motif vient de son identifiant, la couleur de sa catégorie.      |
| Bande   | Un filet de la lumière du monde court sous la barre du haut et au-dessus de la navigation.    |
| Règle   | Une graduation ouvre chaque section, comme une échelle d'instrument.                          |
| Rond    | Réservé au soleil. Le reste a des angles vifs (2 à 6 px).                                     |
| Logo    | Un M à deux sommets ; le soleil monte entre eux le jour et passe derrière la nuit.            |

**Typographie** (servie localement) : Anybody pour l'affichage, dont l'axe de largeur porte toute la
personnalité (58 % pour les chiffres, 130 % pour les villes) ; Instrument Sans pour le texte ; Martian
Mono pour les données.

**Couleurs fixes** : encre `#090b14`, papier `#f4f1e8`, soleil `#ffc53d`, aiguille `#ff4b2b`. Toutes les
autres couleurs vivantes viennent de `skyRgb()` ou des catégories de `mire.ts`.

## Ce qui est honnête, et comment

- **Heures** : fuseau IANA de la ville affichée. Les pays à plusieurs fuseaux ont plusieurs arrêts
  nommés (Los Angeles, Lubumbashi…) ; aucune heure n'est présentée comme valable pour tout un pays.
- **Ciel et lumières** : calculés (formules NOAA), jamais filmés ni décoratifs.
- **Moments du jour** : ils disent l'heure qu'il est là-bas, pas ce qui y est diffusé. Un moment reste
  vide plutôt que d'afficher une ville à la mauvaise heure.
- **« Direct »** : réservé à une source confirmée. La catégorie technique `live` s'affiche « Généraliste ».
- **Pas de géolocalisation** : la longitude du visiteur est estimée depuis son fuseau.

## Fonctions

- **Cadran** (`features/meridian/presentation/Cadran.tsx`) : glisser avec inertie, toucher une ville,
  flèches gauche/droite pour le pays, haut/bas pour la chaîne, Entrée pour regarder. À l'ouverture,
  l'aiguille glisse depuis le méridien du visiteur jusqu'à l'endroit où il est 20 h.
- **Écran** : aperçu vidéo muet en basse qualité, à l'arrêt sur une chaîne. Désactivé par défaut car il
  consomme des données. Aucune balise vidéo n'existe tant qu'il est éteint, et il s'efface devant le
  lecteur principal.
- **Atlas** (`GET /api/atlas`) : les meilleures chaînes de chaque pays, sans aucune URL de flux. S'il
  échoue, le cadran s'accorde sur les chaînes déjà chargées.
- **Où en est le monde** : réveil, midi, 20 h, tard le soir, avec les villes concernées à cette minute.
- **Constellation** (Explorer) : chaque pays à sa place, dans la lumière de cette minute. Le carnet
  d'escales s'y allume. La liste de destinations donne les mêmes choix au clavier et aux lecteurs d'écran.
- **Préréglages** : Ma liste répond aux touches 1 à 9, partout dans l'application.
- **Télécommande** (page de lecture) : P+ et P− parcourent les chaînes du pays, y compris avec Page
  précédente / Page suivante ; bouton de partage ; heure et ciel du lieu de diffusion.
- **Thème « Selon le soleil »** : clair le jour, sombre la nuit, réglage par défaut des nouveaux visiteurs.

- **Lieux de diffusion réels** : chaque chaîne porte le fuseau publié par son flux principal (iptv-org
  `feeds`), et sa ville quand la source la donne. Une chaîne de Los Angeles se trouve à Los Angeles sur
  le cadran, et un arrêt n'existe que s'il a des chaînes. Un fuseau sans arrêt garde sa propre heure et
  son propre nom : son horloge n'est jamais attribuée à l'arrêt le plus proche.
- **Mode Voyage** : un tour du monde automatique, là où il est 20 h, avec des escales de 3, 5 ou
  10 minutes. Une chaîne sans image après 30 secondes est sautée ; le voyage s'arrête après huit chaînes
  muettes de suite, et avec le lecteur. Rien n'est enregistré.
- **Son du cadran** : un souffle radio généré sur place, sans fichier audio. Désactivé par défaut.
- **Rendez-vous** : un lien qui porte un instant, lu par chacun dans son fuseau, avec export agenda.
  Il n'y a ni serveur ni salon : chacun regarde le direct de son côté, à quelques secondes d'écart.
- **Transfert** : un lien copie favoris, préférences et escales vers un autre appareil. Les données
  voyagent dans le fragment de l'URL, que les navigateurs n'envoient jamais au réseau. C'est une copie
  ponctuelle, pas une synchronisation. Rien n'est importé sans accord, et l'import ne fait qu'ajouter.
- **Diffusion** : AirPlay sur Safari, Chromecast sur Chromium. Le SDK Google n'est demandé qu'au clic.
  Une source peut être refusée par l'écran si elle n'autorise pas ses requêtes : MJTV ne le contrôle pas.

## Accessibilité et sobriété

- La couleur du texte sur le ciel est choisie par `inkForSky()` ; un test vérifie le contraste AA pour
  toutes les hauteurs du soleil, de -90° à +90°.
- Le cadran est un `slider` ARIA avec une valeur textuelle (ville, heure, chaîne) et une annonce polie.
- `prefers-reduced-motion` et le réglage MJTV suppriment glissade, inertie, neige animée et chiffres
  élastiques.
- Le canvas ne dessine que lorsque l'aiguille bouge, plus une fois par minute pour la lumière.

## Où modifier quoi

| Sujet                           | Fichier                                               |
| ------------------------------- | ----------------------------------------------------- |
| Tokens et thèmes                | `src/app/globals.css`                                 |
| Tout le langage visuel          | `src/app/meridien.css`                                |
| Soleil, ciel, phases, encres    | `src/features/meridian/domain/solar.ts`               |
| Villes et fuseaux               | `src/features/meridian/domain/places.ts`              |
| Regroupement par heure          | `src/features/meridian/domain/atlas.ts`               |
| Motifs de mires                 | `src/features/meridian/domain/mire.ts`                |
| Dessin du cadran et de la carte | `src/features/meridian/presentation/world-painter.ts` |

Le logo précédent reste disponible dans `public/branding/` et l'illustration Horizons dans
`public/artwork/` ; ni l'un ni l'autre n'est plus affiché.
