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
import { listTemplates, saveTemplate, getTemplate, updateTemplateStats, deleteTemplate, seedDefaultTemplates, autoCreateTemplate } from '@/lib/ai-studio/templates';
import { linkPerformance, buildPerformanceInsights } from '@/lib/ai-studio/performance';
import { runAgenticPipeline } from '@/lib/ai-studio/agent';
import { pickDiverseParadigms, type ConceptParadigm } from '@/lib/ai-studio/brand';
import { runCreativeDirector } from '@/lib/ai-studio/director';
// text-overlay disabled — Gemini renders text directly in the image for better quality
// import { applyTextOverlay, extractOverlayConfig } from '@/lib/ai-studio/text-overlay';
import { generateCrossPlatform, getAvailablePlatforms } from '@/lib/ai-studio/crossplatform';
import { generateForAllPersonas, getAvailablePersonas } from '@/lib/ai-studio/personas';
import { getCached, setCache } from '@/lib/ai-studio/cache';
import { recordFeedback, buildPreferenceContext, getPreferenceSummary } from '@/lib/ai-studio/preferences';
import { getFullBrandContext } from '@/lib/ai-studio/adlibrary';

// Lazy singleton — ensures env vars are loaded before SDK reads them
let _anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropicClient;
}

// Model fallback: best → fast. Opus 4 for brief quality, Sonnet 4 reliable fallback.
const ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',      // Primary — fast + high quality
  'claude-haiku-4-5-20251001',     // Fallback — fastest
];

// System prompt enforces strict JSON output — prevents markdown wrapping and preamble
const STUDIO_SYSTEM_PROMPT = `You are an elite direct-response creative strategist AI. You MUST respond with ONLY a raw JSON object — no markdown, no code fences, no preamble, no explanation outside the JSON. Your JSON must be complete and valid. Every string value must be properly escaped. Do not truncate your response.`;

// Minimum acceptable quality score — creatives below this threshold are filtered out
const MIN_SCORE_THRESHOLD = 8.0;

async function generateWithFallback(messages: any[], maxTokens: number = 8192) {
  let lastError: any = null;
  
  for (const modelId of ANTHROPIC_MODELS) {
    try {
      console.log(`[Studio] Attempting Anthropic generation with model: ${modelId}`);
      const response = await getAnthropicClient().messages.create({
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

    // ── PREFERENCES: Get user taste profile summary ──
    if (action === 'preferences') {
      const summary = await getPreferenceSummary();
      return NextResponse.json({ preferences: summary });
    }

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

    // ── FEEDBACK: Record like/dislike preference ──
    if (type === 'feedback') {
      const { generationId, variantId, feedback, variantMeta } = body;
      if (!variantId || !feedback) {
        return NextResponse.json({ error: 'variantId and feedback are required' }, { status: 400 });
      }
      await recordFeedback({
        generationId: generationId || '',
        variantId,
        feedback,
        timestamp: new Date(),
        variantLabel: variantMeta?.label || '',
        psychologyFramework: variantMeta?.psychologyFramework || variantId,
        colorPalette: variantMeta?.colorPalette || undefined,
        layoutType: variantMeta?.layoutType || undefined,
        headline: variantMeta?.headline || undefined,
        tone: variantMeta?.tone || undefined,
        score: variantMeta?.score || undefined,
      });

      // Auto-create template from liked high-scoring variants
      if (feedback === 'like' && variantMeta?.score && variantMeta.score >= 7.5 && body.brief) {
        autoCreateTemplate(body.brief, variantMeta.score, variantMeta?.label || variantId).catch(() => {});
      }

      return NextResponse.json({ success: true, message: `Feedback "${feedback}" recorded for variant "${variantId}"` });
    }

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

      // ── USER PREFERENCES: Self-learning taste profile ──
      const preferenceContext = await buildPreferenceContext();

      // ── BRAND DNA: Only inject full DNA if user explicitly requests it ──
      // For Top Ads mode, focus on improving the existing creative's scores, not forcing brand DNA
      const topAdsUserText = ((body.prompt || '') + ' ' + (body.additionalInstructions || '') + ' ' + (body.tone || '')).toLowerCase();
      const topAdsWantsBrandDNA = topAdsUserText.includes('brand dna') || topAdsUserText.includes('brand identity') || topAdsUserText.includes('brand signature') || topAdsUserText.includes('full brand');

      let brandContext = '';
      if (topAdsWantsBrandDNA) {
        try {
          console.log('[Studio] Fetching full brand DNA (user requested)...');
          const { brandDNAContext, adLibraryContext } = await getFullBrandContext();
          brandContext = brandDNAContext + adLibraryContext;
          if (brandContext) console.log('[Studio] ✓ Full Brand DNA injected into Top Ads generation');
        } catch (e: any) {
          console.warn('[Studio] Brand DNA fetch failed (non-blocking):', e.message);
        }
      } else {
        console.log('[Studio] Top Ads mode: No full brand DNA (focus on score improvement)');
      }

      // Inject all intelligence contexts into the prompt builder
      const enrichedBody = {
        ...body,
        _memoryContext: memoryContext + performanceContext + brandContext,
        _competitorContext: competitorContext,
        _preferenceContext: preferenceContext,
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
        const hookText = brief.copywriting?.attentionGrabber || brief.copywriting?.hookText || '';
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
        
        rawImagePrompt = `Professional ad creative for Hola Prime prop trading firm. Premium dark fintech aesthetic.
${concept ? `Concept: ${concept}.` : ''}
${layout ? `Layout: ${layout}.` : ''}
Dimensions: ${dimensions}. Deep black background. White text. Neon green glow on prices. Blue pill-shaped CTA button.
${hierarchy ? `Visual hierarchy: ${hierarchy}.` : ''}
${keyVisuals ? `Key visual elements: ${keyVisuals}.` : ''}
Do NOT draw any "hola prime" logo or brand wordmark text — the real logo PNG is composited in post-processing. Leave the top-left corner completely clear. "#WeAreTraders" in white top-right.
Headline: "${headline}".
${hookText ? `Attention-grabbing first line: "${hookText}".` : ''}
${urgencyText ? `Urgency element: "${urgencyText}".` : ''}
${discountText ? `Discount: "${discountText}".` : ''}
${bullets ? `Benefit bullets: ${bullets}.` : 'Benefit bullets: 1-Step Process, 5% Profit Target, No Time Limits.'}
CTA button: "${cta}" in white text on blue pill-shaped button.
${trustText ? `Social proof: "${trustText}".` : ''}
Prices in oversized 3D metallic chrome treatment with neon glow. Fine print disclaimer at bottom in tiny gray text. Ultra-premium, mobile-first 9:16 vertical composition. No human faces, purely graphic design.`;
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
      const mHook = brief.copywriting?.attentionGrabber || brief.copywriting?.hookText || '';
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
        mBullets.forEach((b: any, i: number) => manifestLines.push(`  ${i + 1}. "${b}"`));
      }
      if (mCta) manifestLines.push(`CTA BUTTON: "${mCta}"`);
      if (mTrust) manifestLines.push(`TRUST LINE: "${mTrust}"`);

      // Detect prices/numbers in the brief to prevent rendering errors (e.g. $23 → $223)
      const allBriefText = [mHeadline, mHook, mUrgency, mDiscount, mCta].join(' ');
      const priceMatches = allBriefText.match(/\$\d+(?:\.\d{1,2})?/g) || [];
      const criticalNumbers = [...new Set(priceMatches)].slice(0, 3);
      const numberLock = criticalNumbers.length > 0
        ? `\nCRITICAL NUMBER ACCURACY:\n${criticalNumbers.map(n => `  "${n}" — render EXACTLY these digits: ${n.replace('$', '')} (not ${n.replace('$', '')}0, not ${n.replace('$', '')}00, not 2${n.replace('$', '')}). Character by character: ${n.split('').join('-')}`).join('\n')}\nIf you cannot render the exact number, make it LARGER and more prominent to ensure correct reading.`
        : '';

      const textManifest = `=== MANDATORY BRANDING — LOCKED (APPEARS IN EVERY CREATIVE) ===
TOP-LEFT CORNER — RESERVED FOR LOGO (DO NOT DRAW):
  The HolaPrime logo is composited as a real PNG in post-processing.
  Do NOT draw, render, or write any "hola prime", "HolaPrime", "Hola Prime", or brand wordmark text in the image.
  Leave the top-left corner area COMPLETELY CLEAR — dark background only, no text, no graphics.

TOP-RIGHT CORNER — Hashtag Tagline:
  "#WeAreTraders" inside a thin oval/pill border shape, white text
  This is the ONLY place "We Are Traders" appears in the entire creative
=== END MANDATORY BRANDING ===

=== TEXT MANIFEST ===
The image must contain ONLY the text listed below PLUS the mandatory branding above.
${numberLock}
${manifestLines.join('\n')}
DISCLAIMER (tiny text, bottom edge): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

ABSOLUTE RULES:
1. Do NOT add urgency badges, countdown timers, "limited spots", or scarcity elements UNLESS listed above.
2. Do NOT add discount badges or "% OFF" elements UNLESS listed above.
3. Do NOT add trust badges or social proof numbers UNLESS listed above.
4. Do NOT render framework terminology as text — words like "DANGER", "RELIEF", "URGENCY", "ANCHOR" are instructions for you, NOT text to put in the image.
5. Spell every word exactly as written. "Withdrawals" "Challenge" "Fictitious" "Simulated" "Performance" "Monetary" "Accounts" — copy character by character.
6. Each bullet appears ONCE. Never duplicate into two columns.
7. "We Are Traders" and "#WeAreTraders" appear ONLY in the top-right pill badge. NEVER add it anywhere else in the creative.
=== END TEXT MANIFEST ===

`;

      // ── 3-VARIANT GENERATION — CONCEPT DIVERSITY (not just color variations) ──
      // Each variant uses a FUNDAMENTALLY DIFFERENT visual paradigm.
      // They share the same text content but look NOTHING alike.
      const pickedParadigms = pickDiverseParadigms(3);
      console.log(`[Studio] Picked paradigms: ${pickedParadigms.map(p => p.name).join(', ')}`);

      const variantConfigs = pickedParadigms.map((paradigm: ConceptParadigm) => ({
        id: paradigm.id,
        label: paradigm.name,
        description: paradigm.description,
        promptPrefix: `${paradigm.imageDirective}\n\nANTI-PATTERNS FOR THIS CONCEPT (things that would RUIN it):\n${paradigm.antiPatterns}\n\nDO NOT ADD any elements not present in the text manifest above. The paradigm changes HOW the content is presented, not WHAT content is shown.\n\n`,
      }));

      // ── BRAND VISUAL DIRECTIVES — Two tiers: Base (always) + Full DNA (on request) ──

      // BASE: Always applied — core Hola Prime look without the signature sphere
      const brandBaseDirective = `WORLD-CLASS AD CREATIVE — HOLA PRIME PROP TRADING

You are generating a PREMIUM advertisement for "Hola Prime", a professional prop trading firm that competes with the world's top fintech brands. This creative must look like it was produced by a top-tier creative agency with a $500K+ budget.

LOGO PLACEMENT — CRITICAL:
TOP-LEFT CORNER: RESERVED — Do NOT draw any logo, wordmark, "hola prime", "HolaPrime", or any brand text here. The authentic HolaPrime logo PNG is composited in post-processing. Leave this area COMPLETELY CLEAR with dark background only — no text, no graphics whatsoever.
TOP-RIGHT CORNER: "#WeAreTraders" in white text inside a thin oval/pill outline border.
"We Are Traders" appears ONLY as the "#WeAreTraders" pill in the top-right. NEVER duplicated anywhere else.

COLOR SYSTEM:
- Background: Rich deep black (#000000 to #080810) — absolutely never white or light
- Primary text: Pure white — crisp, sharp, high contrast
- Hero accent: Bright neon green or cyan for the price/key number — creates financial data terminal feel
- CTA button: Deep blue pill shape with white text — confident, clickable
- Optional accent: Purple or amber glow for supporting elements

PREMIUM VISUAL LANGUAGE — CHOOSE ONE HERO VISUAL:
The ad must feature ONE of these premium visual approaches (not memes, not clipart, not generic icons):
  A) DRAMATIC STUDIO PRODUCT SHOT: A sleek object (trading screen, phone with charts, metallic device) photographed with dramatic studio lighting — single overhead spotlight, deep shadows, reflective surface. Shot at f/1.4, shallow depth of field. Like an Apple product launch photo.
  B) CINEMATIC ENVIRONMENT: A dramatic architectural/environmental scene — a trader's war room with multiple glowing screens, a minimalist penthouse office at night, financial district skyline through floor-to-ceiling glass. Professional color graded (teal-orange film grade or blue-gold). No people required.
  C) BOLD GRAPHIC DESIGN: Pure typography and geometry — the price/offer rendered as a photorealistic 3D object with chrome, glass, or neon material. Set against deep space or gradient black. Like Spotify Wrapped or Apple Watch face designs.
  D) ABSTRACT PREMIUM VISUALIZATION: Trading data (candlestick charts, price graphs, flow lines) rendered as beautiful light art on black — glowing, flowing, cinematic. Like a Bloomberg data visualization made into fine art.

TYPOGRAPHY — NON-NEGOTIABLE:
- Headlines: Bold sans-serif, prominent, 30-40% of vertical canvas height
- Hero price/number: MAXIMUM SIZE with premium treatment (neon glow, chrome 3D, or glass morphism)
- Body text: Clean, readable, light weight — never cramped
- CTA text: Inside a bright blue rounded pill button — "Get Funded" or similar
- Legal disclaimer: Very small gray text at absolute bottom
- Only 2 font weights used: bold and regular
- Text size ratio hero:body = minimum 3:1

COMPOSITION RULES:
- 9:16 vertical format — mobile-first
- Generous breathing room: minimum 15% empty dark space around all content
- Maximum 5-6 elements total — discipline and restraint
- ONE dominant focal point — everything else is supporting cast
- Clean grid alignment — nothing randomly placed or floating off-grid
- All text fully visible within boundaries — nothing cut off
- Elements never overlap or crowd each other

QUALITY STANDARD:
This must look like it belongs in the Cannes Lions Grand Prix shortlist. If a senior art director at TBWA, Wieden+Kennedy, or Ogilvy would be proud of it, it passes.

`;

      // FULL BRAND DNA: Only when user explicitly requests brand DNA — adds the signature sphere + effects
      const brandFullDNADirective = `BRAND SIGNATURE ELEMENTS — ACTIVATED:

SIGNATURE VISUAL ELEMENT:
- A large, luminous iridescent sphere (blue-to-purple-to-pink gradient, like a soap bubble or glass orb)
- Positioned as a BACKGROUND element — it sits behind all text and content, never in front
- 35-50% opacity — translucent, light passes through it
- Occupies 40-60% of canvas width, positioned off-center (lower-left or lower-right quadrant)
- Its glow illuminates the dark background like a moon behind clouds
- NO hard edges — softly feathers into the black background

EFFECTS PACKAGE:
- Neon glow outlines around key prices and numbers (green or cyan inner glow)
- Price text rendered with 3D chrome/metallic material — reflects light
- Fine grain/noise texture on the background (film grain, adds depth and premium feel)
- Subtle floating light particles or dust in the dark space (very subtle, not cartoon-like)

`;

      // Detect if user wants full brand DNA — check prompt and additionalInstructions
      const userText = ((body.prompt || '') + ' ' + (body.additionalInstructions || '') + ' ' + (body.tone || '')).toLowerCase();
      const wantsBrandDNA = userText.includes('brand dna') || userText.includes('brand identity') || userText.includes('brand signature') || userText.includes('full brand') || userText.includes('add brand dna') || userText.includes('with brand dna') || userText.includes('use brand dna');

      // When brand DNA is NOT requested, explicitly block signature elements
      const noBrandDNADirective = `NO CIRCULAR BACKGROUND ELEMENTS:
Do not add any translucent spheres, orbs, circles, or glowing blobs in the background.
Background: pure deep black with optional subtle radial or linear gradient — clean and minimal.
Focus all creative energy on: the typography, the hero visual, and the composition.
This is a CLEAN VERSION — the brand power comes from typography and layout mastery, not decorative elements.

`;

      const brandVisualDirective = wantsBrandDNA
        ? brandBaseDirective + brandFullDNADirective
        : brandBaseDirective + noBrandDNADirective;

      console.log(`[Studio] Brand DNA mode: ${wantsBrandDNA ? 'FULL (with signature sphere)' : 'BASE (colors + layout only)'}`);


      console.log(`[Studio] Generating 3 creative variants in parallel...`);

      // ── CREATIVE DIRECTOR: Produce 3 concept-diverse image prompts ──
      let directorConcepts: any[] = [];
      try {
        console.log('[Studio] Running Creative Director for concept-diverse prompts...');
        const directorResult = await runCreativeDirector(brief, pickedParadigms, brandVisualDirective);
        if (directorResult && directorResult.concepts && directorResult.concepts.length >= 3) {
          directorConcepts = directorResult.concepts;
          console.log(`[Studio] ✓ Director produced ${directorConcepts.length} concept-diverse prompts (${directorConcepts.map((c: any) => c.paradigm).join(', ')})`);
        } else {
          console.warn(`[Studio] Director returned ${directorResult?.concepts?.length || 0} concepts, falling back to base prompt`);
        }
      } catch (e: any) {
        console.warn('[Studio] Director failed (non-blocking, using base prompt):', e.message);
      }

      const variantResults = await Promise.allSettled(
        variantConfigs.map(async (variant, idx) => {
          try {
            // Use Director's concept-specific prompt if available, otherwise fall back to paradigm prefix + base
            const conceptPrompt = directorConcepts[idx]?.imagePrompt;
            const useDirectorPrompt = conceptPrompt && conceptPrompt.length > 200;
            const variantPrompt = useDirectorPrompt
              ? brandVisualDirective + textManifest + conceptPrompt
              : brandVisualDirective + textManifest + variant.promptPrefix + basePrompt;
            // Premium quality image prompt with anti-cheap-design guardrails
            const premiumNegativePrompt = [
              baseNegative,
              // Typography errors
              'duplicate text', 'misspelled words', 'garbled disclaimer', 'text cutoff', 'unreadable text', 'text outside image bounds',
              // Cheap/amateur design
              'meme character', 'meme frog', 'Pepe the frog', 'cartoon character', 'clipart', 'emoji', 'stock photo', 'getty images watermark',
              'amateur design', 'cheap gradient', 'flat design without depth', 'pixelated', 'blurry', 'low resolution',
              'generic advertisement', 'cookie-cutter layout', 'template design', 'corporate clipart',
              // Layout problems
              'cluttered layout', 'overlapping elements', 'cramped composition', 'elements touching edges', 'elements cut off',
              'busy background', 'distracting background pattern', 'too many elements', 'information overload',
              // Technical exclusions
              'white background', 'light background', 'bright background', 'gray background',
              'countdown timer', 'excessive urgency badges', 'too many discount stickers', 'watermark',
              'human face', 'person', 'lifestyle photography with people',
              // Brand violations
              ...(wantsBrandDNA ? [] : ['translucent circle', 'iridescent sphere', 'glowing orb', 'circular background decoration']),
            ].join(', ');
            const result = await generateImage({
              detailed: variantPrompt,
              negative: premiumNegativePrompt,
              sourceCreativeUrls,
              referenceUrl: refUrl,
              technicalSpecs: brief.imageGenerationPrompt?.technicalSpecs,
            }, { tier: 'pro' });

            const finalImageUrl = result?.url || result?.dataUri || null;
            console.log(`[Studio] ✓ Variant "${variant.id}" generated (${useDirectorPrompt ? 'Director prompt' : 'paradigm prefix'})`);

            return {
              id: variant.id,
              label: directorConcepts[idx]?.paradigm || variant.label,
              description: directorConcepts[idx]?.visualApproach || variant.description,
              paradigm: directorConcepts[idx]?.paradigm || variant.label,
              imageUrl: finalImageUrl,
            };
          } catch (e: any) {
            console.warn(`[Studio] ✗ Variant "${variant.id}" failed:`, e.message);
            return {
              id: variant.id,
              label: directorConcepts[idx]?.paradigm || variant.label,
              description: variant.description,
              paradigm: directorConcepts[idx]?.paradigm || variant.label,
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

      // ── QUALITY SCORING: Claude Vision scores each variant ──
      let scoredVariants: any[] = variants;
      try {
        const scores = await scoreVariants(variants as any[], brief);
        scoredVariants = variants.map((v: any) => {
          const score = scores.get(v.id);
          return score ? { ...v, score } : v;
        });
        console.log(`[Studio] Scoring complete — ${scores.size} variants scored`);
      } catch (e: any) {
        console.warn('[Studio] Scoring failed (non-blocking):', e.message);
      }

      // ── IMAGE STORAGE: Upload to Cloudinary for permanent URLs ──
      const generationId = `gen-${Date.now()}`;
      try {
        scoredVariants = await uploadVariantImages(scoredVariants, generationId);
      } catch (e: any) {
        console.warn('[Studio] Image upload failed (non-blocking, keeping data URIs):', e.message);
      }

      // Use the highest-scoring variant as primary
      const primaryVariant = scoredVariants
        .filter((v: any) => v?.imageUrl)
        .sort((a: any, b: any) => (b.score?.overall || 0) - (a.score?.overall || 0))[0]
        || scoredVariants[0];

      // ── CREATIVE MEMORY: Save this generation ──
      try {
        await saveGeneration({
          generatedAt: new Date(),
          sourceAdIds: adIds,
          generationType: 'pattern-based',
          userPrompt: body.prompt || '',
          tone: body.tone || '',
          concept: brief.creativeConcept?.title || '',
          headline: brief.copywriting?.headline?.primary || '',
          cta: brief.copywriting?.cta?.primary || '',
          hookText: brief.copywriting?.attentionGrabber || brief.copywriting?.hookText || '',
          psychologyPrimary: brief.psychologyBlueprint?.primaryTrigger?.principle || '',
          psychologySecondary: brief.psychologyBlueprint?.secondaryTrigger?.principle || '',
          variants: scoredVariants.map((v: any) => ({
            id: v.id, label: v.label,
            score: v.score?.overall || null,
            textAccuracy: v.score?.textAccuracy || null,
            layoutQuality: v.score?.layoutQuality || null,
            psychologyScore: v.score?.psychologyScore || null,
            predictedCtr: v.score?.predictedCtr || null,
            strengths: v.score?.strengths || [],
            weaknesses: v.score?.weaknesses || [],
            verdict: v.score?.verdict || null,
          })),
          bestScore: primaryVariant?.score?.overall || 0,
          bestVariantId: primaryVariant?.id || '',
        });
      } catch (e: any) {
        console.warn('[Studio] Memory save failed (non-blocking):', e.message);
      }

      return NextResponse.json({
        creative: {
          ...brief,
          imageUrl: primaryVariant?.imageUrl || null,
          variants: scoredVariants,
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

      // ── BRAND DNA: Only inject full brand DNA if user explicitly requests it ──
      const customUserText = (userPrompt || '').toLowerCase();
      const customWantsBrandDNA = customUserText.includes('brand dna') || customUserText.includes('brand identity') || customUserText.includes('brand signature') || customUserText.includes('full brand') || customUserText.includes('add brand dna') || customUserText.includes('with brand dna') || customUserText.includes('use brand dna');

      let customBrandContext = '';
      if (customWantsBrandDNA) {
        try {
          const { brandDNAContext } = await getFullBrandContext();
          customBrandContext = brandDNAContext;
          if (customBrandContext) console.log('[Studio] ✓ Full Brand DNA injected into custom generation (user requested)');
        } catch (e: any) {
          console.warn('[Studio] Brand DNA fetch failed for custom (non-blocking):', e.message);
        }
      } else {
        console.log('[Studio] Custom mode: Base brand only (user did not request brand DNA)');
      }

      const noBrandDNARule = customWantsBrandDNA ? '' : `
## CRITICAL: NO BRAND SIGNATURE ELEMENTS
The user did NOT request brand DNA. Your imageGenerationPrompt MUST NOT include:
- Any translucent circles, iridescent spheres, orbs, bubbles, or glowing circular shapes
- Any "hola prime" logo text (the real logo will be overlaid separately in post-processing)
- Any "#WeAreTraders" text
Keep the background CLEAN — pure dark black with at most a subtle corner gradient. NO circular decorative elements whatsoever. Be INNOVATIVE with the design — use trading charts, geometric patterns, metallic textures, or abstract shapes instead.
`;

      userContent.push({
        type: 'text',
        text: `You are a world-class creative strategist specializing in prop trading firm advertising for Hola Prime.

BRAND: Hola Prime (#WeAreTraders). Product: funded trading challenges $2K\u2013$25K+. USPs: 1-step process, 5% profit target, no time limits, fast withdrawals (10 min), no activation fees, high profit splits.
DISCLAIMER (use verbatim): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."
${customBrandContext}${noBrandDNARule}
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
    "attentionGrabber": "Thumb-stop first line",
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

      // ── 3-VARIANT GENERATION for custom path — CONCEPT DIVERSITY ──
      const customParadigms = pickDiverseParadigms(3);
      console.log(`[Studio] Custom paradigms: ${customParadigms.map((p: ConceptParadigm) => p.name).join(', ')}`);

      const customVariants = customParadigms.map((paradigm: ConceptParadigm) => ({
        id: paradigm.id,
        label: paradigm.name,
        description: paradigm.description,
        prefix: `${paradigm.imageDirective}\n\nANTI-PATTERNS (avoid these — they would ruin this concept):\n${paradigm.antiPatterns}\n\nDO NOT ADD any elements not in the prompt. The paradigm changes HOW content is presented, not WHAT content is shown.\n\n`,
      }));

      // Build custom brand directive (same quality standard as main path)
      const customBrandBase = `WORLD-CLASS AD CREATIVE — HOLA PRIME PROP TRADING

PREMIUM ADVERTISEMENT: Generate a Cannes Lions-quality creative for "Hola Prime" prop trading firm.
Background: Rich deep black — never white or light.
TOP-LEFT: RESERVED for logo — do NOT draw any "hola prime", "HolaPrime", or brand wordmark text here. The real logo is composited as a PNG in post-processing. Keep this area completely clear with dark background only.
TOP-RIGHT: "#WeAreTraders" in white text inside a thin oval pill border. This is the only place "We Are Traders" appears.
Typography: Bold sans-serif headline (30-40% canvas height). Hero price/number OVERSIZED with neon glow or chrome 3D. Blue pill CTA button. Tiny gray disclaimer at bottom.
Composition: 9:16 vertical. Generous 15%+ dark breathing room. Max 5-6 elements. ONE dominant focal point. Clean grid alignment. Nothing cut off. Nothing overlapping.
Hero visual: Choose ONE premium approach — (A) dramatic studio product shot of trading tech with deep shadows; (B) cinematic financial environment (trading room, city skyline); (C) bold 3D typography with chrome/glass material; (D) abstract trading data visualization as light art.
Quality: Must look like a $500K agency production. Cannes Lions standard.
`;

      const customBrandFull = customWantsBrandDNA ? `BRAND SIGNATURE ELEMENTS:
Do NOT draw any "hola prime" logo text — the real logo PNG is composited in post-processing. Leave top-left CLEAR. "#WeAreTraders" white TOP-RIGHT.
Signature sphere: large iridescent orb (blue-purple-pink gradient, 35-50% opacity) as background glow element, positioned off-center, softly feathering into black background. Never in front of text.
Neon glow outlines on prices and key numbers. 3D chrome/metallic material on price text. Subtle film grain texture on background.
` : `CLEAN VERSION (no decorative spheres or orbs):
No translucent circles, spheres, or circular background elements. Background: pure deep black with optional subtle radial gradient only.
All creative power comes from typography mastery, the premium hero visual, and compositional excellence.
`;

      const customBrandPrefix = customBrandBase + customBrandFull;

      console.log(`[Studio] Generating 3 custom creative variants in parallel... (Brand DNA: ${customWantsBrandDNA ? 'FULL' : 'BASE'})`);

      // ── CREATIVE DIRECTOR for Custom path ──
      let customDirectorConcepts: any[] = [];
      try {
        console.log('[Studio] Running Creative Director for custom concept-diverse prompts...');
        const customDirectorResult = await runCreativeDirector(brief, customParadigms, customBrandPrefix);
        if (customDirectorResult && customDirectorResult.concepts && customDirectorResult.concepts.length >= 3) {
          customDirectorConcepts = customDirectorResult.concepts;
          console.log(`[Studio] ✓ Custom Director produced ${customDirectorConcepts.length} concepts (${customDirectorConcepts.map((c: any) => c.paradigm).join(', ')})`);
        }
      } catch (e: any) {
        console.warn('[Studio] Custom Director failed (non-blocking):', e.message);
      }

      const customResults = await Promise.allSettled(
        customVariants.map(async (variant, idx) => {
          try {
            const conceptPrompt = customDirectorConcepts[idx]?.imagePrompt;
            const useDirectorPrompt = conceptPrompt && conceptPrompt.length > 200;
            const variantPrompt = useDirectorPrompt
              ? customBrandPrefix + conceptPrompt
              : customBrandPrefix + variant.prefix + baseImagePrompt;
            const customPremiumNeg = [
              baseNeg,
              'duplicate text', 'misspelled words', 'garbled disclaimer', 'text cutoff', 'unreadable text',
              'meme character', 'meme frog', 'Pepe the frog', 'cartoon character', 'clipart', 'emoji',
              'stock photo', 'getty images watermark', 'amateur design', 'cheap gradient',
              'flat design without depth', 'pixelated', 'blurry', 'low resolution',
              'generic advertisement', 'cookie-cutter layout', 'template design', 'corporate clipart',
              'cluttered layout', 'overlapping elements', 'cramped composition', 'elements touching edges',
              'elements cut off', 'busy background', 'white background', 'light background', 'bright background',
              'countdown timer', 'excessive urgency badges', 'watermark', 'human face',
              ...(customWantsBrandDNA ? [] : ['translucent circle', 'iridescent sphere', 'glowing orb', 'circular background decoration']),
            ].join(', ');
            const result = await generateImage({
              detailed: variantPrompt,
              referenceUrl: reference || undefined,
              negative: customPremiumNeg,
              technicalSpecs: brief?.imageGenerationPrompt?.technicalSpecs,
            }, { tier: 'pro' });


            const finalImageUrl = result?.url || result?.dataUri || null;
            console.log(`[Studio] ✓ Custom variant "${variant.id}" generated (${useDirectorPrompt ? 'Director' : 'paradigm'})`);

            return {
              id: variant.id,
              label: customDirectorConcepts[idx]?.paradigm || variant.label,
              description: customDirectorConcepts[idx]?.visualApproach || variant.description,
              paradigm: customDirectorConcepts[idx]?.paradigm || variant.label,
              imageUrl: result?.url || result?.dataUri || null,
            };
          } catch (e: any) {
            console.warn(`[Studio] ✗ Custom variant "${variant.id}" failed:`, e.message);
            return { id: variant.id, label: variant.label, description: variant.description, paradigm: variant.label, imageUrl: null, error: e.message };
          }
        })
      );

      const variants = customResults.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);

      // ── QUALITY SCORING ──
      let scoredVariants: any[] = variants as any[];
      try {
        const scores = await scoreVariants(variants as any[], brief);
        scoredVariants = variants.map((v: any) => {
          const score = scores.get(v.id);
          return score ? { ...v, score } : v;
        });
      } catch (e: any) {
        console.warn('[Studio] Custom scoring failed (non-blocking):', e.message);
      }

      // ── IMAGE STORAGE: Upload to Cloudinary ──
      const customGenId = `custom-${Date.now()}`;
      try {
        scoredVariants = await uploadVariantImages(scoredVariants, customGenId);
      } catch (e: any) {
        console.warn('[Studio] Custom image upload failed (non-blocking):', e.message);
      }

      const primaryVariant = scoredVariants
        .filter((v: any) => v?.imageUrl)
        .sort((a: any, b: any) => (b.score?.overall || 0) - (a.score?.overall || 0))[0]
        || scoredVariants[0];

      // ── CREATIVE MEMORY: Save ──
      try {
        await saveGeneration({
          generatedAt: new Date(),
          sourceAdIds: [],
          generationType: 'custom',
          userPrompt: userPrompt || '',
          tone: body.tone || '',
          concept: brief.creativeConcept?.title || '',
          headline: brief.copywriting?.headline?.primary || '',
          cta: brief.copywriting?.cta?.primary || '',
          hookText: brief.copywriting?.attentionGrabber || brief.copywriting?.hookText || '',
          psychologyPrimary: brief.psychologyBlueprint?.primaryTrigger?.principle || '',
          psychologySecondary: brief.psychologyBlueprint?.secondaryTrigger?.principle || '',
          variants: scoredVariants.map((v: any) => ({
            id: v.id, label: v.label,
            score: v.score?.overall || null,
            textAccuracy: v.score?.textAccuracy || null,
            layoutQuality: v.score?.layoutQuality || null,
            psychologyScore: v.score?.psychologyScore || null,
            predictedCtr: v.score?.predictedCtr || null,
            strengths: v.score?.strengths || [],
            weaknesses: v.score?.weaknesses || [],
            verdict: v.score?.verdict || null,
          })),
          bestScore: primaryVariant?.score?.overall || 0,
          bestVariantId: primaryVariant?.id || '',
        });
      } catch (e: any) {
        console.warn('[Studio] Custom memory save failed (non-blocking):', e.message);
      }

      return NextResponse.json({
        creative: {
          ...brief,
          imageUrl: primaryVariant?.imageUrl || reference || null,
          variants: scoredVariants,
        }
      });
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
      
      console.log(`[Studio] Starting agentic pipeline (max ${maxRetries || 2} retries, min score ${minScore || MIN_SCORE_THRESHOLD})...`);
      const agentResult = await runAgenticPipeline(
        agentPrompt,
        agentBrief || {},
        agentRef,
        { maxRetries, minScore: minScore || MIN_SCORE_THRESHOLD }
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

    // ── SAVE TO VAULT (SAVED CREATIVE) ──
    if (type === 'save-creative') {
      const { creativeId, parentId, childId, tab, prompt: historyPrompt, generationOptions: histOpts, result: histResult, imageUrl: histImageUrl, previousInputs } = body;
      if (!creativeId) {
        return NextResponse.json({ error: 'creativeId is required' }, { status: 400 });
      }
      
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
      const savedCollection = db.collection('saved_creative');
      
      const headline = histResult?.copywriting?.headline?.primary || histResult?.creativeConcept?.title || '';
      const score = histResult?.creativeConcept?.targetScore || histResult?.targetScore || null;
      
      await savedCollection.updateOne(
        { creativeId },
        {
          $set: {
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
            savedAt: new Date(),
          }
        },
        { upsert: true }
      );
      
      console.log(`[Vault] Creative ${creativeId} saved/updated in saved_creative collection`);
      return NextResponse.json({ success: true, creativeId });
    }

    return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });

  } catch (err: any) {
    console.error('Studio API POST Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}