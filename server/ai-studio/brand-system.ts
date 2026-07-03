/**
 * Hola Prime BRAND SYSTEM — extracted from the team's human-designed reference
 * creatives (BAU June, 22 ads). This is the single source of truth for the
 * design-template engine: canvas, palette, accents, the FIXED brand furniture
 * (logo TL, #WeAreTraders pill TR, Trustpilot 4.6 BL, Deloitte BR, disclaimer,
 * ZERO PAYOUT DENIAL stamp) and their exact positions — identical on every ad.
 *
 * Rendered deterministically in SVG so the furniture is byte-identical every
 * time, exactly like a designer working from a locked master template.
 */

import { FONT } from './font-setup';

// Reference creatives are 1:1 square. We render at 1080 (IG/Meta feed).
export const CANVAS = { W: 1080, H: 1080 };

// Palette: black base, white type, ONE accent per creative (varies by campaign).
export const ACCENTS: Record<string, string> = {
  cyan: '#29B6E8',
  green: '#00E676',
  purple: '#7B4DFF',
  red: '#E0201B',
  blue: '#2F6BFF',
  magenta: '#C42AC4',
};

export const DISCLAIMER =
  'HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. ' +
  'CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS.';

export function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function wrap(text: string, maxChars: number): string[] {
  const words = (text || '').split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur.trim()) lines.push(cur.trim()); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/** SVG text with optional black stroke halo for legibility on any background. */
export function T(x: number | string, y: number, text: string, size: number, o: {
  weight?: string | number; fill?: string; anchor?: string; spacing?: number; halo?: boolean; family?: string; opacity?: number;
} = {}): string {
  const { weight = 700, fill = '#FFFFFF', anchor = 'start', spacing = 0, halo = false, family = FONT, opacity = 1 } = o;
  const common = `x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}"`;
  let out = '';
  if (halo) out += `<text ${common} fill="none" stroke="#000" stroke-width="${Math.max(2, Math.round(size * 0.06))}" stroke-linejoin="round">${esc(text)}</text>`;
  out += `<text ${common} fill="${fill}">${esc(text)}</text>`;
  return out;
}

/** Lighten (amt>0) / darken (amt<0) a hex colour. */
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amt), g = clamp(((n >> 8) & 255) + amt), b = clamp((n & 255) + amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ─── Reusable defs: chrome + glossy-accent gradients for hero numbers, soft glow ───
export function commonDefs(accent: string): string {
  return `<defs>
    <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="#e9edf2"/>
      <stop offset="55%" stop-color="#aab3bf"/><stop offset="72%" stop-color="#eef1f5"/>
      <stop offset="100%" stop-color="#8b95a3"/>
    </linearGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(accent, 52)}"/><stop offset="48%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${shade(accent, -46)}"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="55%" stop-color="${accent}"/><stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="softglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="34"/></filter>
  </defs>`;
}

// ─── FIXED BRAND FURNITURE ───────────────────────────────────────────────────
export interface FurnitureOpts {
  accent: string;
  disclaimer?: string;
  badge?: boolean;         // ZERO PAYOUT DENIAL circular stamp
  brightTop?: boolean;     // logo/tag ink colour when the corner is light
  // When a real PNG asset exists for a piece, skip its SVG fallback (the PNG is
  // composited on top afterward by brand-assets.compositeFurniture).
  assets?: { trustpilot?: boolean; deloitte?: boolean; stamp?: boolean };
}

/**
 * Returns SVG for every fixed element EXCEPT the logo image itself (that PNG is
 * composited on top afterward). Positions match the reference master exactly.
 */
export function brandFurniture(o: FurnitureOpts): string {
  const { W, H } = CANVAS;
  const pad = Math.round(W * 0.045);
  const ink = o.brightTop ? '#000000' : '#FFFFFF';
  const parts: string[] = [];

  // #WeAreTraders pill — top-right, outlined
  const tag = '#WeAreTraders';
  const tagSize = Math.round(H * 0.022);
  const tagW = Math.round(tag.length * tagSize * 0.56 + tagSize * 1.6);
  const tagH = Math.round(tagSize * 2.1);
  const tagX = W - pad - tagW, tagY = pad;
  parts.push(`<rect x="${tagX}" y="${tagY}" width="${tagW}" height="${tagH}" rx="${tagH / 2}" fill="none" stroke="${ink}" stroke-width="2" opacity="0.9"/>`);
  parts.push(T(tagX + tagW / 2, tagY + tagH / 2 + tagSize * 0.35, tag, tagSize, { anchor: 'middle', fill: ink, weight: 600 }));

  const tpY = H - Math.round(H * 0.062);
  const star = Math.round(H * 0.02);
  // Trustpilot ★ 4.6 — bottom-left (SVG fallback only when no real asset)
  if (!o.assets?.trustpilot) {
    parts.push(T(pad, tpY + star * 0.35, 'Trustpilot', Math.round(star * 1.15), { fill: ink, weight: 700 }));
    let sx = pad + Math.round(star * 6.2);
    for (let i = 0; i < 5; i++) {
      parts.push(`<rect x="${sx}" y="${tpY - star * 0.7}" width="${star}" height="${star}" rx="3" fill="#00B67A"/>`);
      parts.push(T(sx + star / 2, tpY + star * 0.28, '★', Math.round(star * 0.8), { anchor: 'middle', fill: '#fff', weight: 700 }));
      sx += star + 4;
    }
    parts.push(T(sx + 6, tpY + star * 0.35, '4.6', Math.round(star * 1.05), { fill: ink, weight: 700 }));
  }

  // Independently Reviewed By Deloitte. — bottom-right (fallback; non-overlapping)
  if (!o.assets?.deloitte) {
    const dSize = Math.round(star * 1.1);
    const delW = Math.round('Deloitte.'.length * dSize * 0.58);
    parts.push(T(W - pad, tpY + star * 0.35, 'Deloitte.', dSize, { anchor: 'end', fill: ink, weight: 800 }));
    parts.push(T(W - pad - delW - Math.round(star * 0.6), tpY + star * 0.3, 'Independently Reviewed By', Math.round(star * 0.72), { anchor: 'end', fill: ink, weight: 400, opacity: 0.82 }));
  }

  // Disclaimer — bottom center, tiny
  const disc = o.disclaimer || DISCLAIMER;
  const dSize = Math.round(H * 0.0108);
  // 0.68 = real Montserrat uppercase char width; 0.5 under-estimated and let the
  // first line overflow the canvas on both edges.
  const dLines = wrap(disc.toUpperCase(), Math.floor((W - pad * 2) / (dSize * 0.68))).slice(0, 3);
  let dY = H - Math.round(pad * 0.5) - (dLines.length - 1) * Math.round(dSize * 1.3);
  for (const ln of dLines) { parts.push(T(W / 2, dY, ln, dSize, { anchor: 'middle', fill: '#8A93A0', weight: 300 })); dY += Math.round(dSize * 1.3); }

  // ZERO PAYOUT DENIAL stamp — bottom-right, above Deloitte. A real rubber-stamp
  // with curved text around a double ring (textPath), a bit rotated for an
  // authentic hand-stamped feel.
  if (o.badge && !o.assets?.stamp) {
    const cx = W - Math.round(W * 0.135), cy = H - Math.round(H * 0.205), r = Math.round(W * 0.075);
    const bs = Math.round(r * 0.3);
    parts.push(`<g transform="rotate(-8 ${cx} ${cy})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="3" opacity="0.92"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 9}" fill="none" stroke="${ink}" stroke-width="1.4" opacity="0.7"/>
      ${T(cx, cy - bs * 0.75, 'ZERO', bs, { anchor: 'middle', fill: ink, weight: 800 })}
      ${T(cx, cy + bs * 0.35, 'PAYOUT', bs, { anchor: 'middle', fill: ink, weight: 800 })}
      ${T(cx, cy + bs * 1.45, 'DENIAL', bs, { anchor: 'middle', fill: ink, weight: 800 })}
    </g>`);
  }

  return parts.join('\n');
}

/** Where the logo image should be placed (composited as PNG on top). */
export function logoBox() {
  const { W, H } = CANVAS;
  const pad = Math.round(W * 0.045);
  return { left: pad, top: pad, width: Math.round(W * 0.26), height: Math.round(H * 0.055) };
}
