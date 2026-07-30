# Domaine de développement et Cloudflare Tunnel — MJTV

Date de l'audit : 30 juillet 2026

Verdict actuel : `DOMAIN_PLAN_READY_FOR_MANUAL_REGISTRATION`

Ce document prépare l'architecture suivante sans créer de ressource :

```text
dev.<SELECTED_DOMAIN>
        |
        v
Cloudflare DNS
        |
        v
Cloudflare Tunnel nommé : mjtv-dev
        |
        v
http://127.0.0.1:3000
```

Aucune demande DigitalPlat, zone Cloudflare, modification DNS ou création de tunnel nommé n'a été
effectuée pendant cet audit.

## 1. État observé

### Poste local

| Élément                       | État vérifié                                                             |
| ----------------------------- | ------------------------------------------------------------------------ |
| `cloudflared`                 | installé, version `2026.7.3`                                             |
| MJTV sur `localhost:3000`     | indisponible pendant l'audit (`curl: (7)`)                               |
| Processus `cloudflared` actif | aucun au moment du dernier contrôle                                      |
| Quick Tunnel antérieur        | non actif ; il ne sera pas réutilisé comme configuration finale          |
| `%USERPROFILE%\.cloudflared`  | absent                                                                   |
| `cert.pem` Cloudflare         | absent                                                                   |
| Tunnel nommé visible          | non vérifiable : `cloudflared tunnel list` exige le certificat de compte |
| Tunnel `mjtv-dev`             | aucune preuve de création ; considéré comme non créé                     |
| Zone Cloudflare sélectionnée  | non créée ou, au minimum, non vérifiable sans connexion humaine          |
| Délégation DNS                | aucune                                                                   |

`cloudflared tunnel list` a échoué proprement avec « Cannot determine default origin certificate
path ». Cela indique que ce poste n'a pas encore exécuté `cloudflared tunnel login`; cela ne prouve
pas à lui seul qu'aucun tunnel n'existe dans un éventuel compte Cloudflare distant.

### Dépôt local

- Dépôt audité : `<REPO_PATH>`
- Branche présente pendant l'audit :
  `feat/source-health-catalog-curation...origin/feat/source-health-catalog-curation`
- Arbre de travail initial : propre.
- Aucun fichier Cloudflare sensible n'est suivi par Git.
- `.env.example` est suivi intentionnellement et ne contient que des valeurs d'exemple non secrètes.
- `.env`, `.env.local`, `.env.*`, `.next/`, `/audit-output/`, `*.pem` et `/.cloudflared/` sont
  ignorés.
- L'emplacement normal est `%USERPROFILE%\.cloudflared`, hors du dépôt. Ne jamais copier ce dossier,
  `cert.pem` ou un fichier `<TUNNEL_UUID>.json` dans le projet.
- La règle `/.cloudflared/` est seulement une défense en profondeur pour un dossier créé par erreur
  à la racine du dépôt. Elle ne remplace pas des ACL locales restrictives.
- Ne jamais afficher ni committer le contenu des certificats ou credentials JSON Cloudflare.

## 2. Domaine candidat

Le premier candidat de l'ordre de repli est recommandé, sous réserve de disponibilité réelle. Son
nom est court et cohérent avec le produit. Le préfixe `dev` sépare l'environnement temporaire d'un
futur domaine de production.

### Contrôles DNS du 30 juillet 2026

| Candidat              | Résultat DNS | Disponibilité DigitalPlat |
| --------------------- | ------------ | ------------------------- |
| `mjtv.dpdns.org`      | `NXDOMAIN`   | non confirmée             |
| `eulogetv.dpdns.org`  | `NXDOMAIN`   | non confirmée             |
| `mjtvapp.dpdns.org`   | `NXDOMAIN`   | non confirmée             |
| `watchmjtv.dpdns.org` | `NXDOMAIN`   | non confirmée             |

Un résultat `NXDOMAIN` signifie seulement qu'aucune délégation DNS publique ne répond actuellement.
Il ne prouve ni que le nom est réservable, ni qu'il n'est pas réservé, en attente, suspendu ou déjà
attribué dans le système DigitalPlat.

La source de vérité est le bouton **Check availability** du Dashboard DigitalPlat, après connexion.
Le Dashboard refuse l'accès automatisé observé (`403`), donc cette vérification reste
obligatoirement humaine.

Ordre de repli proposé :

1. `mjtv.dpdns.org`
2. `eulogetv.dpdns.org`
3. `mjtvapp.dpdns.org`
4. `watchmjtv.dpdns.org`

Ne soumettre aucun autre nom sans revenir vérifier les implications de marque, de lisibilité et de
documentation.

### Valeurs canoniques après validation

Après confirmation de disponibilité dans le Dashboard DigitalPlat, enregistrer exactement un domaine
dans les deux valeurs suivantes :

```text
<SELECTED_DOMAIN>
dev.<SELECTED_DOMAIN>
```

`<SELECTED_DOMAIN>` représente le domaine racine confirmé, et `dev.<SELECTED_DOMAIN>` le seul
hostname de développement dérivé. Ne remplacer ces placeholders qu'après confirmation humaine dans
le Dashboard DigitalPlat. Toutes les étapes suivantes sont des modèles inopérants tant que ce
remplacement n'a pas été effectué.

Contrôle préalable obligatoire avant toute commande Cloudflare :

```powershell
$placeholder = "<SELECTED" + "_DOMAIN>"
if (Select-String -Path "docs/DOMAIN_AND_TUNNEL_SETUP.md" -SimpleMatch $placeholder -Quiet) {
  throw "Remplacer toutes les occurrences de $placeholder par le domaine confirmé avant de continuer."
}
```

Ce contrôle doit ne retourner aucune occurrence avant une création de zone, une commande
`cloudflared`, une configuration Access ou un test public.

## 3. Audit officiel DigitalPlat FreeDomain

### Faits confirmés

Les faits ci-dessous proviennent de la documentation officielle consultée le 30 juillet 2026 :

- Extensions annoncées : `.dpdns.org`, `.us.kg`, `.qzz.io`, `.xx.kg` et `.qd.je`.
- Le parcours actuel passe par le
  [Dashboard DigitalPlat](https://dash.domain.digitalplat.org/), pas par une Pull Request GitHub.
- L'utilisateur crée un compte avec des coordonnées exactes, consulte les avis et politiques, ouvre
  **Register**, choisit le label et le suffixe, exécute **Check availability**, vérifie le quota ou
  coût affiché, fournit les nameservers externes et soumet une seule fois.
- La limite par défaut documentée est d'un domaine gratuit par compte.
- Des capacités supplémentaires peuvent exister selon les programmes ou options affichés, mais ne
  doivent pas être supposées gratuites.
- DigitalPlat délègue le domaine à des nameservers autoritatifs externes. Les enregistrements
  ordinaires `A`, `AAAA`, `CNAME`, `MX` et `TXT` sont ensuite gérés chez le fournisseur DNS.
- Un fournisseur donnant des nameservers autoritatifs peut être utilisé. La documentation cite
  Cloudflare comme exemple d'interface, sans le garantir ni l'endosser.
- Après délégation, des sous-domaines comme `dev.example.dpdns.org` peuvent être créés librement
  dans la zone DNS externe. Ils ne consomment pas un nouveau domaine DigitalPlat.
- Les règles conseillent des noms courts, descriptifs et en minuscules, sans secret, donnée client
  ou nom interne sensible.
- Les noms trompeurs, usurpant une organisation, violant des droits ou créant un risque peuvent être
  refusés, suspendus ou réservés.
- Le service est fourni au mieux, sans SLA, garantie d'approbation, de disponibilité, de
  propagation, de renouvellement ou de conservation permanente d'un namespace.
- La disponibilité des suffixes, quotas, prix, fenêtres de renouvellement et politiques peut changer.
  Le Dashboard et ses avis courants priment sur les captures ou anciens tutoriels.

Sources officielles :

- [README et extensions disponibles](https://github.com/DigitalPlatDev/FreeDomain/blob/main/README.md)
- [Enregistrer un nom](https://github.com/DigitalPlatDev/FreeDomain/blob/main/documents/tutorial/platform/1.2-domain-registration.md)
- [Connecter des nameservers externes](https://github.com/DigitalPlatDev/FreeDomain/blob/main/documents/tutorial/platform/1.3-connect-nameservers.md)
- [FAQ : limite et sous-domaines](https://github.com/DigitalPlatDev/FreeDomain/blob/main/documents/domains/faq.md)
- [Gestion des sous-domaines](https://github.com/DigitalPlatDev/FreeDomain/blob/main/documents/tutorial/dns/2.2-subdomains.md)
- [Conditions de service](https://domain.digitalplat.org/terms-of-service/)
- [Politique d'usage acceptable](https://domain.digitalplat.org/acceptable-use-policy/)
- [Politique de confidentialité](https://domain.digitalplat.org/privacy-policy/)

### Restrictions pertinentes pour MJTV

La politique ne contient pas d'interdiction générale documentée des Cloudflare Tunnels ou d'un
catalogue vidéo légitime. Elle interdit notamment :

- phishing, vol d'identifiants, malware, botnets, spam et fraude ;
- proxy malveillant, redirection ouverte abusive, contournement de contrôles et trafic dissimulé ;
- usurpation, activités illégales et atteintes aux droits de propriété intellectuelle ;
- piratage, distribution non autorisée et abus de copyright ou de marque ;
- comptes multiples destinés à contourner la limite gratuite et enregistrements automatisés abusifs.

MJTV ne relaie pas les flux vidéo côté serveur : le navigateur contacte les sources externes. Ce
choix réduit le risque de proxy et la bande passante du tunnel, mais ne supprime pas les risques de
copyright, de marque, de disponibilité ou de territorialité des flux. Le propriétaire doit
maintenir les sources, mentions légales, retraits et signalements.

### Éléments non confirmés

La documentation publique ne fixe pas :

- un délai moyen ou garanti d'approbation d'une demande ;
- un délai garanti de propagation ;
- la disponibilité de l'un des quatre noms candidats ;
- le nombre de slots réellement disponible sur le compte concerné ;
- le prix ou la gratuité affiché pour cette demande précise ;
- une syntaxe exhaustive de label indépendante de la validation du Dashboard ;
- une garantie particulière pour un service IPTV ou une bêta vidéo.

Une discussion communautaire évoque une propagation des nameservers pouvant prendre jusqu'à
24 heures, mais ce n'est ni un SLA ni un délai d'approbation officiel. Le rapport retiendra donc
« délai non annoncé » jusqu'à observation du Dashboard.

### Risques propres à un domaine communautaire gratuit

- Suspension, retrait ou modification du namespace sans garantie de continuité.
- Dépendance simultanée à DigitalPlat, Cloudflare, au PC local et au fournisseur d'accès.
- Risque de réputation du suffixe partagé si d'autres utilisateurs en abusent.
- Renouvellement, quota ou conditions pouvant changer.
- Aucun engagement d'uptime ou de support.
- Impossibilité de considérer ce domaine comme actif durable ou adapté à une production critique.
- Perte du domaine pouvant casser liens, PWA installées, cookies, favoris et documentation.

Pour une publication durable, prévoir ultérieurement un domaine payant sous contrôle direct et une
procédure de migration.

## 4. Plan DNS Cloudflare — non appliqué

### Point de validation A : domaine et compte

Action humaine :

1. Ouvrir le Dashboard DigitalPlat officiel.
2. Lire les avis du jour, les Terms, l'AUP, la Privacy Policy et les règles `.dpdns.org`.
3. Vérifier le quota, le coût éventuel et les informations de renouvellement.
4. Tester les quatre candidats avec **Check availability**.
5. Arrêter la procédure et communiquer le nom réellement disponible avant toute soumission.

### Point de validation B : zone Cloudflare

Après confirmation du nom, mais avant soumission DigitalPlat :

1. Se connecter au bon compte Cloudflare.
2. Vérifier qu'aucune zone du même nom n'existe déjà.
3. Ajouter uniquement la zone complète `<SELECTED_DOMAIN>` sur le plan gratuit.
4. Ne modifier aucune autre zone Cloudflare existante.
5. Copier exactement les deux nameservers attribués par Cloudflare.
6. Conserver une capture expurgée ou une note privée des valeurs.

L'ajout de la zone ne doit pas importer ou remplacer une autre zone. Aucun enregistrement `A` ou
`AAAA` ne doit viser l'adresse IP personnelle.

### Point de validation C : inscription et délégation

1. Revenir dans DigitalPlat.
2. Sélectionner le nom confirmé.
3. Fournir tous les nameservers Cloudflare, comme hostnames, jamais comme adresses IP.
4. Vérifier orthographe, suffixe, coût/quota, coordonnées et policies.
5. Soumettre une seule fois.
6. Relever en privé le statut et l'expiration.
7. Attendre l'activation et la propagation sans multiplier les demandes.

Vérifications PowerShell :

```powershell
nslookup -type=NS <SELECTED_DOMAIN>
Resolve-DnsName -Name <SELECTED_DOMAIN> -Type NS
Resolve-DnsName -Name <SELECTED_DOMAIN> -Type SOA
```

Le résultat attendu doit contenir exactement les deux nameservers fournis par Cloudflare. Tant que
ce n'est pas le cas, ne pas créer la route finale du tunnel.

### Enregistrement de tunnel prévu

La commande suivante créera, après validation, un `CNAME` vers
`<TUNNEL_UUID>.cfargotunnel.com` :

```powershell
cloudflared tunnel route dns mjtv-dev dev.<SELECTED_DOMAIN>
```

Le DNS et le tunnel sont indépendants. Si le tunnel ou le PC est arrêté, l'enregistrement reste en
place et Cloudflare peut retourner une erreur `1016`. Aucun `A` vers l'IP publique du domicile n'est
nécessaire.

Source :
[DNS records for Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/).

## 5. Plan du tunnel nommé — non appliqué

Nom réservé au plan :

```text
mjtv-dev
```

Après validation humaine explicite et délégation DNS fonctionnelle :

```powershell
cloudflared tunnel login
cloudflared tunnel create mjtv-dev
cloudflared tunnel list
```

`tunnel login` ouvre une connexion interactive et crée
`%USERPROFILE%\.cloudflared\cert.pem`. Ce certificat peut gérer les tunnels du compte et doit être
traité comme un secret de portée large.

`tunnel create` crée une relation persistante entre le nom et un UUID, puis génère un fichier
`<TUNNEL_UUID>.json`. Ce fichier ne peut que lancer ce tunnel, mais il n'expire pas et reste un
secret.

Ne jamais afficher, copier dans un ticket, envoyer dans une conversation ou committer le contenu de
ces fichiers.

### Configuration de principe

Fichier local futur :

```text
C:\Users\<USER>\.cloudflared\config.yml
```

Contenu prévu :

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL_UUID>.json

ingress:
  - hostname: dev.<SELECTED_DOMAIN>
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Contraintes respectées :

- un seul hostname explicite ;
- aucun wildcard ;
- un seul service local ;
- aucun autre port ;
- fallback final `http_status:404` ;
- TLS reste actif entre le visiteur et Cloudflare ;
- le port 3000 n'est pas ouvert sur la box.

Valider avant exécution :

```powershell
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" ingress validate
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" ingress rule https://dev.<SELECTED_DOMAIN>/
```

Créer ensuite la route, puis démarrer :

```powershell
cloudflared tunnel route dns mjtv-dev dev.<SELECTED_DOMAIN>
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" run mjtv-dev
```

Sources :

- [Création d'un tunnel géré localement](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)
- [Structure du fichier de configuration](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Permissions des certificats et credentials](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/tunnel-permissions/)

### Permissions locales à vérifier

Après création, sans lire le contenu :

```powershell
Get-Acl "$env:USERPROFILE\.cloudflared" | Format-List
Get-ChildItem "$env:USERPROFILE\.cloudflared" -Force |
  Select-Object Name, Length, LastWriteTime
```

Le dossier et les fichiers doivent être accessibles uniquement au compte Windows responsable,
`SYSTEM` et, si nécessaire, aux administrateurs locaux. Toute commande `icacls` retirant
l'héritage doit être préparée avec le nom exact du compte et testée avant application pour éviter
de bloquer `cloudflared`.

## 6. Audit de la surface publique MJTV

### Routes publiques identifiées

| Méthode et route               | Fonction                   | Observation                         |
| ------------------------------ | -------------------------- | ----------------------------------- |
| `GET /`                        | application React/PWA      | publique                            |
| `GET /api/catalog`             | catalogue filtré et paginé | validation Zod, limite maximale 100 |
| `GET /api/channels/:id`        | détail public d'une chaîne | lecture seule                       |
| `GET /api/channels/:id/health` | état de santé agrégé       | lecture seule                       |
| `GET /api/health`              | santé, date, version       | ne renvoie pas l'environnement      |

Aucune route `POST`, `PUT`, `PATCH` ou `DELETE` n'a été trouvée dans l'App Router.

### Éléments non exposés par une route serveur

- Le script `scripts/audit-channel-sources.ts` est une commande CLI seulement.
- `audit-output/` est ignoré par Git et n'est pas sous `public/`.
- Aucun endpoint `fetch?url=...`, proxy vidéo ou exécution de commande n'existe.
- `.git`, `.env`, `.next` et `%USERPROFILE%\.cloudflared` ne sont pas dans `public/`.
- Les playlists et sous-titres personnels sont conservés dans le navigateur.
- Les flux vidéo sont contactés directement par le navigateur, pas retransmis par MJTV.

Fichiers servis statiquement identifiés :

- logos et icônes PWA ;
- `offline.html` ;
- `robots.txt` ;
- `sw.js`.

### Headers présents

La configuration Next.js définit déjà :

- `Content-Security-Policy` ;
- `X-Content-Type-Options: nosniff` ;
- `Referrer-Policy: strict-origin-when-cross-origin` ;
- `Permissions-Policy` restrictive ;
- `X-Frame-Options: DENY` ;
- un cache désactivé pour `sw.js`.

Le mode production n'ajoute pas `unsafe-eval`. `unsafe-inline` reste autorisé pour les scripts et
styles, ce qui constitue un risque résiduel connu.

### Points à traiter avant exposition publique

1. Forcer `NEXT_PUBLIC_ENABLE_DEBUG=false` en production. Le panneau diagnostic est une fonction
   client et ne doit pas afficher plus d'informations que nécessaire.
2. Exécuter les tests de chemins interdits une fois le serveur démarré :

   ```powershell
   $paths = @(
     "/.git/config",
     "/.env",
     "/.env.local",
     "/.next/",
     "/audit-output/",
     "/.cloudflared/",
     "/api/admin",
     "/api/audit"
   )
   foreach ($path in $paths) {
     curl.exe -sS -o NUL -w "$path %{http_code}`n" "http://127.0.0.1:3000$path"
   }
   ```

   Tous doivent retourner `404` ou une réponse explicitement non sensible.

3. Vérifier que le détail public d'une chaîne ne révèle aucun champ interne de curation ou d'audit.
4. Conserver l'outil SSRF d'audit sans route HTTP. Ne jamais l'importer depuis un handler public.
5. Ajouter un rate limiting léger côté Cloudflare sur `/api/catalog` et les routes de détail, avec
   seuils mesurés afin de ne pas casser l'application.
6. Limiter les logs à la méthode, route, statut, durée et identifiant de requête. Ne pas journaliser
   les URLs de flux complètes, playlists, cookies, tokens ou paramètres personnels.
7. Envisager `Strict-Transport-Security` seulement après validation complète du domaine HTTPS. Ne pas
   l'activer prématurément sur un hostname instable.
8. Surveiller les dépendances et corriger les findings de sécurité de la PR #4 avant d'envisager un
   usage public durable. Cet audit n'a ni modifié ni fusionné cette PR.

## 7. Démarrage local prévu

### Terminal 1 — MJTV

À exécuter seulement avec un arbre Git propre et après validation du passage sur `main` :

```powershell
Set-Location "<REPO_PATH>"
git switch main
git pull --ff-only
npm.cmd run build

$env:HOSTNAME = "127.0.0.1"
$env:PORT = "3000"
$env:NODE_ENV = "production"

node ".next\standalone\server.js"
```

Vérifier :

```powershell
curl.exe -I http://127.0.0.1:3000
curl.exe -sS http://127.0.0.1:3000/api/health
```

### Terminal 2 — tunnel

```powershell
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\config.yml" run mjtv-dev
```

Le serveur écoute uniquement sur `127.0.0.1`. Aucune règle NAT, redirection de port ou écoute
`0.0.0.0` n'est prévue.

### Arrêt

Arrêt normal :

1. `Ctrl+C` dans le terminal `cloudflared`.
2. `Ctrl+C` dans le terminal Node.
3. Vérifier qu'aucun processus ne subsiste :

   ```powershell
   Get-Process cloudflared,node -ErrorAction SilentlyContinue
   ```

Si un connecteur obsolète subsiste après un arrêt non propre :

```powershell
cloudflared tunnel cleanup mjtv-dev
```

`cleanup` supprime des connexions résiduelles ; ce n'est pas une suppression du tunnel.

Suppression future, uniquement après validation humaine :

1. Dans la zone `<SELECTED_DOMAIN>` du Dashboard Cloudflare, supprimer uniquement le CNAME
   `dev.<SELECTED_DOMAIN>`.
2. Vérifier que ce hostname ne résout plus :

   ```powershell
   Resolve-DnsName -Name dev.<SELECTED_DOMAIN> -Type CNAME
   ```

3. Supprimer ensuite le tunnel :

```powershell
cloudflared tunnel delete mjtv-dev
```

Ne pas utiliser `--force`.

## 8. Rotation et réponse à une fuite

### Fuite de `cert.pem`

1. Arrêter les opérations de gestion.
2. Dans Cloudflare, ouvrir **My Profile > API Tokens**.
3. Révoquer le token Cloudflare Tunnel/Argo Tunnel associé.
4. Relancer `cloudflared tunnel login` sur un poste sain pour générer un nouveau certificat.
5. Vérifier l'inventaire des tunnels et DNS avant toute autre action.

### Fuite de `<TUNNEL_UUID>.json`

Le credential d'un tunnel géré localement n'expire pas. La documentation ne décrit pas une rotation
locale en place équivalente au bouton de rotation des tunnels gérés à distance.

Procédure conservatrice :

1. arrêter le connecteur et contenir la fuite ;
2. examiner les connexions du tunnel ;
3. obtenir une validation humaine pour supprimer le tunnel compromis ;
4. créer un tunnel de remplacement, générant un nouvel UUID et un nouveau credential ;
5. mettre à jour le CNAME et vérifier le nouveau tunnel ;
6. supprimer les copies locales compromises ;
7. documenter l'incident sans publier les secrets.

Ne pas présenter une simple copie ou suppression du JSON local comme une rotation.

## 9. Tests après application manuelle

Ces tests n'ont pas été exécutés : aucun domaine n'est délégué, aucun tunnel nommé n'est créé et le
serveur local était arrêté pendant l'audit.

### DNS et HTTPS

```powershell
Resolve-DnsName -Name <SELECTED_DOMAIN> -Type NS
Resolve-DnsName -Name dev.<SELECTED_DOMAIN> -Type CNAME
curl.exe -I https://dev.<SELECTED_DOMAIN>
cloudflared tunnel info mjtv-dev
```

Vérifier :

- certificat valide et chaîne HTTPS complète ;
- absence de redirection infinie ;
- absence de mixed content dans la console ;
- réponse `404` aux chemins sensibles ;
- indisponibilité normale quand le PC ou le tunnel est arrêté ;
- retour à la normale après redémarrage.

### Matrice fonctionnelle

| Environnement      | Tests                                                             |
| ------------------ | ----------------------------------------------------------------- |
| PC local           | accueil, catalogue, navigation, plusieurs chaînes, états d'erreur |
| Domaine public     | mêmes tests via HTTPS                                             |
| iPhone Safari      | `https://dev.<SELECTED_DOMAIN>`, 4G/5G, PWA, overflow, HLS natif  |
| Android Chrome     | `https://dev.<SELECTED_DOMAIN>`, navigation, hls.js, responsive   |
| Chromium desktop   | smoke Playwright complet                                          |
| WebKit             | smoke Playwright complet                                          |
| Testeur au Vietnam | DNS, TLS, chargement, latence, restrictions propres aux sources   |

Le test distant doit respecter les droits des flux. MJTV ne doit jamais contourner un géoblocage,
un DRM, une restriction d'origine ou un refus d'accès.

## 10. Modes d'accès

### Mode public temporaire

- Toute personne connaissant l'URL peut accéder à MJTV.
- Adapté uniquement à un test limité dans le temps.
- Exige rate limiting, surveillance minimale et arrêt rapide disponible.
- Ne pas partager largement l'URL tant que les tests de surface sensible ne sont pas terminés.

### Mode bêta privée

Configurer une application **Self-hosted** Cloudflare Access pour
`dev.<SELECTED_DOMAIN>`, puis une politique `Allow` limitée à des adresses e-mail précises. Access
refuse par défaut les utilisateurs qui ne correspondent pas à une règle d'autorisation.

Ne pas utiliser `Include Everyone`, ne pas créer d'authentification MJTV spécifique uniquement pour
ce test et ne pas activer Access sans validation humaine. Tester Safari iPhone, les cookies Access,
le service worker et les requêtes API après activation.

Sources :

- [Applications web Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/)
- [Politiques Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)

## 11. Actions manuelles nécessaires

Dans l'ordre :

1. Valider le compte DigitalPlat responsable et ses coordonnées.
2. Lire les avis, quotas, coûts et politiques actuellement affichés.
3. Confirmer réellement la disponibilité d'un candidat et l'enregistrer comme `<SELECTED_DOMAIN>`.
4. Confirmer le compte Cloudflare à utiliser.
5. Ajouter uniquement la zone du domaine retenu sur le plan gratuit.
6. Communiquer les deux nameservers Cloudflare avant de les transmettre.
7. Valider la soumission DigitalPlat.
8. Attendre et vérifier la délégation.
9. Valider la connexion interactive `cloudflared tunnel login`.
10. Valider la création unique de `mjtv-dev`.
11. Vérifier UUID masqué, chemins et ACL sans lire les secrets.
12. Valider la création du CNAME vers le tunnel.
13. Démarrer MJTV et le tunnel.
14. Exécuter les tests de sécurité et la matrice distante.
15. Décider entre mode public temporaire et Cloudflare Access.

## 12. Liste exacte des changements prévus

Aucun de ces changements n'est encore appliqué :

1. Création du compte ou utilisation du compte DigitalPlat humainement validé.
2. Enregistrement d'un seul domaine candidat.
3. Ajout d'une seule zone Cloudflare, sans toucher aux zones existantes.
4. Modification des nameservers du seul domaine DigitalPlat retenu.
5. Création d'un tunnel nommé `mjtv-dev`.
6. Création locale de :
   - `%USERPROFILE%\.cloudflared\cert.pem`
   - `%USERPROFILE%\.cloudflared\<TUNNEL_UUID>.json`
   - `%USERPROFILE%\.cloudflared\config.yml`
7. Création d'un seul CNAME : `dev.<SELECTED_DOMAIN>` vers
   `<TUNNEL_UUID>.cfargotunnel.com`.
8. Protection de défense en profondeur `/.cloudflared/` dans `.gitignore`, sans remplacer les ACL.
9. Optionnel : création d'une application Cloudflare Access et d'une allowlist d'e-mails.

Ne sont pas prévus :

- enregistrement `A` ou `AAAA` vers l'IP personnelle ;
- ouverture du port 3000 sur Internet ;
- redirection de port sur la box ;
- wildcard DNS ou wildcard d'ingress ;
- désactivation TLS ;
- proxy vidéo ;
- exposition d'un outil d'audit ;
- modification d'une autre zone DNS existante dans le compte Cloudflare ;
- fusion ou modification de la PR #4.

## 13. État du livrable

| Livrable                     | État                                         |
| ---------------------------- | -------------------------------------------- |
| Domaine candidat             | premier candidat disponible de l'ordre prévu |
| Disponibilité                | non confirmée ; Dashboard humain requis      |
| Procédure DigitalPlat        | documentée                                   |
| Délégation Cloudflare        | non commencée                                |
| Tunnel                       | `mjtv-dev` planifié, non créé                |
| UUID                         | inexistant ; affichage futur toujours masqué |
| Fichiers sensibles           | absents, hors Git par conception             |
| Configuration ingress        | préparée avec fallback `404`                 |
| Commandes de démarrage/arrêt | documentées                                  |
| Suppression et rotation      | documentées, soumises à validation           |
| Tests distants               | en attente                                   |
| Risques restants             | documentés                                   |

Prochaine décision humaine : confirmer le compte DigitalPlat, contrôler les quatre disponibilités
dans le Dashboard et communiquer le résultat sans soumettre la demande.
