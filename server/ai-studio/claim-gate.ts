/**
 * Claim Gate — the structural compliance layer for generated ad copy.
 *
 * HARD LINE (user-mandated): the generation pipeline must be INCAPABLE of
 * shipping a specific factual claim — a number, %, price, timeframe, promo
 * code, rating, guarantee or ranking — that is not either
 *   (a) VERBATIM from the user's own brief (the user owns their claims),
 *   (b) an APPROVED_BRAND_FACTS entry used with its EXACT wording, or
 *   (c) an entry in the ACTIVE OFFERS config (config/active-offers.json —
 *       time-limited prices/codes/discounts the team edits per campaign;
 *       expired entries are ignored, so an expired code is auto-rejected).
 *
 * Brand PROMISES ("Zero payout denials", "No hidden rules") are fine; invented
 * FIGURES are forbidden. Enforced in CODE after the model responds — never by
 * asking the model nicely. The model fabricated "95% profit rewards", a "$99"
 * anchor and "$49" anchors (twice, AFTER the prompt hard line was added), so
 * its output is treated as untrusted input.
 *
 * PHRASE-EXACT SEMANTICS for approved facts: a fact's figures are allowed only
 * when the copy contains the fact's exact (normalized) wording. "Up To 95%
 * Rewards" passes; "95% profit split" is dropped even though 95% is real —
 * exactly the wording rule the brand team set.
 *
 * Enforcement = DROP, not rewrite: a violating pill is removed, a violating
 * field is dropped whole (partial stripping leaves broken grammar). The
 * template renderer's no-empty-elements rule guarantees a dropped field leaves
 * no empty chrome behind.
 *
 * Regression suite: server/ai-studio/claim-gate.check.mts — run after ANY
 * change here:  npx tsx server/ai-studio/claim-gate.check.mts
 */

import fs from 'fs';
import path from 'path';

// ── APPROVED BRAND FACTS (EVERGREEN) ─────────────────────────────────────────
// v1 list from the brand team (2026-07-02). Wording is EXACT — the gate only
// unlocks a fact's figures when the copy uses this phrasing verbatim. Team to
// confirm final wording before shipping to users.
// Time-limited offers (prices, promo codes, discount %s) do NOT belong here —
// they go in config/active-offers.json with an expiry.
export const APPROVED_BRAND_FACTS: string[] = [
  '1-Hour Payouts',
  'reward payouts in under 1 hour on average since its launch',
  'Zero Payout Denials',
  'Up To 95% Rewards',                                   // exact — never "95% profit split"
  'Independently Reviewed by Deloitte',
  '98.35% of withdrawals processed within one hour',
  'Trustpilot 4.6',
  '50K+ traders',
  '#WeAreTraders',                                       // fixed furniture tagline
];

// ── BANNED PHRASES ───────────────────────────────────────────────────────────
// Wordings the brand team has explicitly forbidden REGARDLESS of figures —
// token patterns can't express these (e.g. "profit split" is banned phrasing
// even with no number; the approved wording is "Up To 95% Rewards"). Any field
// containing one of these (normalized substring) is dropped. Team-extensible.
export const BANNED_PHRASES: string[] = [
  'profit split',
];

// The one legal disclaimer — compliance-owned, never model-written.
export const FIXED_DISCLAIMER =
  'HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS.';

export interface ClaimViolation {
  field: string;
  token: string;
  action: 'dropped-field' | 'dropped-item' | 'stripped-token' | 'replaced-safe';
}

// ── ACTIVE OFFERS (time-limited, editable per campaign) ─────────────────────
// config/active-offers.json:
//   { "offers": [ { "text": "$39", "expires": "2026-08-31", "note": "July challenge sale" } ] }
// expires: ISO date (inclusive, end-of-day) or null for open-ended. Expired
// entries stop validating IMMEDIATELY — an expired code in copy gets dropped.
export interface ActiveOffer { text: string; expires?: string | null; note?: string }

let _offersCache: { path: string; mtimeMs: number; texts: string[] } | null = null;

export function activeOfferTexts(): string[] {
  const p = process.env.ACTIVE_OFFERS_PATH || path.join(process.cwd(), 'config', 'active-offers.json');
  try {
    const st = fs.statSync(p);
    if (_offersCache && _offersCache.path === p && _offersCache.mtimeMs === st.mtimeMs) return _offersCache.texts;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const now = Date.now();
    const texts: string[] = (Array.isArray(raw?.offers) ? raw.offers : [])
      .filter((o: any) => o && typeof o.text === 'string' && o.text.trim())
      .filter((o: any) => {
        if (!o.expires) return true;
        const iso = String(o.expires);
        const end = new Date(iso.length === 10 ? `${iso}T23:59:59` : iso).getTime();
        return Number.isFinite(end) && end >= now;
      })
      .map((o: any) => o.text.trim());
    _offersCache = { path: p, mtimeMs: st.mtimeMs, texts };
    return texts;
  } catch {
    return []; // no config / unreadable → no active offers (strict by default)
  }
}

// ── Claim-shaped token detectors ─────────────────────────────────────────────
// Anything these match is a "specific factual claim" and must be sourced.
const CLAIM_PATTERNS: RegExp[] = [
  /\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmM]?\b/g,                                      // money: $39, $8,400, $100K
  /\b\d{1,3}(?:\.\d+)?\s?%/g,                                                  // percent: 95%, 98.35%
  /\b\d{1,3}\s?\/\s?\d{1,3}\b/g,                                               // ratios: 90/10, 80/20 — LIVE BREACH 2026-07-02 ("90/10 profit split" passed the gate)
  /\b\d+(?:\.\d+)?\s?[xX]\b/g,                                                 // multiplier: 10x
  /\b\d[\d,]*(?:\s|-)?(?:min(?:ute)?s?|hours?|hrs?|days?|weeks?|months?|seconds?|secs?)\b/gi, // timeframe: 24 hours, 1-hour
  /\b\d[\d,]*\s?[kKmM]?\+?\s?(?:traders?|clients?|users?|members?|countries|payouts?|reviews?|accounts?|spots?|seats?|slots?)\b/gi, // counts: 50K+ traders, 5 spots
  /\b[A-Z]{3,}\d{1,3}\b/g,                                                     // promo codes: WELCOME20 — an invented code is a fake offer
  /\b\d(?:\.\d)?\s?(?:stars?|star[- ]rating|rating)\b/gi,                      // ratings: 4.9 stars
  /(?:#\s?1|no\.\s?1|number\s?one)\b/gi,                                       // rankings
  /\b(?:best|fastest|biggest|largest|highest|cheapest|most\s+trusted|world'?s\s+(?:best|leading)|leading)\b/gi, // superlatives
  /\b(?:guaranteed?|risk[- ]free|no[- ]risk|assured)\b/gi,                     // guarantees
  /\b(?:instant(?:ly)?|same[- ]day|24\/7)\b/gi,                                // speed guarantees
];

/** Normalize for comparison: lowercase; strip everything except a-z 0-9 $ % + . */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9$%+.]+/g, '');
}

/** Extract every claim-shaped token from a text. */
export function extractClaimTokens(text: string): string[] {
  const out: string[] = [];
  for (const re of CLAIM_PATTERNS) {
    const m = text.match(new RegExp(re.source, re.flags));
    if (m) out.push(...m);
  }
  return out;
}

/**
 * Every claim token in `text` that is NOT sourced. Sources:
 *  - the user's brief (token appears verbatim anywhere in it — the user owns
 *    their claims in whatever phrasing they typed), or
 *  - an approved fact / active offer whose EXACT wording appears in this text
 *    (phrase-exact: the fact unlocks only its own tokens, only when quoted
 *    verbatim — "Up To 95% Rewards" unlocks 95%; "95% profit split" does not).
 */
export function findViolations(text: string | undefined, userPrompt: string, approved = APPROVED_BRAND_FACTS): string[] {
  if (!text) return [];
  const nText = norm(text);
  const nPrompt = norm(userPrompt || '');
  // Banned phrasing drops the field even with zero claim tokens — UNLESS the
  // user typed it themselves (their own brief, their own words).
  const banned = BANNED_PHRASES.filter((p) => nText.includes(norm(p)) && !nPrompt.includes(norm(p)));
  const tokens = extractClaimTokens(text);
  if (!tokens.length) return banned;
  const unlocked = new Set<string>();
  for (const src of [...approved, ...activeOfferTexts()]) {
    const nSrc = norm(src);
    if (nSrc && nText.includes(nSrc)) {
      for (const t of extractClaimTokens(src)) unlocked.add(norm(t));
    }
  }
  return [
    ...banned,
    ...tokens.filter((t) => {
      const n = norm(t);
      return !(nPrompt.includes(n) || unlocked.has(n));
    }),
  ];
}

type AnySpec = Record<string, any>;

/**
 * Gate a Design-Engine CreativeSpec. DROPS violating fields/items in place
 * (returns a new object) and reports every action taken.
 */
export function gateCreativeSpec<T extends AnySpec>(spec: T, userPrompt: string): { spec: T; violations: ClaimViolation[] } {
  const v: ClaimViolation[] = [];
  const out: AnySpec = { ...spec };

  // Short claim-bearing fields: DROP the whole field on any violation.
  for (const f of ['hero', 'strikePrice', 'promoCode', 'eyebrow', 'subline', 'headline', 'headlineHero'] as const) {
    const bad = findViolations(out[f], userPrompt);
    if (bad.length) { v.push({ field: f, token: bad.join(', '), action: 'dropped-field' }); delete out[f]; }
  }

  // ctaLabel: replace with a safe, claim-free default (a CTA should survive).
  {
    const bad = findViolations(out.ctaLabel, userPrompt);
    if (bad.length) { v.push({ field: 'ctaLabel', token: bad.join(', '), action: 'replaced-safe' }); out.ctaLabel = 'Get Funded Today'; }
  }

  // Bullets: drop violating pills, keep the clean ones.
  if (Array.isArray(out.bullets)) {
    const kept = out.bullets.filter((b: string) => {
      const bad = findViolations(b, userPrompt);
      if (bad.length) { v.push({ field: 'bullets', token: `${bad.join(', ')} (in "${b}")`, action: 'dropped-item' }); return false; }
      return true;
    });
    out.bullets = kept.length ? kept : undefined;
  }

  // Testimonial: drop violating SENTENCES from body; drop card if body empties.
  if (out.testimonial && typeof out.testimonial === 'object') {
    const t = { ...out.testimonial };
    if (t.body) {
      const sentences = String(t.body).split(/(?<=[.!?])\s+/);
      const kept = sentences.filter((s: string) => {
        const bad = findViolations(s, userPrompt);
        if (bad.length) { v.push({ field: 'testimonial.body', token: bad.join(', '), action: 'dropped-item' }); return false; }
        return true;
      });
      t.body = kept.join(' ').trim();
    }
    const hlBad = findViolations(t.highlight, userPrompt);
    if (hlBad.length) { v.push({ field: 'testimonial.highlight', token: hlBad.join(', '), action: 'dropped-field' }); t.highlight = ''; }
    const titleBad = findViolations(t.title, userPrompt);
    if (titleBad.length) { v.push({ field: 'testimonial.title', token: titleBad.join(', '), action: 'dropped-field' }); t.title = ''; }
    out.testimonial = t.body ? t : undefined;
    if (!t.body) v.push({ field: 'testimonial', token: '(body emptied by gate)', action: 'dropped-field' });
  }

  // platePrompt (image-model hand-off): strip claim tokens so figures can't be
  // smuggled into baked pixels.
  if (out.platePrompt) {
    const bad = findViolations(out.platePrompt, userPrompt);
    if (bad.length) {
      let p = String(out.platePrompt);
      for (const tok of bad) p = p.split(tok).join('');
      out.platePrompt = p.replace(/\s{2,}/g, ' ').trim();
      v.push({ field: 'platePrompt', token: bad.join(', '), action: 'stripped-token' });
    }
  }

  return { spec: out as T, violations: v };
}

/**
 * Gate AI-lane overlay copy (prompt-enhancer output OR extractOverlayConfig
 * from the pattern-based / standard-custom briefs) before applyTextOverlay
 * composites it. Same policy: drop what can't be sourced. Non-copy config
 * fields (layout, darkBackground, tagline, …) pass through untouched.
 */
export function gateOverlayCopy<T extends AnySpec>(overlay: T, userPrompt: string): { overlay: T; violations: ClaimViolation[] } {
  const v: ClaimViolation[] = [];
  const out: AnySpec = { ...overlay };
  for (const f of ['headline', 'subheadline', 'price', 'wasPrice', 'urgencyText', 'promoCode', 'attentionGrabber'] as const) {
    const bad = findViolations(out[f], userPrompt);
    if (bad.length) { v.push({ field: f, token: bad.join(', '), action: 'dropped-field' }); out[f] = ''; }
  }
  {
    const bad = findViolations(out.cta, userPrompt);
    if (bad.length) { v.push({ field: 'cta', token: bad.join(', '), action: 'replaced-safe' }); out.cta = 'Get Funded Today'; }
  }
  if (Array.isArray(out.bullets)) {
    const kept = out.bullets.filter((b: string) => {
      const bad = findViolations(b, userPrompt);
      if (bad.length) { v.push({ field: 'bullets', token: `${bad.join(', ')} (in "${b}")`, action: 'dropped-item' }); return false; }
      return true;
    });
    out.bullets = kept;
  }
  // The legal disclaimer is compliance-owned — never model-written.
  if ('disclaimer' in out) out.disclaimer = FIXED_DISCLAIMER;
  return { overlay: out as T, violations: v };
}

/**
 * Gate a free-text IMAGE PROMPT (integrated mode / reference edits — where the
 * model bakes text into pixels and nothing can be stripped post-render).
 * Unsourced claim tokens are stripped from the prose BEFORE the model sees
 * them, so it is never handed an unsourced claim to render.
 */
export function gateImagePrompt(promptText: string, userPrompt: string): { text: string; violations: ClaimViolation[] } {
  const bad = findViolations(promptText, userPrompt);
  if (!bad.length) return { text: promptText, violations: [] };
  let out = promptText;
  for (const tok of bad) out = out.split(tok).join('');
  out = out.replace(/["“”]\s*["“”]/g, '').replace(/\s{2,}/g, ' ').trim();
  return { text: out, violations: bad.map((t) => ({ field: 'imagePrompt', token: t, action: 'stripped-token' as const })) };
}

/**
 * Gate a generation BRIEF's copywriting block right after it is parsed — the
 * single choke point feeding the text manifest (integrated mode), the overlay
 * compositor AND the copy shown in the UI. Same policy as everywhere: drop
 * unsourced fields/items, safe CTA, fixed legal disclaimer.
 */
export function gateBriefCopy<T extends AnySpec>(brief: T, userPrompt: string): { brief: T; violations: ClaimViolation[] } {
  const v: ClaimViolation[] = [];
  if (!brief || typeof brief !== 'object' || !brief.copywriting) return { brief, violations: v };
  const cw: AnySpec = { ...brief.copywriting };

  const gateStr = (val: string | undefined, field: string): string => {
    const bad = findViolations(val, userPrompt);
    if (bad.length) { v.push({ field, token: bad.join(', '), action: 'dropped-field' }); return ''; }
    return val || '';
  };

  // headline may be a plain string or { primary, variations[] }
  if (typeof cw.headline === 'string') cw.headline = gateStr(cw.headline, 'copywriting.headline');
  else if (cw.headline && typeof cw.headline === 'object') {
    const h: AnySpec = { ...cw.headline };
    h.primary = gateStr(h.primary, 'copywriting.headline.primary');
    if (Array.isArray(h.variations)) {
      h.variations = h.variations.filter((s: string) => {
        const bad = findViolations(s, userPrompt);
        if (bad.length) { v.push({ field: 'copywriting.headline.variations', token: `${bad.join(', ')} (in "${s}")`, action: 'dropped-item' }); return false; }
        return true;
      });
    }
    cw.headline = h;
  }

  for (const f of ['hookText', 'attentionGrabber', 'discountText', 'urgencyText'] as const) {
    if (cw[f] !== undefined) cw[f] = gateStr(cw[f], `copywriting.${f}`);
  }
  if (cw.body && typeof cw.body === 'object') cw.body = { ...cw.body, primary: gateStr(cw.body.primary, 'copywriting.body.primary') };
  else if (typeof cw.body === 'string') cw.body = gateStr(cw.body, 'copywriting.body');

  if (Array.isArray(cw.benefitBullets)) {
    cw.benefitBullets = cw.benefitBullets.filter((b: string) => {
      const bad = findViolations(b, userPrompt);
      if (bad.length) { v.push({ field: 'copywriting.benefitBullets', token: `${bad.join(', ')} (in "${b}")`, action: 'dropped-item' }); return false; }
      return true;
    });
  }

  // CTA survives as safe copy; the legal disclaimer is never model-written.
  if (cw.cta && typeof cw.cta === 'object') {
    const bad = findViolations(cw.cta.primary, userPrompt);
    if (bad.length) { v.push({ field: 'copywriting.cta.primary', token: bad.join(', '), action: 'replaced-safe' }); cw.cta = { ...cw.cta, primary: 'Get Funded Today' }; }
  } else if (typeof cw.cta === 'string') {
    const bad = findViolations(cw.cta, userPrompt);
    if (bad.length) { v.push({ field: 'copywriting.cta', token: bad.join(', '), action: 'replaced-safe' }); cw.cta = 'Get Funded Today'; }
  }
  if (cw.disclaimerText !== undefined) cw.disclaimerText = FIXED_DISCLAIMER;

  return { brief: { ...brief, copywriting: cw } as T, violations: v };
}

/** One-line log formatter so every gate action is visible in server logs. */
export function formatViolations(v: ClaimViolation[]): string {
  return v.map((x) => `${x.field}: "${x.token}" → ${x.action}`).join('; ');
}
