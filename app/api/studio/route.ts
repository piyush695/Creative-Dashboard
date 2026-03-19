import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import Anthropic from '@anthropic-ai/sdk';
import { extractWinningPatterns, filterPatternsBySelection } from '@/lib/ai-studio/patterns';
import { buildGenerationPrompt } from '@/lib/ai-studio/prompts';
import { extractAndRepairJson } from '@/lib/ai-studio/parser';
import { generateImage } from '@/lib/ai-studio/imagegen';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Dynamic model fallback sequence to bypass tier restrictions and 404 errors
const ANTHROPIC_MODELS = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022', 
  'claude-3-5-sonnet-20240620',
  'claude-3-haiku-20240307',
  'claude-3-sonnet-20240229'
];

async function generateWithFallback(messages: any[], maxTokens: number = 4000) {
  let lastError: any = null;
  
  for (const modelId of ANTHROPIC_MODELS) {
    try {
      console.log(`[Studio] Attempting Anthropic generation with model: ${modelId}`);
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: messages }] as any
      });
      return response;
    } catch (err: any) {
      console.warn(`[Studio] Anthropic model ${modelId} failed:`, err.message);
      lastError = err;
      
      // If it's a 404, we continue to the next fallback model.
      // If it's an API key error (e.g. 401), we throw immediately.
      if (err.status === 401 || err.status === 403) {
        throw new Error(`Anthropic Authentication Error (${err.status}): Check your API key.`);
      }
    }
  }
  
  throw lastError || new Error("All Anthropic models failed to generate content.");
}

async function fetchImageAsBase64(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { 
      data: base64, 
      media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp" 
    };
  } catch (err) {
    console.warn(`Failed to fetch image for Anthropic: ${url}`, err);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const collection = db.collection(process.env.MONGODB_COLLECTION || 'creative_data');

    if (action === 'list') {
      const creatives = await collection
        .find({})
        .project({
          adId: 1, adName: 1, adType: 1, thumbnailUrl: 1, 
          compositeRating: 1, ctr: 1, spend: 1, roas: 1,
          performanceLabel: 1
        })
        .sort({ compositeRating: -1 })
        .limit(100)
        .toArray();
      
      console.log(`API Found ${creatives.length} creatives for library`);
      return NextResponse.json({ creatives: creatives || [] });
    }

    if (action === 'aspects') {
      const adId = searchParams.get('adId');
      const doc = await collection.findOne({ adId });
      if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      return NextResponse.json({
        adId: doc.adId,
        adName: doc.adName,
        adType: doc.adType,
        thumbnailUrl: doc.thumbnailUrl,
        ctr: doc.ctr,
        scoreOverall: doc.scoreOverall,
        compositeRating: doc.compositeRating,
        verdictRating: doc.verdictRating,
        verdictDecision: doc.verdictDecision,
        whatWorks: Array.isArray(doc.whatWorks) ? doc.whatWorks : (doc.whatWorks ? String(doc.whatWorks).split(' | ') : []),
        whatDoesntWork: Array.isArray(doc.whatDoesntWork) ? doc.whatDoesntWork : (doc.whatDoesntWork ? String(doc.whatDoesntWork).split(' | ') : []),
        scores: {
          visualDesign: doc.scoreVisualDesign || 0,
          typography: doc.scoreTypography || 0,
          colorUsage: doc.scoreColorUsage || 0,
          composition: doc.scoreComposition || 0,
          ctaEffectiveness: doc.scoreCTA || 0,
          emotionalAppeal: doc.scoreEmotionalAppeal || 0,
          trustSignals: doc.scoreTrustSignals || 0,
          urgencyScarcity: doc.scoreUrgency || 0,
        },
        psychology: {
          lossAversion: { present: doc.lossAversionPresent, strength: doc.lossAversionStrength, evidence: doc.lossAversionEvidence },
          scarcity: { present: doc.scarcityPresent, strength: doc.scarcityStrength, evidence: doc.scarcityEvidence },
          socialProof: { present: doc.socialProofPresent, strength: doc.socialProofStrength, evidence: doc.socialProofEvidence },
          anchoring: { present: doc.anchoringPresent, strength: doc.anchoringStrength, evidence: doc.anchoringEvidence },
        },
        visual: {
          creativeType: doc.creativeType,
          dominantColors: Array.isArray(doc.dominantColors) ? doc.dominantColors : (doc.dominantColors ? String(doc.dominantColors).split(' | ') : []),
          keyVisualElements: Array.isArray(doc.keyVisualElements) ? doc.keyVisualElements : (doc.keyVisualElements ? String(doc.keyVisualElements).split(' | ') : []),
          brandingElements: doc.brandingElements,
        },
        aida: {
          attention: { score: doc.aidaAttentionScore, analysis: doc.aidaAttentionAnalysis },
          interest: { score: doc.aidaInterestScore, analysis: doc.aidaInterestAnalysis },
          desire: { score: doc.aidaDesireScore, analysis: doc.aidaDesireAnalysis },
          action: { score: doc.aidaActionScore, analysis: doc.aidaActionAnalysis },
        },
        recommendations: [doc.recommendation1, doc.recommendation2, doc.recommendation3].filter(Boolean),
        verdictSummary: doc.verdictSummary,
        keyInsight: doc.keyInsight,
        keepElements: doc.keepElements,
        changeElements: doc.changeElements,
        addElements: doc.addElements,
        hookOptions: doc.hookOptions,
        ctaOptions: doc.ctaOptions
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Studio API GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: any = null;
  try {
    body = await request.json();
    const { adIds, selectedAspects, type, prompt: userPrompt, reference } = body;

    if (type === 'pattern-based') {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
      const collection = db.collection(process.env.MONGODB_COLLECTION || 'creative_data');
      const creatives = await collection.find({ adId: { $in: adIds } }).toArray();

      if (creatives.length === 0) {
        return NextResponse.json({ error: 'Source creatives not found' }, { status: 404 });
      }

      let patterns = extractWinningPatterns(creatives);
      if (selectedAspects) {
        patterns = filterPatternsBySelection(patterns, selectedAspects, creatives);
      }

      const promptData = buildGenerationPrompt(patterns, body);
      const userMessageContent: any[] = [];
      const promptArray = Array.isArray(promptData) ? promptData : [];
      const firstMessage = promptArray[0] || { content: [] };
      const contentArray = Array.isArray(firstMessage.content) ? firstMessage.content : [];

      for (const part of contentArray) {
        if (part.type === 'image') {
          const base64Data = await fetchImageAsBase64(part.source.url);
          if (base64Data) {
            userMessageContent.push({
              type: 'image',
              source: { type: 'base64', media_type: base64Data.media_type, data: base64Data.data }
            });
          }
        } else {
          userMessageContent.push(part);
        }
      }

      const response = await generateWithFallback(userMessageContent, 4000);

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';
      let brief: any;
      try {
        brief = extractAndRepairJson(aiText);
      } catch (e) {
        console.error("Error parsing AI Text", e);
      }
      
      if (!brief) {
        console.error("AI response could not be parsed as JSON:", aiText);
        throw new Error(`Failed to parse AI response. Raw output: ${aiText.substring(0, 150)}...`);
      }

      // --- Pass source creative thumbnails as reference for visual-grounded generation ---
      const sourceCreativeUrls = patterns.sourceCreatives
        .map((c: any) => c.thumbnailUrl)
        .filter(Boolean) as string[];

      // Build a rich image spec that includes the reference and improvement data
      const imageSpec = {
        ...(brief.imageGenerationPrompt || {}),
        detailed: (
          typeof brief.imageGenerationPrompt === 'string'
            ? brief.imageGenerationPrompt
            : brief.imageGenerationPrompt?.detailed || ''
        ) + `

## IMPROVEMENT DIRECTIVES (apply these to the source creative):
- KEEP from source: ${(patterns.optimizationSynthesis?.keepElements || []).join('; ')}
- CHANGE in new version: ${(patterns.optimizationSynthesis?.changeElements || []).join('; ')}
- ADD to new version: ${(patterns.optimizationSynthesis?.addElements || []).join('; ')}
- Use hook concept: ${(patterns.optimizationSynthesis?.hookOptions || [])[0] || ''}
- Use CTA: ${(patterns.optimizationSynthesis?.ctaOptions || [])[0] || ''}
${body.tone ? `\n- TONE OVERRIDE (CRITICAL): The user requires this exact tone/style: "${body.tone}". You MUST apply this aesthetic.` : ''}

Brand: Hola Prime prop trading firm. Produce an ultra-premium, million-dollar professional design language. No cheap or spammy aesthetics. DO NOT generate random lifestyle images.`,
        sourceCreativeUrls,
        // Also set primary reference to best-performing source creative
        referenceUrl: patterns.bestCreative?.thumbnailUrl || sourceCreativeUrls[0] || undefined,
      };

      let imageResult: any = null;
      try {
        imageResult = await generateImage(imageSpec, { tier: 'pro' });
      } catch (e: any) {
        console.warn('[Studio] Image generation failed, proceeding with text creative:', e.message);
      }

      return NextResponse.json({
        creative: {
          ...brief,
          imageUrl: imageResult?.url || imageResult?.dataUri || null,
          sourceAdIds: adIds
        }
      });
    }

    if (type === 'custom' || type === 'image' || type === 'video') {
      const userContent: any[] = [];
      if (reference) {
         if (reference.startsWith('data:')) {
           const [meta, data] = reference.split(',');
           const mimeType = meta.split(':')[1].split(';')[0];
           userContent.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data } });
         } else {
           const base64Data = await fetchImageAsBase64(reference);
           if (base64Data) {
             userContent.push({ type: 'image', source: { type: 'base64', media_type: base64Data.media_type, data: base64Data.data } });
           }
         }
      }
      
      const generationPrompt = type === 'custom' ? userPrompt : `Instructions: ${userPrompt}. Reference analysis applied.`;
      
      userContent.push({
        type: 'text',
        text: `You are a world-class direct-response creative strategist for Hola Prime funded trading challenges.

BRAND: Hola Prime (#WeAreTraders). Product: funded trading challenges $2K\u2013$25K+. USPs: 1-step process, 5% profit target, no time limits, fast payouts. Disclaimer required.

USER INSTRUCTION: "${generationPrompt}"

Generate a high-converting Hola Prime ad creative brief applying ALL 10 rules:
1. URGENCY \u2014 countdown timer or 'Only X spots left' (MANDATORY)
2. PRICE ANCHOR \u2014 hero dollar amount ($2K/$25K) as 3D bold typography
3. DISCOUNT \u2014 '40% OFF' badge or promo code 'TAKEOFF40'
4. LOW BARRIER \u2014 'Lowest Barrier Ever', 'Risk-free', 'Easiest path'
5. BULLETS \u2014 3-4 bullet benefit block: 1-Step, 5% Target, No Time Limits
6. CTA \u2014 full-width button: 'CLAIM YOUR $2K CHALLENGE NOW' (commanding verb)
7. DARK THEME \u2014 navy/black bg, white text, electric blue accent
8. VISUAL MOTIFS \u2014 rockets, chart grids, gradient glows
9. SOCIAL PROOF \u2014 'Trusted by 100K+ traders', #WeAreTraders
10. MOBILE-FIRST \u2014 top 30% hooks in 0.5s, discount/amount leads

---
## STRATEGIC FOUNDATION (CREATIVE ANALYSIS FRAMEWORK)
Factor the following methodology into your structural thinking and copy rationale:
- Hook Rule: Aim for a massive thumbstop ratio. Optimize opening frames for attention.
- Deconstruct: Balance hook, visuals, body, offer, CTA, and audio.
- Metric Focus: Design for high CTR (>1.5%) and Hold Rate (>25%). Avoid engagement traps; optimize for CVR and ROAS.
- Anti-Prettiness: Remember that highly-polished ads can flop compared to normalized organic content.
- Inversion: Actively anticipate why this ad might fail and pre-emptively fix it in the brief.
---

Return ONLY valid JSON:
{
  "creativeConcept": {
    "title": "V2 concept name",
    "rationale": "Which rules applied and why",
    "targetScore": 9.0,
    "performanceTier": "ELITE",
    "improvementSummary": "3-4 improvements made"
  },
  "copywriting": {
    "headline": { "primary": "Main headline" },
    "body": { "primary": "Body copy with bullet benefits" },
    "cta": { "primary": "CLAIM YOUR $2K CHALLENGE NOW" },
    "hookText": "Thumb-stop first line",
    "urgencyText": "Countdown or spots-left mechanic",
    "trustText": "Social proof line"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word image prompt for Hola Prime ad: dark navy background, large bold '$2K' or '$25K' hero text in 3D style, countdown timer badge showing '03:25:17', 'Only 47 Spots Left!', 40% OFF badge top corner, Hola Prime logo top-left, #WeAreTraders top-right, rounded benefit box with checkmarks (1-Step Process / 5% Profit Target / No Time Limits), full-width blue gradient CTA button 'CLAIM YOUR $2K CHALLENGE NOW', subtle trading chart grid background pattern, electric blue glowing accents, fine print disclaimer at bottom in small text. Polished, professional, $100M brand aesthetic. Mobile-first vertical composition. Thumb-stop worthy."
  }
}`
      });

      const response = await generateWithFallback(userContent, 2000);

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';
      let brief: any;
      try {
        brief = extractAndRepairJson(aiText);
      } catch (e) {
        console.error("Error parsing AI Text", e);
      }

      if (!brief) {
        console.error("Custom AI response could not be parsed as JSON:", aiText);
        throw new Error(`Failed to generate creative brief. Raw output: ${aiText.substring(0, 150)}...`);
      }

      let imageResult: any = null;
      try {
        const imagePrompt = brief?.imageGenerationPrompt?.detailed 
          || (typeof brief?.imageGenerationPrompt === 'string' ? brief.imageGenerationPrompt : null)
          || userPrompt
          || 'Professional prop trading advertisement creative';

        imageResult = await generateImage({ 
          detailed: imagePrompt,
          referenceUrl: reference || undefined,  // user-uploaded reference image
          negative: brief?.imageGenerationPrompt?.negative,
          technicalSpecs: brief?.imageGenerationPrompt?.technicalSpecs,
        }, { tier: 'pro' });
      } catch (e: any) {
        console.warn('[Studio] Custom image generation failed, proceeding without new image:', e.message);
      }

      return NextResponse.json({
        creative: {
          ...brief,
          imageUrl: imageResult?.url || imageResult?.dataUri || reference || null
        }
      });
    }

    return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });

  } catch (err: any) {
    console.error('Studio API POST Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}