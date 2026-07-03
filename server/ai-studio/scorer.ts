/**
 * Creative Quality Scorer — Claude Vision (12-Dimension)
 *
 * After image generation, sends each variant to Claude Vision for objective scoring.
 * Scores on 12 dimensions covering content, design, color, and impact.
 *
 * CALIBRATION PHILOSOPHY:
 * - A professional, well-executed HolaPrime prop trading ad is the BENCHMARK, not the floor.
 * - Good professional execution = 8+. Poor execution = below 7. Exceptional = 9-10.
 * - innovativeness measures VISUAL DISTINCTIVENESS within the prop firm ad genre, not Cannes Lions originality.
 * - whitespaceUsage: dark negative space IS the brand's intentional aesthetic. Generous dark space = high score.
 *
 * Scoring Dimensions (weights sum to 1.0):
 * CONTENT (18%):  textAccuracy (11%), messageClarity (7%)
 * DESIGN (44%):   layoutQuality (8%), gridAlignment (5%), typographyPairing (6%), visualBalance (5%), whitespaceUsage (4%), textPlacement (8%), clutter (8%)
 * COLOR (14%):    colorHarmony (7%), brandCompliance (7%)
 * IMPACT (24%):   psychologyScore (6%), creativityScore (9%), innovativeness (9%)
 *
 * HONEST SCORING: overall = the TRUE weighted average of the reported dimensions.
 * No score floors and no benefit-of-the-doubt inflation — a weak creative can (and
 * must) return a low/failing score so selection + self-correction actually work.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

const SCORER_MODEL = 'claude-sonnet-4-6';

export interface CreativeScore {
  overall: number;              // 1-10 (weighted average)
  // Content (21%)
  textAccuracy: number;         // 1-10: spelling, no duplicates, correct content
  messageClarity: number;       // 1-10: single message discipline, direct communication
  // Design (44%)
  layoutQuality: number;        // 1-10: spacing, alignment, hierarchy
  gridAlignment: number;        // 1-10: elements align to invisible grid, consistent spacing
  typographyPairing: number;    // 1-10: font hierarchy, weight contrast, readability
  visualBalance: number;        // 1-10: weight distribution, symmetry/asymmetry intent
  whitespaceUsage: number;      // 1-10: breathing room, margins, no overcrowding
  textPlacement: number;        // 1-10: text sits in deliberate negative space, respects margins, relates to composition, never covers the focal subject
  clutter: number;              // 1-10: restraint / anti-clutter — 10 = clean, few intentional elements; 1 = busy, overcrowded, competing elements
  // Color (16%)
  colorHarmony: number;         // 1-10: complementary/analogous/triadic adherence
  brandCompliance: number;      // 1-10: Hola Prime brand consistency + logo presence
  // Impact (28%)
  psychologyScore: number;      // 1-10: emotional impact, aspiration, desire
  creativityScore: number;      // 1-10: visual craft, polish, compelling quality
  innovativeness: number;       // 1-10: distinctiveness within prop firm ad genre
  // Meta
  predictedCtr: string;         // "1.2-1.8%" estimated range
  strengths: string[];          // Top 3 things working well
  weaknesses: string[];         // Top 3 things to fix
  verdict: string;              // One-line summary
}

/**
 * Score a single generated creative image.
 * Returns null if scoring fails (non-blocking — generation still succeeds).
 */
export async function scoreCreative(
  imageDataUri: string,
  brief: any,
  variantId: string
): Promise<CreativeScore | null> {
  if (!imageDataUri || !imageDataUri.startsWith('data:')) {
    return null;
  }

  try {
    const commaIdx = imageDataUri.indexOf(',');
    const meta = imageDataUri.substring(0, commaIdx);
    const base64Data = imageDataUri.substring(commaIdx + 1);
    const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

    const headline = brief?.copywriting?.headline?.primary || '';
    const cta = brief?.copywriting?.cta?.primary || '';
    const bullets = brief?.copywriting?.benefitBullets || [];
    const concept = brief?.creativeConcept?.title || '';

    const response = await getClient().messages.create({
      model: SCORER_MODEL,
      max_tokens: 1500,
      system: `You are a professional creative director scoring HolaPrime prop trading ad creatives. You have 15+ years experience evaluating fintech and trading industry advertising.

SCORING PHILOSOPHY — READ THIS FIRST:
The HolaPrime dark fintech aesthetic IS the brand standard. A clean, professional dark-themed ad with clear typography, a dominant price element, and correct branding IS high quality work. You are scoring within the prop trading advertising genre, not against all advertising globally.

GRADE SCALE (USE THIS — NOT YOUR OWN INTUITION):
9-10: Exceptional — genuinely remarkable for the category, memorable, flawless execution
8-8.9: Professional — clearly the work of skilled designers, meets industry standard, polished
7-7.9: Competent — solid execution with minor issues, acceptable for production
6-6.9: Below standard — noticeable problems, needs revision before production
Below 6: Poor — significant failures in multiple areas, would not be approved

BRAND LOGO CHECK (do this first for brandCompliance):
Correct HolaPrime logo = "hola prime" stacked wordmark top-left + "#WeAreTraders" pill badge top-right.
- BOTH present and legible → brandCompliance starts at 8+
- One missing → cap at 6
- Both missing → cap at 4
- "We Are Traders" appears TWICE anywhere → deduct 1.5 points from brandCompliance

KEY CALIBRATION RULES:
- Dark negative space is intentional premium design for this brand. Generous dark space = score whitespaceUsage 8+.
- A price rendered with neon glow effects IS creative and distinctive for this genre. Score accordingly.
- Do NOT penalize for being "too dark" or "too minimal" — that is the brand language.
- Do NOT penalize for light/white themed creatives if the design is still premium and professional. Both dark and light variants can be "on brand" if executed well.
- Innovativeness: compare to OTHER PROP FIRM ADS, not to all advertising. A visual that stands out among prop firm ads = 7-8. Standard prop firm layout done well = 6-7. Generic cookie-cutter = 5 or below.
- If the creative clearly has a single dominant visual concept (editorial, cinematic, data-native, impact poster, etc.), reward this with innovativeness 7+.
- IMPORTANT: The Hola Prime logo is composited programmatically as a PNG overlay in the top-left corner. If you see a "hola prime" wordmark logo in the top-left, it is the CORRECT programmatic logo. Score brandCompliance 8+ when it is present and properly visible.

Do NOT over-penalize for minor AI text rendering issues (slight character errors in a single word) — score textAccuracy 7 for minor issues, not 4.

Respond with ONLY valid JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as any, data: base64Data }
          },
          {
            type: 'text',
            text: `Score this HolaPrime prop trading ad creative. Variant: "${variantId}".

Brief context:
- Headline: "${headline}"
- CTA: "${cta}"
- Key bullets: ${JSON.stringify(bullets.slice(0, 3))}
- Creative concept: "${concept}"

EVALUATE EACH DIMENSION — use the Grade Scale from your system prompt:

CONTENT (18% total weight):
textAccuracy [13%]: All text legible? Correct spelling? No duplicates? No garbling?
  → 9-10: All text clean, correct, readable | 7-8: One minor error | 5-6: Multiple errors | Below 5: Severely garbled

messageClarity [8%]: Is the core offer instantly clear? Can a viewer understand it in 2 seconds?
  → 9-10: Crystal clear single message | 7-8: Clear with minor ambiguity | 5-6: Somewhat confusing | Below 5: No clear message

DESIGN (35% total weight):
layoutQuality [9%]: Is the visual hierarchy clear? Is spacing generous and intentional? Does it feel professional?
  → 8-10: Professional, spacious, intentional hierarchy | 7: Decent with minor issues | Below 6: Cluttered or broken

gridAlignment [8%]: Do elements align to an invisible grid? Are margins consistent?
  → 8-10: Clean alignment visible | 7: Mostly aligned, minor deviations | Below 6: Visibly scattered or misaligned

typographyPairing [8%]: Is there a clear size hierarchy (hero >> body)? Is it readable at small size?
  → 8-10: Strong hierarchy, excellent readability | 7: Adequate hierarchy | Below 6: No hierarchy or illegible

visualBalance [5%]: Is visual weight distributed intentionally? Is there one dominant focal point?
  → 8-10: Strong focal point, intentional balance | 7: Generally balanced | Below 6: Chaotic or random

whitespaceUsage [4%]: For a dark fintech ad, dark empty space IS intentional design. Score generous dark space as premium.
  → 8-10: Generous breathing room, premium spacing, nothing cramped | 7: Adequate spacing | Below 6: Elements cramped, touching edges

textPlacement [8%]: Is every text block placed with INTENT — in deliberate negative space, aligned to the composition, inside safe margins, and NEVER covering the focal subject (face/hero/price)?
  → 8-10: Text sits in calm negative space, reinforces the focal point, clean safe margins | 7: Mostly intentional, minor crowding | 5-6: Some text fights the subject or hugs the edges | Below 5: Text placed arbitrarily, overlaps the focal subject, or breaks the frame margins

clutter [8%]: RESTRAINT score (HIGH = clean, LOW = busy). Count the competing elements. Does ONE focal point dominate, or do many elements fight for attention?
  → 8-10: Disciplined, few intentional elements, one clear dominant focal point ("less is more") | 7: Slightly busy but controlled | 5-6: Noticeably cluttered, several competing elements | Below 5: Chaotic, overcrowded, no breathing room, no clear hierarchy

COLOR (14% total weight):
colorHarmony [8%]: Does the color palette feel cohesive and intentional? Dark bg + white text + neon accent = good for this brand.
  → 8-10: Cohesive, harmonious, intentional palette | 7: Generally consistent | Below 6: Jarring or clashing

brandCompliance [8%]: Apply the logo check from your system prompt instructions.
  → Start at 8 if both logo elements correct, adjust based on overall brand alignment

IMPACT (24% total weight):
psychologyScore [8%]: Does this creative trigger desire, aspiration, or urgency? Would a trader feel excited by this?
  → 8-10: Strong emotional pull, aspirational | 7: Moderate emotional impact | Below 6: Flat, no emotional resonance

creativityScore [10%]: Is there visual craft and polish here? Is there something visually compelling — a treatment, effect, or composition choice that shows design skill?
  → 8-10: Clearly crafted, visually compelling, shows design skill | 7: Competent execution | Below 6: Zero craft, purely generic

innovativeness [10%]: Compare to OTHER PROP FIRM ADS. Does this stand out in the genre?
  → 8-10: Distinctive visual concept, stands out strongly among prop firm ads | 7: Some distinctive elements, above average for genre | 6: Professional execution with conventional approach | 5: Standard prop firm template done adequately | Below 5: Identical to every other prop firm ad, no distinguishing choices

IMPORTANT: Compute the overall score as the TRUE WEIGHTED AVERAGE using the percentages shown. Do the math correctly.

Return ONLY this JSON (no other text):
{
  "overall": <computed weighted average, 1 decimal place>,
  "textAccuracy": <1-10>,
  "messageClarity": <1-10>,
  "layoutQuality": <1-10>,
  "gridAlignment": <1-10>,
  "typographyPairing": <1-10>,
  "visualBalance": <1-10>,
  "whitespaceUsage": <1-10>,
  "textPlacement": <1-10>,
  "clutter": <1-10>,
  "colorHarmony": <1-10>,
  "brandCompliance": <1-10>,
  "psychologyScore": <1-10>,
  "creativityScore": <1-10>,
  "innovativeness": <1-10>,
  "predictedCtr": "<X.X-X.X%>",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "verdict": "One sentence professional assessment"
}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) return null;
    cleaned = cleaned.substring(startIdx);

    const parsed = JSON.parse(cleaned);

    // HONEST WEIGHTED AVERAGE from the reported dimensions (weights sum to 1.0).
    // Missing/invalid dimensions count as 0 so a malformed or evasive response
    // cannot accidentally score high.
    const d = (x: any) => (typeof x === 'number' && isFinite(x) ? x : 0);
    const computed =
      (d(parsed.textAccuracy)      * 0.11) +
      (d(parsed.messageClarity)    * 0.07) +
      (d(parsed.layoutQuality)     * 0.08) +
      (d(parsed.gridAlignment)     * 0.05) +
      (d(parsed.typographyPairing) * 0.06) +
      (d(parsed.visualBalance)     * 0.05) +
      (d(parsed.whitespaceUsage)   * 0.04) +
      (d(parsed.textPlacement)     * 0.08) +
      (d(parsed.clutter)           * 0.08) +
      (d(parsed.colorHarmony)      * 0.07) +
      (d(parsed.brandCompliance)   * 0.07) +
      (d(parsed.psychologyScore)   * 0.06) +
      (d(parsed.creativityScore)   * 0.09) +
      (d(parsed.innovativeness)    * 0.09);

    // HONEST SCORING: overall IS the weighted average. No score floor, no
    // benefit-of-the-doubt inflation — a weak creative must be able to fail.
    parsed.overall = Math.round(computed * 10) / 10;

    console.log(`[Scorer] Variant "${variantId}": ${parsed.overall}/10 — ${parsed.verdict}`);
    return parsed as CreativeScore;

  } catch (err: any) {
    console.warn(`[Scorer] Failed to score variant "${variantId}":`, err.message);
    return null;
  }
}

/**
 * Score multiple variants in parallel.
 * Non-blocking — returns partial results if some fail.
 */
export async function scoreVariants(
  variants: any[],
  brief: any
): Promise<Map<string, CreativeScore>> {
  const scores = new Map<string, CreativeScore>();

  const scorableVariants = variants.filter(v => v?.imageUrl?.startsWith('data:'));

  if (scorableVariants.length === 0) {
    console.log('[Scorer] No scorable variants (no data URI images)');
    return scores;
  }

  console.log(`[Scorer] Scoring ${scorableVariants.length} variants (12 dimensions)...`);

  const results = await Promise.allSettled(
    scorableVariants.map(v => scoreCreative(v.imageUrl, brief, v.id))
  );

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled' && result.value) {
      scores.set(scorableVariants[idx].id, result.value);
    }
  });

  console.log(`[Scorer] ${scores.size}/${scorableVariants.length} variants scored successfully`);
  return scores;
}
