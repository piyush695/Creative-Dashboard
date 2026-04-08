/**
 * Agentic Creative Pipeline
 * 
 * Multi-step AI workflow where Claude:
 * 1. PLANS — Analyzes the brief and selects the optimal strategy
 * 2. GENERATES — Produces the creative brief with image prompt
 * 3. REVIEWS — Scores the generated image with Vision
 * 4. SELF-CORRECTS — If score < threshold, auto-revises and regenerates
 * 
 * This creates a feedback loop where the AI improves its own output
 * before returning to the user.
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateImage } from './imagegen';
import { scoreCreative } from './scorer';
import { extractAndRepairJson } from './parser';

let _client: Anthropic | null = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

const AGENT_MODEL = 'claude-sonnet-4-20250514';
const MIN_QUALITY_SCORE = 8;  // Auto-retry if below this (target: 8+ for professional quality)
const MAX_RETRIES = 3;         // Maximum self-correction loops

export interface AgentConfig {
  maxRetries?: number;
  minScore?: number;
  verbose?: boolean;
  preferenceContext?: string;  // User taste profile for preference-aware generation
}

export interface AgentResult {
  imageUrl: string | null;
  brief: any;
  score: any;
  iterations: number;
  corrections: string[];  // What was fixed in each iteration
}

/**
 * Step 1: PLAN — Claude analyzes the request and selects optimal strategy
 */
async function planStrategy(userPrompt: string, context: string): Promise<any> {
  const response = await getClient().messages.create({
    model: AGENT_MODEL,
    max_tokens: 1500,
    system: 'You are a creative strategy planner. Analyze the request and produce a strategy. Respond with ONLY valid JSON.',
    messages: [{
      role: 'user',
      content: `Plan the optimal creative strategy for this request:

USER REQUEST: "${userPrompt}"

AVAILABLE CONTEXT:
${context}

Return JSON:
{
  "strategy": "One sentence — the core creative approach",
  "psychologyFramework": "loss_aversion | social_proof | anchoring_contrast",
  "layoutType": "split-screen | single-hero | minimal | community | comparison",
  "primaryEmotion": "The emotion to trigger",
  "keyElement": "The single most important visual element",
  "riskFactors": ["What could go wrong with this creative"],
  "mitigations": ["How to prevent each risk"]
}`
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const result = extractAndRepairJson(text);
  return result?.parsed || null;
}

/**
 * Step 4: SELF-CORRECT — Analyze what went wrong and produce a fix
 */
async function selfCorrect(
  imageDataUri: string,
  previousBrief: any,
  score: any,
  iteration: number,
  preferenceContext?: string
): Promise<string | null> {
  try {
    const content: any[] = [];
    
    if (imageDataUri?.startsWith('data:')) {
      const commaIdx = imageDataUri.indexOf(',');
      const meta = imageDataUri.substring(0, commaIdx);
      const base64Data = imageDataUri.substring(commaIdx + 1);
      const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64Data }
      });
    }

    // Build targeted fix instructions for each low-scoring dimension
    const fixes: string[] = [];
    
    if ((score.whitespaceUsage || 10) < 8)
      fixes.push(`WHITESPACE (currently ${score.whitespaceUsage}/10): Increase breathing room dramatically. Every element needs generous dark space around it. Nothing should feel cramped. Minimum 20% of canvas should be empty dark space.`);
    
    if ((score.layoutQuality || 10) < 8)
      fixes.push(`LAYOUT (currently ${score.layoutQuality}/10): Improve visual hierarchy. The hero price/number should clearly dominate. Clean vertical stacking. Nothing overlapping.`);
    
    if ((score.gridAlignment || 10) < 8)
      fixes.push(`ALIGNMENT (currently ${score.gridAlignment}/10): All text blocks must align to a consistent left or center axis. Equal margins on all sides. No floating elements.`);
    
    if ((score.typographyPairing || 10) < 8)
      fixes.push(`TYPOGRAPHY (currently ${score.typographyPairing}/10): Make the hero text dramatically larger (3x+ the body text). Only 2 font weights. Body text should feel light and airy next to the bold hero.`);
    
    if ((score.textAccuracy || 10) < 8)
      fixes.push(`TEXT ACCURACY (currently ${score.textAccuracy}/10): The price or text had rendering errors. Spell every word and number correctly. The CTA and disclaimer must be legible.`);
    
    if ((score.psychologyScore || 10) < 8)
      fixes.push(`EMOTIONAL IMPACT (currently ${score.psychologyScore}/10): The hero price/number needs to feel exciting and aspirational. Use neon glow, dramatic scale, or cinematic light treatment to make the offer feel premium.`);
    
    if ((score.creativityScore || 10) < 8)
      fixes.push(`VISUAL CRAFT (currently ${score.creativityScore}/10): Add at least one premium visual effect — neon glow on the price, a radial light source behind the hero element, subtle particle effects, or a dramatic trading data visualization as background.`);
    
    if ((score.innovativeness || 10) < 7)
      fixes.push(`DISTINCTIVENESS (currently ${score.innovativeness}/10): The current layout looks too similar to generic prop firm ads. Choose ONE of these approaches instead: (A) Massive single typographic hero with extreme scale contrast and 70%+ empty space; (B) Trading data visualization (candlestick chart rendered as light art) as full bleed background with overlaid text; (C) Cinematic split with strong diagonal composition rather than centered stack; (D) Asymmetric editorial layout with the offer text on one side and pure dark space on the other.`);

    const fixInstructions = fixes.length > 0
      ? `\n\nSPECIFIC FIXES REQUIRED:\n${fixes.join('\n\n')}`
      : '\n\nGeneral polish: increase quality on all dimensions.';

    content.push({
      type: 'text',
      text: `This HolaPrime ad creative scored ${score.overall}/10. It needs revision to reach 8+.

CURRENT WEAKNESSES:
${(score.weaknesses || []).map((w: string) => `- ${w}`).join('\n')}
${fixInstructions}

CURRENT STRENGTHS (preserve these):
${(score.strengths || []).map((s: string) => `- ${s}`).join('\n')}

MANDATORY BRANDING (must be in every revised creative):
- TOP-LEFT: Keep this area clear/unobstructed — the real HolaPrime logo PNG (with its authentic bubble "o") is composited on top in post-processing. Do NOT draw any logo or brand wordmark text here.
- TOP-RIGHT: "#WeAreTraders" in white inside a thin oval/pill border, appearing ONLY once.
- Do NOT draw "hola", "prime", or "hola prime" as text anywhere in the image.
${preferenceContext ? `\nUSER STYLE PREFERENCES:\n${preferenceContext}` : ''}

Generate a REVISED image generation prompt for this creative that fixes every weakness above. The prompt must be 600+ words with precise visual descriptions. No JSON wrapping — return only the prompt text.`
    });

    const response = await getClient().messages.create({
      model: AGENT_MODEL,
      max_tokens: 2000,
      system: 'You are a senior art director fixing a prop trading ad creative that scored below 8/10. Produce a detailed revised image generation prompt that addresses every identified weakness. The result must be a world-class dark fintech advertising creative. Return ONLY the prompt text, 600+ words.',
      messages: [{ role: 'user', content }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : null;
  } catch (err: any) {
    console.warn(`[Agent] Self-correction failed:`, err.message);
    return null;
  }
}

/**
 * Main agentic pipeline: Plan → Generate → Score → (Self-Correct → Regenerate → Re-Score)*
 */
export async function runAgenticPipeline(
  imagePrompt: string,
  brief: any,
  referenceUrl?: string,
  config: AgentConfig = {}
): Promise<AgentResult> {
  const maxRetries = config.maxRetries ?? MAX_RETRIES;
  const minScore = config.minScore ?? MIN_QUALITY_SCORE;
  const corrections: string[] = [];
  
  let currentPrompt = imagePrompt;
  let bestResult: { imageUrl: string | null; score: any } = { imageUrl: null, score: null };
  let iterations = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    iterations = attempt + 1;
    console.log(`[Agent] Iteration ${iterations}/${maxRetries + 1}...`);

    // GENERATE
    let imageResult;
    try {
      imageResult = await generateImage({
        detailed: currentPrompt,
        referenceUrl,
        negative: [
          'duplicate text', 'misspelled words', 'garbled text', 'cut-off elements',
          'cluttered layout', 'overlapping elements', 'cramped spacing',
          'meme character', 'cartoon character', 'clipart', 'Pepe frog', 'emoji',
          'white background', 'light background', 'amateur design', 'pixelated',
          'We Are Traders appearing twice', 'duplicate logo', 'duplicate tagline',
        ].join(', '),
      }, { tier: 'pro' });
    } catch (e: any) {
      console.warn(`[Agent] Generation failed on iteration ${iterations}:`, e.message);
      continue;
    }

    const imageUrl = imageResult?.url || imageResult?.dataUri || null;
    if (!imageUrl) continue;

    // SCORE
    const score = await scoreCreative(imageUrl, brief, `agent-attempt-${iterations}`);
    
    if (!score) {
      bestResult = { imageUrl, score: null };
      break; // Can't score, return what we have
    }

    console.log(`[Agent] Iteration ${iterations} scored: ${score.overall}/10`);

    // Diminishing returns: stop if improvement < 0.5 after first iteration
    const previousBest = bestResult.score?.overall || 0;
    const improvement = score.overall - previousBest;
    if (iterations > 1 && improvement < 0.5 && improvement >= 0) {
      console.log(`[Agent] Diminishing returns (improvement: ${improvement.toFixed(1)}). Keeping best result.`);
      if (score.overall > previousBest) {
        bestResult = { imageUrl, score };
      }
      break;
    }

    // Track best result
    if (!bestResult.score || score.overall > (bestResult.score.overall || 0)) {
      bestResult = { imageUrl, score };
    }

    // Check if good enough
    if (score.overall >= minScore) {
      console.log(`[Agent] ✓ Score ${score.overall}/10 meets threshold ${minScore}. Done.`);
      break;
    }

    // SELF-CORRECT (if more attempts remaining)
    if (attempt < maxRetries) {
      console.log(`[Agent] Score ${score.overall}/10 below threshold ${minScore}. Self-correcting...`);
      const revisedPrompt = await selfCorrect(imageUrl, brief, score, attempt + 1, config.preferenceContext);
      if (revisedPrompt) {
        currentPrompt = revisedPrompt;
        corrections.push(`Iteration ${iterations}: Fixed: ${(score.weaknesses || []).join(', ')}`);
      } else {
        break; // Can't self-correct, return best so far
      }
    }
  }

  return {
    imageUrl: bestResult.imageUrl,
    brief,
    score: bestResult.score,
    iterations,
    corrections,
  };
}
