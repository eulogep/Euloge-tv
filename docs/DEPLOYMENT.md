# Déploiement — MJTV

## Prérequis

- Compte Vercel (ou tout hébergement Next.js compatible : Netlify, Render, conteneur Docker)
- Node.js 22 LTS
- Variables d'environnement configurées (voir `.env.example`)

## Variables d'environnement

```
NEXT_PUBLIC_APP_NAME=MJTV
NEXT_PUBLIC_DEFAULT_COUNTRY=FR
NEXT_PUBLIC_DEFAULT_LANGUAGE=fra
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_EPG=false
IPTV_DATA_REVALIDATE_SECONDS=21600
```

Aucun secret n'est requis.

## Build local

```bash
npm ci
npm run build
```

## Déploiement Vercel

1. Connecter le dépôt GitHub à Vercel
2. Framework preset : Next.js
3. Variables d'environnement : copier `.env.example`
4. Déployer

## Domaine personnalisé

Dans le dashboard Vercel : Settings → Domains → Add. Le certificat SSL est automatique.

## Vérification après déploiement

- [ ] `https://<domaine>/api/health` renvoie `{ status: "ok" }`
- [ ] L'accueil se charge et affiche des chaînes
- [ ] L'ouverture d'une chaîne affiche le lecteur
- [ ] L'installation PWA depuis Safari iOS fonctionne
- [ ] Aucune erreur CSP dans la console

## Rollback

Vercel : Settings → Deployments → ⋮ sur le déploiement précédent → Promote to Production.

## Limites de bande passante

Le serveur MJTV ne relayant aucune vidéo, la bande passante est limitée au catalogue (JSON paginé) et au shell statique. Le trafic vidéo passe directement du CDN IPTV vers le navigateur de l'utilisateur.

## Vérification sur iPhone

Voir `docs/IPHONE_TESTS.md`.
