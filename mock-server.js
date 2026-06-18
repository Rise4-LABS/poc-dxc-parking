// ─── BoxBox Parking — API Server (PostgreSQL persistent) ──────────────────────

const http       = require('http');
const fs         = require('fs');
const nodePath   = require('path');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { Pool }   = require('pg');

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = nodePath.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}
loadEnv();

// ─── Email ────────────────────────────────────────────────────────────────────
const mailTransporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST || 'smtp.office365.com',
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  tls: { ciphers: 'SSLv3' },
});
const MAIL_ENABLED = !!(process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_PASS !== 'MOT_DE_PASSE_ICI');

async function sendActivationMail(toEmail, toName, token) {
  const activationUrl = `${process.env.APP_URL || 'http://localhost:5174'}/?activate=${token}`;
  if (!MAIL_ENABLED) {
    console.log(`[MAIL] ⚠️  Email désactivé — Lien : ${activationUrl}`);
    return;
  }
  const firstName = toName.split(' ')[0];
  try {
    await mailTransporter.sendMail({
      from:    process.env.MAIL_FROM || `"BoxBox" <${process.env.MAIL_USER}>`,
      to:      toEmail,
      subject: "🅿️ Votre accès à l'application Parking",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
          <div style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
            <span style="font-size:36px;">🅿️</span>
            <h1 style="color:#fff;margin:8px 0 0;font-size:20px;font-weight:700;">BoxBox</h1>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px 24px;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="font-size:14px;color:#475569;margin:0 0 24px;">
              Votre compte a été créé. Cliquez sur le bouton ci-dessous pour définir votre mot de passe.
            </p>
            <div style="text-align:center;margin:0 0 24px;">
              <a href="${activationUrl}" style="display:inline-block;padding:14px 32px;background:#1e3a5f;color:#fff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">
                Créer mon mot de passe →
              </a>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              Lien à usage unique. Si nécessaire, un admin peut en générer un nouveau.<br>
              <span style="color:#1e3a5f;word-break:break-all;">${activationUrl}</span>
            </p>
          </div>
        </div>`,
    });
    console.log(`[MAIL] ✅ Email envoyé à ${toEmail}`);
  } catch (err) {
    console.error(`[MAIL] ❌ Erreur : ${err.message}`);
  }
}

// kind: 'CONFIRMED' | 'CANCELLED' — dates: tableau de 'YYYY-MM-DD'
async function sendBookingMail(toEmail, toName, kind, spotNumber, dates, startTime, endTime) {
  if (!MAIL_ENABLED) {
    console.log(`[MAIL] ⚠️  Email désactivé — ${kind} place ${spotNumber} (${dates.join(', ')}) pour ${toEmail}`);
    return;
  }
  const firstName = toName.split(' ')[0];
  const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isCancel = kind === 'CANCELLED';
  const dateLines = dates.map(d => `<li style="margin:2px 0;">${fmtDate(d)}</li>`).join('');
  try {
    await mailTransporter.sendMail({
      from:    process.env.MAIL_FROM || `"BoxBox" <${process.env.MAIL_USER}>`,
      to:      toEmail,
      subject: isCancel
        ? `🅿️ Réservation annulée — place ${spotNumber}`
        : `🅿️ Réservation confirmée — place ${spotNumber}${dates.length > 1 ? ` (${dates.length} dates)` : ''}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
          <div style="background:#1e3a5f;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
            <span style="font-size:36px;">🅿️</span>
            <h1 style="color:#fff;margin:8px 0 0;font-size:20px;font-weight:700;">BoxBox</h1>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px 24px;">
            <p style="font-size:15px;color:#1e293b;margin:0 0 16px;">Bonjour <strong>${firstName}</strong>,</p>
            <p style="font-size:14px;color:#475569;margin:0 0 16px;">
              ${isCancel ? 'Votre réservation a bien été <strong>annulée</strong> :' : 'Votre réservation est <strong>confirmée</strong> :'}
            </p>
            <div style="background:${isCancel ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isCancel ? '#fca5a5' : '#86efac'};border-radius:8px;padding:16px;margin:0 0 16px;">
              <p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 8px;">Place ${spotNumber} · ${startTime}–${endTime}</p>
              <ul style="font-size:14px;color:#475569;margin:0;padding-left:18px;">${dateLines}</ul>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:0;">
              Gérez vos réservations sur <a href="${process.env.APP_URL || 'http://localhost:5174'}" style="color:#1e3a5f;">BoxBox</a>.
            </p>
          </div>
        </div>`,
    });
    console.log(`[MAIL] ✅ Email ${kind} envoyé à ${toEmail}`);
  } catch (err) {
    console.error(`[MAIL] ❌ Erreur : ${err.message}`);
  }
}

function generateToken() { return crypto.randomBytes(24).toString('hex'); }

const PORT = process.env.PORT || 3000;
const DIST = nodePath.join(__dirname, 'apps', 'web', 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain',
};

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false } : false,
});

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function datesBetween(startDate, endDate) {
  const dates = [], d = new Date(startDate + 'T00:00:00'), end = new Date((endDate || startDate) + 'T00:00:00');
  while (d <= end) { dates.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return dates;
}

// ─── Mappers DB → JS ─────────────────────────────────────────────────────────
function mapUser(r) {
  if (!r) return {};
  return { id: r.id, name: r.name, email: r.email, accessId: r.access_id, role: r.role,
    locale: r.locale, active: r.active, status: r.status, activationToken: r.activation_token,
    trigram: r.trigram ?? null };
}
function safeUser(r)  { if (!r?.id) return {}; const { activationToken, ...rest } = mapUser(r); return rest; }
function adminUser(r) { if (!r?.id) return {}; return mapUser(r); }
function mapSpot(r)   { if (!r) return null; return { id: r.id, number: r.number, type: r.type, status: r.status, blockReason: r.block_reason }; }
function mapBooking(r) {
  if (!r) return null;
  return { id: r.id, spotId: r.spot_id, date: r.date, startTime: r.start_time, endTime: r.end_time,
    status: r.status, userId: r.user_id, source: r.source, vehicleLabel: r.vehicle_label,
    isIndefinite: r.is_indefinite, adminNote: r.admin_note, checkedIn: r.checked_in,
    checkedInAt: r.checked_in_at, releasedAt: r.released_at, createdAt: r.created_at };
}
async function withRelations(bkRow) {
  const bk = mapBooking(bkRow);
  const [sr] = await q('SELECT * FROM spots WHERE id = $1', [bk.spotId]);
  const ur   = bk.userId ? (await q('SELECT * FROM users WHERE id = $1', [bk.userId]))[0] : null;
  return { ...bk, spot: mapSpot(sr), user: safeUser(ur) };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function spotsForDate(dateStr) {
  const spots = await q('SELECT * FROM spots ORDER BY type, number');
  const bks   = await q(`SELECT spot_id, status, is_indefinite FROM bookings
    WHERE status != 'CANCELLED' AND (date = $1 OR (is_indefinite = true AND date <= $1))`, [dateStr]);
  return spots.map(s => {
    if (s.status === 'BLOCKED') return mapSpot(s);
    const bk = bks.find(b => b.spot_id === s.id);
    if (!bk)                         return { ...mapSpot(s), status: 'FREE' };
    if (bk.is_indefinite)            return { ...mapSpot(s), status: 'BLOCKED' };
    if (bk.status === 'OCCUPIED')    return { ...mapSpot(s), status: 'OCCUPIED' };
    if (bk.status === 'RELEASED')    return { ...mapSpot(s), status: 'FREE' };
    return { ...mapSpot(s), status: 'RESERVED' };
  });
}
async function hasConflict(spotId, dateStr) {
  const [r] = await q(`SELECT id FROM bookings WHERE spot_id = $1 AND status != 'CANCELLED'
    AND (date = $2 OR (is_indefinite = true AND date <= $2))`, [spotId, dateStr]);
  return r;
}
async function pushLog(action, { userId=null, userName=null, accessId=null, role=null, detail=null } = {}) {
  await q('INSERT INTO logs (action,user_id,user_name,access_id,role,detail,timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [action, userId, userName, accessId, role, detail, new Date().toISOString()]);
}
function makeToken(u) {
  const p = Buffer.from(JSON.stringify({ sub: u.id, role: u.role, name: u.name, email: u.email })).toString('base64url');
  return `mock.${p}.sig`;
}
function decodeToken(header = '') {
  try { const [,p] = header.replace('Bearer ','').split('.'); return JSON.parse(Buffer.from(p,'base64url').toString()); }
  catch { return null; }
}

// ─── Init DB ──────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      access_id TEXT, pin TEXT, role TEXT NOT NULL DEFAULT 'USER',
      locale TEXT DEFAULT 'fr', active BOOLEAN DEFAULT true,
      status TEXT DEFAULT 'PENDING', activation_token TEXT
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trigram TEXT;
    CREATE TABLE IF NOT EXISTS spots (
      id TEXT PRIMARY KEY, number TEXT NOT NULL, type TEXT NOT NULL,
      status TEXT DEFAULT 'FREE', block_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, spot_id TEXT, date TEXT, start_time TEXT, end_time TEXT,
      status TEXT DEFAULT 'RESERVED', user_id TEXT, source TEXT DEFAULT 'USER',
      vehicle_label TEXT, is_indefinite BOOLEAN DEFAULT false, admin_note TEXT,
      checked_in BOOLEAN DEFAULT false, checked_in_at TEXT, released_at TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY, action TEXT NOT NULL, user_id TEXT, user_name TEXT,
      access_id TEXT, role TEXT, detail TEXT, timestamp TEXT
    );
  `);

  // Aucun utilisateur de démo n'est seedé : le seul accès garanti est le compte
  // admin géré ci-dessous (ADMIN_EMAIL/ADMIN_PASS). Les autres comptes sont créés
  // depuis l'interface d'administration.

  // Compte admin géré — upsert idempotent à chaque démarrage (identifiants via env)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASS) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const pass  = process.env.ADMIN_PASS;
    const name  = process.env.ADMIN_NAME || 'Admin DXC';
    await q(`INSERT INTO users (id,name,email,access_id,pin,role,locale,active,status,activation_token,trigram)
             VALUES ($1,$2,$3,'ADMIN',$4,'ADMIN','fr',true,'ACTIVE',null,'ADX')
             ON CONFLICT (email) DO UPDATE
               SET pin=EXCLUDED.pin, role='ADMIN', active=true, status='ACTIVE', activation_token=null, name=EXCLUDED.name`,
      ['u-admin-managed', name, email, pass]);
    console.log(`[DB] ✅ Compte admin géré : ${email}`);
  }

  // Seed spots si vide
  const [{ count: sc }] = await q('SELECT COUNT(*)::int as count FROM spots');
  if (sc === 0) {
    for (const s of [
      {id:'s1',n:'27',t:'LOT1'},{id:'s2',n:'28',t:'LOT1'},{id:'s3',n:'29',t:'LOT1'},
      {id:'s4',n:'30',t:'LOT1'},{id:'s5',n:'31',t:'LOT1'},{id:'s6',n:'69',t:'LOT2'},
      {id:'s7',n:'72',t:'LOT2'},{id:'s8',n:'73',t:'LOT2'},{id:'s9',n:'74',t:'LOT2'},
      {id:'s10',n:'60',t:'BOX'},
    ]) {
      await q('INSERT INTO spots (id,number,type,status,block_reason) VALUES ($1,$2,$3,$4,null)',
        [s.id, s.n, s.t, s.t === 'BOX' ? 'BLOCKED' : 'FREE']);
    }
    console.log('[DB] ✅ Places initiales créées');
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url, `http://${req.headers.host}`);
  const path   = url.pathname;
  const method = req.method;

  // Fichiers statiques
  if (method === 'GET' && !path.startsWith('/api')) {
    let filePath = nodePath.join(DIST, path === '/' ? 'index.html' : path);
    if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
      filePath = nodePath.join(DIST, 'index.html');
    if (fs.existsSync(filePath)) {
      const ext = nodePath.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
      if (ext !== '.html') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.writeHead(200); fs.createReadStream(filePath).pipe(res); return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.setHeader('Content-Type', 'application/json');

  const send = (status, data) => { if (!res.headersSent) { res.writeHead(status); res.end(JSON.stringify(data)); } };
  const getBody = () => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('JSON invalide')); } });
  });
  const authUser = () => decodeToken(req.headers.authorization ?? '');

  try {

    // ── Auth ──────────────────────────────────────────────────────────────────

    if (path === '/api/auth/login' && method === 'POST') {
      const { email, password } = await getBody();
      const [user] = await q('SELECT * FROM users WHERE email = $1', [email]);
      if (!user || user.pin !== password) {
        await pushLog('LOGIN_FAILED', { accessId: email ?? '?', detail: 'Email ou mot de passe incorrect' });
        return send(401, { message: 'Email ou mot de passe incorrect' });
      }
      if (user.status === 'PENDING') {
        await pushLog('LOGIN_FAILED', { userId: user.id, userName: user.name, accessId: user.email, role: user.role, detail: 'Compte non activé' });
        return send(403, { message: 'Compte non activé. Vérifiez votre email pour activer votre compte.', code: 'PENDING' });
      }
      if (!user.active) {
        await pushLog('LOGIN_FAILED', { userId: user.id, userName: user.name, accessId: user.email, role: user.role, detail: 'Compte désactivé' });
        return send(403, { message: 'Compte désactivé. Contactez un administrateur.' });
      }
      await pushLog('LOGIN', { userId: user.id, userName: user.name, accessId: user.email, role: user.role });
      return send(200, { accessToken: makeToken(mapUser(user)), refreshToken: `refresh.${user.id}.token`, user: safeUser(user) });
    }

    if (path === '/api/auth/activate' && method === 'POST') {
      const { token, password } = await getBody();
      if (!token || !password) return send(400, { message: 'Token et mot de passe requis' });
      const [user] = await q('SELECT * FROM users WHERE activation_token = $1', [token]);
      if (!user) return send(404, { message: "Lien d'activation invalide ou déjà utilisé" });
      if (password.length < 6) return send(400, { message: 'Le mot de passe doit faire au moins 6 caractères' });
      await q(`UPDATE users SET pin=$1, status='ACTIVE', activation_token=null WHERE id=$2`, [password, user.id]);
      await pushLog('USER_UPDATED', { userId: user.id, userName: user.name, accessId: user.email, role: user.role, detail: "Mot de passe défini via activation" });
      return send(200, { message: 'Mot de passe défini. Vous pouvez maintenant vous connecter.' });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      const me = authUser();
      if (me) {
        const [user] = await q('SELECT * FROM users WHERE id = $1', [me.sub]);
        await pushLog('LOGOUT', { userId: me.sub, userName: user?.name ?? me.name, accessId: user?.email ?? '?', role: me.role });
      }
      return send(204, null);
    }

    if (path === '/api/auth/refresh' && method === 'POST') {
      const { refreshToken } = await getBody();
      const userId = refreshToken?.split('.')[1];
      const [user] = await q('SELECT * FROM users WHERE id = $1', [userId]);
      if (!user) return send(401, { message: 'Session expirée' });
      return send(200, { accessToken: makeToken(mapUser(user)), refreshToken: `refresh.${user.id}.token`, user: safeUser(user) });
    }

    // ── Spots ─────────────────────────────────────────────────────────────────

    if (path === '/api/spots' && method === 'GET') {
      const date = url.searchParams.get('date') || todayIso();
      return send(200, await spotsForDate(date));
    }

    // ── Bookings utilisateur ──────────────────────────────────────────────────

    if (path === '/api/bookings/me' && method === 'GET') {
      const me = authUser();
      if (!me) return send(401, { message: 'Non authentifié' });
      const bks = await q(`SELECT * FROM bookings WHERE user_id=$1 AND status!='CANCELLED' ORDER BY date DESC, created_at DESC`, [me.sub]);
      return send(200, await Promise.all(bks.map(withRelations)));
    }

    if (path === '/api/bookings' && method === 'POST') {
      const me = authUser();
      if (!me) return send(401, { message: 'Non authentifié' });
      const { spotId, date, startTime, endTime, repeatWeeklyUntil } = await getBody();
      const [spot] = await q('SELECT * FROM spots WHERE id = $1', [spotId]);
      if (!spot) return send(404, { message: 'Place introuvable' });

      // Dates à réserver : date seule, ou récurrence hebdo jusqu'à repeatWeeklyUntil (max 12 occurrences)
      const targetDates = [date];
      if (repeatWeeklyUntil && repeatWeeklyUntil > date) {
        const d = new Date(date + 'T00:00:00');
        while (targetDates.length < 12) {
          d.setDate(d.getDate() + 7);
          const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if (iso > repeatWeeklyUntil) break;
          targetDates.push(iso);
        }
      }

      const created = [], skipped = [];
      for (const dt of targetDates) {
        if (await hasConflict(spotId, dt)) { skipped.push(dt); continue; }
        const id = `bk${Date.now()}${Math.floor(Math.random()*1000)}`;
        await q(`INSERT INTO bookings (id,spot_id,date,start_time,end_time,status,user_id,source,is_indefinite,checked_in,created_at)
                 VALUES ($1,$2,$3,$4,$5,'RESERVED',$6,'USER',false,false,$7)`,
          [id, spotId, dt, startTime, endTime, me.sub, new Date().toISOString()]);
        created.push(id);
      }
      if (!created.length) return send(409, { message: 'Cette place est déjà réservée pour cette date' });

      await pushLog('BOOKING_CREATED', { userId: me.sub, userName: me.name, accessId: me.email, role: me.role,
        detail: `Place ${spot.number} — ${created.length} date(s)${skipped.length ? `, ${skipped.length} conflit(s)` : ''}` });

      // Email de confirmation (fire & forget)
      const [meRow] = await q('SELECT * FROM users WHERE id=$1', [me.sub]);
      if (meRow?.email) {
        const createdDates = targetDates.filter(dt => !skipped.includes(dt));
        void sendBookingMail(meRow.email, meRow.name, 'CONFIRMED', spot.number, createdDates, startTime, endTime);
      }

      const rows = await q(`SELECT * FROM bookings WHERE id = ANY($1) ORDER BY date`, [created]);
      const withRel = await Promise.all(rows.map(withRelations));
      // Rétro-compatible : une seule date → l'objet booking ; récurrence → { bookings, skipped }
      if (!repeatWeeklyUntil) return send(201, withRel[0]);
      return send(201, { bookings: withRel, skipped });
    }

    const cancelM = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
    if (cancelM && method === 'PATCH') {
      const me = authUser();
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [cancelM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      if (bk.user_id !== me?.sub) return send(403, { message: 'Non autorisé' });
      await q(`UPDATE bookings SET status='CANCELLED' WHERE id=$1`, [bk.id]);
      const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
      // Email d'annulation (fire & forget)
      const [meRow] = await q('SELECT * FROM users WHERE id=$1', [bk.user_id]);
      const [spotRow] = await q('SELECT * FROM spots WHERE id=$1', [bk.spot_id]);
      if (meRow?.email && spotRow) {
        void sendBookingMail(meRow.email, meRow.name, 'CANCELLED', spotRow.number, [bk.date], bk.start_time, bk.end_time);
      }
      return send(200, await withRelations(upd));
    }

    const checkInM = path.match(/^\/api\/bookings\/([^/]+)\/check-in$/);
    if (checkInM && method === 'PATCH') {
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [checkInM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      await q(`UPDATE bookings SET status='OCCUPIED',checked_in=true,checked_in_at=$1 WHERE id=$2`, [new Date().toISOString(), bk.id]);
      const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
      return send(200, await withRelations(upd));
    }

    const releaseM = path.match(/^\/api\/bookings\/([^/]+)\/release$/);
    if (releaseM && method === 'PATCH') {
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [releaseM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      await q(`UPDATE bookings SET status='RELEASED',released_at=$1 WHERE id=$2`, [new Date().toISOString(), bk.id]);
      const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
      return send(200, await withRelations(upd));
    }

    const modifyM = path.match(/^\/api\/bookings\/([^/]+)$/);
    if (modifyM && method === 'PATCH') {
      const me = authUser();
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [modifyM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      if (bk.user_id !== me?.sub) return send(403, { message: 'Non autorisé' });
      const { date, startTime, endTime } = await getBody();
      if (!date || !startTime || !endTime) return send(400, { message: 'Champs obligatoires manquants' });
      if (startTime >= endTime) return send(400, { message: "L'heure de début doit être avant l'heure de fin" });
      const [conflict] = await q(`SELECT id FROM bookings WHERE spot_id=$1 AND status!='CANCELLED' AND id!=$2
        AND (date=$3 OR (is_indefinite=true AND date<=$3))`, [bk.spot_id, bk.id, date]);
      if (conflict) return send(409, { message: 'Conflit de réservation sur cette date' });
      await q(`UPDATE bookings SET date=$1,start_time=$2,end_time=$3 WHERE id=$4`, [date, startTime, endTime, bk.id]);
      const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
      return send(200, await withRelations(upd));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    if (path === '/api/admin/stats' && method === 'GET') {
      const daily = await spotsForDate(todayIso());
      const counts = daily.reduce((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; }, {});
      return send(200, { free: counts.FREE??0, reserved: counts.RESERVED??0, occupied: counts.OCCUPIED??0, blocked: counts.BLOCKED??0, total: daily.length });
    }

    if (path === '/api/admin/bookings' && method === 'GET') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      let sql = `SELECT * FROM bookings WHERE status!='CANCELLED'`;
      const params = [];
      if (from && to) { sql += ` AND (date>=$1 AND date<=$2 OR (is_indefinite=true AND date<=$2))`; params.push(from, to); }
      const bks = await q(sql, params);
      return send(200, await Promise.all(bks.map(withRelations)));
    }

    if (path === '/api/admin/bookings' && method === 'POST') {
      const { spotId, startDate, endDate, startTime, endTime, userId, vehicleLabel, isIndefinite, adminNote } = await getBody();
      const [spot] = await q('SELECT * FROM spots WHERE id=$1', [spotId]);
      if (!spot) return send(404, { message: 'Place introuvable' });
      if (isIndefinite) {
        if (await hasConflict(spotId, startDate)) return send(409, { message: `Conflit : la place ${spot.number} est déjà occupée` });
        const id = `bk${Date.now()}`;
        await q(`INSERT INTO bookings (id,spot_id,date,start_time,end_time,status,user_id,source,vehicle_label,is_indefinite,admin_note,checked_in,created_at)
                 VALUES ($1,$2,$3,$4,null,'BLOCKED',$5,'ADMIN',$6,true,$7,false,$8)`,
          [id, spotId, startDate, startTime??'07:00', userId??null, vehicleLabel??null, adminNote??null, new Date().toISOString()]);
        const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [id]);
        return send(201, [await withRelations(bk)]);
      }
      const dates = datesBetween(startDate, endDate || startDate);
      for (const d of dates)
        if (await hasConflict(spotId, d)) return send(409, { message: `Conflit le ${d} : la place ${spot.number} est déjà occupée` });
      const created = [];
      for (const d of dates) {
        const id = `bk${Date.now()}${Math.random().toString(36).slice(2,5)}`;
        await q(`INSERT INTO bookings (id,spot_id,date,start_time,end_time,status,user_id,source,vehicle_label,is_indefinite,admin_note,checked_in,created_at)
                 VALUES ($1,$2,$3,$4,$5,'OCCUPIED',$6,'ADMIN',$7,false,$8,false,$9)`,
          [id, spotId, d, startTime, endTime, userId??null, vehicleLabel??null, adminNote??null, new Date().toISOString()]);
        const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [id]);
        created.push(await withRelations(bk));
      }
      return send(201, created);
    }

    const adminCancelM = path.match(/^\/api\/admin\/bookings\/([^/]+)\/cancel$/);
    if (adminCancelM && method === 'PATCH') {
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [adminCancelM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      await q(`UPDATE bookings SET status='CANCELLED' WHERE id=$1`, [bk.id]);
      const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
      return send(200, await withRelations(upd));
    }

    const adminBookingM = path.match(/^\/api\/admin\/bookings\/([^/]+)$/);
    if (adminBookingM) {
      const [bk] = await q('SELECT * FROM bookings WHERE id=$1', [adminBookingM[1]]);
      if (!bk) return send(404, { message: 'Réservation introuvable' });
      if (method === 'PATCH') {
        const data = await getBody();
        const fm = { spotId:'spot_id', date:'date', startTime:'start_time', endTime:'end_time', status:'status', userId:'user_id', vehicleLabel:'vehicle_label', isIndefinite:'is_indefinite', adminNote:'admin_note' };
        const sets = [], params = [];
        Object.entries(data).forEach(([k,v]) => { if (fm[k]) { params.push(v); sets.push(`${fm[k]}=$${params.length}`); } });
        if (sets.length) { params.push(bk.id); await q(`UPDATE bookings SET ${sets.join(',')} WHERE id=$${params.length}`, params); }
        const [upd] = await q('SELECT * FROM bookings WHERE id=$1', [bk.id]);
        return send(200, await withRelations(upd));
      }
      if (method === 'DELETE') {
        await q('DELETE FROM bookings WHERE id=$1', [bk.id]);
        res.writeHead(204); res.end(); return;
      }
    }

    if (path === '/api/admin/users' && method === 'GET') {
      const users = await q('SELECT * FROM users ORDER BY name');
      return send(200, users.map(adminUser));
    }

    if (path === '/api/admin/logs' && method === 'GET') {
      const logs = await q('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 500');
      return send(200, logs.map(r => ({ id:`log${r.id}`, action:r.action, userId:r.user_id, userName:r.user_name, accessId:r.access_id, role:r.role, detail:r.detail, timestamp:r.timestamp })));
    }

    if (path === '/api/admin/users' && method === 'POST') {
      const { name, email, role, active, locale } = await getBody();
      if (!name || !email || !role) return send(400, { message: 'Champs obligatoires manquants' });
      const [existing] = await q('SELECT id FROM users WHERE email=$1', [email]);
      if (existing) return send(409, { message: `L'email "${email}" est déjà utilisé` });
      const token = generateToken();
      const id = `u${Date.now()}`;
      await q(`INSERT INTO users (id,name,email,access_id,pin,role,locale,active,status,activation_token)
               VALUES ($1,$2,$3,$4,null,$5,$6,$7,'PENDING',$8)`,
        [id, name, email, email.split('@')[0].slice(0,8).toUpperCase(), role??'USER', locale??'fr', active!==false, token]);
      await pushLog('USER_CREATED', { userId:id, userName:name, accessId:email, role:role??'USER', detail:"Lien d'activation généré" });
      void sendActivationMail(email, name, token);
      const [created] = await q('SELECT * FROM users WHERE id=$1', [id]);
      return send(201, adminUser(created));
    }

    const resendM = path.match(/^\/api\/admin\/users\/([^/]+)\/resend-activation$/);
    if (resendM && method === 'POST') {
      const [u] = await q('SELECT * FROM users WHERE id=$1', [resendM[1]]);
      if (!u) return send(404, { message: 'Utilisateur introuvable' });
      const token = generateToken();
      await q(`UPDATE users SET activation_token=$1, status='PENDING', pin=null WHERE id=$2`, [token, u.id]);
      await pushLog('USER_UPDATED', { userId:u.id, userName:u.name, accessId:u.email, role:u.role, detail:"Lien d'activation régénéré" });
      void sendActivationMail(u.email, u.name, token);
      const [upd] = await q('SELECT * FROM users WHERE id=$1', [u.id]);
      return send(200, adminUser(upd));
    }

    const adminUserM = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUserM) {
      const [u] = await q('SELECT * FROM users WHERE id=$1', [adminUserM[1]]);
      if (!u) return send(404, { message: 'Utilisateur introuvable' });
      if (method === 'PATCH') {
        const data = await getBody();
        if (data.email && data.email !== u.email) {
          const [ex] = await q('SELECT id FROM users WHERE email=$1 AND id!=$2', [data.email, u.id]);
          if (ex) return send(409, { message: `L'email "${data.email}" est déjà utilisé` });
        }
        const fm = { name:'name', email:'email', role:'role', active:'active', locale:'locale', trigram:'trigram' };
        const sets = [], params = [];
        Object.entries(data).forEach(([k,v]) => { if (fm[k]) { params.push(v); sets.push(`${fm[k]}=$${params.length}`); } });
        if (sets.length) { params.push(u.id); await q(`UPDATE users SET ${sets.join(',')} WHERE id=$${params.length}`, params); }
        await pushLog('USER_UPDATED', { userId:u.id, userName:u.name, accessId:u.email, role:u.role });
        const [upd] = await q('SELECT * FROM users WHERE id=$1', [u.id]);
        return send(200, adminUser(upd));
      }
      if (method === 'DELETE') {
        await pushLog('USER_DELETED', { userId:u.id, userName:u.name, accessId:u.email, role:u.role });
        await q('DELETE FROM users WHERE id=$1', [u.id]);
        res.writeHead(204); res.end(); return;
      }
    }

    const blockM = path.match(/^\/api\/admin\/spots\/([^/]+)\/block$/);
    if (blockM && method === 'POST') {
      const [spot] = await q('SELECT * FROM spots WHERE id=$1', [blockM[1]]);
      if (!spot) return send(404, { message: 'Place introuvable' });
      const { reason } = await getBody();
      await q(`UPDATE spots SET status='BLOCKED',block_reason=$1 WHERE id=$2`, [reason??null, spot.id]);
      res.writeHead(204); res.end(); return;
    }

    const unblockM = path.match(/^\/api\/admin\/spots\/([^/]+)\/unblock$/);
    if (unblockM && method === 'POST') {
      const [spot] = await q('SELECT * FROM spots WHERE id=$1', [unblockM[1]]);
      if (!spot) return send(404, { message: 'Place introuvable' });
      await q(`UPDATE spots SET status='FREE',block_reason=null WHERE id=$1`, [spot.id]);
      res.writeHead(204); res.end(); return;
    }

    console.log(`[404] ${method} "${path}"`);
    send(404, { message: `Route inconnue: ${method} ${path}` });

  } catch (err) {
    console.error('[ERROR]', err.message);
    send(500, { message: 'Erreur serveur interne' });
  }
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log('');
      console.log('  ✅  BoxBox Parking — PostgreSQL');
      console.log(`  📡  http://localhost:${PORT}`);
      console.log('');
      console.log('  Comptes: admin@dxc.com/0000 · jean.dupont@dxc.com/1234');
      console.log('');
    });
  })
  .catch(err => {
    console.error('❌ Connexion DB impossible:', err.message);
    process.exit(1);
  });
