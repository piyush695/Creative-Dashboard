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
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
Branding: logo top-left, "#WeAreTraders" pill top-right.
Legal disclaimer (use verbatim, tiny, bottom — NEVER replace with "Terms apply"): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."
=== END BRAND ===
`;

// Trending prop-trading / fintech ad formats — rotated for variety.
const CREATIVE_DIRECTIONS: Array<{ format: string; accent: string; vibe: string }> = [
  { format: 'a photographed thermal-paper receipt / payout slip on a dark surface, soft shadow', accent: 'neon green', vibe: 'proof, cred over promises' },
  { format: 'an off-axis Bloomberg-style trading terminal screen with faint scanlines', accent: 'amber', vibe: 'institutional, pro' },
  { format: 'a full-bleed phone lock-screen notification card — the notification IS the ad', accent: 'electric cyan', vibe: 'native, instant' },
  { format: 'a leaked Slack/Discord chat screenshot of the offer (avatar, timestamp, channel)', accent: 'neon green', vibe: 'insider, authentic' },
  { format: 'a candlestick / P&L chart rendered as glowing fine-art light on black', accent: 'cyan', vibe: 'data as art' },
  { format: 'a premium matte-black metal membership/credit card under dramatic studio light', accent: 'neon green', vibe: 'status, vault' },
  { format: 'a brutalist stark Helvetica-on-black poster, harsh contrast, almost ugly', accent: 'white', vibe: 'counter-aesthetic, bold' },
  { format: 'a breaking-news ticker / lower-third TV banner', accent: 'red', vibe: 'urgency, event' },
  { format: 'a banking-app / ATM withdrawal screen mid-payout', accent: 'neon green', vibe: 'payout fantasy' },
  { format: 'an itemized invoice / order confirmation, monospace, dotted dividers', accent: 'cyan', vibe: 'receipt cred' },
  { format: 'a night-time Times-Square-style billboard mockup', accent: 'violet', vibe: 'big, aspirational' },
  { format: 'an X (Twitter) post / quote card carrying the offer', accent: 'white', vibe: 'social proof' },
  { format: 'a cinematic close-up of a real trader\'s face lit by screen glow, genuine emotion', accent: 'cyan', vibe: 'human, emotional' },
  { format: 'hands holding a phone showing a payout confirmation, shallow depth of field', accent: 'neon green', vibe: 'human, proof' },
  { format: 'a vault / safe door cracking open to reveal capital', accent: 'gold', vibe: 'capital unlocked' },
  { format: 'a boarding pass / event ticket with a torn perforation edge', accent: 'cyan', vibe: 'access granted' },
  { format: 'a fan of cash / banknotes under cinematic light', accent: 'neon green', vibe: 'reward, tangible' },
  // ── v2 trader-native directions (design-language upgrade — remove this block to revert) ──
  { format: 'a clinical HUD x-ray scan of a trader silhouette: brain and hands glowing "SKILL 100%", a near-empty red battery over the wallet labelled "CAPITAL", a cable plugging in a full charge', accent: 'cyan-green', vibe: 'you are not broken, just under-capitalized' },
  { format: 'a rising equity / P&L curve rendered as a sunrise landscape horizon, a tiny climbing silhouette walking up it toward the dawn, the drawdown dip left visible', accent: 'emerald', vibe: 'the journey shape, hope earned' },
  { format: 'a grey statutory broker risk-warning banner in its own legalese typeface, one line struck through in red ink and corrected so the math flips in the trader\'s favour', accent: 'red on grey', vibe: 'regulatory in-joke, insider wink' },
  { format: 'a month-view trading P&L calendar heatmap of red / green / grey day tiles, mostly green, one day hand-circled "evaluation passed"', accent: 'green', vibe: 'consistency over luck, the grind' },
  { format: 'a single minted challenge coin standing on its edge in a vast black void, a hard rim-light eclipse halo, the embossed crest in shadow', accent: 'bronze/gold', vibe: 'earned rite of passage, collectible status' },
];

// Creative ANGLES for the best-of-N panel — the lens each candidate commits to.
const BRILLIANT_ANGLES: string[] = [
  'EMOTIONAL / HUMAN — build around a real, authentic human moment: a trader\'s face mid-reaction, hands holding a phone showing a payout, a transformation. Real people and faces ARE allowed and encouraged here; this OVERRIDES any "no faces / graphic-only" brand note. Premium and real, never cheesy stock.',
  'PROOF / RECEIPT — lead with hard, specific, credible proof: a payout/withdrawal screenshot, exact figures, a leaked-chat or receipt aesthetic. Cred over promises. Do NOT fabricate fake testimonials, fake names, or invented amounts — use the brand\'s real facts or clearly representative framing.',
  'BOLD ART-DIRECTION — one striking, original, almost-disruptive visual idea or a sharp counter-narrative hook. No people needed: pure stopping power and craft.',
  'STORY / TENSION — open a curiosity loop: a surprising before/after, a provocative truth about trading, a "wait, what?" moment. The headline is a HOOK, not a label.',
  'PERSUASION-MADE-PHYSICAL — take ONE invisible mechanism (skill-vs-capital, anchoring, scarcity, risk-reversal, identity) and stage it as a single literal object a trader decodes instantly. The object carries the argument; the headline stays a hook, not a label. No fabricated numbers — capital/risk framing must be representative and honest.',
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickDirection() {
  return CREATIVE_DIRECTIONS[Math.floor(Math.random() * CREATIVE_DIRECTIONS.length)];
}
function pickDirectionsDistinct(n: number) {
  return shuffle(CREATIVE_DIRECTIONS).slice(0, n);
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
}

export interface OverlayText {
  headline?: string;
  subheadline?: string;
  price?: string;
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
  headline: string;
  cta: string;
  overlay?: OverlayText;
  structured: boolean;
}

const SYSTEM_PROMPT = `You are a world-class direct-response creative director AND a senior prompt engineer for state-of-the-art image models (gpt-image-1 / Imagen / Ideogram), specialised in premium prop-trading and fintech ad creatives.

Your job: take a SHORT, often vague user request and expand it into ONE complete, literal, production-ready image-generation prompt for a BRILLIANT, scroll-stopping ad. Three words in → a Cannes-shortlist creative out.

THE BRILLIANT BAR — push past "good/competent" to scroll-stopping (this is the whole point):
- You are NOT making an information card. You are making a SCROLL-STOPPER. In the first 0.5 seconds it must trigger an EMOTION and open a curiosity loop.
- The headline is a HOOK, not a label. "100K OFF CHALLENGE" is a label. "He blew 3 accounts — then withdrew $12,400 on a Tuesday" is a hook. Lead with tension, a surprising truth, a specific result, or a transformation.
- ONE emotional driver: status, relief, FOMO, belonging, vindication, transformation, or hard proof. Make the viewer FEEL it — don't list features at them.
- Specific, dramatic, CREDIBLE proof beats vague claims — but NEVER fabricate fake testimonials, fake names, or invented payout amounts. Use the brand's real facts or clearly representative framing.
- It should NOT look like a generic ad — it should look like a notification, a receipt, a leaked screenshot, a news clip, or a piece of art you'd stop to study.
- HUMANS ALLOWED: authentic human faces, reactions, hands, and UGC-style people ARE permitted and encouraged when the angle calls for it — this OVERRIDES any "graphic only / no faces" brand note. Keep them premium and real, never cheesy stock.
- If an ASSIGNED ANGLE is given in the user message, commit to it 100% — that is your creative lens for this concept.

HARD RULES:
1. PRESERVE USER INTENT EXACTLY. Every number, price, %, promo code, date and proper noun appears UNCHANGED. Never invent offers; never drop given ones. Interpret ambiguity by COMMITTING to the strongest reading.
2. BRAND IS GROUND TRUTH. Pull brand name, voice, palette, CTA wording, disclaimer, tiers and proof from the brand block. NEVER a generic CTA ("Start Now", "Get Started", "Learn More") when the brand specifies one. NEVER "Terms apply." when a real disclaimer exists — use the exact one. (The HUMANS-ALLOWED note above intentionally overrides any "no faces" brand line.)
3. COMMIT TO A CONCEPT — a real object, scene, or human moment, executed 100% (a receipt, a terminal, a notification, a trader's face mid-reaction, hands with a payout). The concept owns the idea.
4. BANNED DEFAULTS / VARIETY: do NOT default to (a) a big chrome headline centred on plain black, or (b) a black price tag / hang tag / centred card — overused; everything starts looking identical. COMMIT to the ASSIGNED CREATIVE DIRECTION (format + accent) and ANGLE in the user message. Vary the accent as assigned (green, cyan, amber, violet, red, gold, white) — not always neon green.
5. NO CLICHÉS: "AI-powered", "Revolutionary", "Next-gen", "Unlock your potential", "Algorithm", generic glow-on-black, cheesy stock-photo collages.
6. SPELL EVERY WORD CORRECTLY, and render EACH on-image text string EXACTLY ONCE — the headline, each bullet, the price, the CTA and the disclaimer each appear in ONE location only. NEVER duplicate a block of copy (especially the feature/benefit list) across two zones of the image. List the exact on-image text strings. The brand hashtag must be spelled EXACTLY as given.
7. WRITE FOR AN IMAGE MODEL: concrete and visual, 350–700 words — layout, exact on-image text, typography, colours BY NAME (no hex), lighting, materials, mood, where the hero/CTA/disclaimer sit. No markdown headers.

ALSO return a "visualPrompt" and an "overlay" object for a zero-typo mode where text is drawn in code:
- "visualPrompt": a TEXT-FREE plate — atmosphere/lighting/colour/abstract or human hero only, NO readable text, numbers, words or logo; reserve empty space top ~12% and bottom ~35%. Deep premium background.
- "overlay": the EXACT text strings — headline short (<=6 words); 3–5 short USP bullets; price = ONE short hero token only (e.g. "$39", "40% OFF", or "$100K") — NEVER a phrase or two numbers (put phrases in headline/subheadline); cta = the brand's fixed CTA; disclaimer = the brand's exact disclaimer. Do NOT repeat the same offer across headline, subheadline, price and urgencyText — each field says something different.

OUTPUT: raw JSON only, no fences, no preamble:
{
  "concept": "3-6 word concept name",
  "hook": "the one-line scroll-stopping idea in plain words (why a trader stops)",
  "headline": "the primary on-image headline text (a HOOK, verbatim as it renders)",
  "cta": "the brand's fixed CTA",
  "imagePrompt": "the full literal 350-700 word image prompt, committed to ONE concept (text integrated)",
  "visualPrompt": "a 120-250 word TEXT-FREE plate prompt — no words/numbers/logo, space reserved top & bottom",
  "overlay": { "headline": "", "subheadline": "", "price": "", "bullets": [], "cta": "", "urgencyText": "", "promoCode": "", "disclaimer": "" }
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
  const logoLine = opts.logoWillBeComposited
    ? `\nLOGO HANDLING: The real brand logo will be composited onto the ${opts.logoPosition || 'top-left'} corner AFTER generation. Keep that corner clear/empty (dark, no text, no drawn logo). Do NOT draw any brand wordmark/logo.`
    : `\nLOGO HANDLING: No logo will be composited. Don't draw a brand logo/wordmark unless the user asked — keep brand corners clean.`;

  const angleBlock = angle
    ? `\nASSIGNED ANGLE (your creative lens for THIS concept — commit 100%):\n${angle}\n`
    : '';

  const directionBlock = `
ASSIGNED CREATIVE DIRECTION (commit to THIS unless the user's request clearly names a different format):
- Format / concept: ${direction.format}
- Accent colour: ${direction.accent} (hero accent on the brand's deep near-black base)
- Vibe: ${direction.vibe}
Build the whole creative around this so it looks DIFFERENT from a generic dark price tag/card. Use the assigned accent, not green-by-default.`;

  return `USER REQUEST (expand into a full BRILLIANT ad brief — preserve every number and word):
"""
${userPrompt}
"""${toneLine}${logoLine}
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
    headline: parsed.headline || '',
    cta: parsed.cta || '',
    overlay: ov
      ? {
          headline: ov.headline || parsed.headline || '',
          subheadline: ov.subheadline || '',
          price: ov.price || '',
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
      : pickDirection();
    console.log(`[PromptEnhancer] Single brief | direction: ${direction.format}`);
    const brief = await generateBrief(buildUserMessage(trimmed, opts, direction, null), attempts, rules, trimmed);
    return brief || fallback;
  }

  // ── BEST-OF-N: diverse angles × directions, generated in parallel, then judged ──
  const angles = pickAngles(bestOf);
  const dirs = pickDirectionsDistinct(bestOf);
  console.log(`[PromptEnhancer] Brilliant mode: best-of-${bestOf} | angles: ${angles.map((a) => a.split(' —')[0]).join(', ')}`);

  const results = await Promise.all(
    angles.map((angle, i) =>
      generateBrief(buildUserMessage(trimmed, opts, dirs[i], angle), attempts, rules, trimmed).catch(() => null),
    ),
  );
  const candidates = results.filter((b): b is EnhancedPrompt => !!b);

  if (candidates.length === 0) {
    console.warn('[PromptEnhancer] All candidates failed — using original prompt.');
    return fallback;
  }
  if (candidates.length === 1) return candidates[0];

  const winner = await judgeBriefs(trimmed, candidates, haveOpenAI, haveAnthropic);
  console.log(`[PromptEnhancer] ✓ Best-of-${candidates.length} winner: "${candidates[winner].concept}"`);
  return candidates[winner];
}
