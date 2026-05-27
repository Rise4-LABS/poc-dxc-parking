# DXC Parking

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Rise4-LABS/poc-dxc-parking)

## Pourquoi
Application de gestion des places de parking DriveXchange. Permet aux employés de réserver une place, faire leur check-in, et aux administrateurs de gérer le planning, les utilisateurs et consulter les logs.

## Comment ça marche
- **Utilisateur** : réservation de place, modification, annulation, check-in
- **Admin** : vue planning (5j / 7j / mois), gestion des utilisateurs, logs d'activité

## URL
- Repo : https://github.com/Rise4-LABS/poc-dxc-parking
- App : https://poc-dxc-parking.onrender.com

## Comptes de test
| Identifiant | Mot de passe | Rôle |
|-------------|--------------|------|
| AVI | 0000 | Admin |
| USR001 | 1234 | Utilisateur |
| USR002 | 5678 | Utilisateur |

## Comment l'éditer
Les modifications se font via Claude Code. Après chaque changement :
```
git add . && git commit -m "description" && git push
```
Render redéploie automatiquement en 2-3 minutes.

---

## ⚠️ Notes pour la review IT

> Section maintenue par Claude. À reviewer avant promotion en vraie app.

### Choix techniques tranchés par Claude (sans validation utilisateur)
- Serveur API entièrement in-memory (mock-server.js) — toutes les données sont perdues au redémarrage. Convient pour un POC de démonstration uniquement.
- Authentification par token JWT simulé (pas de vraie signature cryptographique) — à remplacer par un vrai système d'auth en production.
- Mots de passe stockés en clair dans le code — à remplacer par un hash bcrypt + base de données en production.

### Points non-scalables / "POC only"
- Données en mémoire uniquement — pas de persistance entre redémarrages
- Pas de vraie base de données (PostgreSQL prévu dans le schéma Prisma mais non connecté)
- Un seul processus Node — pas de load balancing
- Plan Render Free — l'app s'endort après 15 min d'inactivité (premier chargement ~30s)

### Dépendances externes
- React 18 (CDN via Vite build)
- Zustand 4.5 (state management)
- Vite 5.3 (bundler)
- vite-plugin-pwa 0.20 (PWA / installable sur mobile)

### Variables d'environnement utilisées
- `PORT` : port d'écoute du serveur (fourni automatiquement par Render)
- `NODE_ENV` : environnement (`production` sur Render)
