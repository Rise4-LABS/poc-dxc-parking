# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development servers (without Docker)

The app runs via two independent processes — **no NX needed for day-to-day dev**:

```bash
# Terminal 1 — in-memory mock API on port 3000
node mock-server.js

# Terminal 2 — Vite dev server on port 5174
node node_modules/vite/bin/vite.js apps/web --port 5174 --host
```

Or double-click **`start-dev.bat`** (Windows) to open both in separate CMD windows.

Open **`http://localhost:5174`** in the browser (not 5175 — that's a static preview).

**Test accounts:**
| Identifiant | PIN  | Rôle  |
|-------------|------|-------|
| AVI         | 0000 | Admin |
| USR001      | 1234 | User  |
| USR002      | 5678 | User  |

**After any change to `mock-server.js`**, the server must be restarted (Ctrl+C + re-run). If port 3000 is stuck: `for /f "tokens=5" %a in ('netstat -aon ^| findstr :3000') do taskkill /PID %a /F`

If the browser shows stale UI after frontend changes: open DevTools → Application → Service Workers → Unregister, then hard-reload (Ctrl+Shift+R), or run in the console: `navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister())); location.reload();`

## NX monorepo commands (real backend / CI)

```bash
# Dev (real API + React)
npm run dev

# Build
npm run build

# Lint / typecheck
npm run lint
nx run-many --target=typecheck --all

# Tests
vitest run                  # unit tests
vitest run --coverage       # with coverage
playwright test             # E2E
```

## Architecture

```
driveXchange-parking/
├── mock-server.js          ← standalone in-memory API (Node http, no deps)
├── prisma/schema.prisma    ← source of truth for all data models
├── packages/
│   ├── domain/             ← @dxc/domain  — SpotStateMachine, RbacPolicy, DomainError
│   └── application/        ← @dxc/application — use cases (reserveSpot, cancelBooking…)
└── apps/
    ├── api/                ← Express + Prisma + Socket.io + BullMQ + Redis
    └── web/                ← React 18 + Vite + Zustand (no router — tab-based SPA)
```

### Layering

- `@dxc/domain` — stateless business rules only, no I/O
- `@dxc/application` — orchestrates use cases; imports Prisma client as a port
- `apps/api` — HTTP/WS adapter; imports application layer for all mutations
- `apps/web` — React SPA; calls `/api/*` via `src/services/api.ts`; state in Zustand stores

### Navigation (web)

There is **no router**. Navigation is a Zustand `activeTab` string rendered in `App.tsx`:
- USER tabs: `reservation` · `my-bookings` · `checkin`
- ADMIN extra tabs: `planning` · `users` · `logs`

`isAdmin = user.role !== 'USER'` gates admin pages.

### State management (web)

| Store | Persisted | Contents |
|-------|-----------|----------|
| `authStore` | ✅ localStorage | `accessToken`, `refreshToken`, `user` |
| `spotStore` | ❌ | `spots[]`, `myBookings[]`, `todayBooking` |
| `uiStore`   | ❌ | `activeTab`, `toasts[]` |

### Design system

Pure CSS variables — **no CSS framework**. All tokens in `apps/web/src/styles/tokens.css`, imported by `globals.css`. Components use inline styles referencing `var(--color-*)`.

Key tokens: `--color-primary` · `--color-surface` · `--color-surface-2` · `--color-border` · `--color-text` · `--color-text-muted` · `--radius-md` · `--shadow-sm/md` · `--color-free/reserved/occupied/blocked`

Dark mode via `@media (prefers-color-scheme: dark)` in `tokens.css`.

### Mock server conventions

- All state is in-memory arrays (`USERS`, `SPOTS`, `bookings`, `logs`); reset on restart
- Routes must be checked **in order** — specific paths before regex patterns (e.g. `/bookings/:id/cancel` before `/bookings/:id`)
- `readBody(cb)` is async (event-based); always `return readBody(...)` to exit the handler
- `pushLog(action, opts)` must be called on every mutation for the Logs tab

### Database (real backend)

PostgreSQL via Prisma. Key models: `User` · `Spot` · `Booking` · `RecurringBooking` · `WaitListEntry` · `AuditLog` · `SystemSetting`. `Spot.type` enum: `LOT1 | LOT2 | BOX`. `Booking.status` enum includes `BLOCKED` for indefinite admin reservations.

```bash
npx prisma migrate dev      # apply new migration
npx prisma studio           # GUI browser
npx prisma db seed          # seed initial data
```

## Key files to know

| File | Purpose |
|------|---------|
| `mock-server.js` | Complete in-memory API — edit this for new endpoints |
| `apps/web/src/services/api.ts` | All frontend API calls — single source of truth |
| `apps/web/src/types/api.types.ts` | Shared TypeScript interfaces |
| `apps/web/src/constants/timeslots.ts` | Booking time helpers (getTimesForDuration, durationFromTimes) |
| `apps/api/src/interfaces/http/routes/admin.routes.ts` | Real Express admin routes |
| `prisma/schema.prisma` | Database schema |
