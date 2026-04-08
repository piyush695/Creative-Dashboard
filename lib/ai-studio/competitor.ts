/**
 * Competitor Intelligence Module
 * 
 * Analyzes competitor prop firm ads to extract winning patterns.
 * Works in two modes:
 * 1. Image analysis — user uploads a competitor ad screenshot
 * 2. URL analysis — fetches and analyzes an ad from a URL
 * 
 * Returns structured intelligence that feeds into the creative generation prompt.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient() { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

const ANALYZER_MODEL = 'claude-sonnet-4-20250514';

export interface CompetitorInsight {
  competitor: string;
  adType: string;
  strengths: string[];
  weaknesses: string[];
  psychologyTactics: string[];
  visualTechniques: string[];
  copyPatterns: string[];
  differentiators: string[];   // What they do that Hola Prime doesn't
  opportunities: string[];     // Gaps Hola Prime can exploit
  threatLevel: 'low' | 'medium' | 'high';
  summary: string;
}

/**
 * Analyze a competitor ad image.
 * Accepts base64 data URI or a URL.
 */
export async function analyzeCompetitorAd(
  imageSource: string,
  competitorName?: string
): Promise<CompetitorInsight | null> {
  try {
    const content: any[] = [];

    // Handle image input
    if (imageSource.startsWith('data:')) {
      const commaIdx = imageSource.indexOf(',');
      const meta = imageSource.substring(0, commaIdx);
      const base64Data = imageSource.substring(commaIdx + 1);
      const mimeType = meta.split(':')[1]?.split(';')[0] || 'image/png';
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64Data }
      });
    } else {
      // Try to fetch the URL
      try {
        const res = await fetch(imageSource, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64Data }
        });
      } catch (err: any) {
        console.warn(`[Competitor] Failed to fetch image: ${err.message}`);
        return null;
      }
    }

    content.push({
      type: 'text',
      text: `Analyze this prop firm / funded trading advertisement${competitorName ? ` from "${competitorName}"` : ''}.

You are analyzing a COMPETITOR's ad to extract intelligence for Hola Prime (a prop trading firm). Be ruthlessly analytical.

Return ONLY valid JSON:
{
  "competitor": "Brand name visible in the ad (or 'Unknown')",
  "adType": "Image | Video | Carousel | Story",
  "strengths": ["What this ad does WELL — up to 5 specific things"],
  "weaknesses": ["What this ad does POORLY — up to 5 specific flaws Hola Prime can exploit"],
  "psychologyTactics": ["List every behavioral psychology tactic used: loss aversion, scarcity, social proof, anchoring, etc."],
  "visualTechniques": ["Specific visual design techniques: split-screen, 3D text, meme format, gradient, etc."],
  "copyPatterns": ["Copy/text patterns: price anchoring, benefit bullets, urgency countdown, etc."],
  "differentiators": ["What does this competitor offer/show that Hola Prime currently does NOT feature in ads?"],
  "opportunities": ["Gaps or weaknesses Hola Prime can exploit to beat this competitor's creative"],
  "threatLevel": "low | medium | high",
  "summary": "One paragraph competitive intelligence summary — what should Hola Prime learn and what should it counter?"
}`
    });

    const response = await getClient().messages.create({
      model: ANALYZER_MODEL,
      max_tokens: 2000,
      system: 'You are a competitive intelligence analyst for the prop trading industry. Analyze competitor advertisements ruthlessly and objectively. Respond with ONLY valid JSON.',
      messages: [{ role: 'user', content }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) return null;
    cleaned = cleaned.substring(startIdx);

    const parsed = JSON.parse(cleaned) as CompetitorInsight;
    console.log(`[Competitor] Analyzed: ${parsed.competitor} — Threat: ${parsed.threatLevel}`);
    return parsed;

  } catch (err: any) {
    console.warn('[Competitor] Analysis failed:', err.message);
    return null;
  }
}

/**
 * Build a competitive context string to inject into the creative generation prompt.
 */
export function buildCompetitorContext(insights: CompetitorInsight[]): string {
  if (!insights || insights.length === 0) return '';

  const entries = insights.map((insight, i) => {
    return `### Competitor ${i + 1}: ${insight.competitor} (Threat: ${insight.threatLevel})
- Their strengths: ${insight.strengths.slice(0, 3).join('; ')}
- Their weaknesses to exploit: ${insight.weaknesses.slice(0, 3).join('; ')}
- Psychology they use: ${insight.psychologyTactics.join(', ')}
- Visual techniques: ${insight.visualTechniques.join(', ')}
- Gaps for Hola Prime: ${insight.opportunities.slice(0, 3).join('; ')}`;
  }).join('\n\n');

  return `\n\n## COMPETITOR INTELLIGENCE — BEAT THESE ADS
The following competitor ads have been analyzed. Your creative MUST be objectively superior to each.

${entries}

DIRECTIVE: Exploit every weakness listed. Match or exceed every strength. Use psychology tactics they missed. Your creative should make these competitor ads look amateur by comparison.
`;
}
