import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import Anthropic from '@anthropic-ai/sdk';
import { extractWinningPatterns, filterPatternsBySelection } from '@/lib/ai-studio/patterns';
import { buildGenerationPrompt } from '@/lib/ai-studio/prompts';
import { extractAndRepairJson } from '@/lib/ai-studio/parser';
import { generateImage } from '@/lib/ai-studio/imagegen';
import { scoreVariants } from '@/lib/ai-studio/scorer';
import { saveGeneration, buildMemoryContext } from '@/lib/ai-studio/memory';
import { analyzeCompetitorAd, buildCompetitorContext } from '@/lib/ai-studio/competitor';
import { uploadVariantImages } from '@/lib/ai-studio/storage';
import { buildRefinement } from '@/lib/ai-studio/refine';
import { listTemplates, saveTemplate, getTemplate, updateTemplateStats, deleteTemplate, seedDefaultTemplates } from '@/lib/ai-studio/templates';
import { linkPerformance, buildPerformanceInsights } from '@/lib/ai-studio/performance';
import { runAgenticPipeline } from '@/lib/ai-studio/agent';
import { generateCrossPlatform, getAvailablePlatforms } from '@/lib/ai-studio/crossplatform';
import { generateForAllPersonas, getAvailablePersonas } from '@/lib/ai-studio/personas';
import { getCached, setCache } from '@/lib/ai-studio/cache';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Model fallback: best → fast. Opus 4 for brief quality, Sonnet 4 reliable fallback.
const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',      // Primary — fast + high quality
  'claude-haiku-4-5-20251001',     // Fallback — fastest
];

// System prompt enforces strict JSON output — prevents markdown wrapping and preamble
const STUDIO_SYSTEM_PROMPT = `You are an elite direct-response creative strategist AI. You MUST respond with ONLY a raw JSON object — no markdown, no code fences, no preamble, no explanation outside the JSON. Your JSON must be complete and valid. Every string value must be properly escaped. Do not truncate your response.`;

async function generateWithFallback(messages: any[], maxTokens: number = 8192) {
  let lastError: any = null;
  
  for (const modelId of ANTHROPIC_MODELS) {
    try {
      console.log(`[Studio] Attempting Anthropic generation with model: ${modelId}`);
      const response = await anthropic.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        system: STUDIO_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messages }] as any
      });
      
      // Check if the response was truncated (stop_reason !== 'end_turn')
      if (response.stop_reason === 'max_tokens') {
        console.warn(`[Studio] WARNING: Response from ${modelId} was truncated (hit max_tokens=${maxTokens}). JSON may be incomplete.`);
      }
      
      console.log(`[Studio] ✓ Success with ${modelId} (${response.usage?.output_tokens || '?'} tokens, stop: ${response.stop_reason})`);
      return response;
    } catch (err: any) {
      console.warn(`[Studio] Anthropic model ${modelId} failed:`, err.status, err.message);
      lastError = err;
      
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

    // ── TEMPLATES: List all prompt templates ──
    if (action === 'templates') {
      await seedDefaultTemplates(); // Ensure defaults exist
      const category = searchParams.get('category') || undefined;
      const templates = await listTemplates(category);
      return NextResponse.json({ templates });
    }

    // ── TEMPLATE: Get single template by ID ──
    if (action === 'template') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      const template = await getTemplate(id);
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      return NextResponse.json({ template });
    }

    // ── PLATFORMS: List available cross-platform targets ──
    if (action === 'platforms') {
      return NextResponse.json({ platforms: getAvailablePlatforms() });
    }

    // ── PERSONAS: List available audience personas ──
    if (action === 'personas') {
      return NextResponse.json({ personas: getAvailablePersonas() });
    }

    // ── HISTORY: List endpoint has been migrated fully to direct DB Server Action (/actions/studio-actions.ts) ──

    // ── HISTORY: Get single history entry by creativeId ──
    if (action === 'history-detail') {
      const creativeId = searchParams.get('creativeId');
      if (!creativeId) return NextResponse.json({ error: 'creativeId required' }, { status: 400 });
      const historyCollection = db.collection('history');
      const entry = await historyCollection.findOne({ creativeId });
      if (!entry) return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
      return NextResponse.json({ entry });
    }

    // ── HISTORY: Get recent creatives (latest 5) ──
    if (action === 'recent-creatives') {
      const historyCollection = db.collection('history');
      const recent = await historyCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .project({
          creativeId: 1, tab: 1, prompt: 1, imageUrl: 1,
          createdAt: 1, headline: 1, score: 1, parentId: 1, childId: 1
        })
        .toArray();
      return NextResponse.json({ recent: recent || [] });
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

      // ── CREATIVE MEMORY: Query top past generations ──
      const memoryContext = await buildMemoryContext('pattern-based');
      
      // ── PERFORMANCE INSIGHTS: What actually converts based on real ad data ──
      const performanceContext = await buildPerformanceInsights();
      
      // ── COMPETITOR INTELLIGENCE: Analyze if competitor refs provided ──
      let competitorContext = '';
      if (body.competitorImages && Array.isArray(body.competitorImages)) {
        console.log(`[Studio] Analyzing ${body.competitorImages.length} competitor ads...`);
        const insights = await Promise.all(
          body.competitorImages.slice(0, 3).map((img: string) => analyzeCompetitorAd(img))
        );
        const validInsights = insights.filter(Boolean);
        if (validInsights.length > 0) {
          competitorContext = buildCompetitorContext(validInsights as any[]);
        }
      }

      // Inject all intelligence contexts into the prompt builder
      const enrichedBody = {
        ...body,
        _memoryContext: memoryContext + performanceContext,
        _competitorContext: competitorContext,
      };

      const promptData = buildGenerationPrompt(patterns, enrichedBody);
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

      const response = await generateWithFallback(userMessageContent, 10000);

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';
      let brief: any;
      try {
        const result = extractAndRepairJson(aiText);
        brief = result?.parsed || null;
        if (result?.wasRepaired) console.warn('[Studio] AI JSON response was auto-repaired (truncated output).');
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

      // Extract the image prompt from Claude's brief — with robust fallback
      let rawImagePrompt = '';
      if (typeof brief.imageGenerationPrompt === 'string') {
        rawImagePrompt = brief.imageGenerationPrompt;
      } else if (brief.imageGenerationPrompt?.detailed) {
        rawImagePrompt = typeof brief.imageGenerationPrompt.detailed === 'string' 
          ? brief.imageGenerationPrompt.detailed 
          : '';
      }
      
      // If Claude's image prompt is empty/garbled, reconstruct from ALL available brief data
      if (!rawImagePrompt || rawImagePrompt.length < 50) {
        console.warn('[Studio] Image prompt from AI was empty/short, reconstructing from brief data');
        const headline = brief.copywriting?.headline?.primary || '';
        const cta = brief.copywriting?.cta?.primary || 'CLAIM YOUR CHALLENGE NOW';
        const hookText = brief.copywriting?.hookText || '';
        const urgencyText = brief.copywriting?.urgencyText || '';
        const trustText = brief.copywriting?.trustText || '';
        const discountText = brief.copywriting?.discountText || '';
        const layout = brief.visualDesign?.layout || '';
        const dimensions = brief.visualDesign?.dimensions || '1080x1920';
        const colorPrimary = brief.visualDesign?.colorPalette?.primary || 'dark navy';
        const colorSecondary = brief.visualDesign?.colorPalette?.secondary || 'electric blue';
        const colorAccent = brief.visualDesign?.colorPalette?.accent || 'gold';
        const keyVisuals = (brief.visualDesign?.keyVisualElements || []).slice(0, 6).join(', ');
        const hierarchy = brief.visualDesign?.typography?.hierarchy || '';
        const concept = brief.creativeConcept?.title || '';
        const bullets = (brief.copywriting?.benefitBullets || []).join(', ');
        
        rawImagePrompt = `Professional ad creative for Hola Prime prop trading firm.
${concept ? `Concept: ${concept}.` : ''}
${layout ? `Layout: ${layout}.` : ''}
Dimensions: ${dimensions}. Color scheme: ${colorPrimary} background, ${colorSecondary} accents, ${colorAccent} highlights.
${hierarchy ? `Visual hierarchy: ${hierarchy}.` : ''}
${keyVisuals ? `Key visual elements: ${keyVisuals}.` : ''}
Headline: "${headline}".
${hookText ? `Hook text: "${hookText}".` : ''}
${urgencyText ? `Urgency element: "${urgencyText}".` : ''}
${discountText ? `Discount: "${discountText}".` : ''}
${bullets ? `Benefit bullets: ${bullets}.` : 'Benefit bullets: 1-Step Process, 5% Profit Target, No Time Limits.'}
CTA button: "${cta}".
${trustText ? `Social proof: "${trustText}".` : ''}
Hola Prime logo top-left. Fine print disclaimer at bottom. Ultra-premium, mobile-first vertical composition.`;
      }

      console.log(`[Studio] Image prompt length: ${rawImagePrompt.length} chars`);

      // Append concise improvement directives
      const keepElements = (patterns.optimizationSynthesis?.keepElements || []).slice(0, 3).join('; ');
      const changeElements = (patterns.optimizationSynthesis?.changeElements || []).slice(0, 3).join('; ');
      const addElements = (patterns.optimizationSynthesis?.addElements || []).slice(0, 3).join('; ');
      
      const directives = [
        keepElements && `Keep: ${keepElements}`,
        changeElements && `Change: ${changeElements}`,
        addElements && `Add: ${addElements}`,
        body.tone && `Tone: ${body.tone}`,
      ].filter(Boolean).join('. ');

      const basePrompt = rawImagePrompt + (directives ? `\n\nImprovements: ${directives}` : '');
      const baseNegative = brief.imageGenerationPrompt?.negative || 'generic stock photos, white backgrounds, cluttered, blurry, low quality, typos, misspellings';
      const refUrl = patterns.bestCreative?.thumbnailUrl || sourceCreativeUrls[0] || undefined;

      // ── BUILD TEXT MANIFEST ──
      // Extract ONLY the text Claude's brief actually generated from the user's prompt.
      // If a field is empty, it means the user/source didn't ask for it — DO NOT default.
      const mHeadline = brief.copywriting?.headline?.primary || '';
      const mCta = brief.copywriting?.cta?.primary || '';
      const mHook = brief.copywriting?.hookText || '';
      const mUrgency = brief.copywriting?.urgencyText || '';
      const mTrust = brief.copywriting?.trustText || '';
      const mDiscount = brief.copywriting?.discountText || '';
      const mBulletsRaw = brief.copywriting?.benefitBullets || [];
      const mBullets = [...new Set(mBulletsRaw.map((b: string) => b.replace(/^[•\-\s]+/, '').trim()).filter(Boolean))].slice(0, 4);

      // Build manifest with ONLY non-empty fields — empty = not requested
      const manifestLines: string[] = [];
      if (mHeadline) manifestLines.push(`HEADLINE: "${mHeadline}"`);
      if (mHook) manifestLines.push(`HOOK TEXT: "${mHook}"`);
      if (mUrgency) manifestLines.push(`URGENCY ELEMENT: "${mUrgency}"`);
      if (mDiscount) manifestLines.push(`DISCOUNT BADGE: "${mDiscount}"`);
      if (mBullets.length > 0) {
        manifestLines.push(`BENEFIT BULLETS (each appears EXACTLY ONCE):`);
        mBullets.forEach((b: unknown, i: number) => manifestLines.push(`  ${i + 1}. "${b}"`));
      }
      if (mCta) manifestLines.push(`CTA BUTTON: "${mCta}"`);
      if (mTrust) manifestLines.push(`TRUST LINE: "${mTrust}"`);

      const textManifest = `=== TEXT MANIFEST ===
The image must contain ONLY the text listed below. Do NOT add any element that is not listed here. If an element type (urgency, discount, trust badge, etc.) is NOT listed below, do NOT include it in the image.

${manifestLines.join('\n')}
DISCLAIMER (tiny text, bottom edge): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

ABSOLUTE RULES:
1. Do NOT add urgency badges, countdown timers, "limited spots", or scarcity elements UNLESS listed above.
2. Do NOT add discount badges or "% OFF" elements UNLESS listed above.
3. Do NOT add trust badges or social proof numbers UNLESS listed above.
4. Do NOT render framework terminology as text — words like "DANGER", "RELIEF", "URGENCY", "ANCHOR" are instructions for you, NOT text to put in the image.
5. Spell every word exactly as written. "Withdrawals" "Challenge" "Fictitious" "Simulated" "Performance" "Monetary" "Accounts" — copy character by character.
6. Each bullet appears ONCE. Never duplicate into two columns.
=== END TEXT MANIFEST ===

`;

      // ── 3-VARIANT GENERATION — PSYCHOLOGY APPLIED TO VISUAL DESIGN ──
      // CRITICAL: Psychology guides HOW existing elements are designed (color, size, position, contrast).
      // Psychology NEVER adds new elements the user didn't ask for.
      const variantConfigs = [
        {
          id: 'loss_aversion',
          label: 'Loss Aversion + Contrast',
          description: 'Visual contrast triggers fear of missing out on the better outcome',
          promptPrefix: `PSYCHOLOGY: LOSS AVERSION (apply to visual design ONLY — do NOT add new elements)

How to apply this psychology to the EXISTING elements from the text manifest:
- If the layout has a comparison/split-screen: make the "without" side darker, desaturated, slightly smaller. Make the "with" side brighter, more vibrant, slightly larger. The visual imbalance makes the viewer FEEL the loss.
- Color strategy: Use cooler, muted tones for pain-point areas. Use warmer, vibrant tones for solution areas. The color temperature shift IS the persuasion.
- The CTA button should feel like RELIEF — use the warmest, most inviting color in the entire composition.
- Eye flow: Pain point first (top or left) → Solution second (bottom or right) → CTA as the escape.
- Make the positive outcome take up 55-60% of the visual space vs 40-45% for the negative. Subtle asymmetry creates subconscious preference.

DO NOT ADD: urgency badges, countdown timers, scarcity text, "limited spots", crossed-out prices, or any element not in the text manifest above.

`,
        },
        {
          id: 'social_proof',
          label: 'Social Proof + Trust',
          description: 'Design elements to maximize credibility and belonging signals',
          promptPrefix: `PSYCHOLOGY: SOCIAL PROOF + TRUST (apply to visual design ONLY — do NOT add new elements)

How to apply this psychology to the EXISTING elements from the text manifest:
- If there's a trust line or community number in the manifest, make it visually prominent — give it its own clean space, readable size, and a subtle badge/container treatment.
- Color strategy: Dominant blues and teals for trust and stability. Gold accents for premium authority. Avoid red/orange — this variant persuades through CONFIDENCE, not urgency.
- Typography: Clean, authoritative, professional. The font weight and spacing should feel institutional and credible, not flashy or salesy.
- Characters/illustrations should look confident, successful, aspirational — strong postures, direct eye contact, composed expressions.
- The overall composition should feel PREMIUM and ESTABLISHED — generous whitespace, balanced layout, no visual noise.
- Eye flow: Brand identity first → Key visual/message center → Supporting elements → CTA with confidence.

DO NOT ADD: trust badges, trader counts, community numbers, #hashtags, or any element not in the text manifest above.

`,
        },
        {
          id: 'anchoring_contrast',
          label: 'Anchoring + Value Framing',
          description: 'Visual hierarchy makes the key value proposition feel like an incredible deal',
          promptPrefix: `PSYCHOLOGY: ANCHORING + VALUE FRAMING (apply to visual design ONLY — do NOT add new elements)

How to apply this psychology to the EXISTING elements from the text manifest:
- If there's a price or dollar amount in the manifest, make it the LARGEST, most visually dominant element — 3D treatment, oversized typography, dramatic scale. The brain anchors on the first big number it sees.
- If there's a discount or price comparison in the manifest, use visual scale contrast — old price large and struck through, new price highlighted with a glow or badge. The size difference amplifies perceived savings.
- Color strategy: Gold and deep navy for premium framing. When the visual environment says "luxury" but the price says "accessible," the cognitive dissonance resolves as "incredible deal."
- Typography hierarchy must be extreme — the hero number/amount should be 3-4x larger than supporting text. This size contrast IS the anchoring mechanism.
- Composition: Hero value element at the primary attention point (top-center or center). Supporting benefits cascade below it. CTA at the bottom captures the "I want this" impulse.

DO NOT ADD: anchor prices, crossed-out prices, "% OFF" badges, countdown timers, or any element not in the text manifest above.

`,
        },
      ];

      console.log(`[Studio] Generating 3 creative variants in parallel...`);
      
      const variantResults = await Promise.allSettled(
        variantConfigs.map(async (variant) => {
          try {
            const variantPrompt = textManifest + variant.promptPrefix + basePrompt;
            const result = await generateImage({
              detailed: variantPrompt,
              negative: baseNegative + ', duplicate text, misspelled words, garbled disclaimer, elements not in the text manifest, urgency badges not requested, countdown timers not requested, discount badges not requested, framework terminology rendered as text (DANGER RELIEF ANCHOR URGENCY), watermarks, labels describing psychology concepts',
              sourceCreativeUrls,
              referenceUrl: refUrl,
              technicalSpecs: brief.imageGenerationPrompt?.technicalSpecs,
            }, { tier: 'pro' });
            console.log(`[Studio] ✓ Variant "${variant.id}" generated successfully`);
            return {
              id: variant.id,
              label: variant.label,
              description: variant.description,
              imageUrl: result?.url || result?.dataUri || null,
            };
          } catch (e: any) {
            console.warn(`[Studio] ✗ Variant "${variant.id}" failed:`, e.message);
            return {
              id: variant.id,
              label: variant.label,
              description: variant.description,
              imageUrl: null,
              error: e.message,
            };
          }
        })
      );

      const variants = variantResults
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);

      console.log(`[Studio] ${variants.filter((v: any) => v?.imageUrl).length}/3 variants generated successfully`);

      // Use the first variant with an image as primary (no scoring wait)
      const primaryVariant = variants.find((v: any) => v?.imageUrl) || variants[0];

      // ── RESPOND IMMEDIATELY — don't make the user wait for scoring/upload/save ──
      const responsePayload = {
        creative: {
          ...brief,
          imageUrl: (primaryVariant as any)?.imageUrl || null,
          variants,
          sourceAdIds: adIds
        }
      };

      // ── BACKGROUND: Quality scoring, Cloudinary upload, and memory save ──
      // These run AFTER the response is sent — user sees creative instantly
      // ── BACKGROUND: Quality scoring and Cloudinary upload (NO DATABASE SAVE) ──
      const backgroundWork = async () => {
        let scoredVariants = variants;
        try {
          const scores = await scoreVariants(variants as any[], brief);
          scoredVariants = variants.map((v: any) => {
            const score = scores.get(v.id);
            return score ? { ...v, score } : v;
          });
          console.log(`[Studio] Background scoring complete`);
        } catch (e: any) {
          console.warn('[Studio] Background scoring failed:', e.message);
        }

        const generationId = `gen-${Date.now()}`;
        try {
          scoredVariants = await uploadVariantImages(scoredVariants, generationId);
          console.log(`[Studio] Background Cloudinary upload complete`);
        } catch (e: any) {
          console.warn('[Studio] Background image upload failed:', e.message);
        }
        
        console.log(`[Studio] Background work complete (Creative not yet saved to DB)`);
      };

      backgroundWork().catch(err => console.warn('[Studio] Background error:', err.message));
      backgroundWork().catch(err => console.warn('[Studio] Background work error:', err.message));

      return NextResponse.json(responsePayload);
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
        text: `You are a world-class creative strategist specializing in prop trading firm advertising for Hola Prime.

BRAND: Hola Prime (#WeAreTraders). Product: funded trading challenges $2K\u2013$25K+. USPs: 1-step process, 5% profit target, no time limits, fast withdrawals (10 min), no activation fees, high profit splits.
DISCLAIMER (use verbatim): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

USER INSTRUCTION: "${generationPrompt}"

## DISCIPLINE RULE (MOST IMPORTANT)
Only include elements the user explicitly asked for or that a reference image contains. Do NOT add urgency timers, discount badges, social proof, or rockets unless the user requested them. A clean, focused creative with 4-5 strong elements beats a cluttered one with 10 mediocre elements.

## PROP FIRM AUTHENTICITY
- Use trader language: "funded account", "challenge", "profit target", "payout", "profit split", "prop firm"
- Imagery: trading terminals, candlestick charts, multiple monitors — never generic business stock photos
- Numbers must be ACCURATE to what the user specifies
- Tone: confident but credible — traders are skeptical

## CONVERSION TOOLKIT (use only what fits the user's request)
- PRICE ANCHOR: hero dollar amount as focal point
- BULLET BENEFITS: 3-4 max, each appears ONCE, never duplicated
- CTA: commanding verb — Claim, Start, Unlock, Get
- DARK THEME: navy/black bg, white text, blue accents

Return ONLY valid JSON:
{
  "creativeConcept": {
    "title": "Concept name",
    "rationale": "Strategy applied",
    "targetScore": 9.0,
    "performanceTier": "ELITE",
    "improvementSummary": "Key improvements"
  },
  "copywriting": {
    "headline": { "primary": "Main headline" },
    "body": { "primary": "Body copy" },
    "cta": { "primary": "CTA text" },
    "hookText": "Thumb-stop first line",
    "urgencyText": "Only if requested",
    "trustText": "Only if requested"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word image prompt. RULES: (1) Include ONLY elements the user asked for. (2) Every bullet/text appears EXACTLY ONCE — never duplicate. (3) Spell every word correctly — especially: Withdrawals, Challenge, Limits, Process, Fictitious, Simulated, Performance, Accounts. (4) Use prop-firm-authentic imagery: trading terminals with candlestick charts, not generic stock photos. (5) Describe exact layout: what goes where, relative sizes, spacing. (6) Disclaimer must be copied verbatim from above."
  }
}`
      });

      const response = await generateWithFallback(userContent, 6000);

      const aiText = response.content[0].type === 'text' ? response.content[0].text : '';
      let brief: any;
      try {
        const result = extractAndRepairJson(aiText);
        brief = result?.parsed || null;
        if (result?.wasRepaired) console.warn('[Studio] Custom AI JSON response was auto-repaired.');
      } catch (e) {
        console.error("Error parsing AI Text", e);
      }

      if (!brief) {
        console.error("Custom AI response could not be parsed as JSON:", aiText);
        throw new Error(`Failed to generate creative brief. Raw output: ${aiText.substring(0, 150)}...`);
      }

      let baseImagePrompt = brief?.imageGenerationPrompt?.detailed 
          || (typeof brief?.imageGenerationPrompt === 'string' ? brief.imageGenerationPrompt : null)
          || userPrompt
          || 'Professional prop trading advertisement creative for Hola Prime';

      const baseNeg = brief?.imageGenerationPrompt?.negative || 'typos, misspellings, blurry, low quality, generic stock photos, white background, overlapping text, cramped layout, cluttered elements';

      // ── 3-VARIANT GENERATION for custom path — PSYCHOLOGY APPLIED TO DESIGN ──
      const customVariants = [
        {
          id: 'loss_aversion',
          label: 'Loss Aversion + Contrast',
          description: 'Visual contrast triggers fear of missing the better outcome',
          prefix: `PSYCHOLOGY: LOSS AVERSION — apply to visual design only, do NOT add new elements.
If there's a comparison layout, make the negative side darker/desaturated and the positive side brighter/vibrant. Color shift from cool muted → warm vibrant at the CTA. The visual imbalance creates subconscious preference. DO NOT add urgency badges, timers, or any element not in the prompt.\n\n`,
        },
        {
          id: 'social_proof',
          label: 'Social Proof + Trust',
          description: 'Design maximizes credibility and belonging signals',
          prefix: `PSYCHOLOGY: SOCIAL PROOF + TRUST — apply to visual design only, do NOT add new elements.
Dominant blues/teals for trust. Gold for authority. Characters look confident and aspirational. Layout feels premium, established, institutional. Generous whitespace. Typography is clean and authoritative. DO NOT add trust badges, trader counts, or any element not in the prompt.\n\n`,
        },
        {
          id: 'anchoring_contrast',
          label: 'Anchoring + Value Framing',
          description: 'Visual hierarchy makes key value feel like an incredible deal',
          prefix: `PSYCHOLOGY: ANCHORING + VALUE FRAMING — apply to visual design only, do NOT add new elements.
If there's a price/amount, make it the LARGEST element (3D, oversized). Gold + deep navy for premium framing. Extreme typography hierarchy — hero element 3-4x larger than supporting text. Layout radiates premium quality. DO NOT add anchor prices, crossed-out prices, or any element not in the prompt.\n\n`,
        },
      ];

      console.log(`[Studio] Generating 3 custom creative variants in parallel...`);

      const customResults = await Promise.allSettled(
        customVariants.map(async (variant) => {
          try {
            const variantPrompt = variant.prefix + baseImagePrompt;
            const result = await generateImage({
              detailed: variantPrompt,
              referenceUrl: reference || undefined,
              negative: baseNeg,
              technicalSpecs: brief?.imageGenerationPrompt?.technicalSpecs,
            }, { tier: 'pro' });
            console.log(`[Studio] ✓ Custom variant "${variant.id}" generated`);
            return { id: variant.id, label: variant.label, description: variant.description, imageUrl: result?.url || result?.dataUri || null };
          } catch (e: any) {
            console.warn(`[Studio] ✗ Custom variant "${variant.id}" failed:`, e.message);
            return { id: variant.id, label: variant.label, description: variant.description, imageUrl: null, error: e.message };
          }
        })
      );

      const variants = customResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);

      // Use the first variant with an image as primary (no scoring wait)
      const primaryVariant = variants.find((v: any) => v?.imageUrl) || variants[0];

      // ── RESPOND IMMEDIATELY — don't make the user wait for scoring/upload/save ──
      const customResponsePayload = {
        creative: {
          ...brief,
          imageUrl: (primaryVariant as any)?.imageUrl || reference || null,
          variants,
        }
      };

      // ── BACKGROUND: Quality scoring, Cloudinary upload, and memory save ──
      // ── BACKGROUND: Quality scoring and Cloudinary upload (NO DATABASE SAVE) ──
      const customBackgroundWork = async () => {
        let scoredVariants = variants;
        try {
          const scores = await scoreVariants(variants as any[], brief);
          scoredVariants = variants.map((v: any) => {
            const score = scores.get(v.id);
            return score ? { ...v, score } : v;
          });
          console.log(`[Studio] Custom background scoring complete`);
        } catch (e: any) {
          console.warn('[Studio] Custom background scoring failed:', e.message);
        }

        const customGenId = `custom-${Date.now()}`;
        try {
          scoredVariants = await uploadVariantImages(scoredVariants, customGenId);
          console.log(`[Studio] Custom background Cloudinary upload complete`);
        } catch (e: any) {
          console.warn('[Studio] Custom background image upload failed:', e.message);
        }
        
        console.log(`[Studio] Custom background complete (Creative not yet saved to DB)`);
      };

      customBackgroundWork().catch(err => console.warn('[Studio] Custom background error:', err.message));
      customBackgroundWork().catch(err => console.warn('[Studio] Custom background error:', err.message));

      return NextResponse.json(customResponsePayload);
    }

    // ── COMPETITOR ANALYSIS endpoint ──
    if (type === 'competitor-analysis') {
      const { competitorImage, competitorName } = body;
      if (!competitorImage) {
        return NextResponse.json({ error: 'No competitor image provided' }, { status: 400 });
      }
      const insight = await analyzeCompetitorAd(competitorImage, competitorName);
      if (!insight) {
        return NextResponse.json({ error: 'Failed to analyze competitor ad' }, { status: 500 });
      }
      return NextResponse.json({ insight });
    }

    // ── MULTI-FORMAT REGENERATION endpoint ──
    if (type === 'multi-format') {
      const { imagePrompt, referenceUrl: refUrlParam, formats } = body;
      const targetFormats = formats || ['1:1', '9:16', '4:5'];
      
      console.log(`[Studio] Generating ${targetFormats.length} format variants...`);
      
      const formatResults = await Promise.allSettled(
        targetFormats.map(async (format: string) => {
          const formatPrompt = imagePrompt + `\n\nAspect ratio: ${format}. Adjust composition to fit ${format} format naturally — do not just crop or stretch.`;
          const result = await generateImage({
            detailed: formatPrompt,
            referenceUrl: refUrlParam || undefined,
            technicalSpecs: { aspectRatio: format },
          }, { tier: 'pro' });
          return {
            format,
            imageUrl: result?.url || result?.dataUri || null,
          };
        })
      );
      
      const formatVariants = formatResults
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean);
      
      return NextResponse.json({ formats: formatVariants });
    }

    // ── ITERATIVE REFINEMENT — Fix specific elements without regenerating from scratch ──
    if (type === 'refine') {
      const { imageUrl: currentImage, feedback, originalBrief, refinementType = 'general' } = body;
      if (!feedback) {
        return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });
      }
      
      const refinement = await buildRefinement({
        imageDataUri: currentImage || '',
        feedback,
        originalBrief,
        refinementType,
      });
      
      if (!refinement) {
        return NextResponse.json({ error: 'Refinement analysis failed' }, { status: 500 });
      }

      // Regenerate with the revised prompt
      let imageResult = null;
      try {
        imageResult = await generateImage({
          detailed: refinement.revisedImagePrompt,
          referenceUrl: currentImage?.startsWith('http') ? currentImage : undefined,
        }, { tier: 'pro' });
      } catch (e: any) {
        console.warn('[Studio] Refinement image gen failed:', e.message);
      }

      return NextResponse.json({
        creative: {
          imageUrl: imageResult?.url || imageResult?.dataUri || null,
          changes: refinement.changes,
          reasoning: refinement.reasoning,
        }
      });
    }

    // ── TEMPLATE CRUD ──
    if (type === 'save-template') {
      const { name, description, category, prompt: tPrompt, tone: tTone, targetAudience: tAud, psychologyFramework, tags } = body;
      if (!name || !tPrompt) {
        return NextResponse.json({ error: 'Template name and prompt are required' }, { status: 400 });
      }
      const id = await saveTemplate({
        name, description: description || '', category: category || 'custom',
        prompt: tPrompt, tone: tTone, targetAudience: tAud,
        psychologyFramework, tags: tags || [], isPublic: true,
      });
      return NextResponse.json({ templateId: id });
    }

    if (type === 'delete-template') {
      const { templateId } = body;
      if (!templateId) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      const deleted = await deleteTemplate(templateId);
      return NextResponse.json({ deleted });
    }

    // ── PERFORMANCE FEEDBACK — Link real ad data to a generation ──
    if (type === 'link-performance') {
      const { generationId, performance } = body;
      if (!generationId || !performance) {
        return NextResponse.json({ error: 'generationId and performance data required' }, { status: 400 });
      }
      const linked = await linkPerformance(generationId, performance);
      return NextResponse.json({ linked });
    }

    // ── AGENTIC PIPELINE — Self-correcting generation loop ──
    if (type === 'agentic') {
      const { imagePrompt: agentPrompt, brief: agentBrief, referenceUrl: agentRef, maxRetries, minScore } = body;
      if (!agentPrompt) {
        return NextResponse.json({ error: 'imagePrompt is required for agentic pipeline' }, { status: 400 });
      }
      
      console.log(`[Studio] Starting agentic pipeline (max ${maxRetries || 2} retries, min score ${minScore || 6})...`);
      const agentResult = await runAgenticPipeline(
        agentPrompt,
        agentBrief || {},
        agentRef,
        { maxRetries, minScore }
      );

      return NextResponse.json({
        creative: {
          imageUrl: agentResult.imageUrl,
          score: agentResult.score,
          iterations: agentResult.iterations,
          corrections: agentResult.corrections,
        }
      });
    }

    // ── CROSS-PLATFORM — Generate for Meta, TikTok, Google, Instagram ──
    if (type === 'cross-platform') {
      const { imagePrompt: cpPrompt, platformIds, referenceUrl: cpRef } = body;
      if (!cpPrompt) {
        return NextResponse.json({ error: 'imagePrompt is required' }, { status: 400 });
      }
      
      const platformResults = await generateCrossPlatform(cpPrompt, platformIds, cpRef);
      return NextResponse.json({ platforms: platformResults });
    }

    // ── PERSONA TARGETING — Same offer, multiple audience angles ──
    if (type === 'persona-targeting') {
      const { offer, personaIds, referenceUrl: ptRef } = body;
      if (!offer) {
        return NextResponse.json({ error: 'Base offer text is required' }, { status: 400 });
      }
      
      const personaResults = await generateForAllPersonas(offer, personaIds, ptRef);
      return NextResponse.json({ personas: personaResults });
    }

    // ── SAVE TO HISTORY — Store creative in reddit_data.history ──
    if (type === 'save-history') {
      const { creativeId, parentId, childId, tab, prompt: historyPrompt, generationOptions: histOpts, result: histResult, imageUrl: histImageUrl, previousInputs } = body;
      if (!creativeId) {
        return NextResponse.json({ error: 'creativeId is required' }, { status: 400 });
      }
      
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
      const historyCollection = db.collection('history');
      
      const headline = histResult?.copywriting?.headline?.primary || histResult?.creativeConcept?.title || '';
      const score = histResult?.creativeConcept?.targetScore || histResult?.targetScore || null;
      
      await historyCollection.insertOne({
        creativeId,
        parentId: parentId || null,
        childId: childId || null,
        tab: tab || 'custom',
        prompt: historyPrompt || '',
        generationOptions: histOpts || {},
        result: histResult || {},
        imageUrl: histImageUrl || null,
        headline,
        score,
        previousInputs: previousInputs || [],
        createdAt: new Date(),
      });

      // If this is a regeneration (has parentId), update parent's childId
      if (parentId) {
        await historyCollection.updateOne(
          { creativeId: parentId },
          { $set: { childId: creativeId } }
        );
      }
      
      console.log(`[History] Saved creative ${creativeId} (parent: ${parentId || 'none'}) to history`);
      return NextResponse.json({ success: true, creativeId });
    }

    return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });

  } catch (err: any) {
    console.error('Studio API POST Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}