/**
 * Text Overlay Engine — Sharp + SVG
 *
 * Composites perfectly-spelled text onto AI-generated visual-only ("plate") images.
 * Solves the #1 quality problem: image models misspell/duplicate/garble text.
 *
 * NOT a single fixed template. There are several genuinely DISTINCT layout
 * archetypes (bold left column, single dominant number, top-weighted editorial,
 * side rail, minimal corner). Per creative we (a) read the plate to find the
 * region it actually left calm, then (b) pick an archetype that drops the copy
 * into that negative space — rotating so consecutive creatives don't repeat.
 * The result: variety + text that lands in real empty space, not a hardcoded band.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ─── Types ───

export type LayoutArchetype =
  | 'left-column' | 'dominant-number' | 'top-editorial' | 'side-rail' | 'minimal-corner';

export interface TextOverlayConfig {
  headline?: string;
  subheadline?: string;
  price?: string;
  bullets?: string[];
  cta?: string;
  disclaimer?: string;
  attentionGrabber?: string;
  promoCode?: string;
  urgencyText?: string;
  /** Archetype name, 'auto' (content-aware pick), or a legacy alias. */
  layout: LayoutArchetype | 'auto' | 'editorial' | 'cinematic' | 'data_native' | 'poster' | 'comparison' | 'storytelling' | 'minimal' | 'collage' | 'standard';
  darkBackground?: boolean;
  logoText?: string;
  tagline?: string;
  /** When false, the compositor draws NO logo (caller composites its own). Default true. */
  drawLogo?: boolean;
  /** Brief-named brand accent (hex) — colours the hero price, CTA pill and promo chip. */
  accentColor?: string;
}

// ─── Helpers ───

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > maxChars) {
      if (cur.trim()) lines.push(cur.trim());
      cur = word;
    } else cur = (cur + ' ' + word).trim();
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

const CHARW = 0.62; // bold Arial average glyph-width factor

/** Shrink a headline until its longest wrapped line fits maxW — never clip. */
function fitText(text: string, maxW: number, startSize: number, minRatio = 0.6): { size: number; lines: string[] } {
  let size = startSize;
  let lines: string[] = [];
  for (let i = 0; i < 12; i++) {
    const maxChars = Math.max(4, Math.floor(maxW / (size * CHARW)));
    lines = wrapText(text, maxChars);
    const longest = lines.reduce((a, b) => Math.max(a, b.length), 0);
    if (longest * size * CHARW <= maxW || size <= startSize * minRatio) break;
    size = Math.round(size * 0.92);
  }
  return { size, lines };
}

// ─── Plate analysis: where did the image leave calm negative space? ───

interface PlateRegions {
  // mean brightness 0..255 (lower = darker = better for white text)
  left: number; right: number; top: number; bottom: number; middle: number; center: number;
  corners: { tl: number; tr: number; bl: number; br: number };
  calmSide: 'left' | 'right';       // darker vertical half
  calmBand: 'top' | 'bottom';       // darker horizontal band (excl. middle)
  calmCorner: 'tl' | 'tr' | 'bl' | 'br';
  subjectInMiddle: boolean;         // middle noticeably brighter than top+bottom
}

async function analyzePlate(buf: Buffer): Promise<PlateRegions> {
  const COLS = 6, ROWS = 8;
  let g: Buffer;
  try {
    g = await sharp(buf).greyscale().resize(COLS, ROWS, { fit: 'fill' }).raw().toBuffer();
  } catch {
    g = Buffer.alloc(COLS * ROWS, 20); // assume dark on failure
  }
  const at = (c: number, r: number) => g[r * COLS + c] ?? 20;
  const avg = (cells: Array<[number, number]>) => cells.reduce((s, [c, r]) => s + at(c, r), 0) / cells.length;
  const range = (cs: number[], rs: number[]) => { const a: Array<[number, number]> = []; for (const r of rs) for (const c of cs) a.push([c, r]); return avg(a); };

  const left = range([0, 1, 2], [0, 1, 2, 3, 4, 5, 6, 7]);
  const right = range([3, 4, 5], [0, 1, 2, 3, 4, 5, 6, 7]);
  const top = range([0, 1, 2, 3, 4, 5], [0, 1]);
  const bottom = range([0, 1, 2, 3, 4, 5], [5, 6, 7]);
  const middle = range([0, 1, 2, 3, 4, 5], [2, 3, 4]);
  const center = range([1, 2, 3, 4], [2, 3, 4, 5]);
  const corners = {
    tl: range([0, 1], [0, 1, 2]), tr: range([4, 5], [0, 1, 2]),
    bl: range([0, 1], [5, 6, 7]), br: range([4, 5], [5, 6, 7]),
  };
  const calmCorner = (['tl', 'tr', 'bl', 'br'] as const).reduce((a, k) => (corners[k] < corners[a] ? k : a), 'br' as 'tl' | 'tr' | 'bl' | 'br');
  return {
    left, right, top, bottom, middle, center, corners,
    calmSide: left <= right ? 'left' : 'right',
    calmBand: top <= bottom ? 'top' : 'bottom',
    calmCorner,
    subjectInMiddle: middle > top + 12 && middle > bottom + 12,
  };
}

// ─── Archetype selection (content-aware + anti-repeat rotation) ───

const ALL_ARCHETYPES: LayoutArchetype[] = ['left-column', 'dominant-number', 'top-editorial', 'side-rail', 'minimal-corner'];
const _recentLayouts: LayoutArchetype[] = [];
const RECENT_CAP = 2;

function resolveLayout(layout: TextOverlayConfig['layout']): LayoutArchetype | 'auto' {
  if ((ALL_ARCHETYPES as string[]).includes(layout)) return layout as LayoutArchetype;
  switch (layout) {
    case 'editorial': case 'storytelling': return 'top-editorial';
    case 'data_native': case 'poster': return 'dominant-number';
    case 'minimal': return 'minimal-corner';
    case 'cinematic': return 'side-rail';
    default: return 'auto'; // 'standard' | 'comparison' | 'collage' | 'auto'
  }
}

/** Fit score (higher = the plate's calm space suits this archetype better). */
function fitScore(a: LayoutArchetype, r: PlateRegions): number {
  const dark = (v: number) => 255 - v; // more darkness = calmer
  switch (a) {
    case 'left-column': return dark(Math.min(r.left, r.right)) + Math.abs(r.left - r.right) * 0.6;
    case 'side-rail': return dark(Math.min(r.left, r.right)) + Math.abs(r.left - r.right) * 0.4;
    case 'top-editorial': return dark(r.top) + dark(r.bottom) + (r.subjectInMiddle ? 40 : 0);
    case 'dominant-number': return dark(r.center) + dark(r.middle) * 0.5;
    case 'minimal-corner': return dark(r.corners[r.calmCorner]) * 1.2;
  }
}

function pickArchetype(r: PlateRegions): LayoutArchetype {
  const ranked = [...ALL_ARCHETYPES].sort((a, b) => fitScore(b, r) - fitScore(a, r));
  const fresh = ranked.filter((a) => !_recentLayouts.includes(a));
  // Prefer a well-fitting archetype we haven't used recently; else best fit.
  const pool = fresh.length ? fresh.slice(0, Math.max(1, Math.ceil(fresh.length / 2))) : ranked;
  const chosen = pool[Math.floor(Math.random() * pool.length)] || ranked[0];
  _recentLayouts.push(chosen);
  while (_recentLayouts.length > RECENT_CAP) _recentLayouts.shift();
  return chosen;
}

// ─── SVG text helper factory (bound to nothing; pure) ───

function makeTxt() {
  return (x: number | string, y: number, text: string, size: number, opts: {
    weight?: string; fill?: string; anchor?: string; spacing?: number; opacity?: number; stroke?: boolean;
  } = {}): string => {
    const { weight = '700', fill = '#FFFFFF', anchor = 'middle', spacing = 0, opacity = 1, stroke = true } = opts;
    const common = `x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}"`;
    let out = '';
    if (stroke) out += `<text ${common} fill="none" stroke="black" stroke-width="${Math.max(3, Math.round(size * 0.08))}" stroke-linejoin="round">${escapeXml(text)}</text>\n`;
    out += `<text ${common} fill="${fill}">${escapeXml(text)}</text>`;
    return out;
  };
}

function linearScrim(id: string, x1: number, y1: number, x2: number, y2: number, stops: Array<[number, number]>): string {
  const s = stops.map(([o, op]) => `<stop offset="${o}%" stop-color="#000000" stop-opacity="${op}"/>`).join('');
  return `<defs><linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient></defs>`;
}

// ─── Archetype layout context + renderers ───

interface Ctx {
  W: number; H: number; pad: number; cx: number;
  cfg: TextOverlayConfig; R: PlateRegions;
  txt: ReturnType<typeof makeTxt>;
  S: { headline: number; price: number; sub: number; bullet: number; cta: number };
}

function bulletsOf(cfg: TextOverlayConfig, max: number): string[] {
  return (Array.isArray(cfg.bullets) ? cfg.bullets : []).slice(0, max).map((b) => b.replace(/^[•\-]\s*/, '').trim()).filter(Boolean);
}

/** Perceived-lightness check so accent pills keep readable label text. */
function isLightHexColor(hex: string): boolean {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

function ctaPill(ctx: Ctx, x: number, y: number, anchor: 'start' | 'middle' | 'end', size: number): string[] {
  const { cfg, txt } = ctx;
  if (!cfg.cta) return [];
  // Brief-named brand accent (e.g. "gold") drives the CTA pill; default stays blue.
  const pillFill = cfg.accentColor || '#2563EB';
  const labelFill = isLightHexColor(pillFill) ? '#0b1220' : '#FFFFFF';
  const h = Math.round(size * 2.4);
  const w = Math.min(Math.round(ctx.W * 0.62), Math.round(cfg.cta.length * size * 0.62 + 70));
  // Clamp so the pill never runs off either edge.
  let left = anchor === 'start' ? x : anchor === 'end' ? Math.round(x - w) : Math.round(x - w / 2);
  left = Math.max(ctx.pad, Math.min(left, ctx.W - ctx.pad - w));
  const parts = [
    `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${pillFill}"/>`,
    txt(left + w / 2, y + h / 2 + size * 0.35, cfg.cta, size, { weight: '700', stroke: false, fill: labelFill }),
  ];
  // GUARANTEED PROMO CODE: an offer creative must always show its code (live
  // QA failure: PRIME25 was parsed but no archetype rendered it). A compact
  // outlined chip sits directly under the CTA in every archetype.
  if (cfg.promoCode) {
    const cSize = Math.round(size * 0.82);
    // The enhancer sometimes emits "USE CODE: X" as the code value — strip any
    // such prefix so the chip never reads "Code: USE CODE: X" (live defect).
    const codeClean = cfg.promoCode.replace(/^\s*(?:use\s+code|code)\s*[:\s]\s*/i, '').trim() || cfg.promoCode.trim();
    const label = `Code: ${codeClean}`;
    const cw = Math.round(label.length * cSize * 0.6 + cSize * 1.6);
    const ch = Math.round(cSize * 2);
    let cLeft = anchor === 'start' ? left : anchor === 'end' ? left + w - cw : Math.round(left + w / 2 - cw / 2);
    cLeft = Math.max(ctx.pad, Math.min(cLeft, ctx.W - ctx.pad - cw));
    const cy = y + h + Math.round(ch * 0.35);
    parts.push(
      `<rect x="${cLeft}" y="${cy}" width="${cw}" height="${ch}" rx="${ch / 2}" fill="rgba(10,10,18,0.55)" stroke="${cfg.accentColor || '#FFFFFF'}" stroke-width="1.5"/>`,
      txt(cLeft + cw / 2, cy + ch / 2 + cSize * 0.35, label, cSize, { weight: '700', stroke: false, fill: cfg.accentColor || '#FFFFFF' }),
    );
  }
  return parts;
}

// A) Bold left (or right) column — text stacked in the calmer vertical half.
function archLeftColumn(ctx: Ctx): string[] {
  const { W, H, pad, cfg, R, txt, S } = ctx;
  const side = R.calmSide;
  const colW = Math.round(W * 0.5);
  const x = side === 'left' ? pad : W - pad - colW; // block left edge
  const anchor: 'start' = 'start';
  const parts: string[] = [];
  // side scrim (dark on the text side)
  parts.push(linearScrim('lc', side === 'left' ? 0 : 1, 0, side === 'left' ? 1 : 0, 0, [[0, 0.86], [55, 0.5], [100, 0]]));
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#lc)"/>`);

  const hl = fitText((cfg.headline || '').toUpperCase(), colW, Math.round(S.headline * 1.25));
  const bl = bulletsOf(cfg, 4);
  // measure block height
  let bh = hl.lines.length * Math.round(hl.size * 1.15) + Math.round(S.sub * 1.6);
  if (cfg.price) bh += Math.round(S.price * 1.5);
  bh += bl.length * Math.round(S.bullet * 1.6) + Math.round(S.cta * 3);
  let y = Math.max(Math.round(H * 0.2), Math.round(H * 0.52 - bh / 2));

  for (const ln of hl.lines) { parts.push(txt(x, y, ln, hl.size, { weight: '900', anchor, spacing: 1 })); y += Math.round(hl.size * 1.15); }
  y += Math.round(S.sub * 0.6);
  if (cfg.subheadline && cfg.subheadline.length < 90) { parts.push(txt(x, y, cfg.subheadline, S.sub, { weight: '500', fill: '#D6DAE2', anchor })); y += Math.round(S.sub * 1.7); }
  if (cfg.price) { y += Math.round(S.price * 0.75); parts.push(txt(x, y, cfg.price, S.price, { weight: '900', anchor, fill: cfg.accentColor || '#FFFFFF' })); y += Math.round(S.price * 0.7); }
  for (const b of bl) { parts.push(txt(x, y, `•  ${b}`, S.bullet, { weight: '400', fill: '#E0E4EA', anchor })); y += Math.round(S.bullet * 1.6); }
  y += Math.round(S.cta * 0.6);
  parts.push(...ctaPill(ctx, x, y, 'start', S.cta));
  return parts;
}

// B) Single dominant number — the hero figure owns the frame.
function archDominantNumber(ctx: Ctx): string[] {
  const { W, H, cx, pad, cfg, txt, S } = ctx;
  const parts: string[] = [];
  const numY = Math.round(H * 0.5);
  // radial-ish scrim: darken a central band
  parts.push(linearScrim('dn', 0, 0, 0, 1, [[0, 0.15], [30, 0.7], [70, 0.7], [100, 0.15]]));
  parts.push(`<rect x="0" y="${Math.round(H * 0.24)}" width="${W}" height="${Math.round(H * 0.52)}" fill="url(#dn)"/>`);
  const hero = cfg.price || (cfg.headline || '').split(' ').find((w) => /\d/.test(w)) || '';
  if (cfg.headline) {
    const hl = fitText(cfg.headline.toUpperCase(), W - pad * 2, Math.round(S.headline * 0.9));
    let hy = numY - Math.round(H * 0.14) - (hl.lines.length - 1) * Math.round(hl.size * 1.1);
    for (const ln of hl.lines) { parts.push(txt(cx, hy, ln, hl.size, { weight: '800', spacing: 1 })); hy += Math.round(hl.size * 1.1); }
  }
  if (hero) {
    const big = fitText(hero, W * 0.92, Math.round(H * 0.2), 0.5);
    parts.push(txt(cx, numY + Math.round(big.size * 0.32), hero, big.size, { weight: '900' }));
  }
  const bl = bulletsOf(cfg, 3);
  let by = numY + Math.round(H * 0.11);
  if (bl.length) {
    const line = bl.join('   ·   ');
    let bs = S.bullet;
    while (line.length * bs * 0.5 > W - pad * 2 && bs > Math.round(S.bullet * 0.55)) bs = Math.round(bs * 0.92);
    parts.push(txt(cx, by, line, bs, { weight: '500', fill: '#D6DAE2' }));
    by += Math.round(S.bullet * 1.8);
  }
  parts.push(...ctaPill(ctx, cx, by + Math.round(H * 0.02), 'middle', S.cta));
  return parts;
}

// C) Top-weighted editorial — big headline up top, hero + CTA at the base, subject breathes in the middle.
function archTopEditorial(ctx: Ctx): string[] {
  const { W, H, pad, cfg, txt, S } = ctx;
  const parts: string[] = [];
  parts.push(linearScrim('teTop', 0, 0, 0, 1, [[0, 0.85], [100, 0]]));
  parts.push(`<rect x="0" y="0" width="${W}" height="${Math.round(H * 0.42)}" fill="url(#teTop)"/>`);
  parts.push(linearScrim('teBot', 0, 1, 0, 0, [[0, 0.9], [100, 0]]));
  parts.push(`<rect x="0" y="${Math.round(H * 0.66)}" width="${W}" height="${Math.round(H * 0.34)}" fill="url(#teBot)"/>`);

  const hl = fitText((cfg.headline || '').toUpperCase(), W - pad * 2, Math.round(S.headline * 1.35));
  let y = Math.round(H * 0.135);
  for (const ln of hl.lines) { parts.push(txt(pad, y, ln, hl.size, { weight: '900', anchor: 'start', spacing: 1 })); y += Math.round(hl.size * 1.14); }
  if (cfg.subheadline && cfg.subheadline.length < 90) { y += Math.round(S.sub * 0.4); parts.push(txt(pad, y, cfg.subheadline, S.sub, { weight: '500', fill: '#D6DAE2', anchor: 'start' })); }

  // base: price left, CTA right (or stacked)
  let by = Math.round(H * 0.78);
  if (cfg.price) { parts.push(txt(pad, by, cfg.price, S.price, { weight: '900', anchor: 'start', fill: cfg.accentColor || '#FFFFFF' })); }
  const bl = bulletsOf(cfg, 3);
  if (bl.length) { let yy = by + Math.round(S.price * 0.4); for (const b of bl) { yy += Math.round(S.bullet * 1.5); parts.push(txt(pad, yy, `•  ${b}`, S.bullet, { weight: '400', fill: '#E0E4EA', anchor: 'start' })); } }
  parts.push(...ctaPill(ctx, W - pad, by - Math.round(S.cta * 1.4), 'end', S.cta));
  return parts;
}

// D) Side rail — a translucent panel on the calmer side, subject fills the rest.
function archSideRail(ctx: Ctx): string[] {
  const { W, H, pad, cfg, R, txt, S } = ctx;
  const parts: string[] = [];
  const side = R.calmSide;
  const railW = Math.round(W * 0.44);
  const railX = side === 'right' ? W - railW : 0;
  const innerX = railX + Math.round(pad * 0.7);
  parts.push(`<rect x="${railX}" y="0" width="${railW}" height="${H}" fill="#000000" opacity="0.6"/>`);
  parts.push(`<rect x="${side === 'right' ? railX : railX + railW - 4}" y="0" width="4" height="${H}" fill="#2563EB" opacity="0.9"/>`);

  const colW = railW - Math.round(pad * 1.2);
  const hl = fitText((cfg.headline || '').toUpperCase(), colW, Math.round(S.headline * 1.05));
  const bl = bulletsOf(cfg, 4);
  let bh = hl.lines.length * Math.round(hl.size * 1.15) + (cfg.price ? Math.round(S.price * 1.4) : 0) + bl.length * Math.round(S.bullet * 1.6) + Math.round(S.cta * 3);
  let y = Math.max(Math.round(H * 0.16), Math.round(H * 0.5 - bh / 2));
  for (const ln of hl.lines) { parts.push(txt(innerX, y, ln, hl.size, { weight: '900', anchor: 'start' })); y += Math.round(hl.size * 1.15); }
  if (cfg.price) { y += Math.round(S.price * 0.7); parts.push(txt(innerX, y, cfg.price, S.price, { weight: '900', anchor: 'start', fill: cfg.accentColor || '#FFFFFF' })); y += Math.round(S.price * 0.7); }
  for (const b of bl) { parts.push(txt(innerX, y, `•  ${b}`, S.bullet, { weight: '400', fill: '#E0E4EA', anchor: 'start' })); y += Math.round(S.bullet * 1.6); }
  y += Math.round(S.cta * 0.7);
  parts.push(...ctaPill(ctx, innerX, y, 'start', Math.round(S.cta * 0.95)));
  return parts;
}

// E) Minimal corner — a tight cluster tucked into the calmest corner; lots of breathing room.
function archMinimalCorner(ctx: Ctx): string[] {
  const { W, H, pad, cfg, R, txt, S } = ctx;
  const parts: string[] = [];
  // avoid top-left (logo lives there)
  let corner = R.calmCorner;
  if (corner === 'tl') corner = R.corners.bl <= R.corners.br ? 'bl' : 'br';
  const bottom = corner === 'bl' || corner === 'br';
  const leftSide = corner === 'bl'; // 'tl' is impossible here (remapped above — logo corner)
  const anchor: 'start' | 'end' = leftSide ? 'start' : 'end';
  const x = leftSide ? pad : W - pad;
  const colW = Math.round(W * 0.6);
  // soft corner scrim
  const sy = bottom ? Math.round(H * 0.62) : Math.round(H * 0.1);
  parts.push(linearScrim('mc', 0, bottom ? 1 : 0, 0, bottom ? 0 : 1, [[0, 0.82], [100, 0]]));
  parts.push(`<rect x="0" y="${sy}" width="${W}" height="${Math.round(H * 0.38)}" fill="url(#mc)"/>`);

  const hl = fitText((cfg.headline || '').toUpperCase(), colW, Math.round(S.headline * 1.1));
  const blockH = hl.lines.length * Math.round(hl.size * 1.15) + (cfg.price ? Math.round(S.price * 1.3) : 0) + Math.round(S.cta * 3);
  let y = bottom ? Math.round(H * 0.9 - blockH) : Math.round(H * 0.16);
  for (const ln of hl.lines) { parts.push(txt(x, y, ln, hl.size, { weight: '900', anchor, spacing: 1 })); y += Math.round(hl.size * 1.15); }
  if (cfg.price) { y += Math.round(S.price * 0.7); parts.push(txt(x, y, cfg.price, S.price, { weight: '900', anchor })); y += Math.round(S.price * 0.55); }
  y += Math.round(S.cta * 0.6);
  parts.push(...ctaPill(ctx, x, y, leftSide ? 'start' : 'end', S.cta));
  return parts;
}

const RENDERERS: Record<LayoutArchetype, (c: Ctx) => string[]> = {
  'left-column': archLeftColumn,
  'dominant-number': archDominantNumber,
  'top-editorial': archTopEditorial,
  'side-rail': archSideRail,
  'minimal-corner': archMinimalCorner,
};

// ─── Main export ───

export async function applyTextOverlay(imageDataUri: string, config: TextOverlayConfig): Promise<string> {
  try {
    const commaIdx = imageDataUri.indexOf(',');
    if (commaIdx === -1) return imageDataUri;
    const imageBuffer = Buffer.from(imageDataUri.substring(commaIdx + 1), 'base64');

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1536;

    // NEVER-HEROLESS GUARD: a creative must always carry a dominant text element
    // (the claim gate may have dropped the headline). Promote the best remaining
    // claim-safe copy to headline scale rather than shipping bullets-only.
    if (!config.headline?.trim() && !config.price?.trim()) {
      const promoted = config.attentionGrabber?.trim() || config.subheadline?.trim() || (config.bullets || [])[0]?.trim();
      if (promoted) {
        config = { ...config, headline: promoted };
        if (promoted === config.attentionGrabber?.trim()) config.attentionGrabber = '';
        else if (promoted === config.subheadline?.trim()) config.subheadline = '';
        else config.bullets = (config.bullets || []).slice(1);
        console.warn('[TextOverlay] No headline/price — promoted secondary copy to hero scale (never-heroless rule).');
      }
    }

    const regions = await analyzePlate(imageBuffer);
    const requested = resolveLayout(config.layout);
    const archetype = requested === 'auto' ? pickArchetype(regions) : requested;
    console.log(`[TextOverlay] ${width}x${height} | archetype=${archetype} | calmSide=${regions.calmSide} calmCorner=${regions.calmCorner} subjectMid=${regions.subjectInMiddle}`);

    const pad = Math.round(width * 0.06);
    const cx = Math.round(width / 2);
    const S = {
      headline: Math.round(height * 0.045),
      price: Math.round(height * 0.085),
      sub: Math.round(height * 0.023),
      bullet: Math.round(height * 0.022),
      cta: Math.round(height * 0.026),
    };
    const disclaimerSize = Math.round(height * 0.0105);
    const txt = makeTxt();
    const svgParts: string[] = [];

    // 1) Archetype copy (scrims + text) — drawn first so branding sits on top.
    const ctx: Ctx = { W: width, H: height, pad, cx, cfg: config, R: regions, txt, S };
    svgParts.push(...RENDERERS[archetype](ctx));

    // 2) Brand band: logo top-left + tagline top-right (guardrail — always lands).
    const brandTop = Math.round(height * 0.035);
    const brandLogoH = Math.round(height * 0.05);
    const brandCenterY = brandTop + Math.round(brandLogoH / 2);
    const isBrightLogoArea = regions.corners.tl > 150;
    const drawLogo = config.drawLogo !== false;
    const logoPath = path.join(process.cwd(), 'public', 'holaprime-logo.png');
    let logoImageBuffer: Buffer | null = null;
    let logoImgW = 0, logoImgH = 0, hasLogoImage = false;
    try {
      if (drawLogo && fs.existsSync(logoPath)) {
        logoImageBuffer = await sharp(logoPath).resize({ width: Math.round(width * 0.28), height: brandLogoH, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
        const lm = await sharp(logoImageBuffer).metadata();
        logoImgW = lm.width || brandLogoH; logoImgH = lm.height || brandLogoH; hasLogoImage = true;
      }
    } catch { hasLogoImage = false; }

    if (hasLogoImage && isBrightLogoArea) {
      const m = Math.round(height * 0.012);
      svgParts.push(`<rect x="${pad - m}" y="${brandTop - m}" width="${logoImgW + 2 * m}" height="${logoImgH + 2 * m}" rx="12" fill="#FFFFFF"/>`);
    } else if (drawLogo && !hasLogoImage) {
      const scale = brandLogoH / 95;
      const fg = isBrightLogoArea ? '#000000' : '#FFFFFF';
      svgParts.push(`<g transform="translate(${pad}, ${brandTop}) scale(${scale})"><g font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="44" fill="${fg}" letter-spacing="-2">${!isBrightLogoArea ? `<g fill="rgba(0,0,0,0.5)"><text x="2" y="34">h</text><text x="68" y="34">la</text><text x="2" y="72">prime</text></g>` : ''}<text x="0" y="32">h</text><circle cx="45" cy="18" r="15" fill="#00d4ff"/><text x="66" y="32">la</text><text x="0" y="70">prime</text></g></g>`);
    }

    // 3) Tagline top-right (on top of any scrim).
    const tagline = config.tagline !== undefined ? config.tagline : '#WeAreTraders';
    if (tagline) {
      const tagSize = Math.round(height * 0.02);
      svgParts.push(txt(width - pad, brandCenterY + Math.round(tagSize * 0.36), tagline, tagSize, { weight: '400', anchor: 'end' }));
    }

    // 4) Disclaimer — always pinned to the very bottom, over a thin bottom scrim.
    if (config.disclaimer) {
      const maxDiscChars = Math.floor((width - pad * 2) / (disclaimerSize * 0.52));
      const discLines = wrapText(config.disclaimer.toUpperCase(), maxDiscChars).slice(0, 4);
      svgParts.push(linearScrim('disc', 0, 1, 0, 0, [[0, 0.75], [100, 0]]));
      svgParts.push(`<rect x="0" y="${height - Math.round(height * 0.1)}" width="${width}" height="${Math.round(height * 0.1)}" fill="url(#disc)"/>`);
      let discY = height - Math.round(pad * 0.5) - Math.round((discLines.length - 1) * disclaimerSize * 1.3);
      for (const line of discLines) { svgParts.push(txt(cx, discY, line, disclaimerSize, { weight: '300', fill: '#9AA1AC', stroke: false })); discY += Math.round(disclaimerSize * 1.3); }
    }

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n${svgParts.join('\n')}\n</svg>`;

    const composites: sharp.OverlayOptions[] = [{ input: Buffer.from(svg), top: 0, left: 0 }];
    if (hasLogoImage && logoImageBuffer) composites.push({ input: logoImageBuffer, top: brandTop, left: pad, blend: 'over' });

    const result = await sharp(imageBuffer).composite(composites).png().toBuffer();
    console.log(`[TextOverlay] ✓ Overlay applied (archetype=${archetype})`);
    return `data:image/png;base64,${result.toString('base64')}`;
  } catch (err: any) {
    console.error('[TextOverlay] ✗ FAILED:', err.message, err.stack?.substring(0, 200));
    return imageDataUri;
  }
}

/** Extract text elements from a Studio brief for overlay. */
export function extractOverlayConfig(brief: any, paradigmId: string): TextOverlayConfig {
  const copywriting = brief?.copywriting || {};
  const headline = copywriting.headline?.primary || '';
  const hookOrGrabber = copywriting.attentionGrabber || copywriting.hookText || '';
  const price = hookOrGrabber.match(/\$[\d,]+[KkMm]?/)?.[0] || headline.match(/\$[\d,]+[KkMm]?/)?.[0] || '';
  const discountText = copywriting.discountText || '';
  const promoCode = discountText.match(/(?:USE CODE[:\s]*|CODE[:\s]*)(\S+)/i)?.[0] || discountText.match(/[A-Z]{3,}\d+/)?.[0] || '';

  return {
    headline,
    subheadline: copywriting.body?.primary || '',
    price,
    bullets: (copywriting.benefitBullets || []).map((b: string) => b.replace(/^[•\-]\s*/, '')),
    cta: copywriting.cta?.primary || 'Buy Challenge',
    disclaimer: copywriting.disclaimerText || 'HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS.',
    attentionGrabber: hookOrGrabber.replace(/\$[\d,]+[KkMm]?/, '').trim() || '',
    promoCode,
    urgencyText: copywriting.urgencyText || '',
    // Let the engine pick a content-aware archetype (and rotate) instead of a fixed template.
    layout: 'auto',
    darkBackground: true,
    logoText: 'hola prime',
    tagline: '#WeAreTraders',
  };
}
