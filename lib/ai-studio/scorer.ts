/**
 * Creative Quality Scorer — Claude Vision
 * 
 * After image generation, sends each variant to Claude Vision for objective scoring.
 * Scores on: text accuracy, layout quality, psychology implementation, predicted CTR.
 * Returns a score object that gets attached to each variant.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SCORER_MODEL = 'claude-sonnet-4-20250514';

export interface CreativeScore {
  overall: number;          // 1-10
  textAccuracy: number;     // 1-10: spelling, no duplicates, correct content
  layoutQuality: number;    // 1-10: spacing, alignment, hierarchy, whitespace
  psychologyScore: number;  // 1-10: how well behavioral principles are applied
  brandCompliance: number;  // 1-10: Hola Prime brand consistency
  predictedCtr: string;     // "1.2-1.8%" estimated range
  strengths: string[];      // Top 3 things working well
  weaknesses: string[];     // Top 3 things to fix
  verdict: string;          // One-line summary
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
    // Extract base64 data from data URI
    const commaIdx = imageDataUri.indexOf(',');
    const meta = imageDataUri.substring(0, commaIdx);
    const base64Data = imageDataUri.substring(commaIdx + 1);
    const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';

    const headline = brief?.copywriting?.headline?.primary || '';
    const cta = brief?.copywriting?.cta?.primary || '';
    const bullets = brief?.copywriting?.benefitBullets || [];
    const concept = brief?.creativeConcept?.title || '';

    const response = await anthropic.messages.create({
      model: SCORER_MODEL,
      max_tokens: 1000,
      system: 'You are a creative quality auditor. Score the ad creative image objectively. Respond with ONLY valid JSON — no markdown, no preamble.',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType as any, data: base64Data }
          },
          {
            type: 'text',
            text: `Score this ad creative for Hola Prime (prop trading firm). Variant: "${variantId}".

The brief requested:
- Headline: "${headline}"
- CTA: "${cta}"
- Bullets: ${JSON.stringify(bullets)}
- Concept: "${concept}"

Return JSON:
{
  "overall": <1-10>,
  "textAccuracy": <1-10 — are all words spelled correctly? Any duplicated text? Any garbled disclaimer?>,
  "layoutQuality": <1-10 — clean spacing? Clear hierarchy? Nothing cramped or cut off?>,
  "psychologyScore": <1-10 — does the visual design apply behavioral science effectively?>,
  "brandCompliance": <1-10 — does it feel like a premium Hola Prime ad?>,
  "predictedCtr": "<X.X-X.X%>",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "verdict": "One sentence summary"
}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Parse JSON
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) return null;
    cleaned = cleaned.substring(startIdx);
    
    const parsed = JSON.parse(cleaned);
    
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

  console.log(`[Scorer] Scoring ${scorableVariants.length} variants...`);

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
