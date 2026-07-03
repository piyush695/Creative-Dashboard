/**
 * Template Studio — renders Hola Prime creatives from a locked design system
 * (see brand-system.ts), the way the in-house designers do: bold TYPOGRAPHY +
 * LAYOUT + brand furniture on a code-rendered background. gpt-image-1 is used
 * ONLY for the genuinely photographic archetypes; everything else is 100%
 * deterministic SVG/sharp — pixel-perfect and byte-identical brand furniture.
 *
 * Archetypes (from the 22 reference ads): giant-number · testimonial ·
 * benefit-stack · photographic. Backgrounds: black · orb (iridescent sphere) ·
 * solid · photo.
 */

import './font-setup'; // MUST precede sharp so fontconfig finds bundled Poppins
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { CANVAS, ACCENTS, DISCLAIMER, esc, wrap, T, commonDefs, brandFurniture } from './brand-system';
import { FONT } from './font-setup';
import { applyLogoOverlay } from './logo-overlay';
import { hasAsset, compositeFurniture } from './brand-assets';

function isLightHex(hex?: string): boolean {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

const { W, H } = CANVAS;

export type Archetype = 'giant-number' | 'testimonial' | 'benefit-stack' | 'photographic';

export interface CreativeSpec {
  archetype: Archetype;
  accent?: string;                 // key of ACCENTS or hex
  background?: 'black' | 'orb' | 'solid' | 'photo';
  photoDataUri?: string;           // required for background:'photo'
  solidColor?: string;
  eyebrow?: string;                // small line above the hero
  hero?: string;                   // the giant number/offer, e.g. "$4,000,000", "FLAT 45% OFF"
  heroStyle?: 'chrome' | 'accent' | 'white';
  strikePrice?: string;            // red strikethrough anchor price
  subline?: string;                // supporting line; **token** wrapped in ** ** is emphasized
  headline?: string;               // top headline (testimonial/benefit/photographic)
  headlineHero?: string;           // second, larger headline line (often accent-colored)
  bullets?: string[];              // benefit pills
  promoCode?: string;
  ctaLabel?: string;               // e.g. "Use Code: WELCOME20" or "Buy Challenge"
  ctaStyle?: 'solid' | 'outline';
  badge?: boolean;                 // ZERO PAYOUT DENIAL stamp
  testimonial?: { name: string; handle: string; verified?: boolean; title: string; body: string; highlight: string; date: string };
  /** Composition arrangement for giant-number (rotated per request so two offer
   *  briefs don't wear the identical suit — the live "same design language" bug). */
  layoutVariant?: 'editorial' | 'centered' | 'poster';
  /** Deterministic variety seed: shifts sphere positions/hues per generation. */
  seed?: number;
}

function resolveAccent(a?: string): string {
  if (!a) return ACCENTS.cyan;
  return ACCENTS[a] || (a.startsWith('#') ? a : ACCENTS.cyan);
}

function fitOne(text: string, maxW: number, start: number, charw = 0.6, min = 0.3): number {
  let s = start;
  while (text.length * s * charw > maxW && s > start * min) s = Math.round(s * 0.94);
  return s;
}

// ─── Procedural backgrounds — glossy, rim-lit spheres (not flat glows) ───
// A dark planet with a soft halo ring + a bright crescent on the lit edge —
// the signature Hola Prime "iridescent sphere" look, rendered in SVG.
function glossySphere(id: string, cx: number, cy: number, r: number, hue: string): string {
  return `
  <radialGradient id="halo${id}" cx="50%" cy="50%" r="50%">
    <stop offset="52%" stop-color="${hue}" stop-opacity="0"/>
    <stop offset="80%" stop-color="${hue}" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="${hue}" stop-opacity="0"/>
  </radialGradient>
  <circle cx="${cx}" cy="${cy}" r="${r * 1.16}" fill="url(#halo${id})" filter="url(#softglow)"/>
  <radialGradient id="body${id}" cx="38%" cy="34%" r="72%">
    <stop offset="0%" stop-color="#1a1a24"/><stop offset="58%" stop-color="#0b0b13"/><stop offset="100%" stop-color="#050507"/>
  </radialGradient>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#body${id})"/>
  <path d="M ${cx - r * 0.72} ${cy - r * 0.66} A ${r} ${r} 0 0 1 ${cx + r * 0.55} ${cy - r * 0.8}" fill="none" stroke="${hue}" stroke-width="${Math.max(3, r * 0.035)}" stroke-linecap="round" opacity="0.55" filter="url(#glow)"/>`;
}

// Sphere hues rotate through the brand's iridescent family so consecutive
// generations don't share the identical glow.
const SPHERE_HUES = ['#B23BE0', '#6A3BF0', '#2A9BC4'];

function background(spec: CreativeSpec): string {
  const base = `<rect x="0" y="0" width="${W}" height="${H}" fill="#05060A"/>`;
  const seed = Math.abs(Math.round(spec.seed ?? 0));
  const hue = SPHERE_HUES[seed % SPHERE_HUES.length];
  if (spec.background === 'solid') {
    const c = spec.solidColor || '#0b2a12';
    return `<radialGradient id="sol" cx="70%" cy="45%" r="85%"><stop offset="0%" stop-color="${c}"/><stop offset="100%" stop-color="#04060a"/></radialGradient><rect width="${W}" height="${H}" fill="url(#sol)"/>`;
  }
  if (spec.background === 'orb') {
    // One big iridescent sphere — position rotates per seed so two orb creatives
    // in a row don't share the identical horizon.
    const orbPresets: [number, number, number][] = [
      [W * 0.5, H * 1.06, W * 0.5],    // rising from bottom-centre
      [W * 1.02, H * 0.55, W * 0.44],  // half-orb on the right edge
      [W * 0.14, H * -0.08, W * 0.4],  // crescent overhead top-left
    ];
    const [cx, cy, r] = orbPresets[seed % orbPresets.length];
    return base + glossySphere('orb', cx, cy, r, hue);
  }
  // 'black' — near-black with rim-lit spheres kept to the corners; the corner
  // pairing rotates per seed.
  const blackPresets: [number, number, number, number, number, number][] = [
    [W * 1.04, H * 0.02, W * 0.36, W * -0.02, H * 1.02, W * 0.28], // TR + BL (classic)
    [W * -0.04, H * 0.06, W * 0.3, W * 1.02, H * 0.95, W * 0.34],  // TL + BR
    [W * 1.06, H * 0.5, W * 0.3, W * 0.12, H * 1.08, W * 0.26],    // R-edge + bottom
  ];
  const [x1, y1, r1, x2, y2, r2] = blackPresets[seed % blackPresets.length];
  return base +
    glossySphere('bR', x1, y1, r1, hue) +
    glossySphere('bL', x2, y2, r2, SPHERE_HUES[(seed + 1) % SPHERE_HUES.length]);
}

// bold **token** emphasis inside a subline (returns [ {t, bold} ])
function splitEmphasis(s: string): { t: string; bold: boolean }[] {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => p.startsWith('**') ? { t: p.slice(2, -2), bold: true } : { t: p, bold: false });
}

// ─── Archetype layouts (return SVG parts positioned on the 1080² canvas) ───

function layoutGiantNumber(spec: CreativeSpec, accent: string): string {
  // Three compositions for the same content slots — rotated per request by the
  // pipeline so consecutive offer briefs don't produce the identical layout.
  if (spec.layoutVariant === 'centered') return giantNumberCentered(spec, accent);
  if (spec.layoutVariant === 'poster') return giantNumberPoster(spec, accent);
  // 'editorial' (default): left-aligned stack.
  const p: string[] = [];
  const pad = Math.round(W * 0.075);
  const maxW = W - pad * 2;
  const heroFill = spec.heroStyle === 'chrome' ? 'url(#chrome)' : spec.heroStyle === 'white' ? '#fff' : 'url(#gloss)';

  let y = Math.round(H * 0.225);
  if (spec.eyebrow) { const eSize = fitOne(spec.eyebrow, maxW, Math.round(H * 0.05), 0.54, 0.7); p.push(T(pad, y, spec.eyebrow, eSize, { weight: 500, fill: '#eef1f5' })); }

  // hero number — huge, left-aligned, CRISP flat gradient. NO outer glow (judges flagged
  // the bloom as the tell-tale cheap-template look) and tight editorial kerning.
  // If the hero was dropped (e.g. by the claim gate), promote the headline into the
  // hero slot — never leave the focal area empty.
  const hero = spec.hero || '';
  const heroY = y + Math.round(H * 0.16);
  let sy = heroY + Math.round(H * 0.092);
  if (hero) {
    const hSize = fitOne(hero, maxW, Math.round(H * 0.19), 0.66, 0.4);
    p.push(T(pad, heroY, hero, hSize, { weight: 900, fill: heroFill, spacing: Math.round(-hSize * 0.035) }));
  } else if (spec.headline) {
    const lines = wrap(spec.headline, 16).slice(0, 2);
    const hSize = fitOne(lines[0] || '', maxW, Math.round(H * 0.105), 0.56, 0.5);
    let hy = heroY - Math.round(hSize * (lines.length - 1) * 0.55);
    for (const ln of lines) { p.push(T(pad, hy, ln, hSize, { weight: 900, fill: heroFill, spacing: -1 })); hy += Math.round(hSize * 1.1); }
  }
  if (spec.strikePrice) {
    const sp = spec.strikePrice.replace(/[~*]/g, '').trim();
    const ss = Math.round(H * 0.05);
    p.push(T(pad, sy, sp, ss, { weight: 700, fill: '#E0201B' }));
    const sw = sp.length * ss * 0.55;
    p.push(`<line x1="${pad - 4}" y1="${sy - ss * 0.3}" x2="${pad + sw}" y2="${sy - ss * 0.3}" stroke="#E0201B" stroke-width="4"/>`);
    sy += Math.round(H * 0.06);
  }
  // subline with **emphasis**, left-aligned, fit-to-width so it never clips
  if (spec.subline) {
    const parts = splitEmphasis(spec.subline);
    const plain = parts.map((s) => s.t).join('');
    const sSize = fitOne(plain, maxW, Math.round(H * 0.052), 0.53, 0.55);
    let x = pad;
    for (const seg of parts) { p.push(T(x, sy, seg.t, sSize, { weight: seg.bold ? 700 : 400, fill: '#fff' })); x += Math.round(seg.t.length * sSize * 0.53 + (seg.bold ? sSize * 0.1 : 0)); }
    sy += Math.round(H * 0.025);
  }
  // Lower CTA: the code pill ONLY when a real code exists (never an empty
  // "Use Code:" shell — no element renders without content); otherwise a plain
  // CTA button when a label exists; otherwise nothing.
  if (spec.promoCode) p.push(codePill(spec, accent, pad, sy + Math.round(H * 0.04)));
  else if (spec.ctaLabel) p.push(ctaBlock(spec, accent, sy + Math.round(H * 0.04), pad, 'start'));
  return p.join('\n');
}

// ── giant-number: CENTERED composition — everything on the vertical axis ──
function giantNumberCentered(spec: CreativeSpec, accent: string): string {
  const p: string[] = [];
  const cx = W / 2;
  const maxW = W * 0.86;
  const heroFill = spec.heroStyle === 'chrome' ? 'url(#chrome)' : spec.heroStyle === 'white' ? '#fff' : 'url(#gloss)';

  let y = Math.round(H * 0.21);
  if (spec.eyebrow) {
    const eSize = fitOne(spec.eyebrow, maxW, Math.round(H * 0.042), 0.6, 0.7);
    p.push(T(cx, y, spec.eyebrow.toUpperCase(), eSize, { anchor: 'middle', weight: 600, fill: '#eef1f5', spacing: 3 }));
  }
  const hero = spec.hero || spec.headline || '';
  const heroY = y + Math.round(H * 0.17);
  let sy = heroY + Math.round(H * 0.085);
  if (hero) {
    const hSize = fitOne(hero, maxW, Math.round(H * 0.185), 0.66, 0.4);
    p.push(T(cx, heroY, hero, hSize, { anchor: 'middle', weight: 900, fill: heroFill, spacing: Math.round(-hSize * 0.035) }));
  }
  if (spec.strikePrice) {
    const sp = spec.strikePrice.replace(/[~*]/g, '').trim();
    const ss = Math.round(H * 0.046);
    const sw = sp.length * ss * 0.55;
    p.push(T(cx, sy, sp, ss, { anchor: 'middle', weight: 700, fill: '#E0201B' }));
    p.push(`<line x1="${cx - sw / 2 - 6}" y1="${sy - ss * 0.3}" x2="${cx + sw / 2 + 6}" y2="${sy - ss * 0.3}" stroke="#E0201B" stroke-width="4"/>`);
    sy += Math.round(H * 0.058);
  }
  if (spec.subline) {
    const sub = spec.subline.replace(/\*\*/g, '');
    const sSize = fitOne(sub, maxW, Math.round(H * 0.046), 0.55, 0.55);
    p.push(T(cx, sy, sub, sSize, { anchor: 'middle', weight: 500, fill: '#fff' }));
    sy += Math.round(H * 0.03);
  }
  if (spec.promoCode) p.push(codePill(spec, accent, cx, sy + Math.round(H * 0.035), 'middle'));
  else if (spec.ctaLabel) p.push(ctaBlock(spec, accent, sy + Math.round(H * 0.035)));
  return p.join('\n');
}

// ── giant-number: POSTER composition — accent eyebrow pill, oversized hero ──
function giantNumberPoster(spec: CreativeSpec, accent: string): string {
  const p: string[] = [];
  const cx = W / 2;
  const maxW = W * 0.9;
  const heroFill = spec.heroStyle === 'white' ? '#fff' : spec.heroStyle === 'accent' ? 'url(#gloss)' : 'url(#chrome)';

  if (spec.eyebrow) {
    const eSize = Math.round(H * 0.028);
    const label = spec.eyebrow.toUpperCase();
    const w = Math.min(maxW, label.length * eSize * 0.62 + eSize * 2.4);
    const h = Math.round(eSize * 2.2);
    const yTop = Math.round(H * 0.155);
    p.push(`<rect x="${cx - w / 2}" y="${yTop}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="${accent}" stroke-width="2"/>`);
    p.push(T(cx, yTop + h / 2 + eSize * 0.35, label, eSize, { anchor: 'middle', weight: 700, fill: accent, spacing: 2 }));
  }
  const hero = spec.hero || spec.headline || '';
  const heroY = Math.round(H * 0.46);
  let sy = heroY + Math.round(H * 0.09);
  if (hero) {
    const hSize = fitOne(hero, maxW, Math.round(H * 0.23), 0.66, 0.35);
    p.push(T(cx, heroY, hero, hSize, { anchor: 'middle', weight: 900, fill: heroFill, spacing: Math.round(-hSize * 0.04) }));
  }
  // strike + subline share one centred line (poster keeps the lower half airy)
  {
    const sp = (spec.strikePrice || '').replace(/[~*]/g, '').trim();
    const sub = (spec.subline || '').replace(/\*\*/g, '');
    const ss = Math.round(H * 0.042);
    const joined = [sp, sub].filter(Boolean).join('   ');
    if (joined) {
      const size = fitOne(joined, maxW, ss, 0.56, 0.6);
      const total = joined.length * size * 0.56;
      let x = cx - total / 2;
      if (sp) {
        p.push(T(x, sy, sp, size, { weight: 700, fill: '#E0201B' }));
        const sw = sp.length * size * 0.56;
        p.push(`<line x1="${x - 4}" y1="${sy - size * 0.3}" x2="${x + sw}" y2="${sy - size * 0.3}" stroke="#E0201B" stroke-width="4"/>`);
        x += sw + size * 1.6;
      }
      if (sub) p.push(T(x, sy, sub, size, { weight: 500, fill: '#fff' }));
      sy += Math.round(H * 0.028);
    }
  }
  if (spec.promoCode) p.push(codePill(spec, accent, cx, sy + Math.round(H * 0.04), 'middle'));
  else if (spec.ctaLabel) p.push(ctaBlock(spec, accent, sy + Math.round(H * 0.04)));
  return p.join('\n');
}

function codePill(spec: CreativeSpec, accent: string, x: number, y: number, anchor: 'start' | 'middle' = 'start'): string {
  const code = spec.promoCode || '';
  if (!code) return ''; // no code → no pill, ever (empty chrome is a rendering bug)
  const size = Math.round(H * 0.03);
  const pre = 'Use Code: ';
  const preW = pre.length * size * 0.52;
  const codeW = code.length * size * 0.6;
  const w = Math.round(preW + codeW + size * 2);
  const h = Math.round(size * 2.3);
  const left = anchor === 'middle' ? Math.round(x - w / 2) : x;
  const parts = [
    `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#12121f" stroke="${accent}" stroke-width="1.5"/>`,
    T(left + size * 0.9, y + h / 2 + size * 0.35, pre, size, { weight: 500, fill: '#e6e9ee' }),
    T(left + size * 0.9 + preW, y + h / 2 + size * 0.35, code, size, { weight: 700, fill: accent }),
  ];
  const trailer = anchor === 'start' && /to get started/i.test(spec.ctaLabel || '') ? 'to Get Started' : '';
  if (trailer) parts.push(T(left + w + size * 0.6, y + h / 2 + size * 0.35, trailer, size, { weight: 400, fill: '#9aa1ac' }));
  return parts.join('\n');
}

function layoutTestimonial(spec: CreativeSpec, accent: string): string {
  const p: string[] = [];
  const cx = W / 2, pad = Math.round(W * 0.06);
  // two-tier headline
  if (spec.headline) p.push(T(cx, H * 0.175, spec.headline, Math.round(H * 0.038), { anchor: 'middle', weight: 500, fill: '#fff' }));
  if (spec.headlineHero) {
    const hs = fitOne(spec.headlineHero, W * 0.88, Math.round(H * 0.072), 0.56);
    p.push(T(cx, H * 0.25, spec.headlineHero, hs, { anchor: 'middle', weight: 900, fill: accent, spacing: -1 }));
  }
  // decorative quote marks
  p.push(T(W * 0.14, H * 0.30, '“', Math.round(H * 0.13), { fill: accent, weight: 800, opacity: 0.9 }));
  p.push(T(W * 0.90, H * 0.62, '”', Math.round(H * 0.13), { anchor: 'end', fill: accent, weight: 800, opacity: 0.9 }));
  // review card
  const t = spec.testimonial;
  if (t) {
    const cardX = W * 0.16, cardY = H * 0.30, cardW = W * 0.68, cardH = H * 0.30;
    p.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="22" fill="#ffffff"/>`);
    const ix = cardX + 34, iy = cardY + 42;
    const av = 46;
    const nm = t.name || 'Verified Trader';
    p.push(`<circle cx="${ix + av / 2}" cy="${iy + av / 2}" r="${av / 2}" fill="${accent}"/>`);
    p.push(T(ix + av / 2, iy + av / 2 + 12, (nm[0] || 'T').toUpperCase(), 30, { anchor: 'middle', fill: '#fff', weight: 800 }));
    p.push(T(ix + av + 18, iy + 18, nm, 30, { fill: '#0b1220', weight: 800 }));
    if (t.handle) p.push(T(ix + av + 18, iy + 48, t.handle, 22, { fill: '#6b7280', weight: 500 }));
    // stars + verified
    let sx = ix + av + 18;
    for (let i = 0; i < 5; i++) { p.push(`<rect x="${sx}" y="${iy + 62}" width="22" height="22" rx="3" fill="#00B67A"/>`); p.push(T(sx + 11, iy + 79, '★', 16, { anchor: 'middle', fill: '#fff', weight: 700 })); sx += 26; }
    if (t.verified !== false) p.push(T(sx + 10, iy + 79, '✓ Verified', 22, { fill: '#00B67A', weight: 700 }));
    // title + body + highlight + date — every element renders ONLY with real
    // content (the claim gate may have emptied any of them; no empty chrome).
    if (t.title) p.push(T(ix, iy + 120, t.title, 26, { fill: '#0b1220', weight: 800 }));
    const bodyLines = wrap(t.body, 52).slice(0, 2);
    let by = iy + 156;
    for (const bl of bodyLines) { p.push(T(ix, by, bl, 22, { fill: '#374151', weight: 400 })); by += 30; }
    if (t.highlight) {
      const hlSize = fitOne(t.highlight, cardW - 76, 22, 0.55, 0.7);
      const hlW = Math.round(t.highlight.length * hlSize * 0.55 + 16);
      p.push(`<rect x="${ix - 4}" y="${by - hlSize}" width="${hlW}" height="${Math.round(hlSize * 1.4)}" rx="5" fill="${accent}" opacity="0.22"/>`);
      p.push(T(ix, by, t.highlight, hlSize, { fill: '#0b1220', weight: 700 }));
    }
    if (t.date) p.push(T(ix, by + 40, t.date, 18, { fill: '#9aa1ac', weight: 400 }));
  }
  // offer + promo — subline is FIT to the canvas (never clips) and the CTA sits
  // clear below it (no collision).
  if (spec.subline) {
    const sub = spec.subline.replace(/\*\*/g, '');
    // With the ZPD stamp on (bottom-right), keep the centered subline out of the
    // stamp zone; without it the full width is available. A subline too long for
    // one readable line WRAPS to two centered lines (like the references) —
    // never shrink-to-unreadable, never clip, never touch the stamp.
    const subMaxW = spec.badge !== false ? W * 0.58 : W * 0.86;
    const base = Math.round(H * 0.05);
    const CW = 0.62; // real Montserrat w800 char width
    if (sub.length * Math.round(base * 0.8) * CW <= subMaxW) {
      const sSize = fitOne(sub, subMaxW, base, CW, 0.7);
      p.push(T(cx, H * 0.675, sub, sSize, { anchor: 'middle', weight: 800, fill: '#fff' }));
    } else {
      const lines = wrap(sub, Math.ceil(sub.length / 2) + 6).slice(0, 2);
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');
      const sSize = fitOne(longest, subMaxW, Math.round(base * 0.8), CW, 0.6);
      let ly = H * 0.648;
      for (const ln of lines) { p.push(T(cx, ly, ln, sSize, { anchor: 'middle', weight: 800, fill: '#fff' })); ly += Math.round(sSize * 1.3); }
    }
  }
  p.push(ctaBlock(spec, accent, H * 0.745));
  return p.join('\n');
}

function layoutBenefitStack(spec: CreativeSpec, accent: string): string {
  const p: string[] = [];
  const cx = W / 2;
  const head = wrap(spec.headline || '', 20).slice(0, 3);
  let y = H * 0.2;
  const hs = Math.round(H * 0.062);
  for (const ln of head) { p.push(T(cx, y, ln, hs, { anchor: 'middle', weight: 800, fill: '#fff' })); y += hs * 1.15; }
  const pills = (spec.bullets || []).slice(0, 3);
  let py = H * 0.46;
  const pw = W * 0.6, pillH = Math.round(H * 0.075);
  for (const b of pills) {
    const pSize = fitOne(b, pw * 0.9, Math.round(H * 0.036), 0.56, 0.6); // text never overflows its pill
    p.push(`<rect x="${cx - pw / 2}" y="${py}" width="${pw}" height="${pillH}" rx="${pillH / 2}" fill="none" stroke="#fff" stroke-width="2" opacity="0.85"/>`);
    p.push(T(cx, py + pillH / 2 + pSize * 0.35, b, pSize, { anchor: 'middle', weight: 600, fill: '#fff' }));
    py += pillH + H * 0.028;
  }
  if (spec.ctaLabel) p.push(ctaBlock(spec, accent, py + H * 0.01));
  return p.join('\n');
}

function layoutPhotographic(spec: CreativeSpec, accent: string): string {
  const p: string[] = [];
  const pad = Math.round(W * 0.06);
  // left legibility scrim
  p.push(`<linearGradient id="pscrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#000" stop-opacity="0.85"/><stop offset="55%" stop-color="#000" stop-opacity="0.35"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></linearGradient><rect width="${W}" height="${H}" fill="url(#pscrim)"/>`);
  if (spec.eyebrow) p.push(T(pad, H * 0.28, spec.eyebrow, Math.round(H * 0.036), { weight: 500, fill: '#fff', halo: true }));
  const hero = spec.headlineHero || spec.hero || '';
  const lines = wrap(hero, 14).slice(0, 3);
  let y = H * 0.36;
  const hs = fitOne(lines[0] || '', W * 0.5, Math.round(H * 0.088), 0.56);
  for (const ln of lines) { p.push(T(pad, y, ln, hs, { weight: 900, fill: accent, halo: true })); y += hs * 1.06; }
  if (spec.subline) { const parts = splitEmphasis(spec.subline); let x = pad; y += hs * 0.2; for (const seg of parts) { p.push(T(x, y, seg.t, Math.round(H * 0.04), { weight: seg.bold ? 800 : 400, fill: '#fff', halo: true })); x += Math.round(seg.t.length * H * 0.04 * 0.56); } }
  p.push(ctaBlock(spec, accent, H * 0.7, pad, 'start'));
  return p.join('\n');
}

function ctaBlock(spec: CreativeSpec, accent: string, y: number, x = W / 2, anchor: 'middle' | 'start' = 'middle'): string {
  const label = spec.ctaLabel || (spec.promoCode ? `Use Code: ${spec.promoCode}` : '');
  if (!label) return '';
  const size = Math.round(H * 0.032);
  const w = Math.min(W * 0.7, label.length * size * 0.62 + 70);
  const h = Math.round(size * 2.4);
  const left = anchor === 'start' ? x : x - w / 2;
  const outline = spec.ctaStyle === 'outline';
  const parts = [
    outline
      ? `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="#fff" stroke-width="2"/>`
      : `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${accent}"/>`,
    T(left + w / 2, y + h / 2 + size * 0.35, label, size, { anchor: 'middle', weight: 700, fill: outline ? '#fff' : '#04121f' }),
  ];
  return parts.join('\n');
}

const LAYOUTS: Record<Archetype, (s: CreativeSpec, a: string) => string> = {
  'giant-number': layoutGiantNumber,
  'testimonial': layoutTestimonial,
  'benefit-stack': layoutBenefitStack,
  'photographic': layoutPhotographic,
};

// ─── Compose: background + archetype + fixed furniture + logo PNG ───
export async function renderCreative(spec: CreativeSpec): Promise<string> {
  const accent = resolveAccent(spec.accent);
  const isPhoto = spec.background === 'photo' && spec.photoDataUri;
  const dark = !(spec.background === 'solid' && isLightHex(spec.solidColor));
  const badge = spec.badge !== false;
  const assets = { trustpilot: hasAsset('trustpilot', dark), deloitte: hasAsset('deloitte', dark), stamp: hasAsset('stamp', dark) };

  const contentSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
${commonDefs(accent)}
${isPhoto ? '' : background(spec)}
${LAYOUTS[spec.archetype](spec, accent)}
${brandFurniture({ accent, disclaimer: DISCLAIMER, badge, assets })}
</svg>`;

  // Base layer
  let base: sharp.Sharp;
  if (isPhoto) {
    const buf = Buffer.from(spec.photoDataUri!.split(',')[1], 'base64');
    base = sharp(buf).resize(W, H, { fit: 'cover' });
  } else {
    base = sharp({ create: { width: W, height: H, channels: 4, background: '#05060A' } });
  }

  let buf = await base.composite([{ input: Buffer.from(contentSvg), top: 0, left: 0 }]).png().toBuffer();

  // Real brand assets (Trustpilot / Deloitte / stamp PNGs) composited over the SVG.
  try { buf = await compositeFurniture(buf, { dark, badge }); } catch { /* graceful */ }

  // Logo: the real brand logo asset (logo-light/logo-dark) is composited in
  // compositeFurniture above. Fall back to the shared overlay (old holaprime-logo.png)
  // ONLY when no brand logo asset is present.
  let outUri = `data:image/png;base64,${buf.toString('base64')}`;
  if (!hasAsset('logo', dark)) { try { outUri = await applyLogoOverlay(outUri); } catch { /* keep as-is */ } }
  return outUri;
}
