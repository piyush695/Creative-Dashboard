/**
 * Template Pipeline — turns a user prompt into N genuinely-DISTINCT design-engine
 * creatives (not one layout recolored). This is the auto-router's "template" lane.
 *
 * Variety strategy: the LLM director decides the natural archetype + copy from the
 * prompt (variation 1). Variations 2..N are re-directed with an explicit, DIFFERENT
 * (archetype, accent, background, angle) so each is a different LAYOUT and focal
 * point — while every number, %, price and promo code stays verbatim and no payout
 * amounts or named people are invented.
 */
import { directCreative, type DirectorResult } from './template-director';
import { renderCreative, type Archetype, type CreativeSpec } from './template-studio';
import { gateCreativeSpec, formatViolations, type ClaimViolation } from './claim-gate';

export interface TemplateVariant {
  id: string;
  label: string;
  archetype: Archetype;
  accent: string;
  background: string;
  imageUrl: string;      // data URI (caller may upload + swap for a short URL)
  rationale?: string;
  objective?: string;
  /** Claims the compliance gate stripped from this variant (empty = fully sourced copy). */
  gated?: ClaimViolation[];
}

const ACCENT_ROTATION = ['cyan', 'green', 'purple', 'magenta'];
const BG_ROTATION: NonNullable<CreativeSpec['background']>[] = ['black', 'orb', 'orb', 'black'];
const ANGLES = [
  'Lead with the single strongest outcome; maximal negative space.',
  'Lead with the proof and supporting benefits.',
  'Lead with a bold one-line hook; one dominant focal point.',
  'Lead with the transformation / turning point.',
];

// Alternate archetypes that stay ON-MESSAGE for the base content (no fabrication).
function archetypePool(base: Archetype): Archetype[] {
  switch (base) {
    case 'testimonial': return ['testimonial', 'giant-number', 'testimonial', 'giant-number'];
    case 'benefit-stack': return ['benefit-stack', 'giant-number', 'benefit-stack', 'giant-number'];
    case 'giant-number':
    default: return ['giant-number', 'benefit-stack', 'giant-number', 'benefit-stack'];
  }
}

export async function generateTemplateVariations(
  prompt: string,
  count = 1,
): Promise<{ variants: TemplateVariant[]; base: DirectorResult }> {
  const n = Math.max(1, Math.min(4, Math.round(count) || 1));
  const base = await directCreative(prompt);
  let baseArch: Archetype = base.decision.archetype;
  if (baseArch === 'photographic') baseArch = 'giant-number'; // the template lane never renders photo
  const pool = archetypePool(baseArch);

  const variants: TemplateVariant[] = [];
  for (let i = 0; i < n; i++) {
    const accent = ACCENT_ROTATION[i % ACCENT_ROTATION.length];
    const bg = (i === 0 ? 'black' : BG_ROTATION[i % BG_ROTATION.length]) as NonNullable<CreativeSpec['background']>;
    const archetype = i === 0 ? baseArch : pool[i % pool.length];

    let r: DirectorResult = base;
    if (i > 0) {
      const directive =
        `\n\nTREATMENT ${i + 1} of ${n}: Render this as the "${archetype}" archetype on a "${bg}" background with the "${accent}" accent. ${ANGLES[i % ANGLES.length]} ` +
        `Make it visually DISTINCT from the other treatments — a different layout and focal point, NOT a recolor. ` +
        `Preserve every number, %, price and promo code from the brief VERBATIM. Do not invent payout amounts or fake named people.`;
      try { r = await directCreative(prompt + directive); } catch { r = base; }
    }

    let spec: CreativeSpec = { ...r.spec, accent, background: bg };
    // Safety: the template lane must never try to render the photo archetype.
    if (spec.archetype === 'photographic') spec = { ...spec, archetype: 'giant-number' };

    // ── COMPLIANCE GATE (structural, non-optional): drop every factual claim the
    //    director emitted that is not sourced from the user's brief or the approved
    //    brand-facts list. The model is untrusted here — see claim-gate.ts. ──
    const gated = gateCreativeSpec(spec, prompt);
    spec = gated.spec;
    if (gated.violations.length) {
      console.warn(`[ClaimGate] variation ${i + 1}: stripped unsourced claims — ${formatViolations(gated.violations)}`);
    }

    let imageUrl: string;
    try {
      imageUrl = await renderCreative(spec);
    } catch {
      continue; // skip a failed render rather than abort the whole set
    }
    variants.push({
      id: `tpl-${i + 1}`,
      label: `Variation ${i + 1}`,
      archetype: spec.archetype,
      accent,
      background: String(bg),
      imageUrl,
      rationale: r.decision?.rationale,
      objective: r.decision?.objective,
      gated: gated.violations.length ? gated.violations : undefined,
    });
  }
  return { variants, base };
}
