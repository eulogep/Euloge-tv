# Confort du lecteur — 30 octobre 2026

- Sélecteur Auto / Économie de données / qualité manuelle sous la vidéo.
- Économie : meilleure définition disponible jusqu'à 480p, sinon la définition
  la plus basse. À définition identique, préférence au débit le plus faible.
- Le choix Auto ou Économie est mémorisé localement. Les qualités manuelles
  restent propres à la source. Un échec de stockage laisse le choix utilisable
  dans la session et affiche un message.
- Le réglage s'applique à HLS.js. Le lecteur natif continue de gérer sa qualité ;
  un message indique la limite lorsqu'un choix Économie existe déjà.
- Raccourcis lorsque le lecteur a le focus : Espace ou K pour lecture/pause,
  M pour le son, F pour le plein écran, flèches haut/bas pour le volume.
  Les champs, menus, boutons et autres zones conservent leurs touches normales.
- Les commandes restent visibles pendant la navigation au clavier. Le sélecteur
  est accessible sur mobile sans couvrir l'image. Le mini-lecteur conserve la
  même vidéo lors des transitions.

Validation locale : lint, TypeScript, compilation, 312 tests unitaires,
60 tests Chromium. Lecture réelle RTS 1 en 854×480 avec plus de 1,5 seconde
mesurée, choix conservé après rechargement, retour Auto fonctionnel.
Affichage contrôlé à 320 et 390 pixels sans débordement horizontal.
Safari/iOS et l'économie de données avec un lecteur natif ne sont pas validés.
La consommation réseau totale n'a pas été mesurée ; aucun pourcentage d'économie
n'est annoncé.

Validation Vercel à 2026-10-30T17:17:29.624Z : lecture réelle RTS 1 en 854×480,
46 images décodées, progression supérieure à 1,5 seconde ; préférence conservée
après rechargement, retour Auto et affichage mobile à 320/390 pixels confirmés.
Déploiement de production READY : dpl_sh5PAptm7RaC41bsSggjFZdr95ws.
Le premier contrôle a expiré pendant le chargement ; la relance et le diagnostic
ciblé ont réussi. Aucun enregistrement d'erreur serveur dans la fenêtre
17:05:53–17:15:53 UTC du contrôle ponctuel Vercel.
