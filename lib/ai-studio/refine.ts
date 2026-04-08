/**
 * Iterative Refinement Engine
 * 
 * Takes a generated creative + user feedback and produces a targeted improvement.
 * Instead of regenerating from scratch, this sends the existing image + feedback
 * to Claude for a revised brief, then regenerates only what needs fixing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractAndRepairJson } from './parser';

let _client: Anthropic | null = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

export interface RefinementRequest {
  imageDataUri: string;         // The current creative image
  feedback: string;             // User's refinement instruction e.g. "Fix the CTA placement"
  originalBrief?: any;          // The original creative brief (optional)
  refinementType: 'layout' | 'copy' | 'color' | 'element' | 'general';
}

export interface RefinementResult {
  revisedImagePrompt: string;   // Updated prompt for image regeneration
  changes: string[];            // What specifically changed
  reasoning: string;            // Why these changes were made
}

/**
 * Analyze the current creative and produce a refined image prompt
 * that addresses the user's specific feedback.
 */
export async function buildRefinement(request: RefinementRequest): Promise<RefinementResult | null> {
  try {
    const content: any[] = [];
    
    // Send the current image to Claude
    if (request.imageDataUri?.startsWith('data:')) {
      const commaIdx = request.imageDataUri.indexOf(',');
      const meta = request.imageDataUri.substring(0, commaIdx);
      const base64Data = request.imageDataUri.substring(commaIdx + 1);
      const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64Data }
      });
    }

    // Extract key brief data if available
    const briefContext = request.originalBrief ? `
Original brief context:
- Concept: ${request.originalBrief.creativeConcept?.title || 'N/A'}
- Headline: ${request.originalBrief.copywriting?.headline?.primary || 'N/A'}
- CTA: ${request.originalBrief.copywriting?.cta?.primary || 'N/A'}` : '';

    content.push({
      type: 'text',
      text: `You are refining an existing Hola Prime ad creative based on user feedback.

CURRENT CREATIVE: (see attached image)
${briefContext}

USER FEEDBACK: "${request.feedback}"
REFINEMENT TYPE: ${request.refinementType}

Analyze the current creative, understand what the user wants changed, and produce a REVISED image generation prompt. The revised prompt should:
1. Describe the current creative's layout, elements, and style accurately
2. Keep EVERYTHING the user didn't mention — don't change what's working
3. Apply ONLY the specific change the user requested
4. Be a complete, standalone image generation prompt (600+ words)

Return ONLY valid JSON:
{
  "revisedImagePrompt": "Complete 600+ word prompt describing the improved creative. Start by describing the existing layout then specify exactly what changes.",
  "changes": ["Specific change 1", "Specific change 2"],
  "reasoning": "Why these specific changes address the user's feedback"
}`
    });

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: 'You are a creative refinement specialist. Produce targeted improvements to existing ad creatives. Respond with ONLY valid JSON.',
      messages: [{ role: 'user', content }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = extractAndRepairJson(text);
    
    if (result?.parsed) {
      console.log(`[Refine] Produced refinement with ${result.parsed.changes?.length || 0} changes`);
      return result.parsed as RefinementResult;
    }
    return null;
  } catch (err: any) {
    console.warn('[Refine] Refinement failed:', err.message);
    return null;
  }
}
