// Compose final 800x400 blog featured images:
//   background photo -> cover-crop 800x400 -> dark legibility scrim
//   -> crisp bold white title (auto-wrapped vector text) -> hola prime logo badge.
// Text & logo are rendered as supersampled SVG vectors for sharp, correct output.
//
// Usage: node scripts/make-blog-headers.mjs            (all blogs with a bg)
//        node scripts/make-blog-headers.mjs <slug> ... (only these slugs)

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { blogs } from './blog-headers/blogs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BG_DIR = path.join(ROOT, 'blog-headers', 'bg');
const OUT_DIR = path.join(ROOT, 'blog-headers', 'out');

const W = 800, H = 400;
const SS = 3;                       // supersample factor for crisp text

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- the iridescent white "hola prime" wordmark (vector, from add-logo-badge) ----
async function makeWhiteLogo(targetWidth) {
  const baseW = 160, baseH = 88;
  const scale = (targetWidth / baseW) * 4;
  const svg = `<svg width="${Math.round(baseW * scale)}" height="${Math.round(baseH * scale)}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="globe" cx="38%" cy="32%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="18%" stop-color="#e9c2f2"/>
      <stop offset="42%" stop-color="#ff7eb3"/><stop offset="62%" stop-color="#7ec8e3"/>
      <stop offset="82%" stop-color="#19c6f0"/><stop offset="100%" stop-color="#141430"/>
    </radialGradient></defs>
    <g transform="scale(${scale})">
      <g fill="#FFFFFF" font-family="Arial,'Segoe UI',Helvetica,sans-serif" font-weight="700" font-size="46" letter-spacing="-1.5">
        <text x="0" y="35">h</text>
        <circle cx="47" cy="20" r="16" fill="url(#globe)"/>
        <circle cx="42" cy="13" r="4.2" fill="#ffffff" opacity="0.85"/>
        <text x="68" y="35">la</text>
        <text x="112" y="14" font-size="12" font-weight="700">®</text>
        <text x="0" y="78">prime</text>
      </g></g></svg>`;
  return sharp(Buffer.from(svg), { density: 384 }).resize({ width: targetWidth }).png().toBuffer();
}

// ---- greedy word-wrap with approximate width for bold Arial ----
function wrap(title, fontSize, maxWidth) {
  const charW = fontSize * 0.58;                 // bold Arial avg advance
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (test.length * charW > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// pick the largest font (in [min,max]) that wraps into <= maxLines
function fitText(title, maxWidth, maxLines, min = 26, max = 44) {
  for (let fs = max; fs >= min; fs -= 1) {
    const lines = wrap(title, fs, maxWidth);
    const tooWide = lines.some((l) => l.length * fs * 0.58 > maxWidth);
    if (lines.length <= maxLines && !tooWide) return { fs, lines };
  }
  return { fs: min, lines: wrap(title, min, maxWidth) };
}

async function compose(blog) {
  const bgPath = ['png', 'jpg', 'jpeg', 'webp']
    .map((e) => path.join(BG_DIR, `${blog.slug}.${e}`))
    .find(existsSync);
  if (!bgPath) { console.warn(`· skip ${blog.slug} (no background)`); return false; }

  // background: cover-crop to 800x400
  const bg = await sharp(bgPath).resize(W, H, { fit: 'cover', position: 'center' }).toBuffer();

  // dark legibility scrim (vertical gradient + center band behind title)
  const scrim = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="#070b14" stop-opacity="0.55"/>
        <stop offset="45%" stop-color="#070b14" stop-opacity="0.34"/>
        <stop offset="100%" stop-color="#05080f" stop-opacity="0.72"/>
      </linearGradient>
      <radialGradient id="c" cx="50%" cy="48%" r="62%">
        <stop offset="0%"  stop-color="#05080f" stop-opacity="0.40"/>
        <stop offset="100%" stop-color="#05080f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#v)"/>
    <rect width="${W}" height="${H}" fill="url(#c)"/>
  </svg>`);

  // title text (supersampled vector)
  const maxTextW = 680;
  const { fs, lines } = fitText(blog.title, maxTextW, 3);
  const lineH = fs * 1.18;
  const blockH = lines.length * lineH;
  const startY = (H - blockH) / 2 + fs * 0.82;   // vertically centered
  const tspans = lines.map((l, i) =>
    `<text x="${(W / 2) * SS}" y="${(startY + i * lineH) * SS}" text-anchor="middle"
       font-family="Arial,'Segoe UI',Helvetica,sans-serif" font-weight="800"
       font-size="${fs * SS}" letter-spacing="${-0.5 * SS}"
       fill="#ffffff">${esc(l)}</text>`).join('');
  const titleSvg = Buffer.from(`<svg width="${W * SS}" height="${H * SS}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${1.2 * SS}" stdDeviation="${2.2 * SS}" flood-color="#000000" flood-opacity="0.6"/>
    </filter></defs>
    <g filter="url(#sh)">${tspans}</g></svg>`);
  const titleLayer = await sharp(titleSvg, { density: 72 }).resize(W, H).png().toBuffer();

  // logo badge bottom-right
  const logoW = Math.round(W * 0.085);
  const logo = await makeWhiteLogo(logoW);
  const lMeta = await sharp(logo).metadata();
  const margin = Math.round(W * 0.03);

  const out = path.join(OUT_DIR, `${blog.slug}.webp`);
  await sharp(bg)
    .composite([
      { input: scrim, top: 0, left: 0 },
      { input: titleLayer, top: 0, left: 0 },
      { input: logo, left: W - lMeta.width - margin, top: H - lMeta.height - margin },
    ])
    .webp({ quality: 92 })
    .toFile(out);
  console.log(`✓ ${blog.slug}.webp  [${fs}px / ${lines.length} lines]`);
  return true;
}

const only = process.argv.slice(2);
const todo = only.length ? blogs.filter((b) => only.includes(b.slug)) : blogs;
let n = 0;
for (const b of todo) if (await compose(b)) n++;
console.log(`\nDone: ${n}/${todo.length} composed -> blog-headers/out/`);
