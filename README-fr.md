# DriveXchange Parking Manager

Gestionnaire de places de parking pour flotte véhicules (~20–50 utilisateurs).
PWA mobile-first, architecture hexagonale, TypeScript strict.

## Démarrage rapide

### Prérequis
- Node.js ≥ 20, npm ≥ 10
- Docker + Docker Compose (pour PostgreSQL et Redis)

### Installation

```bash
# 1. Cloner et installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env
# Éditer .env : générer des secrets JWT, configurer VAPID, etc.

# 3. Démarrer PostgreSQL + Redis
docker-compose up -d postgres redis

# 4. Créer le schéma et peupler la base
npm run db:migrate:dev
npm run db:seed

# 5. Démarrer l'API et le frontend en parallèle
npm run dev
```

Frontend : http://localhost:5174  
API : http://localhost:3000  
Prisma Studio : `npm run db:studio`

### Comptes de test (après seed)

| Identifiant | PIN  | Rôle  | Nom            |
|-------------|------|-------|----------------|
| ADMIN1      | 1234 | ADMIN | Administrateur |
| MAR001      | 1234 | USER  | Marie Dupont   |
| THO002      | 1234 | USER  | Thomas Martin  |
| JUL003      | 1234 | USER  | Julie Bernard  |
| KAR004      | 1234 | USER  | Karim Smail    |

## Architecture

```
driveXchange-parking/
├── packages/
│   ├── domain/          # Entités, state machine, erreurs, politiques RBAC
│   └── application/     # Cas d'utilisation (aucune dépendance framework)
└── apps/
    ├── api/             # Express + Prisma + Socket.io
    └── web/             # React 18 + Vite PWA + Zustand
```

### Machine à états des places

```
FREE ──hold()──► HELD ──confirm()──► RESERVED ──checkIn()──► OCCUPIED
 ▲                │                      │                       │
 │    expireHold()│                      │                       │release()
 │                ▼                      ▼                       ▼
 └────────────── FREE ◄──────────── (annulé) ◄────────── RELEASED
 
 Tout état ──block()──► BLOCKED ──unblock()──► FREE  (admin uniquement)
```

### Types de places

| Code     | Description              |
|----------|--------------------------|
| DEMO     | Essai véhicule           |
| STANDARD | Place standard           |
| EV       | Borne de recharge        |
| VISITOR  | Visiteur externe         |

## Scripts disponibles

```bash
npm run dev            # API + Web en parallèle
npm run dev:api        # API seule
npm run dev:web        # Web seul (port 5174)
npm run build          # Build production
npm run test:unit      # Tests unitaires Vitest
npm run test:e2e       # Tests E2E Playwright
npm run test:coverage  # Couverture (seuil 60%)
npm run lint           # ESLint
npm run db:migrate:dev # Migration Prisma (dev)
npm run db:seed        # Peupler la base
npm run db:studio      # Interface Prisma Studio
```

## Fonctionnalités

- **Auth** : Identifiant 6 car. + PIN 4 chiffres, JWT (30 min) + refresh rotatif (30 j)
- **RBAC** : USER / ADMIN / SUPER_ADMIN
- **Réservations** : grille par type, créneau matin/après-midi/journée
- **Check-in** : retour haptique, WebAuthn optionnel
- **Libération anticipée** : place remise dans le pool immédiatement
- **Liste d'attente** : promotion FIFO automatique
- **Admin** : statistiques temps réel, blocage/déblocage de places
- **PWA** : Service Worker + offline-first, installable sur mobile
- **Socket.io** : mise à jour des statuts en temps réel
- **Notifications** : Web Push VAPID + email Postmark en fallback

## Déploiement

```bash
# Build des images Docker
docker-compose build

# Production complète
docker-compose up
```

L'image API inclut `prisma migrate deploy` dans son entrypoint.

## Tests

```bash
# Unitaires (domain + use-cases)
npm run test:unit

# E2E (nécessite l'API démarrée avec une base de test)
DATABASE_URL=postgresql://... npm run test:e2e
```

## Variables d'environnement clés

| Variable           | Description                          |
|--------------------|--------------------------------------|
| `DATABASE_URL`     | URL PostgreSQL                       |
| `REDIS_URL`        | URL Redis                            |
| `JWT_SECRET`       | Secret JWT utilisateurs              |
| `ADMIN_JWT_SECRET` | Secret JWT admins                    |
| `VAPID_PUBLIC_KEY` | Clé publique Web Push                |
| `VAPID_PRIVATE_KEY`| Clé privée Web Push                  |
| `POSTMARK_API_KEY` | Clé API Postmark (emails)            |
