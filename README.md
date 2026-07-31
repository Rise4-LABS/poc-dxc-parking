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
- `APP_URL` : URL publique de l'app, utilisée dans les liens d'activation des emails
- `MAIL_TENANT_ID` / `MAIL_CLIENT_ID` / `MAIL_CLIENT_SECRET` / `MAIL_SENDER` : credentials d'envoi de mail via `noreplyrise@rise.fo` (Microsoft Graph). Fournis par l'env group Render partagé `noreplyrise-mail` (jamais de valeur en clair dans le repo).

### Envoi de mails — écart avec la spec initiale (tranché par Claude)
- Le POC envoie des mails à deux moments : **activation de compte** (création / renvoi d'invitation par un admin) et **réservation** (confirmation / annulation).
- L'implémentation d'origine était un **mailer maison** (`nodemailer` + SMTP Office365) piloté par `MAIL_USER`/`MAIL_PASS`/`MAIL_HOST`/`MAIL_FROM`, avec un verrou `MAIL_ENABLED` qui, une fois faux, **loggait sans jamais envoyer** (mails perdus en silence). Le `.env.example` prévoyait de son côté **Postmark** (`POSTMARK_API_KEY`).
- Remplacée par la **seule voie autorisée dans l'écosystème Rise** : Microsoft Graph via la boîte partagée `noreplyrise@rise.fo` (`mail.js` + env group `noreplyrise-mail`). Envoi **réel par défaut, sans verrou** ; en cas d'échec, l'erreur est loggée. Les dépendances `nodemailer` et `postmark` du `package.json` sont désormais **inutilisées** (à retirer lors d'un nettoyage).

### ⚠️ Point de sécurité à traiter avant prod (lié au mail)
- Les routes `/api/admin/*` (dont la création d'utilisateur qui déclenche le mail d'activation) **ne vérifient pas l'authentification ni le rôle** dans `mock-server.js`. En l'état, un tiers pourrait déclencher l'envoi de mails d'activation vers des adresses arbitraires. Acceptable pour une démo interne fermée, **à sécuriser (auth + contrôle de rôle) avant toute ouverture** — sinon risque d'usage abusif de la boîte d'envoi et d'exposition de données personnelles (RGPD).
