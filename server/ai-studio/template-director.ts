/**
 * Template Director — the creative "brain" for the design-template engine.
 *
 * Works the way a Hola Prime designer does:
 *   1. UNDERSTAND the situation/brief → objective.
 *   2. PICK the archetype that fits (from the playbook).
 *   3. BRAINSTORM which TRADING ELEMENTS reinforce the message and WHERE they go
 *      (hero / proof / supporting / corner) for maximum engagement.
 *   4. WRITE the copy (preserving every number & code verbatim).
 *   5. EXPLAIN the reasoning.
 *
 * Output = a renderable CreativeSpec (for template-studio.renderCreative) + a
 * human-readable rationale + the element/placement decisions. Grounded in
 * brand-playbook.ts, which is editable to teach it new plays.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractAndRepairJson } from './parser';
import { playbookContext, SITUATIONS } from './brand-playbook';
import type { CreativeSpec, Archetype } from './template-studio';

let _client: Anthropic | null = null;
function client(): Anthropic { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 1 }); return _client; }

const MODEL = process.env.STUDIO_DIRECTOR_MODEL || 'claude-sonnet-4-6';

export interface DirectorDecision {
  situation: string;
  objective: string;
  archetype: Archetype;
  accent: string;
  background: 'black' | 'orb' | 'solid' | 'photo';
  elements: { element: string; zone: string; why: string }[];
  placement: string;
  rationale: string;
}
export interface DirectorResult {
  decision: DirectorDecision;
  spec: CreativeSpec;
  platePrompt?: string; // for photographic archetype
}

const SYSTEM = `You are the Creative Director at Hola Prime, a premium prop-trading firm. You brief the design team.
You do NOT fill templates blindly — you reason like a designer:
1) READ THE SITUATION: what is the trigger and the ONE objective (offer-push, social-proof, trust-authority, aspiration, feature-comms, tier-promo)?
2) PICK THE ARCHETYPE that fits (giant-number | testimonial | benefit-stack | photographic).
3) BRAINSTORM TRADING ELEMENTS: from the element library, choose the 2–4 that best reinforce THIS message, and decide WHERE each sits (hero / proof-center / proof-side / supporting / lower-offer / corner-trust / background) so the ad is engaging and reads in 0.5s.
4) WRITE THE COPY, preserving EVERY number, %, price, promo code and proper noun from the brief VERBATIM. COMPLIANCE HARD LINE: you may NOT emit ANY specific factual claim — number, %, price, anchor/strike price, timeframe, promo code, ranking or guarantee — that is not in the brief or the approved facts (Zero payout denials; Trustpilot 4.6; Independently Reviewed by Deloitte). No figure in the brief = write claim-free copy (brand promises like "Zero payout denials" are fine; invented figures are FORBIDDEN and will be stripped by a compliance gate). If a testimonial is needed and none is given, write a clearly representative one using ONLY figures from the brief.
5) EXPLAIN your reasoning briefly.

Use the PLAYBOOK below as your knowledge. Choose ONE dominant focal point. One accent colour — and if the brief NAMES brand colours (e.g. "gold accent", "navy + gold"), USE the named accent, never substitute your default. If the brief states a MESSAGE the ad must land (e.g. "payouts in under 24 hours"), that message MUST appear on the creative — as the headline or subline, verbatim or tightened. Trust furniture is automatic (logo, #WeAreTraders, Trustpilot 4.6, Deloitte, disclaimer) — you only decide whether to add the ZERO PAYOUT DENIAL stamp.

COPY LENGTH — terse like the references (long copy gets clipped): eyebrow <= 4 words; hero <= 12 characters; headline <= 6 words; headlineHero <= 3 words; subline <= 7 words; each bullet <= 5 words. Do NOT use markdown strikethrough (~~); put the plain price in strikePrice. Emphasis in subline uses **double asterisks** only.

Return RAW JSON only (no fences), shape:
{
  "situation": "<matched situation id or short description>",
  "objective": "<the one objective>",
  "archetype": "giant-number|testimonial|benefit-stack|photographic",
  "accent": "cyan|green|purple|red|blue|magenta|gold|orange|teal|white",
  "background": "black|orb|solid|photo",
  "badge": true|false,
  "elements": [ { "element": "<trading element label>", "zone": "hero|proof-center|proof-side|supporting|lower-offer|corner-trust|background", "why": "<one line>" } ],
  "placement": "<one-line art-direction summary of the arrangement>",
  "rationale": "<2-4 sentences: the situation, why this archetype, why these elements, why this placement>",
  "copy": {
    "eyebrow": "", "hero": "", "heroStyle": "accent|chrome|white", "strikePrice": "",
    "subline": "use **double asterisks** around the token to emphasise (e.g. Starts with **Just $39**)",
    "headline": "", "headlineHero": "", "bullets": [], "promoCode": "", "ctaLabel": "",
    "testimonial": { "name": "", "handle": "", "title": "", "body": "", "highlight": "", "date": "" }
  },
  "platePrompt": "<only for photographic: a text-free photo-plate prompt; leave the darker side empty for text; NO words/numbers/logos>"
}
Only include copy fields relevant to the chosen archetype.`;

function heuristicFallback(brief: string): DirectorResult {
  const s = SITUATIONS.find((x) => new RegExp(x.id.split('-')[0], 'i').test(brief)) || SITUATIONS[0];
  // CLAIM SAFETY: derive every figure/code from the BRIEF itself — never hardcode
  // one. A fallback that fabricates "$39"/"WELCOME20" for an unrelated prompt is a
  // false-advertising path (see claim-gate.ts). No figure in the brief → claim-free copy.
  const money = brief.match(/\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmM]?/)?.[0]?.replace(/\s/g, '');
  const code = brief.match(/\b[A-Z]{3,}\d{1,3}\b/)?.[0];
  const spec: CreativeSpec = {
    archetype: s.archetype, accent: s.accent,
    background: s.archetype === 'benefit-stack' ? 'orb' : 'black', badge: true,
    hero: money || undefined,
    eyebrow: money ? 'Start with' : undefined,
    headline: money ? undefined : 'We Are Traders',
    subline: code ? `Use code **${code}**` : undefined,
    promoCode: code || undefined,
    ctaLabel: code ? `Use Code: ${code}` : 'Get Funded Today',
  };
  return { decision: { situation: s.id, objective: s.objective, archetype: s.archetype, accent: s.accent, background: spec.background!, elements: s.coreElements.map((e) => ({ element: e, zone: 'hero', why: 'playbook default' })), placement: s.placement, rationale: 'LLM unavailable — used the playbook default for the closest situation (brief figures only).' }, spec };
}

/** Turn a situation/brief into a fully art-directed, renderable creative decision. */
export async function directCreative(brief: string): Promise<DirectorResult> {
  if (!process.env.ANTHROPIC_API_KEY) return heuristicFallback(brief);
  const user = `PLAYBOOK\n${playbookContext()}\n\nBRIEF / SITUATION:\n"""${brief}"""\n\nProduce the JSON decision now.`;
  try {
    const res = await client().messages.create({ model: MODEL, max_tokens: 1600, temperature: 0.7, system: SYSTEM, messages: [{ role: 'user', content: user }] });
    const text = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = extractAndRepairJson(text)?.parsed;
    if (!parsed || !parsed.copy) return heuristicFallback(brief);
    const c = parsed.copy;
    const archetype = (['giant-number', 'testimonial', 'benefit-stack', 'photographic'].includes(parsed.archetype) ? parsed.archetype : 'giant-number') as Archetype;
    // Also strip emoji/pictographs here (belt — esc() strips at render too) so
    // text-fitting maths counts only glyphs the bundled fonts can draw.
    const clean = (s?: string) => (s || '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}\u{E000}-\u{F8FF}]/gu, '')
      .replace(/\n+/g, ' ').replace(/~~/g, '').replace(/\s{2,}/g, ' ').trim();
    const heroText = clean(c.hero);
    const headline = clean(c.headline);
    const spec: CreativeSpec = {
      archetype,
      accent: parsed.accent || 'cyan',
      background: parsed.background || (archetype === 'benefit-stack' ? 'orb' : archetype === 'photographic' ? 'photo' : 'black'),
      badge: parsed.badge !== false,
      eyebrow: clean(c.eyebrow) || undefined,
      heroStyle: c.heroStyle || undefined,
      strikePrice: clean(c.strikePrice) || undefined,
      subline: c.subline ? c.subline.replace(/\n+/g, ' ').trim() : undefined,
      bullets: Array.isArray(c.bullets) ? c.bullets.map((b: string) => clean(b)).filter(Boolean) : undefined,
      promoCode: c.promoCode || undefined,
      ctaLabel: c.ctaLabel || undefined,
      testimonial: c.testimonial && c.testimonial.body ? c.testimonial : undefined,
      // hero-number is only for giant-number; other archetypes use hero text as a headline line
      hero: archetype === 'giant-number' ? (heroText || undefined) : undefined,
      headline: archetype === 'giant-number' ? (headline || undefined)
        : archetype === 'benefit-stack' ? (headline || heroText || undefined)
          : (headline || undefined),
      headlineHero: archetype === 'testimonial' ? (clean(c.headlineHero) || heroText || undefined) : (clean(c.headlineHero) || undefined),
    };
    return {
      decision: {
        situation: parsed.situation || 'custom', objective: parsed.objective || '', archetype, accent: parsed.accent || 'cyan',
        background: spec.background as any, elements: Array.isArray(parsed.elements) ? parsed.elements : [], placement: parsed.placement || '', rationale: parsed.rationale || '',
      },
      spec,
      platePrompt: parsed.platePrompt || undefined,
    };
  } catch (e: any) {
    console.warn('[TemplateDirector] failed:', e.message);
    return heuristicFallback(brief);
  }
}
