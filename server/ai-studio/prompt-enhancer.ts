/**
 * Prompt Enhancer — turns a SIMPLE user prompt into a BRILLIANT, agency-grade
 * image brief, consistently.
 *
 * Pipeline:
 *   1. BEST-OF-N: generate N candidate concepts in parallel, each on a DIFFERENT
 *      creative angle (emotional/human · proof/receipt · bold art · story/tension)
 *      and a different trending format, using the strongest available engine
 *      (GPT-4.1 / Claude Opus 4.8 / Sonnet 4.6 / Haiku).
 *   2. JUDGE: a creative-director judge scores the candidates on stopping-power,
 *      emotion, originality and clarity, and returns the most brilliant one.
 *   3. FIX + VALIDATE: deterministic clean-up (brand hashtag, CTA, disclaimer) +
 *      a hard checklist (committed length, brand CTA/disclaimer, numbers kept).
 *
 * Set STUDIO_BEST_OF=1 to disable the panel and run a single fast brief.
 * Output is structured so the Studio UI can show concept/headline/CTA, and so a
 * zero-typo overlay (visualPrompt + overlay) can composite text in code.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { extractAndRepairJson } from './parser';

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 120_000, maxRetries: 1 });
  return _anthropic;
}
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 1 });
  return _openai;
}

const ENHANCER_TEMPERATURE = Number(process.env.STUDIO_ENHANCER_TEMPERATURE ?? 0.9);
const ENHANCER_MAX_TOKENS = Number(process.env.STUDIO_ENHANCER_MAX_TOKENS ?? 3000);
const ANTHROPIC_PRIMARY = process.env.STUDIO_ENHANCER_MODEL || 'claude-opus-4-8';
const OPENAI_PRIMARY = process.env.STUDIO_ENHANCER_OPENAI_MODEL || 'gpt-4.1';
const BEST_OF_DEFAULT = Number(process.env.STUDIO_BEST_OF ?? 3);

const HOLA_PRIME_FALLBACK = `
=== BRAND (fallback — Hola Prime, used because no Brand Kit is uploaded) ===
Brand: Hola Prime — a premium prop trading firm. Tagline "#WeAreTraders".
CTA (FIXED — never substitute): "Buy Challenge" (English) / "Compra el Challenge" (Spanish). NEVER "Start Now", "Get Started", "Learn More".
Palette: deep near-black background (#000–#0A0A0F); white text; ONE accent — neon green or cyan for the hero number; blue pill CTA button.
Tiers: funded challenges from $2K to $100K. USPs: 1-step process, 5% profit target, no time limits, fast withdrawals, no activation fees, high profit splits.
Branding layout: the real logo is composited in the top-left corner in post-processing — leave that corner clear and do NOT draw it. "#WeAreTraders" pill sits top-right on the same line.
Legal disclaimer (use verbatim, tiny, bottom — NEVER replace with "Terms apply"): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."
=== END BRAND ===
`;

// The team's 4 creative directions (their methodology) — rotated per generation.
// Each is a complete visual concept; the model executes it 100% with fresh
// details every time (scene props, card design, chart mood vary per run).
const CREATIVE_DIRECTIONS: Array<{ format: string; accent: string; vibe: string }> = [
  { format: '"Trading Terminal Sale" — a dark, cinematic trading-platform UI as the subdued background; the offer card centered as the hero with glowing edges, carrying the sale label, price and code; sharp 3D sale typography', accent: 'electric blue + orange glow', vibe: 'premium fintech, direct-response' },
  { format: '"Challenge Access Pass" — the offer designed as a digital ticket / access pass floating above a subdued trading chart; the price huge and bold on the pass; the code styled like a scannable coupon strip; faint candlesticks, balance cards and subtle leaderboard elements behind', accent: 'gold on dark navy', vibe: 'limited-time trading ticket, collectible' },
  { format: '"Prop Trader Alert" — the entire ad styled as a trading-platform price-alert notification: alert bell icon, a popup card with the price-drop message, glowing chart line, red/green market movement, countdown-style urgency cues', accent: 'orange/red on dark', vibe: 'urgency, retargeting' },
  { format: '"Leaderboard Winner Energy" — a premium dashboard scene with challenge progress, leaderboard rank and an account-size badge; aspirational and competitive, the trader identity as the pull', accent: 'electric blue + gold', vibe: 'trader identity, performance' },
];

// Trading-psychology HOOKS for the best-of-N panel (the team's methodology) —
// the emotional lens each candidate commits to.
const BRILLIANT_ANGLES: string[] = [
  'OPPORTUNITY — "This is a big chance." Frame the offer as the opening a trader has been waiting for; the door is open right now.',
  'URGENCY — "This deal may disappear." Price-drop alert energy, limited-time framing, act-before-it-ends tension.',
  'STATUS — "Serious traders use this." Identity and belonging: the tool/badge of traders who are past playing around.',
  'CHALLENGE — "Can I pass this?" Gamified self-test energy: the evaluation as a proving ground, slightly competitive, leaderboard spirit.',
  'REWARD — "I can access a bigger account for less." Maximum account size per dollar; the value unlock is the star.',
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// ── Anti-repetition by DESIGN FAMILY ──────────────────────────────────────────
// The 22 directions cluster into a few families (proof · human · status · bold ·
// data). The judge tends to favour the "proof/receipt" family for proof-y prompts,
// so excluding the exact format isn't enough — consecutive runs still all look like
// receipts/screenshots. So we rotate at the FAMILY level: each run draws its
// candidates from DISTINCT families, excluding the last couple of WINNING families,
// so a bare prompt comes back as a visibly different design language every run.
const RECENT_CAP = 2;
const _recentFamilies: string[] = [];
function familyOf(format: string): string {
  const f = (format || '').toLowerCase();
  if (/face|hands|trader'?s|holding a phone|silhouette|human/.test(f)) return 'human';
  if (/vault|metal|membership|credit card|coin|cash|banknote|boarding pass|ticket/.test(f)) return 'status';
  if (/brutalist|billboard|times.?square|poster|risk.?warning|helvetica/.test(f)) return 'bold';
  if (/chart|candlestick|curve|heatmap|x-?ray|sparkline|terminal|ticker|calendar/.test(f)) return 'data';
  return 'proof'; // receipt, invoice, leaked chat, notification, ATM screen, X post…
}
function recordFamily(format?: string) {
  if (!format) return;
  _recentFamilies.push(familyOf(format));
  while (_recentFamilies.length > RECENT_CAP) _recentFamilies.shift();
}
// Pick n directions from n DISTINCT families, avoiding the recently-won families.
function pickFromFamilies(n: number, exclude: string[]): { format: string; accent: string; vibe: string }[] {
  const allFamilies = [...new Set(CREATIVE_DIRECTIONS.map((d) => familyOf(d.format)))];
  let fams = allFamilies.filter((fam) => !exclude.includes(fam));
  if (fams.length < Math.min(n, allFamilies.length)) fams = allFamilies; // not enough fresh ones
  const chosen = shuffle(fams).slice(0, n);
  while (chosen.length < n) chosen.push(allFamilies[Math.floor(Math.random() * allFamilies.length)]);
  return chosen.map((fam) => {
    const pool = CREATIVE_DIRECTIONS.filter((d) => familyOf(d.format) === fam);
    return pool[Math.floor(Math.random() * pool.length)] || CREATIVE_DIRECTIONS[0];
  });
}
function pickDirection(exclude: string[] = []) {
  return pickFromFamilies(1, exclude)[0];
}
function pickAngles(n: number) {
  return shuffle(BRILLIANT_ANGLES).slice(0, n);
}

export interface EnhanceOptions {
  brandContext?: string;
  tone?: string;
  directionHint?: string;
  logoWillBeComposited?: boolean;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** How many candidate concepts to generate + judge. Default from STUDIO_BEST_OF (3). */
  bestOf?: number;
  /** When the prompt is a photographic SCENE (a person doing something), lock the
   *  literal subject + action: the brief may art-direct it but never replace it
   *  with an object/receipt/screen concept. Pass the user's scene description. */
  subjectLock?: string;
}

export interface OverlayText {
  headline?: string;
  subheadline?: string;
  price?: string;
  /** Original/anchor price ("$450") — rendered struck-through by the overlay. */
  wasPrice?: string;
  bullets?: string[];
  cta?: string;
  urgencyText?: string;
  promoCode?: string;
  disclaimer?: string;
}

export interface EnhancedPrompt {
  imagePrompt: string;
  visualPrompt?: string;
  concept: string;
  /** META ADS WORKFLOW step 2: the ONE angle this creative commits to. */
  angle?: string;
  /** Step 1: offer · message · audience · funnel (as the concept agent read it). */
  briefDeconstruction?: string;
  /** Step 1: what the brief left unstated and the agent assumed. */
  assumptions?: string;
  headline: string;
  cta: string;
  overlay?: OverlayText;
  structured: boolean;
}

const SYSTEM_PROMPT = `You are a world-class direct-response creative director AND a senior prompt engineer for state-of-the-art image models (gpt-image-1 / Imagen / Ideogram), specialised in premium prop-trading and fintech ad creatives.

Your job: take a SHORT, often vague user request and expand it into ONE complete, literal, production-ready image-generation prompt for a BRILLIANT, scroll-stopping ad. Three words in → a Cannes-shortlist creative out.

THE TEAM'S CREATIVE APPROACH (this is the methodology — follow it, in order, for every brief):

1. START WITH THE TRADING PSYCHOLOGY HOOK. Before any design thinking, define the ONE emotional angle this ad triggers:
   - opportunity — "This is a big chance."
   - urgency — "This deal may disappear."
   - status — "Serious traders use this."
   - challenge — "Can I pass this?"
   - reward — "I can access a bigger account for less."
   The hook must work as a STANDALONE SENTENCE (e.g. "Unlock a $100K Challenge for less than the price of a weekend trade setup"). If it doesn't stop a thumb alone, rewrite it before designing.

2. BUILD A STRONG VISUAL HIERARCHY. The viewer must understand the ad in 2 SECONDS, reading in this exact order: Brand → Offer → Price → Code → Trust → CTA. The PRICE and the CHALLENGE/ACCOUNT SIZE are the biggest conversion elements — make them visually dominate (e.g. MID SEASON SALE / $100K Challenge / Was $450 → Now $248 / Use Code: NEWMS45 / Trustpilot 4.6 · Reviewed by Deloitte). HARD RULE: if the brief names a challenge/account size ($100K, $200K…), it MUST appear on-image — put it in the overlay "headline" (e.g. "$100K Challenge") so the viewer knows exactly WHAT they are buying, with the price as the separate hero token.

3. PREMIUM FINTECH DESIGN LANGUAGE. The creative must feel: modern, fast, trustworthy, premium, competitive, slightly gamified. Build with: a dark trading-dashboard background, glowing chart lines, clean cards, orange/blue contrast, polished 3D typography, and CTA elements that look like trading-platform notifications.

4. THE OFFER CARD IS THE HERO. The biggest mistake in trading ads is a busy chart/background — keep market UI subdued BEHIND, and make the offer card clean, bright and readable ON TOP. The card should feel like a "limited-time trading ticket" or "challenge access pass", never a normal coupon.

5. CONVERSION-SUPPORTING ELEMENTS (choose what the brief needs — trust + urgency without looking cheap): Trustpilot rating, review/audit badge, limited-time sale label, account-size badge, coupon-code block, alert/notification icon, tiny disclaimer at the bottom, trading-UI background, price slash-through, CTA arrow/button.

COPY STYLE — short and sharp, never paragraphs: primary headline ("$100K Challenge. Mid Season Price Drop." pattern), one offer line ("Get started for just $248" pattern), the code as its own block ("Use Code: NEWMS45"), one urgency line ("Only for new users"). CRITICAL: every figure, price, %, code comes ONLY from the brief or the approved brand facts — NEVER invented (a compliance gate strips violations).

COLOUR DIRECTION: dark navy / black for the premium trading feel · electric blue for fintech trust · orange / gold for sale energy · white / cream cards for readability · green/red accents only as market-movement hints · soft glow lighting. The ad must feel like a PREMIUM TRADING INTERFACE, never a generic discount poster.

FONT DIRECTION: headline = heavy geometric sans-serif (3D or chrome treatment welcome) · offer text = clean bold sans · price = ULTRA-BOLD and oversized · code = bold condensed · disclaimer = small readable uppercase. Strong and financial, never playful.

BRIEF DECONSTRUCTION FIRST: define the campaign goal (new users / retargeting / flash sale / challenge promotion), the offer (NEVER invent one — no offer in the brief = claim-free brand play), audience and funnel stage. If something is missing, state your assumption explicitly in "assumptions" — never silently guess.
FORBIDDEN: multiple competing messages or CTAs; text covering more than ~30% of the image; busy backgrounds fighting the offer card; generic discount-poster energy.

ART DIRECTION — MANDATORY (name EACH of these EXPLICITLY inside every imagePrompt AND visualPrompt; a brief that leaves any of them generic is INCOMPLETE — this is what separates a real art-directed ad from a merely described one):
- FOCAL POINT + HIERARCHY: state the ONE hero the eye must hit first, and rank everything else as explicitly SUBORDINATE (secondary, tertiary). One hero only — never two elements competing for attention.
- LIGHTING SETUP: name a real setup + direction — e.g. "low-key single rim light from back-left", "soft key with gentle fill", "hard chiaroscuro spotlight", "high-key editorial", "moody practical screen-glow". Never just "good"/"dramatic" lighting.
- LENS / FRAMING / DEPTH OF FIELD: name a focal length + framing + DOF, and say what is sharp vs. what melts to bokeh — e.g. "85mm portrait, shallow f/1.8, tight crop", "35mm environmental wide, deep focus", "100mm macro on the receipt".
- COLOUR GRADE + PALETTE: name a cohesive grade tied to the emotional beat and the brand's near-black base — e.g. "cool cyan monochrome on black", "teal-and-orange filmic grade", "warm amber low-key", "bleach-bypass steel". Restrained 3-4 colours, ONE hero accent — never rainbow.
- NEGATIVE SPACE (anti-clutter): demand deliberate empty space and say it in words — "remove elements until the composition would break; if a thing does not earn its place, delete it." Cap at ~5-6 elements with real breathing room on all sides.
- COMPOSITION RULE + THUMBNAIL (SQUINT) TEST: commit to ONE rule — "rule of thirds", "centered symmetry", or "intentional off-balance asymmetry" — and guarantee the hero + headline READ AT THUMBNAIL SIZE: if it turns to mush shrunk into a phone feed, it has failed.
- MATERIAL / TEXTURE / MOOD: where relevant, specify tangible surface + finish (brushed metal, thermal-receipt paper grain, glossy black acrylic reflection, real skin pores + stubble, fine film grain) and the single-word mood.
- PROOF IS NEVER CLUTTER: for a prop firm, CREDIBILITY CONVERTS — so restraint removes DECORATION (stray glows, particles, extra props, background noise), NEVER evidence. Payout / withdrawal screens, receipts, approval ticks, real figures, the offer/price, funded-account proof are CONVERSION elements — keep them visible, legible and prominent. When trimming, cut a decorative flourish, never a proof point. "Minimal" means fewer decorations, not less proof.

BANNED FILLER — never write these hollow phrases; each one is a craft decision you failed to make. Replace every one with a concrete lighting / lens / grade / composition choice: "professional ad", "eye-catching", "modern design", "sleek and modern", "visually appealing", "high quality", "stunning", "clean and professional", "dynamic composition". If one slips in, delete it and specify the actual craft instead.

HARD RULES:
1. PRESERVE USER INTENT EXACTLY. Every number, price, %, promo code, date and proper noun appears UNCHANGED. Never invent offers; never drop given ones. Interpret ambiguity by COMMITTING to the strongest reading.
2. BRAND IS GROUND TRUTH. Pull brand name, voice, palette, CTA wording, disclaimer, tiers and proof from the brand block. NEVER a generic CTA ("Start Now", "Get Started", "Learn More") when the brand specifies one. NEVER "Terms apply." when a real disclaimer exists — use the exact one. (The HUMANS-ALLOWED note above intentionally overrides any "no faces" brand line.)
3. COMMIT TO A CONCEPT — a real object, scene, or human moment, executed 100% (a receipt, a terminal, a notification, a trader's face mid-reaction, hands with a payout). The concept owns the idea.
4. BANNED DEFAULTS / VARIETY: do NOT default to (a) a big chrome headline centred on plain black, or (b) a black price tag / hang tag / centred card — overused; everything starts looking identical. COMMIT to the ASSIGNED CREATIVE DIRECTION (format + accent) and ANGLE in the user message. Vary the accent as assigned (green, cyan, amber, violet, red, gold, white) — not always neon green.
5. NO CLICHÉS: "AI-powered", "Revolutionary", "Next-gen", "Unlock your potential", "Algorithm", generic glow-on-black, cheesy stock-photo collages.
6. SPELL EVERY WORD CORRECTLY, and render EACH on-image text string EXACTLY ONCE — the headline, each bullet, the price, the CTA and the disclaimer each appear in ONE location only. NEVER duplicate a block of copy (especially the feature/benefit list) across two zones of the image. List the exact on-image text strings. The brand hashtag must be spelled EXACTLY as given.
7. WRITE FOR AN IMAGE MODEL: concrete and visual, 400–750 words — layout, exact on-image text, typography, colours BY NAME (no hex), and EVERY art-direction spec above stated explicitly (focal point + hierarchy, named lighting setup, lens/framing/DOF, colour grade, deliberate negative space with the "remove until it breaks" test, composition rule + thumbnail-readability, material/texture/mood), plus where the hero/CTA/disclaimer sit. RESERVE the top ~10-12% as a clean brand strip: keep the top-left corner clear (the real logo is composited there in post — do NOT draw it), put the "#WeAreTraders" pill top-right on that same line, and START THE HEADLINE BELOW the strip so nothing overlaps the logo corner. No markdown headers.

ALSO return a "visualPrompt" and an "overlay" object for a zero-typo mode where text is drawn in code:
- "visualPrompt": a TEXT-FREE plate, FULL-BLEED and edge-to-edge — the hero subject or scene FILLS THE ENTIRE FRAME (a face/figure is large and dominant; an object/scene extends to all four edges). NO readable text, numbers, words or logo. Name the LENS/focal length, LIGHTING setup and COLOUR GRADE here too — same art-direction bar as the imagePrompt. KEEP proof DEVICES visible (a payout/withdrawal screen, a receipt, an approval tick, a funded-account dashboard) — but with ZERO letterforms or digits visible: heavily out-of-focus, angled away, or abstracted to glow and shape (an out-of-focus glowing screen, never fake numbers — placeholder/"illegible" filler ALWAYS renders as garbled junk and is FORBIDDEN); never delete the proof object itself. Do NOT leave blank or empty areas — instead make the TOP ~12% and BOTTOM ~38% naturally DARKER (cinematic shadow, gradient, vignette or depth-of-field falloff) so overlaid text stays legible WITHOUT any dead space. Deep, premium, cinematic — frame-filling, never a small element floating on an empty background.
- "overlay": the EXACT text strings — headline short (<=6 words); 3–5 short USP bullets; price = ONE short hero token only (e.g. "$39", "40% OFF", or "$100K") — NEVER a phrase or two numbers (put phrases in headline/subheadline); cta = the brand's fixed CTA; disclaimer = the brand's exact disclaimer. Do NOT repeat the same offer across headline, subheadline, price and urgencyText — each field says something different.

OUTPUT: raw JSON only, no fences, no preamble:
{
  "concept": "3-6 word concept name",
  "angle": "opportunity|urgency|status|challenge|reward",
  "briefDeconstruction": "one line: offer · message · audience · funnel stage",
  "assumptions": "anything the brief left unstated that you assumed (empty if none)",
  "hook": "the one-line scroll-stopping idea in plain words (why a trader stops) — MUST work as a standalone sentence",
  "headline": "the primary on-image headline text (a HOOK, verbatim as it renders)",
  "cta": "the brand's fixed CTA",
  "imagePrompt": "the full literal 350-700 word image prompt, committed to ONE concept (text integrated)",
  "visualPrompt": "a 120-250 word TEXT-FREE plate prompt — FULL-BLEED frame-filling hero, no words/numbers/logo, ZERO letterforms even on screens/receipts (out-of-focus/abstracted), top & bottom naturally DARKENED (not empty) for text legibility",
  "overlay": { "headline": "", "subheadline": "", "price": "", "wasPrice": "the original/anchor price token when the brief gives one (e.g. $450) — empty otherwise", "bullets": [], "cta": "", "urgencyText": "", "promoCode": "", "disclaimer": "" }
}`;

function effectiveBrand(opts: EnhanceOptions): string {
  return opts.brandContext && opts.brandContext.trim() ? opts.brandContext : HOLA_PRIME_FALLBACK;
}

function buildUserMessage(
  userPrompt: string,
  opts: EnhanceOptions,
  direction: { format: string; accent: string; vibe: string },
  angle: string | null,
): string {
  const toneLine = opts.tone ? `\nTONE / STYLE OVERRIDE: ${opts.tone}` : '';
  const logoCorner = opts.logoPosition || 'top-left';
  const logoLine = `\nBRAND STRIP (STRICT TOP-OF-CANVAS LAYOUT): Reserve the TOP ~10-12% of the canvas as a clean, uncluttered horizontal brand strip. The real brand logo is composited onto the ${logoCorner} corner of this strip AFTER generation — keep that corner COMPLETELY clear/empty (dark, no text, do NOT draw any logo or wordmark, do NOT write "Hola" or "Prime" anywhere). Place the "#WeAreTraders" pill in the TOP-RIGHT of the SAME strip, vertically centered on the same horizontal line as the (empty) logo corner. NOTHING else may enter this top strip — the headline and ALL other text/content MUST start BELOW it, never overlapping the corner.`;

  const angleBlock = angle
    ? `\nASSIGNED ANGLE (your creative lens for THIS concept — commit 100%):\n${angle}\n`
    : '';

  const directionBlock = `
ASSIGNED CREATIVE DIRECTION (commit to THIS unless the user's request clearly names a different format):
- Format / concept: ${direction.format}
- Accent colour: ${direction.accent} (hero accent on the brand's deep near-black base)
- Vibe: ${direction.vibe}
Build the whole creative around this so it looks DIFFERENT from a generic dark price tag/card. Use the assigned accent, not green-by-default.
Creative seed (for fresh variation in composition, props and wording — do NOT render this number anywhere): ${Math.floor(Math.random() * 1_000_000)}`;

  const subjectLockBlock = opts.subjectLock
    ? `
SUBJECT LOCK — OVERRIDES THE ASSIGNED DIRECTION'S FORMAT:
The user asked for a photographic SCENE: "${opts.subjectLock}".
The image MUST literally depict this human subject and action as the frame-filling hero. You may art-direct it (lighting, lens, grade, mood, environment) but you may NOT substitute the subject with an object, receipt, screen, notification or any other stand-in concept. A person ${/celebrat/i.test(opts.subjectLock) ? 'celebrating' : 'doing the described action'} must be visible and dominant in BOTH imagePrompt and visualPrompt. If the assigned creative direction conflicts with this, keep its lighting/accent/vibe and DROP its format.
`
    : '';

  return `USER REQUEST (expand into a full BRILLIANT ad brief — preserve every number and word):
"""
${userPrompt}
"""${toneLine}${logoLine}${subjectLockBlock}
${angleBlock}${directionBlock}
${effectiveBrand(opts)}

Produce the JSON. Make it scroll-stopping and emotional, not a generic info-card. The imagePrompt must be specific enough that the image model produces a finished, premium ad on the first try.`;
}

// ─── Brand rules used to fix + validate briefs ───
interface BrandRules {
  cta: string | null;
  tagline: string | null;
  requireDisclaimer: boolean;
  disclaimer: string | null;
}
function detectBrandRules(brandText: string): BrandRules {
  const t = brandText || '';
  const rules: BrandRules = { cta: null, tagline: null, requireDisclaimer: false, disclaimer: null };
  if (/buy challenge/i.test(t)) rules.cta = 'Buy Challenge';
  const tag = t.match(/#[A-Za-z][A-Za-z0-9]{2,}/);
  if (tag) rules.tagline = tag[0];
  if (/fictitious/i.test(t)) {
    rules.requireDisclaimer = true;
    const dm = t.match(/[A-Z][A-Z0-9 ,.'"-]*FICTITIOUS[^"]*?ACCOUNTS\./i);
    if (dm) rules.disclaimer = dm[0].trim();
  }
  return rules;
}

function tokensToPreserve(s: string): string[] {
  const out = new Set<string>();
  const re = /\d[\d,]*(?:\.\d+)?\s?k?%?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const tok = m[0].replace(/[\s,]/g, '').toLowerCase();
    if (/\d/.test(tok)) out.add(tok);
  }
  return [...out];
}

function fixupBrief(brief: EnhancedPrompt, rules: BrandRules): EnhancedPrompt {
  let ip = brief.imagePrompt || '';
  if (rules.tagline) ip = ip.replace(/#[A-Za-z][A-Za-z0-9]{2,}/g, rules.tagline);
  if (rules.disclaimer) ip = ip.replace(/terms (?:and conditions )?apply\.?/gi, rules.disclaimer);
  brief.imagePrompt = ip;
  if (rules.cta) brief.cta = rules.cta;
  if (brief.overlay) {
    if (rules.cta) brief.overlay.cta = rules.cta;
    if (rules.disclaimer) brief.overlay.disclaimer = rules.disclaimer;
  }
  return brief;
}

function validateBrief(brief: EnhancedPrompt, userPrompt: string, rules: BrandRules): string[] {
  const issues: string[] = [];
  const ip = (brief.imagePrompt || '').toLowerCase().replace(/,/g, '');
  if ((brief.imagePrompt || '').length < 1200) issues.push('thin/short prompt');
  if (/terms apply/i.test(brief.imagePrompt || '')) issues.push('generic "Terms apply"');
  if (rules.requireDisclaimer && !ip.includes('fictitious')) issues.push('missing disclaimer');
  if (rules.cta && !ip.includes(rules.cta.toLowerCase()) && !(brief.cta || '').toLowerCase().includes(rules.cta.toLowerCase())) {
    issues.push('missing brand CTA');
  }
  for (const tok of tokensToPreserve(userPrompt)) {
    if (!ip.includes(tok)) issues.push(`dropped "${tok}"`);
  }
  return issues;
}

function validShape(p: any): boolean {
  return p && typeof p.imagePrompt === 'string' && p.imagePrompt.length > 80;
}
function toBrief(parsed: any): EnhancedPrompt {
  const ov = parsed.overlay && typeof parsed.overlay === 'object' ? parsed.overlay : undefined;
  return {
    imagePrompt: parsed.imagePrompt,
    visualPrompt: typeof parsed.visualPrompt === 'string' ? parsed.visualPrompt : '',
    concept: parsed.concept || '',
    angle: typeof parsed.angle === 'string' ? parsed.angle : '',
    briefDeconstruction: typeof parsed.briefDeconstruction === 'string' ? parsed.briefDeconstruction : '',
    assumptions: typeof parsed.assumptions === 'string' ? parsed.assumptions : '',
    headline: parsed.headline || '',
    cta: parsed.cta || '',
    overlay: ov
      ? {
          headline: ov.headline || parsed.headline || '',
          subheadline: ov.subheadline || '',
          price: ov.price || '',
          wasPrice: ov.wasPrice || '',
          bullets: Array.isArray(ov.bullets) ? ov.bullets : [],
          cta: ov.cta || parsed.cta || '',
          urgencyText: ov.urgencyText || '',
          promoCode: ov.promoCode || '',
          disclaimer: ov.disclaimer || '',
        }
      : undefined,
    structured: true,
  };
}

// ─── Engine calls — return a parsed brief object or null ───
async function generateAnthropic(model: string, userMessage: string): Promise<any | null> {
  try {
    const supportsTemp = !/opus-4-8/i.test(model);
    const res = await getAnthropic().messages.create({
      model,
      max_tokens: ENHANCER_MAX_TOKENS,
      ...(supportsTemp ? { temperature: ENHANCER_TEMPERATURE } : {}),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const text = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = extractAndRepairJson(text)?.parsed || null;
    return validShape(parsed) ? parsed : null;
  } catch (err: any) {
    console.warn(`[PromptEnhancer] anthropic:${model} failed:`, err.status, err.message);
    if (err.status === 401 || err.status === 403) throw err;
    return null;
  }
}
async function generateOpenAI(model: string, userMessage: string): Promise<any | null> {
  try {
    const isReasoning = /(^|[-/])(o\d|gpt-5)/i.test(model);
    const res = await getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: ENHANCER_MAX_TOKENS,
      ...(isReasoning ? {} : { temperature: ENHANCER_TEMPERATURE }),
    } as any);
    const text = res.choices?.[0]?.message?.content || '';
    const parsed = extractAndRepairJson(text)?.parsed || null;
    return validShape(parsed) ? parsed : null;
  } catch (err: any) {
    console.warn(`[PromptEnhancer] openai:${model} failed:`, err.status, err.message);
    if (err.status === 401 || err.status === 403) throw err;
    return null;
  }
}

type Attempt = { provider: 'anthropic' | 'openai'; model: string };
function buildAttempts(haveAnthropic: boolean, haveOpenAI: boolean): Attempt[] {
  const openaiFirst: Attempt[] = [
    { provider: 'openai', model: OPENAI_PRIMARY },
    { provider: 'anthropic', model: ANTHROPIC_PRIMARY },
    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  ];
  const anthropicFirst: Attempt[] = [
    { provider: 'anthropic', model: ANTHROPIC_PRIMARY },
    { provider: 'anthropic', model: 'claude-sonnet-4-6' },
    { provider: 'openai', model: OPENAI_PRIMARY },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  ];
  const attempts = (process.env.STUDIO_ENHANCER_PROVIDER || 'openai').toLowerCase() === 'anthropic'
    ? anthropicFirst : openaiFirst;
  return attempts.filter((a) => (a.provider === 'anthropic' ? haveAnthropic : haveOpenAI));
}

/** Generate ONE brief from a user message: try engines, fix + validate, return the cleanest. */
async function generateBrief(
  userMessage: string,
  attempts: Attempt[],
  rules: BrandRules,
  userPrompt: string,
): Promise<EnhancedPrompt | null> {
  let best: EnhancedPrompt | null = null;
  let bestIssues = Number.POSITIVE_INFINITY;
  for (const a of attempts) {
    let parsed: any = null;
    try {
      parsed = a.provider === 'anthropic'
        ? await generateAnthropic(a.model, userMessage)
        : await generateOpenAI(a.model, userMessage);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) continue;
      parsed = null;
    }
    if (!parsed) continue;
    const brief = fixupBrief(toBrief(parsed), rules);
    const issues = validateBrief(brief, userPrompt, rules);
    if (issues.length === 0) return brief;
    if (issues.length < bestIssues) { best = brief; bestIssues = issues.length; }
  }
  return best;
}

/** Creative-director judge: pick the most BRILLIANT candidate. Returns its index. */
async function judgeBriefs(
  userPrompt: string,
  candidates: EnhancedPrompt[],
  haveOpenAI: boolean,
  haveAnthropic: boolean,
): Promise<number> {
  if (candidates.length <= 1) return 0;
  const list = candidates
    .map((c, i) => `#${i}\nCONCEPT: ${c.concept}\nHEADLINE: ${c.headline}\nOPENING: ${(c.imagePrompt || '').slice(0, 350)}`)
    .join('\n\n');
  const sys = `You are a world-class direct-response creative director judging prop-trading ad CONCEPTS. Pick the ONE most BRILLIANT — most likely to STOP a trader's thumb in 0.5s, trigger emotion, feel ORIGINAL (a competitor could NOT run it), be crystal-clear on ONE idea, and convert. Reward bold, specific, emotional, scroll-stopping hooks. Penalise generic info-cards and label-headlines. Return ONLY JSON: {"winner": <index>, "why": "<one line>"}`;
  const usr = `User request: "${userPrompt}"\n\nCandidates:\n${list}\n\nReturn JSON only.`;
  try {
    if (haveOpenAI) {
      const res = await getOpenAI().chat.completions.create({
        model: OPENAI_PRIMARY,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_completion_tokens: 150,
      } as any);
      const p = extractAndRepairJson(res.choices?.[0]?.message?.content || '')?.parsed;
      const w = Number(p?.winner);
      if (Number.isInteger(w) && w >= 0 && w < candidates.length) {
        console.log(`[PromptEnhancer] Judge → #${w}: ${p?.why || ''}`);
        return w;
      }
    } else if (haveAnthropic) {
      const res = await getAnthropic().messages.create({
        model: 'claude-sonnet-4-6', max_tokens: 150, system: sys,
        messages: [{ role: 'user', content: usr }],
      });
      const txt = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
      const p = extractAndRepairJson(txt)?.parsed;
      const w = Number(p?.winner);
      if (Number.isInteger(w) && w >= 0 && w < candidates.length) {
        console.log(`[PromptEnhancer] Judge → #${w}: ${p?.why || ''}`);
        return w;
      }
    }
  } catch (e: any) {
    console.warn('[PromptEnhancer] Judge failed:', e.message);
  }
  return 0;
}

/**
 * Expand a short user prompt into a BRILLIANT image brief.
 * Best-of-N across diverse angles + a creative-director judge by default.
 * Never throws — returns the original prompt as imagePrompt on total failure.
 */
export async function enhanceImagePrompt(
  userPrompt: string,
  opts: EnhanceOptions = {},
): Promise<EnhancedPrompt> {
  const fallback: EnhancedPrompt = { imagePrompt: userPrompt, concept: '', headline: '', cta: '', structured: false };
  const trimmed = (userPrompt || '').trim();
  if (!trimmed) return fallback;

  const haveAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const haveOpenAI = !!process.env.OPENAI_API_KEY;
  if (!haveAnthropic && !haveOpenAI) {
    console.warn('[PromptEnhancer] No ANTHROPIC_API_KEY or OPENAI_API_KEY — sending prompt unenhanced.');
    return fallback;
  }

  const rules = detectBrandRules(effectiveBrand(opts));
  const attempts = buildAttempts(haveAnthropic, haveOpenAI);
  const bestOf = Math.max(1, Math.min(4, Number(opts.bestOf ?? BEST_OF_DEFAULT)));

  // Single brief when best-of is disabled OR the caller forces a specific direction.
  if (bestOf <= 1 || opts.directionHint) {
    const direction = opts.directionHint
      ? { format: opts.directionHint, accent: 'on-brand accent', vibe: '' }
      : pickDirection(_recentFamilies);
    console.log(`[PromptEnhancer] Single brief | direction: ${direction.format}`);
    const brief = await generateBrief(buildUserMessage(trimmed, opts, direction, null), attempts, rules, trimmed);
    if (brief && !opts.directionHint) recordFamily(direction.format);
    return brief || fallback;
  }

  // ── BEST-OF-N: diverse angles × directions, generated in parallel, then judged.
  //    Directions EXCLUDE the recent winners so the design language rotates each run. ──
  const angles = pickAngles(bestOf);
  const dirs = pickFromFamilies(bestOf, _recentFamilies);
  console.log(`[PromptEnhancer] Brilliant mode: best-of-${bestOf} | families: ${dirs.map((d) => familyOf(d.format)).join(', ')} | avoiding [${_recentFamilies.join(', ')}]`);

  const results = await Promise.all(
    angles.map((angle, i) =>
      generateBrief(buildUserMessage(trimmed, opts, dirs[i], angle), attempts, rules, trimmed)
        .then((b) => (b ? { brief: b, dir: dirs[i] } : null))
        .catch(() => null),
    ),
  );
  const candidates = results.filter(Boolean) as { brief: EnhancedPrompt; dir: { format: string; accent: string; vibe: string } }[];

  if (candidates.length === 0) {
    console.warn('[PromptEnhancer] All candidates failed — using original prompt.');
    return fallback;
  }
  if (candidates.length === 1) { recordFamily(candidates[0].dir.format); return candidates[0].brief; }

  const winner = await judgeBriefs(trimmed, candidates.map((c) => c.brief), haveOpenAI, haveAnthropic);
  const win = candidates[winner] || candidates[0];
  recordFamily(win.dir.format);
  console.log(`[PromptEnhancer] ✓ Best-of-${candidates.length} winner: "${win.brief.concept}" (${win.dir.format.slice(0, 28)})`);
  return win.brief;
}
