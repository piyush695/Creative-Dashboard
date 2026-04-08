/**
 * Persona-Based Creative Targeting
 * 
 * Takes a single offer and generates creatives for different audience personas.
 * Each persona gets a different angle, tone, visual style, and psychology approach
 * while keeping the core offer identical.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractAndRepairJson } from './parser';
import { generateImage } from './imagegen';

let _client: Anthropic | null = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

export interface Persona {
  id: string;
  name: string;
  description: string;
  age: string;
  painPoints: string[];
  motivations: string[];
  tone: string;
  visualStyle: string;
  psychologyApproach: string;
  hookAngle: string;
}

const TRADING_PERSONAS: Persona[] = [
  {
    id: 'beginner_curious',
    name: 'The Curious Beginner',
    description: 'Never traded before but keeps seeing trading content. Intimidated but curious.',
    age: '18-25',
    painPoints: ['Feels trading is too complex', 'Scared of losing money', 'No capital to start'],
    motivations: ['Side income', 'Financial freedom TikToks', 'Peer influence'],
    tone: 'Friendly, approachable, non-intimidating. Break down barriers.',
    visualStyle: 'Bright, youthful, meme-friendly. UGC aesthetic. Relatable characters.',
    psychologyApproach: 'Low barrier messaging. "$38 to start" removes the capital objection. Risk-free removes the fear objection.',
    hookAngle: 'What if you could start trading for less than a dinner out?',
  },
  {
    id: 'frustrated_trader',
    name: 'The Frustrated Trader',
    description: 'Has traded before but lost money or got screwed by another prop firm.',
    age: '25-35',
    painPoints: ['Lost money with another prop firm', 'Unfair rules/hidden fees', 'Slow payouts'],
    motivations: ['Redemption', 'Finding a fair firm', 'Proving they can trade'],
    tone: 'Empathetic then empowering. "We get it. Other firms failed you."',
    visualStyle: 'Split-screen before/after. Dark → light transition. Comparison layout.',
    psychologyApproach: 'Loss aversion + contrast. Show the pain of bad firms, then the relief of Hola Prime.',
    hookAngle: 'Tired of prop firms with hidden rules? There is a better way.',
  },
  {
    id: 'serious_scalper',
    name: 'The Serious Scalper',
    description: 'Experienced trader who knows exactly what they want. Evaluates prop firms on numbers.',
    age: '28-45',
    painPoints: ['Drawdown limits too tight', 'Profit splits too low', 'Evaluation too hard'],
    motivations: ['Maximum profit split', 'Fair rules', 'Fast scaling'],
    tone: 'Data-driven, no-BS, professional. Speak their language.',
    visualStyle: 'Clean, minimal, data-focused. Trading terminal aesthetic. Numbers as hero.',
    psychologyApproach: 'Anchoring + rational comparison. Show the numbers — 5% target, 90% split, no time limit.',
    hookAngle: '5% profit target. 90% split. No time limit. The numbers speak.',
  },
  {
    id: 'affiliate_hustler',
    name: 'The Affiliate Hustler',
    description: 'Interested in the affiliate program more than trading. Wants passive income.',
    age: '20-35',
    painPoints: ['Low commission rates elsewhere', 'Hard to recruit', 'No marketing support'],
    motivations: ['Passive income', 'High commissions', 'Easy referral process'],
    tone: 'Hustle culture, money-focused, entrepreneurial.',
    visualStyle: 'Money imagery, network diagrams, commission calculator aesthetic.',
    psychologyApproach: 'Social proof + anchoring. Show the commission rates and successful affiliates.',
    hookAngle: 'Earn 50% commission for every trader you refer. Do the math.',
  },
  {
    id: 'fomo_scroller',
    name: 'The FOMO Scroller',
    description: 'Sees everyone making money trading. Impulsive. Responds to urgency and social proof.',
    age: '18-30',
    painPoints: ['Feels left behind', 'Everyone else is making money', 'Doesn\'t know where to start'],
    motivations: ['Not missing out', 'Quick results', 'Being part of the movement'],
    tone: 'Urgent, exciting, community-driven. "Everyone is doing this."',
    visualStyle: 'Bold urgency elements, countdown timers, crowd/community imagery. High energy.',
    psychologyApproach: 'Scarcity + social proof. Limited spots + 100K traders already in.',
    hookAngle: '100K+ traders already started. Spots are filling fast.',
  },
];

export function getAvailablePersonas(): Persona[] {
  return TRADING_PERSONAS;
}

/**
 * Generate a persona-adapted creative brief and image.
 */
export async function generateForPersona(
  baseOffer: string,
  persona: Persona,
  referenceUrl?: string
): Promise<{ persona: Persona; imageUrl: string | null; brief: any; error?: string }> {
  try {
    // Generate persona-specific brief
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'You are an elite creative strategist. Generate a persona-targeted ad brief. Respond with ONLY valid JSON.',
      messages: [{
        role: 'user',
        content: `Generate a Hola Prime ad creative targeted at this specific persona:

PERSONA: ${persona.name}
- ${persona.description}
- Age: ${persona.age}
- Pain points: ${persona.painPoints.join(', ')}
- Motivations: ${persona.motivations.join(', ')}
- Tone: ${persona.tone}
- Visual style: ${persona.visualStyle}
- Psychology: ${persona.psychologyApproach}
- Hook angle: ${persona.hookAngle}

BASE OFFER: ${baseOffer}

Return JSON with:
{
  "headline": "Persona-targeted headline",
  "hookText": "First line that stops THIS specific person",
  "bodyText": "2-3 lines speaking to their specific pain points",
  "cta": "CTA that resonates with this persona",
  "imagePrompt": "400+ word image generation prompt tailored to this persona's visual style, age group, and psychological approach. Include specific visual elements that would resonate with ${persona.name}."
}`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = extractAndRepairJson(text);
    const brief = result?.parsed;

    if (!brief) {
      return { persona, imageUrl: null, brief: null, error: 'Failed to generate brief' };
    }

    // Generate image
    const imageResult = await generateImage({
      detailed: brief.imagePrompt || brief.headline || 'Hola Prime trading ad',
      referenceUrl,
    }, { tier: 'pro' });

    console.log(`[Persona] ✓ Generated for "${persona.name}"`);
    return {
      persona,
      imageUrl: imageResult?.url || imageResult?.dataUri || null,
      brief,
    };
  } catch (err: any) {
    console.warn(`[Persona] ✗ Failed for "${persona.name}":`, err.message);
    return { persona, imageUrl: null, brief: null, error: err.message };
  }
}

/**
 * Generate creatives for multiple personas in parallel.
 */
export async function generateForAllPersonas(
  baseOffer: string,
  personaIds?: string[],
  referenceUrl?: string
): Promise<any[]> {
  const targets = personaIds
    ? TRADING_PERSONAS.filter(p => personaIds.includes(p.id))
    : TRADING_PERSONAS;

  console.log(`[Persona] Generating for ${targets.length} personas...`);

  const results = await Promise.allSettled(
    targets.map(p => generateForPersona(baseOffer, p, referenceUrl))
  );

  return results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
}
