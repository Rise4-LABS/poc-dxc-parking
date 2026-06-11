// Génère les icônes PWA BoxBox (PNG) sans dépendance — panneau parking "P" blanc sur bleu.
// Usage : node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── PNG encoder minimal ── */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre None
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ── dessin de l'icône ── */
function drawIcon(S) {
  const px = Buffer.alloc(S * S * 4);
  const BG = [30, 64, 175];   // bleu panneau parking
  const FG = [255, 255, 255];

  const corner = S * 0.22;          // coins arrondis du fond
  // "P" : tige + anneau
  const stemX0 = S * 0.32, stemX1 = S * 0.45;
  const stemY0 = S * 0.24, stemY1 = S * 0.78;
  const cx = S * 0.45, cy = S * 0.415;
  const rOut = S * 0.175, rIn = S * 0.062;

  function inRoundedRect(x, y) {
    if (x < 0 || y < 0 || x >= S || y >= S) return false;
    const dx = Math.max(corner - x, x - (S - corner), 0);
    const dy = Math.max(corner - y, y - (S - corner), 0);
    return dx * dx + dy * dy <= corner * corner;
  }
  function inP(x, y) {
    if (x >= stemX0 && x < stemX1 && y >= stemY0 && y < stemY1) return true;
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    return x >= cx && d2 <= rOut * rOut && d2 >= rIn * rIn;
  }

  // 2x2 supersampling pour des bords lisses
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let bgHits = 0, fgHits = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const sx = x + ox, sy = y + oy;
        if (inRoundedRect(sx, sy)) { bgHits++; if (inP(sx, sy)) fgHits++; }
      }
      const i = (y * S + x) * 4;
      const alpha = bgHits / 4;
      const fgRatio = bgHits ? fgHits / bgHits : 0;
      px[i]     = Math.round(BG[0] + (FG[0] - BG[0]) * fgRatio);
      px[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * fgRatio);
      px[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * fgRatio);
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

mkdirSync(join(root, 'apps/web/public/icons'), { recursive: true });
for (const size of [192, 512]) {
  const png = encodePng(size, size, drawIcon(size));
  const out = join(root, `apps/web/public/icons/icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`✅ ${out} (${png.length} octets)`);
}
