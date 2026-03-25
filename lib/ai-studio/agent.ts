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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const AGENT_MODEL = 'claude-sonnet-4-20250514';
const MIN_QUALITY_SCORE = 6;  // Auto-retry if below this
const MAX_RETRIES = 2;         // Maximum self-correction loops

export interface AgentConfig {
  maxRetries?: number;
  minScore?: number;
  verbose?: boolean;
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
  const response = await anthropic.messages.create({
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
  iteration: number
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

    content.push({
      type: 'text',
      text: `This creative scored ${score.overall}/10. It needs improvement.

WEAKNESSES IDENTIFIED:
${(score.weaknesses || []).map((w: string) => `- ${w}`).join('\n')}

SCORES:
- Text Accuracy: ${score.textAccuracy}/10
- Layout Quality: ${score.layoutQuality}/10
- Psychology: ${score.psychologyScore}/10
- Brand: ${score.brandCompliance}/10

This is correction attempt ${iteration}. Generate a REVISED image prompt that specifically fixes every weakness listed above while keeping the strengths:
${(score.strengths || []).map((s: string) => `- ${s}`).join('\n')}

Return ONLY the revised image generation prompt as a single string (600+ words). No JSON wrapping.`
    });

    const response = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 2000,
      system: 'You are fixing a creative that failed quality checks. Produce a revised image prompt that addresses every weakness. Return ONLY the prompt text.',
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
        negative: 'duplicate text, misspelled words, garbled text, cut-off elements, cluttered layout',
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
      const revisedPrompt = await selfCorrect(imageUrl, brief, score, attempt + 1);
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
