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

// Recent looks served by THIS instance (3-deep) — used to avoid repeats within
// a short session. Resetting on instance restart is harmless here.
const _recentLooks: number[] = [];

export async function generateTemplateVariations(
  prompt: string,
  count = 1,
  opts: { forcedAccent?: string } = {},
): Promise<{ variants: TemplateVariant[]; base: DirectorResult }> {
  const n = Math.max(1, Math.min(4, Math.round(count) || 1));
  // Variety must be RANDOM (module counters reset per Cloud Run instance —
  // live bug ×2) and layout/background draws must be INDEPENDENT: the earlier
  // `(seq+i)%3` vs `(seq*4+i)%3` pair was congruent mod 3, locking layout and
  // orb together → only 3 effective looks, twins everywhere (live bug ×3).
  let layoutIdx = Math.floor(Math.random() * 3);
  const bgSeed = Math.floor(Math.random() * 999_983);
  let look = layoutIdx * 3 + (bgSeed % 3);
  for (let tries = 0; tries < 3 && _recentLooks.includes(look); tries++) {
    layoutIdx = (layoutIdx + 1 + Math.floor(Math.random() * 2)) % 3;
    look = layoutIdx * 3 + (bgSeed % 3);
  }
  _recentLooks.push(look);
  if (_recentLooks.length > 3) _recentLooks.shift();
  const seq = bgSeed; // accent/angle rotation offset
  const base = await directCreative(prompt);
  let baseArch: Archetype = base.decision.archetype;
  if (baseArch === 'photographic') baseArch = 'giant-number'; // the template lane never renders photo
  const pool = archetypePool(baseArch);

  const variants: TemplateVariant[] = [];
  for (let i = 0; i < n; i++) {
    const rot = (i + seq) % ACCENT_ROTATION.length;
    // Accent priority: a BRIEF-stated brand colour beats everything (live bug:
    // "gold accent" briefs rendered cyan); else variation 1 keeps the DIRECTOR's
    // per-situation palette; later variations rotate for in-request distinctness.
    const accent = opts.forcedAccent
      ? opts.forcedAccent
      : i === 0
        ? (base.spec.accent || ACCENT_ROTATION[rot])
        : ACCENT_ROTATION[rot];
    const bg = (i === 0
      ? ((base.spec.background && base.spec.background !== 'photo') ? base.spec.background : 'black')
      : BG_ROTATION[rot]) as NonNullable<CreativeSpec['background']>;
    const archetype = i === 0 ? baseArch : pool[i % pool.length];

    let r: DirectorResult = base;
    if (i > 0) {
      const directive =
        `\n\nTREATMENT ${i + 1} of ${n}: Render this as the "${archetype}" archetype on a "${bg}" background with the "${accent}" accent. ${ANGLES[(i + seq) % ANGLES.length]} ` +
        `Make it visually DISTINCT from the other treatments — a different layout and focal point, NOT a recolor. ` +
        `Preserve every number, %, price and promo code from the brief VERBATIM. Do not invent payout amounts or fake named people.`;
      try { r = await directCreative(prompt + directive); } catch { r = base; }
    }

    let spec: CreativeSpec = {
      ...r.spec,
      accent,
      background: bg,
      // Variety controls: independent draws (see above) + per-variation offsets.
      seed: bgSeed + i * 7,
      layoutVariant: (['editorial', 'centered', 'poster'] as const)[(layoutIdx + i) % 3],
    };
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
