// 生成 PWA PNG 图标（暗色圆角方块 + 金色光环 + 金色圆点），无外部依赖
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function insideRounded(x, y, W, H, r) {
  const nx = Math.min(x, W - x);
  const ny = Math.min(y, H - y);
  if (nx >= r || ny >= r) return true;
  const dx = r - nx;
  const dy = r - ny;
  if (dx <= 0 && dy <= 0) return true;
  if (dx > 0 && dy > 0) return dx * dx + dy * dy <= r * r;
  return true;
}

function drawIcon(size) {
  const ss = 4;
  const W = size;
  const H = size;
  const buf = Buffer.alloc(W * H * 4);
  const cx = W / 2;
  const cy = H / 2;
  const cornerR = W * 0.22;
  const bg = [11, 14, 17];
  const gold = [240, 185, 11];
  const ringInner = W * 0.165;
  const ringOuter = W * 0.215;
  const dotR = W * 0.055;
  const glowSigma = W * 0.05;
  const ringMid = (ringInner + ringOuter) / 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let accR = 0,
        accG = 0,
        accB = 0,
        accA = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          if (!insideRounded(px, py, W, H, cornerR)) continue;
          accA += 1;
          accR += bg[0];
          accG += bg[1];
          accB += bg[2];
          const dx = px - cx;
          const dy = py - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          const glow = Math.exp(-((d - ringMid) * (d - ringMid)) / (2 * glowSigma * glowSigma)) * 0.35;
          accR += gold[0] * glow;
          accG += gold[1] * glow;
          accB += gold[2] * glow;
          if (d >= ringInner && d <= ringOuter) {
            accR += gold[0] - bg[0];
            accG += gold[1] - bg[1];
            accB += gold[2] - bg[2];
          }
          if (d <= dotR) {
            accR += gold[0] - bg[0];
            accG += gold[1] - bg[1];
            accB += gold[2] - bg[2];
          }
        }
      }
      const n = ss * ss;
      if (accA === 0) {
        a = 0;
      } else {
        a = Math.round((255 * accA) / n);
        r = Math.min(255, Math.round(accR / accA));
        g = Math.min(255, Math.round(accG / accA));
        b = Math.min(255, Math.round(accB / accA));
      }
      const idx = (y * W + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }
  return encodePNG(W, H, buf);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const s of [192, 512, 180]) {
  writeFileSync(join(OUT_DIR, `icon-${s}.png`), drawIcon(s));
  console.log('generated icon-' + s + '.png');
}
