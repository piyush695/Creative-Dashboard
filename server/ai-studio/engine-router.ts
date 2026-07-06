/**
 * Engine Router — decides WHICH generation engine renders a prompt.
 *
 *   • "template"  → the procedural design engine (template-studio.renderCreative):
 *                   designed layout, real fonts, pixel-clean brand furniture, zero-typo.
 *                   Best for TYPE-DRIVEN creatives — hero numbers, testimonials,
 *                   benefit stacks, offers/promos.
 *
 *   • "ai"        → gpt-image-1 imagery + brand furniture/text on top.
 *                   Needed for genuinely PHOTOGRAPHIC / scene / lifestyle creatives
 *                   (a person, a place, an object, a moment, a mood) — things you
 *                   can't draw procedurally.
 *
 * This classifier is deterministic and auditable ON PURPOSE: it is the single
 * source of truth for the auto-router's decision, so a human can read the rule and
 * predict the route. The LLM director (template-director.directCreative) then does
 * the creative work WITHIN the chosen lane. The UI shows this decision + its reason,
 * and the user can force the other engine in one action.
 *
 * DESIGN CALLS (approved):
 *  1. Ties break toward the Design Engine (never let a hero number become fragile
 *     baked text). Ambiguity is surfaced (`ambiguous`, low confidence) so the UI can
 *     nudge the user to the override — the tie-break is safe ONLY because the
 *     override is real and visible.
 *  2. A stray scene-noun ("a trader") is DECORATION when a strong text anchor is
 *     present — that keeps narrative single-liners on the Design Engine.
 *  3. But a scene with NO strong text anchor — even with no explicit "photo/cinematic"
 *     cue — is a photographic brief (a person doing something, a place, a moment).
 *     A *weak* text signal (a lone benefit/offer word) must NOT beat that scene.
 */

export type Engine = 'template' | 'ai';
export type ArchetypeHint = 'giant-number' | 'testimonial' | 'benefit-stack' | 'photographic';

export interface RouteSignal {
  kind: string;               // e.g. "hero-stat", "promo-code", "scene-action"
  side: 'type' | 'photo';
  weight: number;
  match: string;              // the actual substring that matched (for transparency)
}

export interface RouteDecision {
  engine: Engine;
  /** True when the brief describes a photographic SCENE (person/place/moment) — gates subject-lock + subject verification. */
  scene: boolean;
  archetypeHint: ArchetypeHint;
  typeScore: number;
  photoScore: number;
  confidence: number;         // 0..1 — low means "ambiguous, check the override"
  ambiguous: boolean;         // both lanes fired strongly
  signals: RouteSignal[];
  reason: string;             // one-line human explanation for the UI
}

// ── Signal regexes (named so the probe/UI can reference them) ─────────────────

// TYPE-DRIVEN anchors
const RE_HERO_STAT = /(\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmM]?|\b\d{1,3}\s?%|\b\d+\s?[xX]\b|\b\d+\s?(?:day|hour|hr|min|minute|week|month)s?\b|\b(?:million|thousand|billion)\b)/;
const RE_PROMO = /\b(?:code|coupon|promo)\b|\b[A-Z]{3,}\d{1,3}\b/;
// Narrative PROOF verbs / quotes / review vocabulary (NOT depiction verbs).
const RE_TESTIMONIAL = /["'“”‘’]|\b(?:doubted|withdrew|cashed out|got paid|passed|turned|scaled|review|testimonial|verified|said|told|thought)\b/i;
const RE_BENEFIT = /\b(?:no time limit|instant|unlimited|profit split|payout|spread|leverage|no rules|same[- ]?day|24\/?7|fast payout|scaling)\b/gi;
const RE_OFFER = /\b(?:challenge|discount|% ?off|\boff\b|deal|offer|sale|save|bonus|free|limited)\b/i;

// PHOTOGRAPHIC intent
// Explicit medium words — the strongest photo signal.
const RE_EXPLICIT_PHOTO = /\b(?:photo(?:graph)?|photorealistic|realistic|cinematic|portrait|lifestyle|scene|shot of|image of|render of|3d render|close[- ]?up|wide shot|aerial|bokeh|depth of field|studio light(?:ing)?|golden hour)\b/i;
// A human / place / object SUBJECT or environment.
const RE_SCENE_SUBJECT = /\b(?:a |an |the )?(?:trader|man|woman|person|people|someone|somebody|guy|girl|team|crowd|office|desk|setup|city|street|skyline|car|yacht|jet|beach|mountain|sunset|sunrise|room|studio|gym|penthouse|rooftop|apartment|home|laptop|phone|screen|monitors?|hands?|window)\b/i;
// A DEPICTION verb — a photographable human action/moment (NOT a proof verb).
const RE_SCENE_ACTION = /\b(?:celebrat\w+|checking|holding|walking|sitting|standing|smiling|looking|staring|reading|working from|trading from|living|relaxing|driving|waking|resting|travel\w+|scrolling|gazing|reacting|laughing|crying|hugging|running|leaning|waiting)\b/i;
// Moment / emotion framing — "the moment…", a life event, a time-of-day mood.
const RE_MOMENT = /\b(?:the moment|the feeling|first payout|first withdrawal|first win|when (?:you|they) (?:get|got|finally)|late at night|late[- ]night|picture (?:this|yourself)|imagine)\b/i;

interface Detector { kind: string; side: 'type' | 'photo'; weight: number; re: RegExp; }
const DETECTORS: Detector[] = [
  { kind: 'hero-stat', side: 'type', weight: 3, re: RE_HERO_STAT },
  { kind: 'promo-code', side: 'type', weight: 3, re: RE_PROMO },
  { kind: 'testimonial', side: 'type', weight: 3, re: RE_TESTIMONIAL },
  { kind: 'benefit', side: 'type', weight: 2, re: RE_BENEFIT },
  { kind: 'offer', side: 'type', weight: 2, re: RE_OFFER },
  { kind: 'explicit-photo', side: 'photo', weight: 4, re: RE_EXPLICIT_PHOTO },
  { kind: 'scene-subject', side: 'photo', weight: 2, re: RE_SCENE_SUBJECT },
  { kind: 'scene-action', side: 'photo', weight: 2, re: RE_SCENE_ACTION },
  { kind: 'moment', side: 'photo', weight: 2, re: RE_MOMENT },
];

function detect(prompt: string): RouteSignal[] {
  const out: RouteSignal[] = [];
  for (const d of DETECTORS) {
    const m = prompt.match(new RegExp(d.re.source, d.re.flags.replace('g', '')));
    if (m) out.push({ kind: d.kind, side: d.side, weight: d.weight, match: m[0].trim() });
  }
  return out;
}

function pickArchetype(signals: RouteSignal[], benefitCount: number): ArchetypeHint {
  const has = (k: string) => signals.some((s) => s.kind === k);
  if (has('testimonial')) return 'testimonial';
  // A 2-plus-feature list is a benefit stack even if a stat is present (approved tune).
  if (benefitCount >= 2) return 'benefit-stack';
  if (has('benefit') && !has('hero-stat')) return 'benefit-stack';
  if (has('hero-stat') || has('promo-code') || has('offer')) return 'giant-number';
  return 'giant-number';
}

/**
 * Classify a prompt into an engine + archetype hint. Deterministic.
 * `override` forces a lane (from the UI) and short-circuits the rule.
 */
export function classifyPromptEngine(promptRaw: string, override?: Engine): RouteDecision {
  const prompt = (promptRaw || '').trim();
  const signals = detect(prompt);
  const typeScore = signals.filter((s) => s.side === 'type').reduce((n, s) => n + s.weight, 0);
  const photoScore = signals.filter((s) => s.side === 'photo').reduce((n, s) => n + s.weight, 0);
  const benefitCount = (prompt.match(RE_BENEFIT) || []).length;
  const hasExplicitPhoto = signals.some((s) => s.kind === 'explicit-photo');
  const strongType = typeScore >= 3; // a weight-3 anchor, or a couple of weaker ones

  // Manual override from the UI always wins.
  if (override) {
    return {
      engine: override, scene: photoScore > 0, archetypeHint: override === 'ai' ? 'photographic' : pickArchetype(signals, benefitCount),
      typeScore, photoScore, confidence: 1, ambiguous: false, signals,
      reason: `Forced to ${override === 'ai' ? 'AI Image' : 'Design Engine'} by you (manual override).`,
    };
  }

  // Routes at/below this confidence ALWAYS get the visible ⚠ flag + one-click
  // override — never resolve genuine uncertainty silently, whichever engine won.
  const LOW_CONF = 0.65;

  let engine: Engine;
  let reason: string;
  const collision = strongType && hasExplicitPhoto;

  // ── GEN-AI-FIRST (user directive 2026-07-03): every brief gets a FRESH
  //    AI-generated concept/layout by default — "use gen AI fully, invent
  //    placement every generation". The fixed-layout Design Engine runs ONLY
  //    when the user explicitly asks for structured/exact placement (or forces
  //    it via the override chip). Compliance is unchanged either way: the claim
  //    gate + real-font overlay + verifier run on the AI lane too. ──
  const wantsTemplate = /\b(design engine|template|exact placement|locked layout|fixed layout|strict layout|bau style|brand layout)\b/i.test(prompt);

  if (wantsTemplate) {
    engine = 'template';
    reason = `You asked for structured placement (${prompt.match(/\b(design engine|template|exact placement|locked layout|fixed layout|strict layout|bau style|brand layout)\b/i)?.[0]}) → Design Engine (locked brand layouts).`;
  } else {
    engine = 'ai';
    reason = strongType
      ? `Gen-AI-first: fresh AI concept + layout (offer copy composited in real fonts, claim-gated). Say "use the design engine" or use the override for locked brand layouts.`
      : photoScore > 0
        ? `Photographic/scene brief (${sigList(signals, 'photo')}) → AI Image.`
        : `Gen-AI-first default: fresh concept + layout every generation.`;
  }

  const archetypeHint: ArchetypeHint = engine === 'ai' ? 'photographic' : pickArchetype(signals, benefitCount);

  // Confidence under gen-AI-first: explicit template request = certain; the AI
  // default is high (it's a policy, not a guess) but soft enough to surface the
  // override chip when the brief is empty of signals.
  const winner = Math.max(typeScore, photoScore);
  void collision; void strongType; // retained signals still power archetypeHint + reasons
  let confidence: number = wantsTemplate ? 0.95 : winner > 0 ? 0.85 : 0.7;
  confidence = round2(confidence);

  // Low-confidence-always-flags: a close call is surfaced regardless of the winner.
  const ambiguous = confidence < LOW_CONF;
  if (ambiguous && !collision) {
    reason += ` (Low-confidence call — flip the engine in one click if this is wrong.)`;
  }

  return { engine, scene: photoScore > 0, archetypeHint, typeScore, photoScore, confidence, ambiguous, signals, reason };
}

function sigList(signals: RouteSignal[], side: 'type' | 'photo'): string {
  return signals.filter((s) => s.side === side).map((s) => `${s.kind}:"${s.match}"`).join(', ') || 'none';
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
