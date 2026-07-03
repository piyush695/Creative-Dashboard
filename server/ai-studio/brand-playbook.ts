/**
 * Hola Prime CREATIVE PLAYBOOK — the decision logic a designer uses, made explicit.
 *
 * Three knowledge sets, all reverse-engineered from the 22 BAU-June reference ads:
 *   1. SITUATIONS  — the criteria/trigger for making a creative → which archetype fits.
 *   2. TRADING_ELEMENTS — the domain-specific things we can put IN a creative (payout
 *      proof, equity curve, candlesticks, funded tier, review card, stamp…), what each
 *      one PROVES, and WHERE it should sit for engagement.
 *   3. PLACEMENT — the art-direction principles for arranging them.
 *
 * The template-director (the "brain") reasons over this to turn a brief/situation into
 * a fully art-directed creative spec. Edit this file to teach it new plays.
 */

export type Zone = 'hero' | 'proof-center' | 'proof-side' | 'lower-offer' | 'background' | 'corner-trust' | 'supporting';

// ── 1. WHAT trading elements can go in a creative, what they prove, where they belong ──
export interface TradingElement {
  id: string;
  label: string;
  proves: string;                 // the psychological job it does
  fitsArchetypes: string[];
  zone: Zone;
  renderAs: 'hero-number' | 'review-card' | 'chart-band' | 'equity-curve' | 'payout-card' | 'pill' | 'stamp' | 'strike-price' | 'ai-subject' | 'furniture';
  note: string;
}

export const TRADING_ELEMENTS: TradingElement[] = [
  { id: 'payout-proof', label: 'Payout / withdrawal confirmation', proves: 'we actually pay — de-risks the click', fitsArchetypes: ['photographic', 'testimonial'], zone: 'proof-center', renderAs: 'payout-card', note: 'a phone/laptop screen with a $ amount + green check; the single most persuasive prop.' },
  { id: 'equity-curve', label: 'Rising equity / P&L curve', proves: 'profitability is achievable here', fitsArchetypes: ['photographic', 'benefit-stack'], zone: 'proof-side', renderAs: 'equity-curve', note: 'green upward line; strong on a monitor in a lifestyle shot or as a lower graphic.' },
  { id: 'candlesticks', label: 'Candlestick chart', proves: 'real trading, market credibility', fitsArchetypes: ['giant-number', 'benefit-stack'], zone: 'supporting', renderAs: 'chart-band', note: 'decorative lower band or faint backdrop; never competes with the hero.' },
  { id: 'funded-tier', label: 'Funded challenge tier', proves: 'aspiration + concrete product', fitsArchetypes: ['giant-number'], zone: 'hero', renderAs: 'hero-number', note: 'chrome/3D treatment of the tier amount — use ONLY a tier figure stated in the brief.' },
  { id: 'review-card', label: 'Trustpilot review screenshot', proves: 'peer social proof', fitsArchetypes: ['testimonial'], zone: 'proof-center', renderAs: 'review-card', note: 'real-looking card + a highlighted key phrase; the hero of the testimonial play.' },
  { id: 'speed-number', label: 'Payout-speed proof', proves: 'differentiator vs slow competitors', fitsArchetypes: ['giant-number', 'testimonial', 'benefit-stack'], zone: 'hero', renderAs: 'hero-number', note: 'time is the wedge; make it the emphasis line — use ONLY a speed figure stated in the brief.' },
  { id: 'discount', label: 'Discount / promo price', proves: 'urgency + value', fitsArchetypes: ['giant-number'], zone: 'hero', renderAs: 'hero-number', note: 'red strikethrough anchor price ONLY if the brief provides the anchor; code pill ONLY with a code from the brief.' },
  { id: 'benefit-pills', label: 'Benefit pills (e.g. Zero Payout Denials, No Hidden Rules)', proves: 'stacks rational reasons', fitsArchetypes: ['benefit-stack', 'giant-number'], zone: 'supporting', renderAs: 'pill', note: 'max 3, rounded outline, evenly spaced. Promise-level pills only — NEVER a figure/% that is not in the brief.' },
  { id: 'deloitte', label: 'Independently Reviewed by Deloitte', proves: 'institutional credibility', fitsArchetypes: ['benefit-stack', 'giant-number', 'testimonial'], zone: 'corner-trust', renderAs: 'furniture', note: 'always bottom-right; can be promoted to hero for a pure-trust ad.' },
  { id: 'trustpilot', label: 'Trustpilot 4.6', proves: 'rating social proof', fitsArchetypes: ['*'], zone: 'corner-trust', renderAs: 'furniture', note: 'always bottom-left.' },
  { id: 'zpd-stamp', label: 'ZERO PAYOUT DENIAL stamp', proves: 'removes the #1 prop-firm fear', fitsArchetypes: ['*'], zone: 'corner-trust', renderAs: 'stamp', note: 'circular rubber-stamp, bottom-right above Deloitte.' },
  { id: 'trader-emotion', label: 'Real funded-trader emotion (relief/celebration)', proves: 'aspiration — "this could be you"', fitsArchetypes: ['photographic'], zone: 'hero', renderAs: 'ai-subject', note: 'documentary, never cheesy stock; needs AI/photo — the imagery ceiling.' },
  { id: 'orb', label: 'Iridescent brand orb', proves: 'premium brand signature', fitsArchetypes: ['giant-number', 'benefit-stack', 'testimonial'], zone: 'background', renderAs: 'furniture', note: 'code-rendered glossy sphere; default premium background.' },
];

// ── 2. WHEN to make which creative (situation → archetype) ──
export interface Situation {
  id: string;
  when: string;                   // the trigger/criteria a marketer would recognise
  objective: string;
  archetype: 'giant-number' | 'testimonial' | 'benefit-stack' | 'photographic';
  accent: string;                 // default accent (brain may override for theme)
  coreElements: string[];         // TradingElement ids
  placement: string;              // one-line art-direction summary
}

export const SITUATIONS: Situation[] = [
  { id: 'offer-push', when: 'a discount, price drop, coupon or challenge-fee sale is live', objective: 'convert price-sensitive intent NOW', archetype: 'giant-number', accent: 'cyan', coreElements: ['discount', 'zpd-stamp', 'orb'], placement: 'the number/offer is the hero (huge, glossy, left); strike-price anchor + code pill below; stamp bottom-right.' },
  { id: 'social-proof', when: 'we have a strong real review or a fast-payout story to amplify', objective: 'borrow a peer\'s credibility to de-risk the click', archetype: 'testimonial', accent: 'green', coreElements: ['review-card', 'speed-number', 'discount'], placement: 'two-tier headline with the payout-speed as the green emphasis; review card centre with the key phrase highlighted; offer + code lower.' },
  { id: 'trust-authority', when: 'leaning on institutional authority (Deloitte review, Trustpilot rating)', objective: 'establish institutional legitimacy', archetype: 'benefit-stack', accent: 'purple', coreElements: ['deloitte', 'benefit-pills', 'zpd-stamp', 'orb'], placement: 'authority line as hero on the orb; 3 proof pills; Deloitte + stamp corners.' },
  { id: 'aspiration', when: 'selling the outcome/lifestyle of being a funded trader', objective: 'make the viewer feel the win is real and near', archetype: 'photographic', accent: 'cyan', coreElements: ['trader-emotion', 'payout-proof', 'equity-curve', 'discount'], placement: 'photographic trader + payout screen fills the frame; text lockup on the darker side; offer lower.' },
  { id: 'feature-comms', when: 'communicating core mechanics (fast payouts, zero denials, high split, no rules)', objective: 'stack rational reasons to choose us', archetype: 'benefit-stack', accent: 'purple', coreElements: ['benefit-pills', 'orb', 'zpd-stamp'], placement: 'bold headline top; 3 outlined benefit pills centre on the orb.' },
  { id: 'tier-promo', when: 'promoting a specific challenge size named in the brief', objective: 'anchor aspiration on a concrete product tier', archetype: 'giant-number', accent: 'red', coreElements: ['funded-tier', 'zpd-stamp'], placement: 'the tier number (from the brief) in chrome/3D as hero; qualifier word in accent; stamp corner.' },
];

// ── 3. HOW to arrange for engagement (art-direction principles) ──
export const PLACEMENT_PRINCIPLES: string[] = [
  'ONE dominant focal point — the hero number, hero phrase, or subject. Everything else is subordinate.',
  'Proof sits centre or on the calm side; it must be legible in 0.5s (the "does-it-read-at-thumbnail" test).',
  'Fixed trust furniture never moves: logo TL, #WeAreTraders TR, Trustpilot 4.6 BL, Deloitte BR, disclaimer bottom.',
  'ONE accent colour carries the key message; everything else is white on near-black. Never rainbow.',
  'Offer + CTA live in the lower third; the code is emphasised in the accent.',
  'Generous negative space — remove any element that does not earn its place (but never remove PROOF).',
  'Decorative trading elements (candlesticks, curves) stay faint/lower so they never fight the hero.',
  'If a photographic subject is used, put text on the darker third and keep the subject on the other side.',
];

/** Compact context string of the whole playbook for the director LLM. */
export function playbookContext(): string {
  const els = TRADING_ELEMENTS.map((e) => `- ${e.id} (${e.label}): proves ${e.proves}; fits ${e.fitsArchetypes.join('/')}; zone=${e.zone}; render=${e.renderAs}. ${e.note}`).join('\n');
  const sits = SITUATIONS.map((s) => `- ${s.id}: WHEN ${s.when} → objective: ${s.objective}; archetype: ${s.archetype}; accent: ${s.accent}; elements: ${s.coreElements.join(', ')}; placement: ${s.placement}`).join('\n');
  return `TRADING ELEMENTS (what to put in a creative, what it proves, where):\n${els}\n\nSITUATIONS (when to make which creative):\n${sits}\n\nPLACEMENT PRINCIPLES:\n${PLACEMENT_PRINCIPLES.map((p) => '- ' + p).join('\n')}`;
}
