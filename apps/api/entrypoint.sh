#!/bin/sh
set -e
echo "[DXC] Exécution des migrations Prisma…"
npx prisma migrate deploy
echo "[DXC] Démarrage de l'API…"
exec node dist/server.js
