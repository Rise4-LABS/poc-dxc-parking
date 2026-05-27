// ─── DriveXchange Parking — Mock API Server ───────────────────────────────
// Fully in-memory, no DB required. Runs on port 3000.
// Comptes de test:
//   AVI    / 0000  →  Admin (4 onglets)
//   USR001 / 1234  →  Utilisateur standard
//   USR002 / 5678  →  Utilisateur standard (Marie Martin)

const http     = require('http');
const fs       = require('fs');
const nodePath = require('path');

const PORT    = process.env.PORT || 3000;
const DIST    = nodePath.join(__dirname, 'apps', 'web', 'dist');
const MIME    = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.webp':  'image/webp',
  '.txt':   'text/plain',
};

// ─── Données initiales ────────────────────────────────────────────────────────
let USERS = [
  { id: 'u1', name: 'AVI',           accessId: 'AVI',    pin: '0000', role: 'ADMIN', locale: 'fr', active: true },
  { id: 'u2', name: 'Jean Dupont',   accessId: 'USR001', pin: '1234', role: 'USER',  locale: 'fr', active: true },
  { id: 'u3', name: 'Marie Martin',  accessId: 'USR002', pin: '5678', role: 'USER',  locale: 'fr', active: true },
];
let userCounter = 4;

const SPOTS = [
  // Chêne-Bourg Lot 1
  { id: 's1',  number: '27', type: 'LOT1', status: 'FREE', blockReason: null },
  { id: 's2',  number: '28', type: 'LOT1', status: 'FREE', blockReason: null },
  { id: 's3',  number: '29', type: 'LOT1', status: 'FREE', blockReason: null },
  { id: 's4',  number: '30', type: 'LOT1', status: 'FREE', blockReason: null },
  { id: 's5',  number: '31', type: 'LOT1', status: 'FREE', blockReason: null },
  // Chêne-Bourg Lot 2
  { id: 's6',  number: '69', type: 'LOT2', status: 'FREE', blockReason: null },
  { id: 's7',  number: '72', type: 'LOT2', status: 'FREE', blockReason: null },
  { id: 's8',  number: '73', type: 'LOT2', status: 'FREE', blockReason: null },
  { id: 's9',  number: '74', type: 'LOT2', status: 'FREE', blockReason: null },
  // Chêne-Bourg Box
  { id: 's10', number: '60', type: 'BOX',  status: 'FREE', blockReason: null },
];

let bookings = [];
let counter  = 1;

// ─── Logs ─────────────────────────────────────────────────────────────────────
let logs = [];
let logCounter = 1;
function pushLog(action, { userId = null, userName = null, accessId = null, role = null, detail = null } = {}) {
  logs.unshift({
    id: `log${logCounter++}`,
    action, userId, userName, accessId, role, detail,
    timestamp: new Date().toISOString(),
  });
  if (logs.length > 500) logs.pop(); // garde les 500 derniers
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function spotsForDate(dateStr) {
  return SPOTS.map(spot => {
    if (spot.status === 'BLOCKED') return { ...spot };
    const bk = bookings.find(b =>
      b.spotId === spot.id &&
      b.status !== 'CANCELLED' &&
      (b.date === dateStr || (b.isIndefinite && b.date <= dateStr)),
    );
    if (!bk) return { ...spot, status: 'FREE' };
    if (bk.isIndefinite)           return { ...spot, status: 'BLOCKED' };
    if (bk.status === 'OCCUPIED')  return { ...spot, status: 'OCCUPIED' };
    if (bk.status === 'RELEASED')  return { ...spot, status: 'FREE' };
    return { ...spot, status: 'RESERVED' };
  });
}

function hasConflict(spotId, dateStr) {
  return bookings.find(b =>
    b.spotId === spotId &&
    b.status !== 'CANCELLED' &&
    (b.date === dateStr || (b.isIndefinite && b.date <= dateStr)),
  );
}

function datesBetween(startDate, endDate) {
  const dates = [];
  const d   = new Date(startDate + 'T00:00:00');
  const end = new Date((endDate || startDate) + 'T00:00:00');
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function safeUser(u) {
  if (!u || !u.id) return {};
  const { pin, ...rest } = u;
  return rest;
}

// Version admin : inclut le PIN (routes admin uniquement)
function adminUser(u) {
  if (!u || !u.id) return {};
  return { ...u };
}

// Minimal fake JWT — base64(payload), no real signature
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, name: user.name })).toString('base64url');
  return `mock.${payload}.sig`;
}
function decodeToken(header = '') {
  try {
    const token = header.replace('Bearer ', '');
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch { return null; }
}

function withBookingRelations(bk) {
  return {
    ...bk,
    spot: SPOTS.find(s => s.id === bk.spotId) ?? null,
    user: safeUser(USERS.find(u => u.id === bk.userId) ?? {}),
  };
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url    = new URL(req.url, `http://${req.headers.host}`);
  const path   = url.pathname;
  const method = req.method;

  // ── Fichiers statiques (frontend buildé) — non-API GET uniquement ──────────
  if (method === 'GET' && !path.startsWith('/api')) {
    let filePath = nodePath.join(DIST, path === '/' ? 'index.html' : path);
    // Sécurité : empêcher la traversée de dossiers
    if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    // Si fichier inexistant → SPA fallback vers index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = nodePath.join(DIST, 'index.html');
    }
    if (fs.existsSync(filePath)) {
      const ext  = nodePath.extname(filePath).toLowerCase();
      const mime = MIME[ext] ?? 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      if (ext !== '.html') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.setHeader('Content-Type', 'application/json');

  const authUser = () => decodeToken(req.headers.authorization ?? '');

  const send = (status, data) => {
    res.writeHead(status);
    res.end(JSON.stringify(data));
  };

  const readBody = cb => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      try { cb(JSON.parse(raw || '{}')); }
      catch { send(400, { message: 'JSON invalide' }); }
    });
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  if (path === '/api/auth/login' && method === 'POST') {
    return readBody(({ accessId, pin }) => {
      const user = USERS.find(u => u.accessId === accessId && u.pin === pin);
      if (!user) {
        pushLog('LOGIN_FAILED', { accessId: accessId ?? '?', detail: 'Identifiant ou PIN incorrect' });
        return send(401, { message: 'Identifiant ou PIN incorrect' });
      }
      if (user.active === false) {
        pushLog('LOGIN_FAILED', { userId: user.id, userName: user.name, accessId: user.accessId, role: user.role, detail: 'Compte désactivé' });
        return send(403, { message: 'Compte désactivé. Contactez un administrateur.' });
      }
      pushLog('LOGIN', { userId: user.id, userName: user.name, accessId: user.accessId, role: user.role });
      send(200, {
        accessToken:  makeToken(user),
        refreshToken: `refresh.${user.id}.token`,
        user: safeUser(user),
      });
    });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const me = authUser();
    if (me) {
      const user = USERS.find(u => u.id === me.sub);
      pushLog('LOGOUT', { userId: me.sub, userName: user?.name ?? me.name, accessId: user?.accessId ?? '?', role: me.role });
    }
    return send(204, null);
  }

  if (path === '/api/auth/refresh' && method === 'POST') {
    return readBody(({ refreshToken }) => {
      const userId = refreshToken?.split('.')[1];
      const user = USERS.find(u => u.id === userId);
      if (!user) return send(401, { message: 'Session expirée' });
      send(200, {
        accessToken:  makeToken(user),
        refreshToken: `refresh.${user.id}.token`,
        user: safeUser(user),
      });
    });
  }

  // ── Spots ─────────────────────────────────────────────────────────────────

  if (path === '/api/spots' && method === 'GET') {
    const date = url.searchParams.get('date') ?? todayIso();
    return send(200, spotsForDate(date));
  }

  // ── Bookings (user) ───────────────────────────────────────────────────────

  if (path === '/api/bookings' && method === 'POST') {
    const me = authUser();
    if (!me) return send(401, { message: 'Non authentifié' });
    return readBody(({ spotId, date, startTime, endTime }) => {
      const spot = SPOTS.find(s => s.id === spotId);
      if (!spot) return send(404, { message: 'Place introuvable' });
      if (spot.status === 'BLOCKED') return send(409, { message: 'Cette place est bloquée' });

      const conflict = bookings.find(
        b => b.spotId === spotId && b.date === date && !['CANCELLED', 'RELEASED'].includes(b.status),
      );
      if (conflict) return send(409, { message: 'Cette place est déjà réservée pour ce jour' });

      const alreadyMine = bookings.find(
        b => b.userId === me.sub && b.date === date && !['CANCELLED', 'RELEASED'].includes(b.status),
      );
      if (alreadyMine) return send(409, { message: 'Vous avez déjà une réservation ce jour-là' });

      const bk = {
        id: `bk${counter++}`, spotId, date, startTime, endTime,
        status: 'CONFIRMED', userId: me.sub,
        checkedIn: false, checkedInAt: null, releasedAt: null,
        createdAt: new Date().toISOString(),
      };
      bookings.push(bk);
      send(201, withBookingRelations(bk));
    });
  }

  if (path === '/api/bookings/me' && method === 'GET') {
    const me = authUser();
    if (!me) return send(401, { message: 'Non authentifié' });
    return send(200, bookings.filter(b => b.userId === me.sub).map(withBookingRelations));
  }

  // PATCH /api/bookings/:id/cancel
  const cancelM = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
  if (cancelM && method === 'PATCH') {
    const bk = bookings.find(b => b.id === cancelM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });
    bk.status = 'CANCELLED';
    return send(200, withBookingRelations(bk));
  }

  // PATCH /api/bookings/:id/check-in
  const checkInM = path.match(/^\/api\/bookings\/([^/]+)\/check-in$/);
  if (checkInM && method === 'PATCH') {
    const bk = bookings.find(b => b.id === checkInM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });
    if (!['CONFIRMED', 'HELD'].includes(bk.status))
      return send(400, { message: `Impossible de faire le check-in (statut: ${bk.status})` });
    bk.status     = 'OCCUPIED';
    bk.checkedIn  = true;
    bk.checkedInAt = new Date().toISOString();
    return send(200, withBookingRelations(bk));
  }

  // PATCH /api/bookings/:id/release
  const releaseM = path.match(/^\/api\/bookings\/([^/]+)\/release$/);
  if (releaseM && method === 'PATCH') {
    const bk = bookings.find(b => b.id === releaseM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });
    if (bk.status !== 'OCCUPIED')
      return send(400, { message: `Impossible de libérer (statut: ${bk.status})` });
    bk.status     = 'RELEASED';
    bk.releasedAt = new Date().toISOString();
    return send(200, withBookingRelations(bk));
  }

  // PATCH /api/bookings/:id — modifier une réservation (date / horaires)
  const editBookingM = path.match(/^\/api\/bookings\/([^/]+)$/);
  if (editBookingM && method === 'PATCH') {
    const me = authUser();
    if (!me) return send(401, { message: 'Non authentifié' });
    const bk = bookings.find(b => b.id === editBookingM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });
    if (bk.userId !== me.sub) return send(403, { message: 'Accès refusé' });
    if (!['PENDING', 'CONFIRMED', 'HELD'].includes(bk.status))
      return send(400, { message: `Impossible de modifier une réservation avec le statut : ${bk.status}` });
    return readBody(({ date, startTime, endTime }) => {
      if (!date || !startTime || !endTime)
        return send(400, { message: 'Champs manquants (date, startTime, endTime)' });
      // Vérification conflit (exclut la réservation courante)
      const conflict = bookings.find(b =>
        b.id !== bk.id &&
        b.spotId === bk.spotId &&
        b.date === date &&
        !['CANCELLED', 'RELEASED'].includes(b.status),
      );
      if (conflict) return send(409, { message: 'Cette place est déjà réservée pour ce créneau' });
      // Vérif doublon même utilisateur ce jour-là
      const alreadyMine = bookings.find(b =>
        b.id !== bk.id &&
        b.userId === me.sub &&
        b.date === date &&
        !['CANCELLED', 'RELEASED'].includes(b.status),
      );
      if (alreadyMine) return send(409, { message: 'Vous avez déjà une réservation ce jour-là' });
      bk.date      = date;
      bk.startTime = startTime;
      bk.endTime   = endTime;
      return send(200, withBookingRelations(bk));
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  if (path.startsWith('/api/admin/')) {
    console.log(`[ADMIN] ${method} ${path}`);
  }

  if (path === '/api/admin/stats' && method === 'GET') {
    const today = todayIso();
    const daily = spotsForDate(today);
    const counts = daily.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});
    return send(200, {
      free:     counts.FREE     ?? 0,
      reserved: counts.RESERVED ?? 0,
      occupied: counts.OCCUPIED ?? 0,
      blocked:  counts.BLOCKED  ?? 0,
      total:    SPOTS.length,
    });
  }

  if (path === '/api/admin/bookings' && method === 'GET') {
    const from = url.searchParams.get('from');
    const to   = url.searchParams.get('to');
    let result = bookings.filter(b => b.status !== 'CANCELLED');
    if (from && to) result = result.filter(b =>
      (b.date >= from && b.date <= to) ||       // normale dans la plage
      (b.isIndefinite && b.date <= to),          // indéfinie commencée avant la fin
    );
    return send(200, result.map(withBookingRelations));
  }

  // POST /api/admin/bookings — création admin (multi-jours expandé)
  if (path === '/api/admin/bookings' && method === 'POST') {
    return readBody(({ spotId, startDate, endDate, startTime, endTime, userId, vehicleLabel, isIndefinite, adminNote }) => {
      const spot = SPOTS.find(s => s.id === spotId);
      if (!spot) return send(404, { message: 'Place introuvable' });

      if (isIndefinite) {
        // Vérifie conflit à la date de début
        if (hasConflict(spotId, startDate))
          return send(409, { message: `Conflit : la place ${spot.number} est déjà occupée à cette date` });
        const bk = {
          id: `bk${counter++}`, spotId, date: startDate,
          startTime: startTime ?? '07:00', endTime: null,
          status: 'BLOCKED', userId: userId ?? null,
          source: 'ADMIN', vehicleLabel: vehicleLabel ?? null,
          isIndefinite: true, adminNote: adminNote ?? null,
          checkedIn: false, checkedInAt: null, releasedAt: null,
          createdAt: new Date().toISOString(),
        };
        bookings.push(bk);
        return send(201, [withBookingRelations(bk)]);
      }

      // Expansion multi-jours
      const dates = datesBetween(startDate, endDate || startDate);
      for (const d of dates) {
        if (hasConflict(spotId, d))
          return send(409, { message: `Conflit le ${d} : la place ${spot.number} est déjà occupée` });
      }
      const created = dates.map(d => {
        const bk = {
          id: `bk${counter++}`, spotId, date: d,
          startTime, endTime,
          status: 'OCCUPIED', userId: userId ?? null,
          source: 'ADMIN', vehicleLabel: vehicleLabel ?? null,
          isIndefinite: false, adminNote: adminNote ?? null,
          checkedIn: false, checkedInAt: null, releasedAt: null,
          createdAt: new Date().toISOString(),
        };
        bookings.push(bk);
        return bk;
      });
      return send(201, created.map(withBookingRelations));
    });
  }

  // PATCH /api/admin/bookings/:id/cancel  (doit être avant le PATCH générique /:id)
  const adminCancelM = path.match(/^\/api\/admin\/bookings\/([^/]+)\/cancel$/);
  if (adminCancelM && method === 'PATCH') {
    const bk = bookings.find(b => b.id === adminCancelM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });
    bk.status = 'CANCELLED';
    return send(200, withBookingRelations(bk));
  }

  // PATCH /api/admin/bookings/:id — mise à jour générale
  // DELETE /api/admin/bookings/:id — suppression
  const adminBookingM = path.match(/^\/api\/admin\/bookings\/([^/]+)$/);
  if (adminBookingM) {
    const bk = bookings.find(b => b.id === adminBookingM[1]);
    if (!bk) return send(404, { message: 'Réservation introuvable' });

    if (method === 'PATCH') {
      return readBody(data => {
        Object.assign(bk, data);
        return send(200, withBookingRelations(bk));
      });
    }
    if (method === 'DELETE') {
      bookings = bookings.filter(b => b.id !== adminBookingM[1]);
      res.writeHead(204); res.end(); return;
    }
  }

  if (path === '/api/admin/users' && method === 'GET') {
    return send(200, USERS.map(adminUser));
  }

  if (path === '/api/admin/logs' && method === 'GET') {
    return send(200, logs);
  }

  // POST /api/admin/users — créer un utilisateur
  if (path === '/api/admin/users' && method === 'POST') {
    return readBody(({ name, accessId, pin, role, active, locale }) => {
      if (!name || !accessId || !pin || !role)
        return send(400, { message: 'Champs obligatoires manquants (name, accessId, pin, role)' });
      if (accessId.length > 6)
        return send(400, { message: "L'identifiant ne peut pas dépasser 6 caractères" });
      if (USERS.find(u => u.accessId === accessId))
        return send(409, { message: `L'identifiant "${accessId}" est déjà utilisé` });
      const u = {
        id: `u${userCounter++}`, name, accessId, pin,
        role: role ?? 'USER', locale: locale ?? 'fr',
        active: active !== false,
      };
      USERS.push(u);
      pushLog('USER_CREATED', { userId: u.id, userName: u.name, accessId: u.accessId, role: u.role });
      return send(201, adminUser(u));
    });
  }

  // PATCH /api/admin/users/:id — modifier
  // DELETE /api/admin/users/:id — supprimer
  const adminUserM = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserM) {
    const u = USERS.find(u => u.id === adminUserM[1]);
    if (!u) return send(404, { message: 'Utilisateur introuvable' });

    if (method === 'PATCH') {
      return readBody(data => {
        if (data.accessId && data.accessId !== u.accessId) {
          if (data.accessId.length > 6)
            return send(400, { message: "L'identifiant ne peut pas dépasser 6 caractères" });
          if (USERS.find(x => x.accessId === data.accessId && x.id !== u.id))
            return send(409, { message: `L'identifiant "${data.accessId}" est déjà utilisé` });
        }
        const { pin, ...rest } = data;
        Object.assign(u, rest);
        if (pin) u.pin = pin; // PIN modifié uniquement si fourni
        pushLog('USER_UPDATED', { userId: u.id, userName: u.name, accessId: u.accessId, role: u.role });
        return send(200, adminUser(u));
      });
    }
    if (method === 'DELETE') {
      pushLog('USER_DELETED', { userId: u.id, userName: u.name, accessId: u.accessId, role: u.role });
      USERS = USERS.filter(x => x.id !== adminUserM[1]);
      res.writeHead(204); res.end(); return;
    }
  }

  // PATCH /api/admin/spots/:id/block
  const blockM = path.match(/^\/api\/admin\/spots\/([^/]+)\/block$/);
  if (blockM && method === 'POST') {
    const spot = SPOTS.find(s => s.id === blockM[1]);
    if (!spot) return send(404, { message: 'Place introuvable' });
    spot.status = 'BLOCKED';
    return readBody(({ reason }) => { spot.blockReason = reason ?? null; send(204, null); });
  }

  // POST /api/admin/spots/:id/unblock
  const unblockM = path.match(/^\/api\/admin\/spots\/([^/]+)\/unblock$/);
  if (unblockM && method === 'POST') {
    const spot = SPOTS.find(s => s.id === unblockM[1]);
    if (!spot) return send(404, { message: 'Place introuvable' });
    spot.status = 'FREE';
    spot.blockReason = null;
    return send(204, null);
  }

  console.log(`[404] Aucune route pour: ${method} "${path}"`);
  send(404, { message: `Route inconnue: ${method} ${path}` });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅  Mock API DriveXchange Parking');
  console.log(`  📡  http://localhost:${PORT}`);
  console.log('');
  console.log('  Comptes de test:');
  console.log('    AVI    / 0000  →  Admin   (4 onglets)');
  console.log('    USR001 / 1234  →  Jean Dupont');
  console.log('    USR002 / 5678  →  Marie Martin');
  console.log('');
});
