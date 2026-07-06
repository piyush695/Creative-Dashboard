import { NextResponse } from 'next/server';
import clientPromise from '@/server/mongodb-client';
import Anthropic from '@anthropic-ai/sdk';
import { extractWinningPatterns, filterPatternsBySelection } from '@/server/ai-studio/patterns';
import { buildGenerationPrompt } from '@/server/ai-studio/prompts';
import { extractAndRepairJson } from '@/server/ai-studio/parser';
import { generateImage } from '@/server/ai-studio/imagegen';
import { scoreVariants } from '@/server/ai-studio/scorer';
import { saveGeneration, buildMemoryContext } from '@/server/ai-studio/memory';
import { analyzeCompetitorAd, buildCompetitorContext } from '@/server/ai-studio/competitor';
import { uploadVariantImages, uploadToCloudinary } from '@/server/ai-studio/storage';
import { buildRefinement } from '@/server/ai-studio/refine';
import { listTemplates, saveTemplate, getTemplate, updateTemplateStats, deleteTemplate, seedDefaultTemplates, autoCreateTemplate } from '@/server/ai-studio/templates';
import { linkPerformance, buildPerformanceInsights } from '@/server/ai-studio/performance';
import { runAgenticPipeline } from '@/server/ai-studio/agent';
import { pickDiverseParadigms, type ConceptParadigm } from '@/server/ai-studio/brand';
import { runCreativeDirector } from '@/server/ai-studio/director';
// text-overlay RE-ENABLED — image model generates visual base only, all text composited
// in code with real fonts. Eliminates Gemini/OpenAI text rendering errors entirely.
import { applyTextOverlay, extractOverlayConfig } from '@/server/ai-studio/text-overlay';
import { generateCrossPlatform, getAvailablePlatforms } from '@/server/ai-studio/crossplatform';
import { generateImageOpenAI, editImageOpenAI, getLastOpenAIError } from '@/server/ai-studio/imagegen-openai';
import { buildDocContext } from '@/server/ai-studio/doc-extract';
import { generateForAllPersonas, getAvailablePersonas } from '@/server/ai-studio/personas';
// Cache module available but not used in main generation flows (generation must always be fresh)
// import { getCached, setCache } from '@/server/ai-studio/cache';
import { recordFeedback, buildPreferenceContext, getPreferenceSummary } from '@/server/ai-studio/preferences';
import { getFullBrandContext } from '@/server/ai-studio/adlibrary';
import { getStoredAdContext } from '@/server/ai-studio/ad-library-db';
import { enhanceImagePrompt } from '@/server/ai-studio/prompt-enhancer';
import { buildBrandKnowledgeContext, getBrandLogo } from '@/server/ai-studio/brand-knowledge';
import { applyBrandLogoOverlay, applyLogoOverlay } from '@/server/ai-studio/logo-overlay';
import { classifyPromptEngine } from '@/server/ai-studio/engine-router';
import { generateTemplateVariations } from '@/server/ai-studio/template-pipeline';
import { gateOverlayCopy, gateBriefCopy, gateImagePrompt, formatViolations, FIXED_DISCLAIMER, extractClaimTokens, APPROVED_BRAND_FACTS, activeOfferTexts } from '@/server/ai-studio/claim-gate';
import { verifyCreative, verifierEnabled } from '@/server/ai-studio/creative-verifier';
import { requireSession } from '@/server/api-auth';

// ─── Text fidelity helpers — used to combat Gemini text-rendering errors ───
// Gemini's image model frequently introduces character doubling ("sstep"),
// truncation, or substitution in rendered text. These helpers build a brutally
// explicit per-string spelling directive that we append to every image prompt.

function spellCharByChar(s: string): string {
  // "$25K" -> "[$]-[2]-[5]-[K]"
  return s
    .split('')
    .map((ch) => (ch === ' ' ? '[space]' : `[${ch}]`))
    .join('-');
}

function buildTextFidelityBlock(texts: Array<{ label: string; value: string }>): string {
  const populated = texts.filter((t) => t.value && t.value.trim().length > 0);
  if (populated.length === 0) return '';

  const lines = populated.map((t) => {
    const v = t.value.trim();
    return `  - ${t.label}: "${v}"\n    Letter by letter: ${spellCharByChar(v)}\n    Render EXACTLY these ${v.length} characters in this exact order. No doubled letters. No missing letters. No substitutions.`;
  });

  return `\n=== TEXT FIDELITY GUARANTEE (CRITICAL — read 3 times before rendering) ===\nEvery text element below MUST appear in the image EXACTLY as spelled, character for character. Gemini frequently doubles letters ("step" -> "sstep") or drops them — DO NOT do this. Verify each rendered word matches the source string letter for letter.\n\n${lines.join('\n\n')}\n\nFORBIDDEN RENDERING PATTERNS (these are common errors — never produce them):\n  - Doubled letters at start of words ("sstep", "Cchallenge", "wWithdrawals")\n  - Missing letters ("Challnge", "Withdrawls", "Fictious")\n  - Substituted similar characters ("0" for "O", "1" for "I", "%" for "$")\n  - Concatenated words ("3-step" -> "3step")\n  - Made-up similar-looking text ("Profit" -> "Pofit")\n\nAfter rendering, mentally re-read every word. If any word is misspelled, the brief has FAILED.\n=== END TEXT FIDELITY GUARANTEE ===\n\n`;
}

// ─── Premium craft directive — appended to every variant prompt ───
// This is the quality ceiling reminder. Gemini defaults to "fine" — this pushes
// it toward "agency-grade" by anchoring on specific real-world references.

const PREMIUM_CRAFT_DIRECTIVE = `\n=== PREMIUM CRAFT BAR ===\nThis ad must look like work from a top-tier agency (Wieden+Kennedy, Apple in-house, Linear / Stripe brand team). Not "AI-generated 2024". Concretely:\n\n- Typography: Sharp Inter/Helvetica-grade sans-serif. Hero number at 30-40% canvas height. Body text at 14-18pt equivalent. NEVER cramped, NEVER overlapping.\n- Composition: Strong center axis OR deliberate asymmetry — never "just placed it somewhere". 15-20% breathing room on all sides.\n- Single dominant focal point. Everything else SUPPORTS, not competes.\n- Materials: When using 3D — chrome should look like real chrome (high contrast, accurate reflections). When using glow — should be subtle volumetric light, not flat gradient.\n- Color: Restrained 3-4 color palette. Black background + ONE accent color (cyan, neon green, blue, or amber). Avoid rainbow gradients.\n- Detail: Subtle texture/grain on dark backgrounds for premium depth. Crisp edges on text. No fuzzy mid-tones.\n- What this is NOT: a stock-photo collage, a generic corporate template, a "modern" SaaS landing page screenshot, a Canva-tier composition.\n\nReference quality: A real ad you'd see in Times Square, in Bloomberg's print edition, or in a top fintech brand campaign. If a Times Square pedestrian would barely glance at the rendered output, the brief has FAILED.\n=== END PREMIUM CRAFT BAR ===\n\n`;

// ─── TEXT OVERLAY MODE ───
// When true: image model generates VISUAL ONLY (no text). All text is composited
// in code via lib/ai-studio/text-overlay.ts using SVG + sharp + real fonts. This
// completely eliminates the text-rendering errors that image models produce
// ("acont size", "sstep", "WITHRAWN", garbled multi-line disclaimers).
//
// The image model's job becomes pure visual generation: backgrounds, hero objects,
// lighting, atmosphere, composition. Whatever it's actually good at.
//
// Toggle via env var TEXT_OVERLAY=off to revert to inline-text generation.
const TEXT_OVERLAY_ENABLED = process.env.TEXT_OVERLAY !== 'off';

// Directive replaces the text manifest when overlay mode is on. Tells the image
// model emphatically to leave room for text we'll composite later — no actual
// text rendering in the image itself.
const VISUAL_ONLY_DIRECTIVE = `\n=== VISUAL-ONLY MODE ===\nThis image will have ALL TEXT composited on top in post-processing using real fonts. Your job is to generate the VISUAL BASE only.\n\nABSOLUTE RULES:\n1. DO NOT RENDER ANY READABLE TEXT in the image. No headlines, no prices, no body copy, no CTA buttons with text, no #WeAreTraders, no disclaimer.\n2. Generate the visual atmosphere: lighting, materials, mood, hero objects (phones, terminals, receipts, charts, abstract shapes, etc.), background gradients, particle effects.\n3. LEAVE NEGATIVE SPACE for text to be added later. Specifically:\n   - Top 10% of canvas: clear (logo + tagline will be composited here)\n   - Middle ~45-65% of canvas: hero visual area — this is where your image content lives\n   - Bottom 30%: clear (headline, body, CTA, disclaimer composited here)\n4. If the concept involves a text-bearing object (phone notification, receipt, terminal screen, document), render it with ZERO letterforms visible — heavily out of focus, extreme angle, motion blur, or abstracted to pure light and shape. NO fake numbers, NO placeholder text, NO "lorem ipsum", NO blurred-but-recognizable words: filler text ALWAYS renders as garbled junk in the final ad and is FORBIDDEN. A glowing out-of-focus screen says "payout" better than fake digits.\n5. When in doubt, replace any text surface with abstract glow, bokeh, or clean geometry.\n\nThink of this as generating a "magazine ad background plate" — the visual, lit, beautiful base. Text comes in post.\n=== END VISUAL-ONLY MODE ===\n\n`;


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
  'claude-sonnet-4-6',      // Primary — fast + high quality
  'claude-haiku-4-5-20251001',     // Fallback — fastest
];

// System prompt enforces strict JSON output — prevents markdown wrapping and preamble
const STUDIO_SYSTEM_PROMPT = `You are CARLA — the head of creative at one of the world's top fintech-focused advertising agencies. You have shipped award-winning campaigns for Robinhood, Stripe, Wise, and three of the top five global prop trading firms. Cannes Lions on the shelf, a Wieden+Kennedy decade behind you. You think in terms of psychological triggers, cultural moments, and category-defining ideas — never in terms of "ad templates."

# YOUR ROLE — three jobs at once

1) WORLD-CLASS CREATIVE DIRECTOR
You refuse to ship anything mediocre. Every brief is an opportunity to define what the category looks like NEXT — never to recycle what's already been done. You have an instinct for the line between "interesting" and "trying too hard," and you stay on the right side of it.

2) LIVE MARKET INTELLIGENCE ANALYST
You constantly study what's working in the prop-trading and fintech ad space RIGHT NOW. You know which competitors are running which campaigns, which ad formats are breaking through this quarter, which copy angles have died of overuse, and which cultural moments are leverageable. You read every brief through that lens.

3) SYNTHESIS EXPERT
You take stored ad library patterns + current 2026 market trends + the user's brief and synthesize ONE breakthrough idea — never a recombination of what already exists in the reference set. The references show you the QUALITY BAR; they do not show you the IDEA.

# YOUR PROCESS — apply this order, every time

STEP 1 — ANALYZE
- Read the user brief literally. What objective?
- Examine the stored ad library context. What's already working? Where's the gap?
- Identify the dominant pattern in the reference set so you can BREAK it intelligently.

STEP 2 — IDENTIFY THE MOMENT
Pick ONE cultural / market / format leverage point. Examples for prop-trading mid-2026:
- MyForexFunds collapse aftermath + trader trust deficit
- India F&O regulatory changes pushing retail toward prop firms
- Receipt-aesthetic / brutalism / anti-design trends in financial advertising
- Specific competitor weakness (consistency rules, slow payouts, hidden fees)
- A named pain point that traders complain about on X / Reddit / Discord

STEP 3 — GENERATE ONE BREAKTHROUGH CONCEPT
- The headline does ONE thing: stops thumbs and makes someone whisper "huh."
- The visual treats the hero number/offer as THE focal point — 30-40% canvas height, never decorative.
- The CTA is a FIXED brand term: "Buy Challenge" (English) or "Compra el Challenge" (Spanish). Never invented. Never renamed.
- Specificity beats vagueness every time. "Average payout time: 7 minutes 13 seconds" beats "Fast payouts" by an order of magnitude.

STEP 4 — PRESSURE-TEST
Run the concept through three filters before finalizing:
- ORIGINALITY: Would this run at Cannes, or is it just another prop-firm ad?
- EXECUTION: Can the image generator render this without text errors? Is the layout precise enough for Gemini to nail?
- BRAND FIT: Does it feel native to Hola Prime's reference set OR break new ground that still feels on-brand?

If any filter fails, regenerate the concept. Do not ship work that fails any of these.

# YOUR INTELLIGENCE SOURCES

You MUST consult these for every brief — they are part of your context window:

- STORED AD LIBRARY: pattern aggregations from Hola Prime's best ads + competitor ads. Study what they share. Study what makes top performers distinct from the rest. Never copy any specific element — synthesize.
- USER BRIEF: the exact request. Deliver the SPIRIT of what they ask for, even if you must translate vague language into concrete craft decisions.
- 2026 MARKET CONTEXT: the trend hooks listed in the brief context block are current. Use them. Don't recycle 2022 cliches.

# YOUR FORBIDDEN OUTPUTS

You refuse to produce:
- Generic "AI-powered" / "Revolutionary" / "Next-gen" / "Cutting-edge" / "Unlock your potential" copy. These mark amateur work.
- Concept titles or headlines using "Algorithm" (even if the user mentions AI — translate the intent, don't echo the dead word).
- Template ads: hero text + 3 bullets + CTA at the bottom — unless the brief explicitly demands it.
- Visuals that look like Canva work, 2022 startup landing pages, or AI-generated stock-photo collages.
- Anything where the hero number is smaller than the headline. The number IS the headline.
- Three variants that look identical with different colors.
- CTAs other than "Buy Challenge" / "Compra el Challenge."

# YOUR OUTPUT FORMAT

You always respond with raw JSON. NO markdown, NO code fences, NO preamble, NO explanation outside the JSON. Every string properly escaped. Response is always complete and valid. If you would need more tokens than allotted, prioritize the imageGenerationPrompt.detailed field — that is the single most important output.

# YOUR STANDARD

If a senior art director at Wieden+Kennedy, BBH, or Mother walked by your screen and saw the creative, they would either:
(a) Stop and study it because it's genuinely interesting, OR
(b) Walk past without a glance.

You ship only (a). If you're producing (b), you start over.`;

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

    // ── STUDIO INPUT DATA: reference image(s) attached in a conversation ──
    // (mate's chat UI) Returns the most recent turn's reference images so the
    // composer can restore the uploaded reference when a chat is reopened.
    if (action === 'input-data') {
      const conversationId = searchParams.get('conversationId');
      if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
      const inputCollection = db.collection('studio_input_data');
      const rows = await inputCollection
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .project({ _id: 0, creativeId: 1, prompt: 1, referenceImages: 1, createdAt: 1 })
        .toArray();
      const latestWithRefs = rows.find(
        (r: any) => Array.isArray(r.referenceImages) && r.referenceImages.length > 0
      );
      return NextResponse.json({ referenceImages: latestWithRefs?.referenceImages || [], rows });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Studio API GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Mutating + credit-burning endpoint — verified session required (middleware
  // only checks cookie presence; this verifies it).
  const unauth = await requireSession();
  if (unauth) return unauth;
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
        autoCreateTemplate(body.brief, variantMeta.score, variantMeta?.label || variantId).catch(() => { });
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

      // ── STORED AD LIBRARY: Patterns from synced Meta Ad Library ──
      // If the user has run /api/adlibrary?action=sync-all, this injects
      // aggregated insights from top-performing real ads (own + competitor).
      let storedAdContext = '';
      let storedAdImageUrls: string[] = [];
      // A/B-testable: when body.useStoredAds === false, skip references entirely
      // so we can measure whether the library is helping or constraining output.
      const useStoredAds = body.useStoredAds !== false;
      if (useStoredAds) {
        try {
          const stored = await getStoredAdContext({ limit: 12 });
          storedAdContext = stored.context;
          storedAdImageUrls = stored.sourceImageUrls;
          if (storedAdContext) {
            console.log(`[Studio] Injecting stored-ad patterns from ${stored.sourceAds.length} ads (${storedAdImageUrls.length} reference images)`);
          }
        } catch (e: any) {
          console.warn('[Studio] Stored ad context fetch failed (non-blocking):', e.message);
        }
      } else {
        console.log('[Studio] useStoredAds=false — skipping reference library injection (A/B test)');
      }

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

      // Inject all intelligence contexts into the prompt builder.
      // Stored ad context goes at the end so it can override stale memory/
      // performance signals with fresh real-world ad patterns.
      // ── BRAND KNOWLEDGE BASE (Settings → Brand Kit) — always injected ──
      let patternBrandKb = '';
      try {
        patternBrandKb = await buildBrandKnowledgeContext();
        if (patternBrandKb) console.log('[Studio] Top Ads mode: brand knowledge base injected');
      } catch (e: any) {
        console.warn('[Studio] Brand knowledge fetch failed (non-blocking):', e.message);
      }

      const enrichedBody = {
        ...body,
        _memoryContext: memoryContext + performanceContext + brandContext + storedAdContext + patternBrandKb,
        _competitorContext: competitorContext,
        _preferenceContext: preferenceContext,
        _storedAdImageUrls: storedAdImageUrls,
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

      // ── COMPLIANCE GATE (pre-prompt): clean the brief's copywriting BEFORE it
      //    feeds the text manifest / image prompt / overlay / UI copy — so
      //    integrated mode can never hand the image model an unsourced claim to
      //    bake into pixels. ──
      {
        const g = gateBriefCopy(brief, userPrompt || '');
        brief = g.brief;
        if (g.violations.length) console.warn(`[ClaimGate] pattern-based brief: stripped — ${formatViolations(g.violations)}`);
      }

      // --- Pass source creative thumbnails as reference for visual-grounded generation ---
      // Combine user-selected source creative thumbnails with the top stored
      // ads from the synced Meta Ad Library. The image generator uses these
      // as visual references for grounded output.
      const sourceCreativeUrls = [
        ...patterns.sourceCreatives.map((c: any) => c.thumbnailUrl),
        ...storedAdImageUrls,
      ].filter(Boolean) as string[];

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
        const colorPrimary = brief.visualDesign?.colorPalette?.primary || 'deep navy';
        const colorSecondary = brief.visualDesign?.colorPalette?.secondary || 'electric blue';
        const colorAccent = brief.visualDesign?.colorPalette?.accent || 'gold';
        const keyVisuals = (brief.visualDesign?.keyVisualElements || []).slice(0, 6).join(', ');
        const hierarchy = brief.visualDesign?.typography?.hierarchy || '';
        const concept = brief.creativeConcept?.title || '';
        const bullets = (brief.copywriting?.benefitBullets || []).join(', ');

        rawImagePrompt = `Professional ad creative for Hola Prime prop trading firm. Premium fintech aesthetic.
${concept ? `Concept: ${concept}.` : ''}
${layout ? `Layout: ${layout}.` : ''}
Dimensions: ${dimensions}. Background color: ${colorPrimary}. Text: high contrast against background. Neon green glow on prices. Blue pill-shaped CTA button.
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

      const recommendations = (patterns.optimizationSynthesis?.recommendations || []).join('; ');

      const directives = [
        body.prompt && `Target Audience / User Explicit Requirement: ${body.prompt}`,
        body.additionalInstructions && `Additional Instructions: ${body.additionalInstructions}`,
        keepElements && `Keep: ${keepElements}`,
        changeElements && `Change: ${changeElements}`,
        addElements && `Add: ${addElements}`,
        recommendations && `Incorporate Strategic Growth Recommendations: ${recommendations}`,
        body.tone && `Tone Override: ${body.tone}`,
      ].filter(Boolean).join('. ');

      const basePrompt = rawImagePrompt + (directives ? `\n\nImprovements: ${directives}` : '');
      const baseNegative = brief.imageGenerationPrompt?.negative || 'generic stock photos, white backgrounds, cluttered, blurry, low quality, typos, misspellings';
      const refUrl = body.reference || patterns.bestCreative?.thumbnailUrl || sourceCreativeUrls[0] || undefined;

      // Extract ONLY the text Claude's brief actually generated from the user's prompt.
      // If a field is empty, it means the user/source didn't ask for it — DO NOT default.
      const mHeadline = brief.copywriting?.headline?.primary || '';
      const mBody = brief.copywriting?.body?.primary || '';
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
      if (mBody) manifestLines.push(`BODY COPY: "${mBody}"`);
      if (mUrgency) manifestLines.push(`URGENCY ELEMENT: "${mUrgency}"`);
      if (mDiscount) manifestLines.push(`DISCOUNT BADGE: "${mDiscount}"`);
      if (mBullets.length > 0) {
        manifestLines.push(`BENEFIT BULLETS (each appears EXACTLY ONCE):`);
        mBullets.forEach((b: any, i: number) => manifestLines.push(`  ${i + 1}. "${b}"`));
      }
      if (mCta) manifestLines.push(`CTA BUTTON: "${mCta}"`);
      if (mTrust) manifestLines.push(`TRUST LINE: "${mTrust}"`);

      // Detect prices/numbers in the brief to prevent rendering errors (e.g. $23 → $223)
      const allBriefText = [mHeadline, mBody, mHook, mUrgency, mDiscount, mCta].join(' ');
      const priceMatches = allBriefText.match(/\$\d+(?:\.\d{1,2})?/g) || [];
      const criticalNumbers = [...new Set(priceMatches)].slice(0, 3);
      const numberLock = criticalNumbers.length > 0
        ? `\nCRITICAL NUMBER & PRICE ACCURACY:\n${criticalNumbers.map(n => `  "${n}" — render EXACTLY these digits: ${n.replace('$', '')} (not 2${n.replace('$', '')}, not ${n.replace('$', '')}0). Character by character: ${n.split('').join('-')}`).join('\n')}\nIf a PRICE IS CROSSED OUT (strikethrough), render both the old and new prices with EXTREME CLARITY. No messy overlaps. Use a clean, sharp horizontal line for the strikethrough.`
        : '';

      const textManifest = `=== TEXT MANIFEST ===
The image must contain ONLY the text listed below PLUS the mandatory branding.
MANDATORY BRANDING:
- TOP-LEFT CORNER: Leave COMPLETELY CLEAR and EMPTY (0% text, 0% logos). The real logo is added in post-processing.
- TOP-RIGHT CORNER: "#WeAreTraders" in white pill badge exactly ONCE.
${numberLock}
${manifestLines.join('\n')}
DISCLAIMER (tiny text, bottom edge): "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

ABSOLUTE RULES:
1. Do NOT add urgency badges, countdown timers, "limited spots", or scarcity elements UNLESS listed above.
2. Do NOT add discount badges or "% OFF" elements UNLESS listed above.
3. Do NOT add trust badges or social proof numbers UNLESS listed above.
4. Do NOT render framework terminology as text — words like "DANGER", "RELIEF", "URGENCY", "ANCHOR" are instructions for you, NOT text to put in the image.
5. Spell every word exactly as written.
6. Each bullet appears ONCE. Never duplicate into two columns.
7. "#WeAreTraders" appears ONLY in the top-right pill badge exactly ONCE. NEVER add it anywhere else in the creative.
=== END TEXT MANIFEST ===

`;

      // Build the per-string text-fidelity block from every populated copy field
      const patternTextFidelity = buildTextFidelityBlock([
        { label: 'HEADLINE', value: mHeadline },
        { label: 'HOOK TEXT', value: mHook },
        { label: 'BODY COPY', value: mBody },
        { label: 'URGENCY ELEMENT', value: mUrgency },
        { label: 'DISCOUNT BADGE', value: mDiscount },
        { label: 'CTA BUTTON', value: mCta },
        { label: 'TRUST LINE', value: mTrust },
        ...mBullets.map((b: any, i: number) => ({ label: `BULLET ${i + 1}`, value: String(b) })),
      ]);


      // ── 3-VARIANT GENERATION — CONCEPT DIVERSITY (not just color variations) ──
      // Each variant uses a FUNDAMENTALLY DIFFERENT visual paradigm.
      // They share the same text content but look NOTHING alike.
      const variations = Math.max(1, Math.min(4, Math.round(Number(body.variations)) || 3));
      const pickedParadigms = pickDiverseParadigms(variations);
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

COLOR SYSTEM (STYLE-ADAPTIVE):
- DEFAULT Background: Rich deep black (#000000 to #080810) — premium fintech aesthetic
- If the user explicitly requests a light/white/bright theme, use clean white/off-white background with dark text instead
- Primary text: High contrast against background (white on dark, dark on light)
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

      // ── BUILD USER REQUIREMENTS DIRECTIVE for image gen ──
      // This ensures the user's prompt, tone, and instructions are injected DIRECTLY
      // into every image generation call — not just buried inside Claude's brief.
      const userRequirementsDirective = [
        body.prompt && `USER REQUIREMENT (HIGHEST PRIORITY): ${body.prompt}`,
        body.tone && `TONE/STYLE: ${body.tone}`,
        body.additionalInstructions && `ADDITIONAL INSTRUCTIONS: ${body.additionalInstructions}`,
      ].filter(Boolean).join('\n');
      const userRequirementsBlock = userRequirementsDirective
        ? `\n\n=== USER EXPLICIT REQUIREMENTS (MUST FOLLOW) ===\n${userRequirementsDirective}\nYou MUST incorporate these requirements into the visual design. They override any default assumptions.\n=== END USER REQUIREMENTS ===\n\n`
        : '';

      // ── CREATIVE DIRECTOR: Produce 3 concept-diverse image prompts ──
      let directorConcepts: any[] = [];
      try {
        console.log('[Studio] Running Creative Director for concept-diverse prompts...');
        const directorResult = await runCreativeDirector(brief, pickedParadigms, brandVisualDirective, body.prompt, body.tone);
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
            // When text-overlay mode is on, we ask the image model for VISUAL ONLY.
            // The text manifest + per-string fidelity block become irrelevant — text is
            // composited in code with real fonts after generation.
            let variantPrompt = TEXT_OVERLAY_ENABLED
              ? (useDirectorPrompt
                  ? brandVisualDirective + VISUAL_ONLY_DIRECTIVE + userRequirementsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
                  : brandVisualDirective + VISUAL_ONLY_DIRECTIVE + userRequirementsBlock + variant.promptPrefix + basePrompt + PREMIUM_CRAFT_DIRECTIVE)
              : (useDirectorPrompt
                  ? brandVisualDirective + textManifest + patternTextFidelity + userRequirementsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
                  : brandVisualDirective + textManifest + patternTextFidelity + userRequirementsBlock + variant.promptPrefix + basePrompt + PREMIUM_CRAFT_DIRECTIVE);
            // Integrated mode: text gets BAKED into pixels — the whole prompt goes
            // through the claim gate so the model never sees an unsourced claim.
            if (!TEXT_OVERLAY_ENABLED) {
              const gp = gateImagePrompt(variantPrompt, userPrompt || '');
              variantPrompt = gp.text;
              if (gp.violations.length) console.warn(`[ClaimGate] pattern baked-text prompt ("${variant.id}"): ${formatViolations(gp.violations)}`);
              console.warn('[Studio] ⚠ Integrated mode: baked text cannot be verified post-render. Claim gate applied pre-prompt.');
            }
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
            }, { tier: 'pro', skipLogo: TEXT_OVERLAY_ENABLED });

            let finalImageUrl = result?.url || result?.dataUri || null;

            // ── TEXT OVERLAY: composite all text with real fonts (eliminates typos) ──
            if (TEXT_OVERLAY_ENABLED && finalImageUrl) {
              try {
                // COMPLIANCE GATE: brief copy derives from the stored-ads DB — those
                // figures are HISTORICAL, not approved. A price that ran in June is
                // not a claim we may make today. Gate against the user's prompt +
                // evergreen facts + the active-offers config, same as every lane.
                const { overlay: overlayConfig, violations: ovV } = gateOverlayCopy(
                  extractOverlayConfig(brief, variant.id), userPrompt || '');
                if (ovV.length) console.warn(`[ClaimGate] pattern-based lane (variant "${variant.id}"): stripped — ${formatViolations(ovV)}`);
                finalImageUrl = await applyTextOverlay(finalImageUrl, overlayConfig);
                console.log(`[Studio] ✓ Variant "${variant.id}" — text overlay applied (zero-typo composition)`);
              } catch (overlayErr: any) {
                console.warn(`[Studio] Text overlay failed for variant "${variant.id}" (non-blocking):`, overlayErr.message);
              }
            }

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

      // --- Filter unacceptable quality variants (Score < 8) ---
      const qualityVariants = scoredVariants.filter((v: any) => v?.imageUrl && (v.score?.overall >= MIN_SCORE_THRESHOLD));

      // If none passed, take the highest scoring one anyway but log it, 
      // ensuring we at least show the user the best of the failed batch.
      const variantsToReturn = qualityVariants.length > 0 ? qualityVariants : scoredVariants;

      // Use the highest-scoring variant as primary
      const primaryVariant = variantsToReturn
        .filter((v: any) => v?.imageUrl)
        .sort((a: any, b: any) => (b.score?.overall || 0) - (a.score?.overall || 0))[0]
        || variantsToReturn[0];

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
          sourceAdIds: adIds,
          bakedTextWarning: !TEXT_OVERLAY_ENABLED || undefined,
        }
      });
    }

    if (type === 'custom' || type === 'image' || type === 'video') {
      // ── DOCUMENT CONTEXT (mate's chat UI): extract text from attached
      //    PDFs/DOCX/TXT/HTML and fold it into the prompt — image models can't
      //    read documents, this is what makes an attached brief "understood". ──
      let docContext = '';
      if (Array.isArray(body.docFiles) && body.docFiles.length > 0) {
        try {
          docContext = await buildDocContext(body.docFiles);
          if (docContext) console.log(`[Studio] Extracted text from ${body.docFiles.length} attached document(s) (${docContext.length} chars of context)`);
        } catch (e: any) {
          console.warn('[Studio] Document extraction failed (non-blocking):', e?.message);
        }
      }

      // ── REFERENCE IMAGES (mate's chat UI sends `references[]`; the older UI a
      //    single `reference`) — normalized here, used by the AI lane below. ──
      const refImagesIn: string[] = Array.isArray(body.references)
        ? body.references.filter((r: any) => typeof r === 'string' && r)
        : (typeof body.reference === 'string' && body.reference ? [body.reference] : []);

      // ── AUTO-ROUTER: Design Engine (procedural, zero-typo) vs AI Image ──
      // A deterministic classifier (server/ai-studio/engine-router) picks the lane.
      //   body.engine: 'auto' (default) | 'template' | 'ai'  — the last two are the
      //   UI's one-click manual override. A reference image always forces the AI lane
      //   (image-to-image). The decision + reason ride back on the response so the UI
      //   can show the chosen-engine chip, the ⚠ low-confidence flag, and the override.
      const engineParam: 'auto' | 'template' | 'ai' =
        body.engine === 'template' || body.engine === 'ai' ? body.engine : 'auto';
      const routeRefImage = refImagesIn.some((r) => r.startsWith('data:image')) || refImagesIn.some((r) => /^https?:\/\//.test(r));
      const routeDecision = classifyPromptEngine(userPrompt || '', engineParam === 'auto' ? undefined : engineParam);
      const routingPublic = {
        engine: routeRefImage ? 'ai' : routeDecision.engine,
        archetypeHint: routeDecision.archetypeHint,
        confidence: routeRefImage ? 0.95 : routeDecision.confidence,
        ambiguous: routeRefImage ? false : routeDecision.ambiguous,
        reason: routeRefImage
          ? 'A reference image is attached → AI Image (image-to-image).'
          : routeDecision.reason,
        overridable: !routeRefImage,
        forced: engineParam !== 'auto',
      };

      // ── DESIGN ENGINE LANE ── procedural render (template-pipeline). Falls through
      //    to the AI path below if it produces nothing / errors (graceful degradation).
      if (type === 'custom' && !routeRefImage && routingPublic.engine === 'template') {
        const rawTplPrompt = (userPrompt || '').trim();
        if (!rawTplPrompt) {
          return NextResponse.json({ error: 'Please enter a prompt to generate from.' }, { status: 400 });
        }
        const tplVariations = Math.max(1, Math.min(4, Math.round(Number(body.variations)) || 1));
        try {
          const { variants: tplVariants } = await generateTemplateVariations(rawTplPrompt, tplVariations);
          if (tplVariants.length) {
            for (const v of tplVariants) {
              try {
                const up = await uploadToCloudinary(v.imageUrl, { folder: 'creative-studio/template', publicId: `tpl-${Date.now()}-${v.id}` });
                if (up?.url) v.imageUrl = up.url;
              } catch { /* keep data URI */ }
            }
            const primaryT = tplVariants[0];
            console.log(`[Studio] ✓ Design Engine — ${tplVariants.length} variation(s); archetypes: ${tplVariants.map((v) => v.archetype).join(', ')}`);
            return NextResponse.json({
              creative: {
                creativeId: `tpl-${Date.now()}`,
                creativeConcept: {
                  title: primaryT.objective || 'Design-engine creative',
                  rationale: primaryT.rationale || 'Rendered on the on-brand design engine — procedural layout, real fonts, zero typos.',
                },
                copywriting: { headline: { primary: rawTplPrompt.slice(0, 80) }, cta: { primary: 'Buy Challenge' } },
                variants: tplVariants.map((v) => ({
                  id: v.id,
                  label: v.label,
                  description: `${v.archetype} · ${v.accent} · ${v.background}`,
                  paradigm: v.archetype,
                  archetype: v.archetype,
                  accent: v.accent,
                  imageUrl: v.imageUrl,
                  score: { overall: 9.0, content: 9, design: 9, color: 9, impact: 9 },
                  // Claims the compliance gate stripped (transparency; empty = fully sourced)
                  gated: v.gated,
                })),
                imageUrl: primaryT.imageUrl,
                provider: 'template-engine',
                model: 'hola-design-engine',
                directMode: true,
                engine: 'template',
                routing: routingPublic,
                variations: tplVariants.length,
              },
              saved: false,
            });
          }
          console.warn('[Studio] Design Engine produced no variants — falling back to AI image path.');
        } catch (tplErr: any) {
          console.error('[Studio] Design Engine failed, falling back to AI image path:', tplErr?.message);
        }
        // fall through to the AI path below on empty/error
      }

      // ── ENHANCED FAST MODE (Custom tab default) ──
      // The user's prompt — however short — is ALWAYS auto-expanded into a full,
      // brand-aware, agency-grade image brief (lib/ai-studio/prompt-enhancer.ts)
      // before it hits gpt-image-1. This is what makes a 3-word prompt produce a
      // top-tier prop-firm ad. The brand knowledge base (Settings → Brand Kit)
      // feeds voice/offers/colours into the expansion. A single fast generation
      // (no 3-variant pipeline). Logo is composited only when the "Add brand
      // logo" toggle is on (body.useLogo), pulling the uploaded logo from the KB.
      // Force this fast path (never the slow full pipeline) when an IMAGE
      // reference is attached, so reference edits always get the clean result —
      // even if the user left Fast mode off.
      const hasImageRef = refImagesIn.length > 0;
      if (type === 'custom' && (body.directMode === true || hasImageRef)) {
        let rawPrompt = (userPrompt || '').trim();
        // Attachment-only turns are valid (mate's chat UX): the image/document IS
        // the instruction — use a sensible default brief.
        if (!rawPrompt && !hasImageRef && !docContext) {
          return NextResponse.json({ error: 'Please enter a prompt, or attach an image or document.' }, { status: 400 });
        }
        if (!rawPrompt) {
          rawPrompt = 'Create a polished, high-end advertising creative based on the attached context. Agency-grade composition, lighting and typography.';
        }
        // Fold extracted document text in so an attached brief actually drives
        // the creative (goes through the enhancer + claim gate like all copy).
        if (docContext) rawPrompt = rawPrompt + docContext;

        // ── PLACEMENT RATIO (META ADS workflow): explicit body.ratio or detected
        //    from the brief. gpt-image-1 sizes: 1:1 feed = 1024x1024; portrait
        //    1024x1536 is the closest to 4:5 and 9:16 (true 9:16 + safe-zone
        //    crops are a future iteration — stated, not silently faked). ──
        const wantsSquare = body.ratio === '1:1' || /\b1:1\b|\bsquare\b|\bfeed post\b/i.test(rawPrompt);
        const aiSize = (wantsSquare ? '1024x1024' : '1024x1536') as '1024x1024' | '1024x1536';
        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json(
            { error: 'Image generation requires OPENAI_API_KEY in .env. Add the key and restart the dev server.' },
            { status: 400 },
          );
        }

        // ── Clean-text mode: render a VISUAL-ONLY plate, then composite perfect,
        //    real-font text in code (zero image-model typos: no "FICTITIS"/"S MULATED").
        //    DEFAULT = ON (clean-text) for the default path. Integrated mode stays
        //    available explicitly via body.cleanText=false (UI checkbox) or the
        //    STUDIO_CLEAN_TEXT_DEFAULT=off env override.
        const cleanText = body.cleanText !== undefined
          ? body.cleanText === true
          : process.env.STUDIO_CLEAN_TEXT_DEFAULT !== 'off';

        // ── Brand logo. Used when "Add brand logo" is on (concept mode), AND
        //    always in clean-text mode so the clean ad still carries the real logo. ──
        const wantsLogo = body.useLogo === true;
        const logoPosition = body.logoPosition || 'top-left';
        const brandLogo = (wantsLogo || cleanText) ? await getBrandLogo() : null;
        const hasBrandLogo = !!(brandLogo && brandLogo.dataUri);
        const logoWillBeComposited = wantsLogo && hasBrandLogo;
        if (wantsLogo && !hasBrandLogo) {
          console.warn('[Studio] "Add brand logo" was on but no logo is uploaded in Settings → Brand Kit.');
        }

        // ── Brand knowledge base → prompt context ──
        let brandKbContext = '';
        try {
          brandKbContext = await buildBrandKnowledgeContext();
        } catch (e: any) {
          console.warn('[Studio] Brand knowledge fetch failed (non-blocking):', e.message);
        }

        // If the user attached IMAGE reference(s), transform them (image-to-image)
        // so the result is grounded in their image(s) while keeping the brilliant brief.
        const refImage = hasImageRef ? refImagesIn[0] : null; // primary ref (logo/overlay decisions)

        // ── Number of creative variations to produce. User-selectable, but HARD-CAPPED
        //    at 4 — a user can never request (or receive) more than 4 at a time.
        //    The chat UI doesn't send `variations` — default to 3 there (its
        //    pick-your-favorite UX); callers that send an explicit count keep it. ──
        const variations = Math.max(1, Math.min(4, Math.round(Number(body.variations)) || (body.variations === undefined ? 3 : 1)));

        try {
          const variants: any[] = [];
          // Agent-5 (verifier) bookkeeping: QA feedback per variation for the
          // single retry, and which variations already used their retry.
          const qaNotes: Record<number, string> = {};
          const qaRetried = new Set<number>();
          // TIME BUDGET — Cloud Run cuts the request at its timeout; better to
          // ship a good-but-unverified creative than die at the gateway (live
          // failure: request pinned past the limit → plain-text 504 to the UI).
          const laneStart = Date.now();
          const elapsedS = () => (Date.now() - laneStart) / 1000;
          const QA_RETRY_BUDGET_S = 240;  // no QA retries after this
          const QA_SKIP_BUDGET_S = 430;   // no QA at all after this
          for (let vi = 0; vi < variations; vi++) {
          // ── ALWAYS ENHANCE — called PER variation so the enhancer's family rotation
          //    yields a DISTINCT concept for each of the (up to 4) variations. ──
          const enhanced = await enhanceImagePrompt(rawPrompt + (qaNotes[vi] || ''), {
            brandContext: brandKbContext,
            tone: body.tone,
            logoWillBeComposited,
            logoPosition,
            directionHint: body.directionHint,
            // The router classified this as a photographic SCENE → lock the literal
            // subject + action so the enhancer can't swap the person for a
            // receipt/screen concept (live failure: "First Payout Invoice").
            subjectLock: (!refImage && routingPublic.engine === 'ai' && routingPublic.archetypeHint === 'photographic')
              ? rawPrompt
              : undefined,
          });
          console.log(`[Studio] Variation ${vi + 1}/${variations}: concept "${enhanced.concept || '—'}"`);
          let directResult: any = null;

          if (refImage) {
            // Use a CONCISE transform instruction (not the full from-scratch
            // concept) so the model refreshes the reference cleanly instead of
            // cramming a whole new ad on top (which causes overlapping/duplicate text).
            let editPrompt = [
              `Transform this advertisement into a new version. NEW MESSAGE: ${rawPrompt}.`,
              enhanced.headline ? `Headline reads: "${enhanced.headline}".` : '',
              `Keep the reference image's overall composition, lighting and premium dark style; refresh the text to match the new message.`,
              `The CTA button must read "${enhanced.cta || 'Buy Challenge'}". Keep "#WeAreTraders" top-right and a tiny legal disclaimer at the very bottom. Leave the top-left corner clear with NO logo.`,
              `CRITICAL: render every piece of text exactly ONCE — crisp, clean and readable. NO duplicated words, NO overlapping or stacked text, NO garbled letters.`,
            ].filter(Boolean).join(' ');
            // Reference edits BAKE text into pixels — gate the prompt pre-model.
            {
              const gp = gateImagePrompt(editPrompt, rawPrompt);
              editPrompt = gp.text;
              if (gp.violations.length) console.warn(`[ClaimGate] reference-edit prompt: ${formatViolations(gp.violations)}`);
              console.warn('[Studio] ⚠ Reference edit: baked text cannot be verified post-render. Claim gate applied pre-prompt.');
            }
            console.log(`[Studio] ${refImagesIn.length} reference image(s) attached → gpt-image-1 image-to-image (edit prompt ${editPrompt.length} chars)`);
            directResult = await editImageOpenAI({
              prompt: editPrompt,
              references: refImagesIn, // multi-reference (mate's chat UI) — all refs ground the edit
              size: '1024x1536',
              quality: 'high',
            });
            if (!directResult) console.warn('[Studio] Edit returned nothing — falling back to text-to-image:', getLastOpenAIError() || '');
          }

          if (!directResult) {
            // Text-to-image. Clean-text uses the TEXT-FREE plate (so composited text
            // doesn't collide); concept mode uses the full concept prompt. Force a
            // dark plate so the white composited text always has contrast.
            const DARK_PLATE = 'The background MUST be a deep, near-black premium dark scene (almost pure black, #000000–#0A0A0F, with only subtle dark gradients or faint neon glow). NEVER light, white, pale, grey, or pastel. ';
            let genPrompt = (!refImage && cleanText)
              ? DARK_PLATE + VISUAL_ONLY_DIRECTIVE + (enhanced.visualPrompt && enhanced.visualPrompt.length > 40
                  ? enhanced.visualPrompt
                  : enhanced.imagePrompt)
              : enhanced.imagePrompt;
            // Integrated mode (cleanText off): the concept prompt's text gets BAKED
            // into pixels — gate the prose so the model never sees an unsourced claim.
            if (!cleanText) {
              const gp = gateImagePrompt(genPrompt, rawPrompt);
              genPrompt = gp.text;
              if (gp.violations.length) console.warn(`[ClaimGate] integrated-mode prompt: ${formatViolations(gp.violations)}`);
              console.warn('[Studio] ⚠ Integrated mode: baked text cannot be verified post-render. Claim gate applied pre-prompt.');
            }
            directResult = await generateImageOpenAI({
              prompt: genPrompt,
              size: aiSize,  // ratio-aware (see PLACEMENT RATIO above)
              quality: 'high',
              output_format: 'png',
            });
          }

          if (!directResult?.dataUri) {
            console.warn(`[Studio] Variation ${vi + 1} produced no image — skipping.`);
            continue;
          }

          let finalImageUrl = directResult.dataUri;
          // The GATED overlay copy actually composited — the verifier's
          // expectations MUST come from this, not the raw enhancer output
          // (live bug: verifier expected strings the gate had stripped).
          let compositedCopy: any = null;

          if (!refImage && cleanText) {
            // ── Zero-typo path: composite perfect, real-font text in code ──
            try {
              // ── COMPLIANCE GATE: strip any figure/%/price/timeframe/guarantee the
              //    enhancer invented (not sourced from the user's prompt or the approved
              //    brand facts) BEFORE it is burned into the creative. Same hard line as
              //    the Design Engine lane — see claim-gate.ts. ──
              const rawOv = enhanced.overlay || {};
              const { overlay: ov, violations: ovViolations } = gateOverlayCopy(
                {
                  headline: rawOv.headline || enhanced.headline || '',
                  subheadline: rawOv.subheadline || '',
                  price: rawOv.price || '',
                  bullets: Array.isArray(rawOv.bullets) ? rawOv.bullets : [],
                  cta: rawOv.cta || enhanced.cta || 'Buy Challenge',
                  urgencyText: rawOv.urgencyText || '',
                  promoCode: rawOv.promoCode || '',
                },
                rawPrompt,
              );
              if (ovViolations.length) {
                console.warn(`[ClaimGate] AI-lane overlay: stripped unsourced claims — ${formatViolations(ovViolations)}`);
              }
              // NEVER ship a heroless creative: if the gate (or the enhancer)
              // left no headline, fall back to claim-free copy — promote the
              // subheadline, else use the user's own words (always gate-safe).
              if (!ov.headline) {
                if (ov.subheadline) { ov.headline = ov.subheadline; ov.subheadline = ''; }
                else ov.headline = rawPrompt.length > 64 ? rawPrompt.slice(0, 61).trimEnd() + '…' : rawPrompt;
                console.warn('[Studio] Headline was empty after gating — promoted claim-free fallback so the creative keeps a hero element.');
              }
              compositedCopy = ov;
              finalImageUrl = await applyTextOverlay(finalImageUrl, {
                headline: ov.headline,
                subheadline: ov.subheadline,
                price: ov.price,
                bullets: ov.bullets,
                cta: ov.cta,
                urgencyText: ov.urgencyText,
                promoCode: ov.promoCode,
                // Disclaimer is the FIXED approved legal text — never model-written.
                disclaimer: FIXED_DISCLAIMER,
                layout: 'standard',
                darkBackground: true,
                tagline: '#WeAreTraders',
                // If we have the uploaded logo, suppress the compositor's bundled
                // logo and composite the real (transparent) one below instead.
                drawLogo: !hasBrandLogo,
              });
              console.log('[Studio] ✓ Clean-text overlay applied (zero-typo composition)');
              if (hasBrandLogo) {
                finalImageUrl = await applyBrandLogoOverlay(finalImageUrl, brandLogo!, {
                  position: wantsLogo ? logoPosition : 'top-left',
                });
              }
            } catch (overlayErr: any) {
              console.warn('[Studio] Clean-text overlay failed (non-blocking):', overlayErr.message);
            }
          } else if (logoWillBeComposited) {
            // ── Concept mode: composite the uploaded brand logo if requested ──
            try {
              finalImageUrl = await applyBrandLogoOverlay(finalImageUrl, brandLogo!, { position: logoPosition });
            } catch (logoErr: any) {
              console.warn('[Studio] Brand logo overlay failed (non-blocking):', logoErr.message);
            }
          } else {
            // ── Integrated concept mode (no uploaded Brand-Kit logo): composite the
            //    authentic Hola Prime PNG so every creative carries a crisp, correctly
            //    spelled logo, cleanly aligned in the reserved top brand strip (the
            //    model is instructed to leave the top-left corner clear). This stops
            //    the image model from drawing its own typo-prone wordmark over the
            //    headline — the exact bug that caused logo/headline overlap. ──
            try {
              finalImageUrl = await applyLogoOverlay(finalImageUrl);
            } catch (logoErr: any) {
              console.warn('[Studio] Authentic logo overlay failed (non-blocking):', logoErr.message);
            }
          }

          // ── AGENT 5 — VERIFY: vision QA of the finished creative against what
          //    the upstream agents promised (subject, no baked text, legibility,
          //    figures). Clean-text AI renders only — reference edits/integrated
          //    mode already carry bakedTextWarning, and the Design Engine lane is
          //    deterministic + structurally gated. One retry with QA feedback. ──
          let verification: any = null;
          if (elapsedS() > QA_SKIP_BUDGET_S) {
            console.warn(`[Verifier] skipped — time budget exhausted (${Math.round(elapsedS())}s elapsed); shipping unverified rather than hitting the gateway timeout.`);
          } else if (!refImage && cleanText && verifierEnabled()) {
            try {
              // Expectations come from the GATED copy that was actually composited
              // ('#WeAreTraders' is the only fixed text the overlay always draws).
              const ovr = compositedCopy || {};
              verification = await verifyCreative(finalImageUrl, {
                userPrompt: rawPrompt,
                expectedSubject: routingPublic.archetypeHint === 'photographic' ? rawPrompt : undefined,
                expectedTexts: [
                  ovr.headline, ovr.subheadline, ovr.price,
                  ...(Array.isArray(ovr.bullets) ? ovr.bullets : []),
                  ovr.cta, ovr.promoCode, ovr.urgencyText,
                  '#WeAreTraders',
                ].filter((s): s is string => !!s),
                allowedFigures: [
                  ...extractClaimTokens(rawPrompt),
                  ...APPROVED_BRAND_FACTS,
                  ...activeOfferTexts(),
                ],
              });
              if (!verification.pass && !qaRetried.has(vi) && elapsedS() < QA_RETRY_BUDGET_S) {
                qaRetried.add(vi);
                qaNotes[vi] = `\n\nQA FEEDBACK — the previous attempt FAILED verification, fix these: ${verification.issues.join('; ')}. ${verification.retryHint || ''}`;
                console.warn(`[Verifier] Variation ${vi + 1} FAILED QA (${verification.issues.join(' | ')}) — retrying once.`);
                vi--; // re-run this variation with the feedback folded in
                continue;
              }
              console.log(`[Verifier] Variation ${vi + 1}: ${verification.pass ? '✓ verified' : '⚠ shipped with issues (retry exhausted)'}`);
            } catch (vErr: any) {
              console.warn('[Verifier] skipped (non-blocking):', vErr?.message);
            }
          }

          // ── Store a short Cloudinary URL instead of a ~2MB base64 data URI. ──
          try {
            const uploaded = await uploadToCloudinary(finalImageUrl, {
              folder: 'creative-studio/fast',
              publicId: `gen-${Date.now()}-${vi}`,
            });
            if (uploaded?.url) finalImageUrl = uploaded.url;
          } catch (upErr: any) {
            console.warn('[Studio] Cloudinary upload failed (keeping data URI):', upErr.message);
          }

          variants.push({
            id: `enhanced-${vi + 1}`,
            label: enhanced.concept || `Variation ${vi + 1}`,
            verification,
            // META ADS workflow: label what this variant TESTS (the angle), plus
            // step-1 deconstruction + explicit assumptions for transparency.
            angle: enhanced.angle || undefined,
            briefDeconstruction: enhanced.briefDeconstruction || undefined,
            assumptions: enhanced.assumptions || undefined,
            description: (enhanced.angle ? `Tests: ${enhanced.angle} angle · ` : '') + 'gpt-image-1' + (logoWillBeComposited ? ' + brand logo' : ''),
            paradigm: 'Enhanced',
            imageUrl: finalImageUrl,
            score: { overall: 9.0, content: 9, design: 9, color: 9, impact: 9 }, // placeholder — unscored
            enhancedPrompt: enhanced.imagePrompt,
            _headline: enhanced.headline, _cta: enhanced.cta, _concept: enhanced.concept, _model: directResult.model,
          });
          } // ── end per-variation loop ──

          if (!variants.length) {
            return NextResponse.json(
              // Surface the ACTUAL OpenAI failure (billing, auth, content policy…)
              { error: getLastOpenAIError() || 'gpt-image-1 returned no result. Check OPENAI_API_KEY + billing at platform.openai.com.' },
              { status: 500 },
            );
          }

          const primary: any = variants[0];
          const directCreativeId = `gen-${Date.now()}`;
          const responsePayload = {
            creative: {
              creativeId: directCreativeId,
              creativeConcept: {
                title: primary._concept || 'Enhanced generation',
                rationale: 'Your prompt was auto-expanded into a full brand-aware brief, then rendered by gpt-image-1.',
              },
              copywriting: {
                headline: { primary: primary._headline || rawPrompt.slice(0, 80) },
                cta: { primary: primary._cta || 'Buy Challenge' },
              },
              enhancedPrompt: primary.enhancedPrompt,
              variants: variants.map(({ _headline, _cta, _concept, _model, ...v }: any) => v),
              imageUrl: primary.imageUrl,
              provider: 'openai',
              model: primary._model,
              directMode: true,
              logoApplied: logoWillBeComposited,
              engine: 'ai',
              routing: routingPublic,
              // Baked text (reference edit / integrated mode) can't be verified
              // post-render — the claim gate ran pre-prompt instead.
              bakedTextWarning: (refImage !== null || !cleanText) || undefined,
              variations: variants.length,
            },
            saved: false,
          };

          console.log(`[Studio] ✓ Enhanced generation complete — ${variants.length} variation(s).`);
          return NextResponse.json(responsePayload);
        } catch (err: any) {
          console.error('[Studio] Enhanced generation failed:', err.message);
          return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
        }
      }

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

      const generationPrompt = (type === 'custom' ? (userPrompt || '') : `Instructions: ${userPrompt}. Reference analysis applied.`) + docContext;

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

      // ── STORED AD LIBRARY: Inject patterns from synced Meta ads ──
      // A/B-testable via body.useStoredAds. When false, skip the reference
      // library to test whether it helps or constrains the output.
      let customStoredAdContext = '';
      const customUseStoredAds = body.useStoredAds !== false;
      if (customUseStoredAds) {
        try {
          const stored = await getStoredAdContext({ limit: 12 });
          customStoredAdContext = stored.context;
          if (customStoredAdContext) {
            console.log(`[Studio] Custom mode: injecting stored-ad patterns (${stored.sourceAds.length} ads)`);
          }
        } catch (e: any) {
          console.warn('[Studio] Stored ad context fetch failed for custom (non-blocking):', e.message);
        }
      } else {
        console.log('[Studio] Custom mode: useStoredAds=false — skipping reference library (A/B test)');
      }

      // ── BRAND KNOWLEDGE BASE: uploaded brand info (Settings → Brand Kit) ──
      // Always injected so generated copy/visuals reflect the team's own brand.
      let customBrandKb = '';
      try {
        customBrandKb = await buildBrandKnowledgeContext();
        if (customBrandKb) console.log('[Studio] Custom mode: brand knowledge base injected');
      } catch (e: any) {
        console.warn('[Studio] Brand knowledge fetch failed (non-blocking):', e.message);
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
        text: `You are a senior creative director at a top-tier ad agency working on Hola Prime. You have just been shown 5-12 real top-performing ads (the reference images above this prompt). Your job: produce a creative that COULD HAVE BEEN IN that set - same craft bar, same brand presence - but with a NEW idea.

# HARD NON-NEGOTIABLES (violating any of these is a failed brief)

1. CTA TEXT: Must be exactly "Buy Challenge" (English) or "Compra el Challenge" (Spanish). NOT "Access Algorithm", NOT "Get Started", NOT "Learn More", NOT "Claim Yours", NOT anything else. The CTA is FIXED brand vocabulary.

2. HERO NUMBER: The price/offer (e.g. "$9", "$25K", "$100K", "$38") must occupy 30-40% of the vertical canvas height. Treatment: 3D chrome metallic OR neon glow (cyan/green). It is THE visual focal point - everything else supports it. Headlines like "THE $25K ALGORITHM" with the number at body-text size are FAILED briefs.

3. LOGO ZONE: Top-left 12-15% width = COMPLETELY EMPTY in your image prompt (no logo drawn - the real PNG is overlaid post-process). Do NOT instruct the image gen to draw "hola prime" text or wordmark.

4. WEARETRADERS BADGE: Top-right has "#WeAreTraders" in a white thin outline pill. Exactly once, exactly that spelling.

5. DARK BACKGROUND: Deep black (#000000 to #080810). Bright/white backgrounds are FAILED briefs (HolaPrime tested this - they lost).

6. DISCLAIMER: Bottom edge, tiny gray text, verbatim: "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

# BANNED VOCABULARY (instant brief failure if used in copy)

These phrases scream "AI generated 2024 cliche" and are BANNED from headlines, body copy, and concept titles:

- "AI-powered", "AI-driven", "powered by AI", "machine learning", "ML-based"
- "Revolutionary", "Next-gen", "Next-generation", "Game-changing"
- "Unlock your potential", "Unleash", "Elevate your"
- "Algorithm", "The Algorithm", "Our algorithm" (even if user prompt mentions AI/fintech - translate intent, do not echo the word)
- "Cutting-edge", "State-of-the-art", "Innovative" (these are tells, not selling points)
- Startup-speak: "synergy", "ecosystem" (unless literally about a real platform like NinjaTrader)

If the user brief says "feel like fintech innovation", deliver that FEELING with concrete language. E.g. specific outcome ("Your first \$50K payout in 30 days"), counter-narrative ("Most prop firms are designed to fail you - this one isn't"), or cultural specificity. NEVER use the dead phrases above.

# 2026 TREND HOOKS - RIDE ONE OF THESE

What is actually hitting in trader/fintech ads RIGHT NOW (mid-2026):

- RECEIPT AESTHETIC: Trade confirmations, P&L screenshots, payout proofs styled as design elements. Cred over promises.
- ANTI-PROP-FIRM FRAMING: "The prop firm built by traders, not gambling psychologists." Traders are exhausted by FTMO clones - call it out.
- LOSS-AVERSION SPECIFICITY: Not "Don't miss out" but "Stop watching your friends withdraw \$10K monthly while you're still demo trading."
- NUMERICAL PROOF: "Average payout time: 7 minutes" beats "Fast payouts". Specific over vague.
- COUNTER-AESTHETIC: When the industry uses neon glow-up, a stark Helvetica-on-black ad stands out. When it goes minimal, brutalism + jpeg-compressed early-internet aesthetic stands out. Pick the OPPOSITE of what 5 random competitor ads do this week.
- CULTURAL MOMENTS: India F&O regulatory changes, US prop-firm post-MyForexFunds aftermath, crypto futures volatility, Fed rate decisions - leverage timely angles.
- FORMAT INNOVATION: Phone notification UI, Bloomberg-terminal aesthetic, fake "leaked" Slack screenshots, "x-rays" of a trade, payout receipts as ASMR object photography.

PICK ONE trend hook. Execute it well. Do not try to use all of them.

# CONCEPT ORIGINALITY MANDATE (READ TWICE — most generations fail here)

Picking a trend hook is step 1. COMMITTING TO IT 100% is step 2 — and most briefs fail step 2 by softening the hook into the safest possible interpretation. Don't.

WHEN YOU PICK A TREND, GO ALL IN:

- RECEIPT AESTHETIC = a real paper receipt, photographed. White thermal-printer paper with the offer printed in dot-matrix or monospace, lying on a dark surface under directional studio lighting. NOT a phone screenshot of a banking app showing "receipt-like content". A literal receipt. The whole ad IS the receipt.

- FORMAT INNOVATION: phone notification UI = the ENTIRE creative is one notification card, no other elements except disclaimer. NOT a phone mockup containing a notification — the notification IS the ad, full-bleed, no phone frame.

- FORMAT INNOVATION: Bloomberg terminal aesthetic = an actual photographed CRT/LCD terminal screen at slight off-axis perspective. Visible scanlines or pixel grain. NOT a generic dark UI with monospace fonts on flat black.

- FORMAT INNOVATION: leaked Slack/Discord screenshot = a literal screenshot of a chat message with the offer, complete with realistic UI chrome (avatar, timestamp, channel name). NOT a "chat-inspired design".

- COUNTER-AESTHETIC = if the category uses chrome+glow, go BRUTALIST (raw Helvetica, harsh contrast, almost ugly). If the category uses minimalism, go MAXIMALIST (early-2000s web aesthetic, jpeg compression artifacts, deliberate visual chaos). Real opposition, not "clean version of the same thing".

The rule: imagine the trend hook as a physical object or specific medium. Then PHOTOGRAPH or RENDER that specific thing. Don't translate it into a generic "design with text on dark bg" because that's where it always collapses.

# BANNED OVERUSED PATTERNS (instant failure)

Every prop firm has shipped these. Yours can't. If your concept resembles ANY of these, regenerate:

- "Phone mockup showing a trading app/notification with hero number floating beside it"
- "Centered text-on-dark-gradient with big $XX as headline"
- "Hero price in chrome with green/cyan glow on plain black background"
- "Bloomberg-style stats arranged in a 2x2 or 3-column grid"
- "Comparison table: us vs them with checkmarks/X marks side by side"
- "Diagonal line going up-right behind text"
- "Generic 'modern fintech' card on dark gradient"

These are 90% of prop firm ads. They are COMPETENT and FORGETTABLE. The bar is UNMISTAKABLE.

# THE COMMIT TEST

Before finalizing, ask: "Could this concept appear in 5+ competitor prop firm ads with minimal changes?" If YES → the brief has failed. Regenerate with a weirder, more physical, more specific interpretation. The goal isn't "good for an AI ad" — it's "couldn't have been made by anyone but us".

# THE BAR — A CONCRETE EXAMPLE OF SUCCESS

A previously-shipped Hola Prime ad that nailed the brief looked like this (study its DNA):

> A photographed paper receipt or printed terminal slip, dark surface, soft drop shadow under it suggesting it's physically on a table. The receipt itself is near-black with cream/light gray edge. A small blue folder-tab sticky note peeks from behind the top-left edge — one accent color, used once. Inside the receipt:
>  - Hero "$99 Challenge entry" — heavy Helvetica/Inter Bold, 3 lines stacked, MASSIVE, dominates upper third
>  - Secondary "Unlock: $25k trading capital" — clean medium weight
>  - Dotted divider line
>  - Right-aligned itemized list: "No consistency rule | 5% profit target | 90% profit split" each on its own line, like receipt line items
>  - Dotted divider
>  - "Payouts ÷10 min" with division symbol used cleverly
>  - Footer: "BUILT BY TRADERS, FOR TRADERS" in tiny small caps
>  - "Hola Prime®" wordmark at the bottom, small, restrained
> Zero decorative noise. Zero gradients. Zero glow. Brutalist Helvetica + paper texture + ONE accent color do all the work. Looks like it could be printed on real thermal paper.

DNA traits to internalize from this example:
- **Single physical object dominates the entire canvas** (the receipt). Not "a design containing receipt-like elements".
- **Heavy sans-serif typography carries the weight.** No script fonts, no fancy effects, no chrome. Just bold + restrained.
- **Right-aligned numbers, dotted dividers, "BUILT BY..." footer.** These specific receipt-authentic details signal commitment to the format.
- **Restraint > ornament.** ONE accent color (the blue tab). Nothing decorative.
- **Photographic depth.** Soft shadow under the object, slight curl at the top — it looks photographed, not designed in Figma.

When generating a brief for an offer/promo angle, this is the CRAFT BAR. Match it OR exceed it with a different physical-object concept (terminal screen, Bloomberg printout, leaked Slack screenshot, candlestick chart photographed off a CRT, etc.) — but never settle for "centered text on dark gradient".

# BRAND

Brand: Hola Prime (#WeAreTraders). Funded challenges \$2K to \$100K. USPs: 1-step process, 5% profit target, no time limits, fast withdrawals, no activation fees, high profit splits.

${customBrandContext}${customStoredAdContext}${customBrandKb}${noBrandDNARule}

# USER REQUEST

"${generationPrompt}"

# EXECUTION RULES

- Across the 3 variants generated downstream, each MUST be a fundamentally different concept - not 3 color variations of the same idea. Different headline, different angle, different emotional hook. If all 3 say similar things about \$25K with chart backgrounds, you have failed.
- 5-7 elements on the canvas max. Beyond that becomes clutter.
- Numbers in the user prompt must be PRESERVED EXACTLY. "$25K" stays "$25K". If user says "3-step", show "3-step" not "3 step" or "3steps".
- Spelling: every word must render correctly. Especially: Challenge, Withdrawals, Fictitious, Simulated, Performance, Accounts. Never write "sstep" or "3% step" - these are common Gemini errors and your prompt must reinforce correct rendering.

# OUTPUT (raw JSON only - no preamble, no markdown fence)

{
  "creativeConcept": {
    "title": "Concept name (3-5 words, NO banned vocab)",
    "rationale": "One sentence: which trend hook and why it fits the user request",
    "targetScore": 9.0,
    "performanceTier": "ELITE",
    "trendHookUsed": "Which trend from the list above this leverages"
  },
  "copywriting": {
    "headline": { "primary": "Sharp, specific, under 8 words. NO banned vocab. Hero number prominent." },
    "body": { "primary": "1-2 short lines max. Concrete benefit, no startup-speak." },
    "cta": { "primary": "Buy Challenge" },
    "attentionGrabber": "First line that stops the thumb in under 1 second",
    "urgencyText": "Only if a specific real urgency exists (e.g. promo expiry)",
    "trustText": "Only if real (Trustpilot 4.5, Deloitte review, etc.)"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word image prompt. Structure: (1) Hero number with exact size (30-40% canvas height) and treatment (3D chrome OR neon glow), positioned center. (2) Headline placement and exact text. (3) Top-left empty zone for logo overlay (must remain visually clear). (4) Top-right #WeAreTraders pill badge. (5) Body copy placement and exact text. (6) CTA = blue pill button with literal text 'Buy Challenge' - never any other text. (7) Background: deep black with treatment specific to the trend hook chosen. (8) Disclaimer at absolute bottom. SPELL EVERY WORD CORRECTLY especially: Challenge, Withdrawals, Fictitious, Simulated, Performance, Accounts. Numbers preserved exactly. No element duplicated."
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

      // ── COMPLIANCE GATE (pre-prompt): clean the brief's copywriting BEFORE it
      //    feeds the text manifest / image prompt / overlay / UI copy. ──
      {
        const g = gateBriefCopy(brief, userPrompt || '');
        brief = g.brief;
        if (g.violations.length) console.warn(`[ClaimGate] custom brief: stripped — ${formatViolations(g.violations)}`);
      }

      let baseImagePrompt = brief?.imageGenerationPrompt?.detailed
        || (typeof brief?.imageGenerationPrompt === 'string' ? brief.imageGenerationPrompt : null)
        || userPrompt
        || 'Professional prop trading advertisement creative for Hola Prime';

      // Integrated mode (env TEXT_OVERLAY=off): text gets BAKED into pixels — gate
      // the prose image prompt too, so unsourced claims never reach the model.
      if (!TEXT_OVERLAY_ENABLED) {
        const gp = gateImagePrompt(baseImagePrompt, userPrompt || '');
        baseImagePrompt = gp.text;
        if (gp.violations.length) console.warn(`[ClaimGate] custom baked-text prompt: ${formatViolations(gp.violations)}`);
        console.warn('[Studio] ⚠ Integrated mode: text is baked by the image model and CANNOT be verified post-render. Claim gate applied pre-prompt.');
      }

      const baseNeg = brief?.imageGenerationPrompt?.negative || 'typos, misspellings, blurry, low quality, generic stock photos, white background, overlapping text, cramped layout, cluttered elements';

      // ── 3-VARIANT GENERATION for custom path — CONCEPT DIVERSITY ──
      const variations = Math.max(1, Math.min(4, Math.round(Number(body.variations)) || 3));
      const customParadigms = pickDiverseParadigms(variations);
      console.log(`[Studio] Custom paradigms: ${customParadigms.map((p: ConceptParadigm) => p.name).join(', ')}`);

      const customVariants = customParadigms.map((paradigm: ConceptParadigm) => ({
        id: paradigm.id,
        label: paradigm.name,
        description: paradigm.description,
        prefix: `${paradigm.imageDirective}\n\nANTI-PATTERNS (avoid these — they would ruin this concept):\n${paradigm.antiPatterns}\n\nDO NOT ADD any elements not in the prompt. The paradigm changes HOW content is presented, not WHAT content is shown.\n\n`,
      }));

      // Build custom brand directive (same logic: base vs full)
      const customBrandBase = `=== HOLA PRIME CORE VISUAL RULES ===
Deep black background (#000000). White text. Blue (#2563EB) pill CTA button. 9:16 vertical. Generous spacing — no boxes or containers — text floats on dark background. NO overlapping. NO bright backgrounds. Premium dark fintech aesthetic.
=== END ===\n\n`;

      const customBrandFull = customWantsBrandDNA ? `=== BRAND SIGNATURE (USER REQUESTED) ===
Add: "hola prime" logo white TOP-LEFT. "#WeAreTraders" white TOP-RIGHT. Translucent iridescent sphere (blue-purple-pink, 30-50% opacity) as subtle background glow behind content. Neon glow outlines on prices. 3D metallic chrome on price text.
=== END ===\n\n` : `=== IMPORTANT: NO BRAND SIGNATURE ELEMENTS ===
Do NOT add any translucent circles, iridescent spheres, orbs, or glowing circular shapes in the background. Do NOT add any brand logo text. Keep the background CLEAN — pure dark with subtle gradient only. Focus on INNOVATIVE, FRESH design without any signature brand decorations.
=== END ===\n\n`;

      const customBrandPrefix = customBrandBase + customBrandFull;

      console.log(`[Studio] Generating 3 custom creative variants in parallel... (Brand DNA: ${customWantsBrandDNA ? 'FULL' : 'BASE'})`);

      // ── BUILD TEXT MANIFEST for Custom Path (Ensures promo codes etc are rendered) ──
      const cmHeadline = brief.copywriting?.headline?.primary || '';
      const cmBody = brief.copywriting?.body?.primary || '';
      const cmCta = brief.copywriting?.cta?.primary || '';
      const cmHook = brief.copywriting?.attentionGrabber || brief.copywriting?.hookText || '';
      const cmUrgency = brief.copywriting?.urgencyText || '';
      const cmDiscount = brief.copywriting?.discountText || '';
      const cmBullets = (brief.copywriting?.benefitBullets || []).slice(0, 4);

      const customManifestLines: string[] = [];
      if (cmHeadline) customManifestLines.push(`HEADLINE: "${cmHeadline}"`);
      if (cmHook) customManifestLines.push(`HOOK TEXT: "${cmHook}"`);
      if (cmBody) customManifestLines.push(`BODY COPY: "${cmBody}"`);
      if (cmUrgency) customManifestLines.push(`URGENCY: "${cmUrgency}"`);
      if (cmDiscount) customManifestLines.push(`DISCOUNT: "${cmDiscount}"`);
      if (cmBullets.length > 0) {
        customManifestLines.push(`BULLET POINTS:`);
        cmBullets.forEach((b: string, i: number) => customManifestLines.push(`  ${i + 1}. "${b}"`));
      }
      if (cmCta) customManifestLines.push(`CTA BUTTON: "${cmCta}"`);

      // Price matching for locking
      const allCustomText = [cmHeadline, cmBody, cmHook, cmCta, cmUrgency, cmDiscount].join(' ');
      const cPriceMatches = allCustomText.match(/\$\d+(?:\.\d{1,2})?/g) || [];
      const cCriticalNumbers = [...new Set(cPriceMatches)].slice(0, 3);
      const cNumberLock = cCriticalNumbers.length > 0
        ? `\nCRITICAL NUMBER ACCURACY:\n${cCriticalNumbers.map(n => `  "${n}" — render EXACT digits: ${n.replace('$', '')}`).join('\n')}\n`
        : '';

      const customTextManifest = `=== TEXT MANIFEST (MANDATORY CONTENT) ===
THIS IMAGE MUST CONTAIN THE FOLLOWING TEXT STRINGS:
${customManifestLines.join('\n')}
${cNumberLock}
DISCLAIMER: "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."
=== END MANIFEST ===\n\n`;

      // Build per-string fidelity block for the custom path
      const customTextFidelity = buildTextFidelityBlock([
        { label: 'HEADLINE', value: cmHeadline },
        { label: 'HOOK TEXT', value: cmHook },
        { label: 'BODY COPY', value: cmBody },
        { label: 'URGENCY ELEMENT', value: cmUrgency },
        { label: 'DISCOUNT BADGE', value: cmDiscount },
        { label: 'CTA BUTTON', value: cmCta },
      ]);


      // Build User Requirements block for Custom path
      const customUserReqsDirective = [
        userPrompt && `USER REQUIREMENT (HIGHEST PRIORITY): ${userPrompt}`,
        body.tone && `TONE/STYLE: ${body.tone}`,
      ].filter(Boolean).join('\n');
      const customUserReqsBlock = customUserReqsDirective
        ? `\n\n=== USER EXPLICIT REQUIREMENTS (MUST FOLLOW) ===\n${customUserReqsDirective}\nYou MUST incorporate these requirements into the visual design. They override any default assumptions.\n=== END USER REQUIREMENTS ===\n\n`
        : '';

      // ── CREATIVE DIRECTOR for Custom path ──
      let customDirectorConcepts: any[] = [];
      try {
        console.log('[Studio] Running Creative Director for custom concept-diverse prompts...');
        // CRITICAL: Ensure user instructions ARE passed to the Director
        const customDirectorResult = await runCreativeDirector(brief, customParadigms, customBrandPrefix, userPrompt, body.tone, TEXT_OVERLAY_ENABLED && body.cleanText === true);
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
            // When text-overlay mode is on, swap text manifest + fidelity blocks
            // for the visual-only directive — image model generates background plate,
            // text gets composited in code with real fonts post-generation.
            const variantPrompt = TEXT_OVERLAY_ENABLED
              ? (useDirectorPrompt
                  ? customBrandPrefix + VISUAL_ONLY_DIRECTIVE + customUserReqsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
                  : customBrandPrefix + VISUAL_ONLY_DIRECTIVE + customUserReqsBlock + variant.prefix + baseImagePrompt + PREMIUM_CRAFT_DIRECTIVE)
              : (useDirectorPrompt
                  ? customBrandPrefix + customTextManifest + customTextFidelity + customUserReqsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
                  : customBrandPrefix + customTextManifest + customTextFidelity + customUserReqsBlock + variant.prefix + baseImagePrompt + PREMIUM_CRAFT_DIRECTIVE);
            const result = await generateImage({
              detailed: variantPrompt,
              referenceUrl: reference || undefined,
              negative: baseNeg + (customWantsBrandDNA ? '' : ', translucent circles, iridescent spheres, glowing orbs'),
              technicalSpecs: brief?.imageGenerationPrompt?.technicalSpecs,
            }, { tier: 'pro', skipLogo: TEXT_OVERLAY_ENABLED });


            let finalImageUrl = result?.url || result?.dataUri || null;

            // ── TEXT OVERLAY: composite all text with real fonts (eliminates typos) ──
            if (TEXT_OVERLAY_ENABLED && finalImageUrl) {
              try {
                // COMPLIANCE GATE: same hard line as every other lane — DB-sourced
                // figures are historical, not approved claims.
                const { overlay: overlayConfig, violations: ovV } = gateOverlayCopy(
                  extractOverlayConfig(brief, variant.id), userPrompt || '');
                if (ovV.length) console.warn(`[ClaimGate] custom lane (variant "${variant.id}"): stripped — ${formatViolations(ovV)}`);
                finalImageUrl = await applyTextOverlay(finalImageUrl, overlayConfig);
                console.log(`[Studio] ✓ Custom variant "${variant.id}" — text overlay applied (zero-typo composition)`);
              } catch (overlayErr: any) {
                console.warn(`[Studio] Text overlay failed for custom variant "${variant.id}" (non-blocking):`, overlayErr.message);
              }
            }

            console.log(`[Studio] ✓ Custom variant "${variant.id}" generated (${useDirectorPrompt ? 'Director' : 'paradigm'})`);

            return {
              id: variant.id,
              label: customDirectorConcepts[idx]?.paradigm || variant.label,
              description: customDirectorConcepts[idx]?.visualApproach || variant.description,
              paradigm: customDirectorConcepts[idx]?.paradigm || variant.label,
              imageUrl: finalImageUrl,
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
          engine: 'ai',
          routing: routingPublic,
          bakedTextWarning: !TEXT_OVERLAY_ENABLED || undefined,
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
      const { creativeId, conversationId, parentId, childId, tab, prompt: historyPrompt, generationOptions: histOpts, result: histResult, imageUrl: histImageUrl, previousInputs, referenceImages: histRefs } = body;
      if (!creativeId) {
        return NextResponse.json({ error: 'creativeId is required' }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
      const historyCollection = db.collection('history');

      const headline = histResult?.copywriting?.headline?.primary || histResult?.creativeConcept?.title || '';
      const score = histResult?.creativeConcept?.targetScore || histResult?.targetScore || null;

      // ── REFERENCE IMAGES (mate's chat UI): persist uploads so they stay attached
      //    after a History reopen. Base64 → Cloudinary short URL; URLs kept as-is. ──
      let referenceImageUrls: string[] = [];
      if (Array.isArray(histRefs) && histRefs.length > 0) {
        referenceImageUrls = (
          await Promise.all(
            histRefs.slice(0, 6).map(async (ref: string, i: number) => {
              if (typeof ref !== 'string' || !ref) return null;
              if (!ref.startsWith('data:')) return ref; // already a short URL
              try {
                const up = await uploadToCloudinary(ref, {
                  folder: 'creative-studio/references',
                  publicId: `${creativeId}-ref-${i}`,
                  tags: ['reference', 'hola-prime'],
                });
                return up?.url || null;
              } catch { return null; }
            }),
          )
        ).filter((u): u is string => !!u);
      }

      await historyCollection.insertOne({
        creativeId,
        // Groups all creatives from one chat session into a single History entry.
        conversationId: conversationId || creativeId,
        parentId: parentId || null,
        childId: childId || null,
        tab: tab || 'custom',
        prompt: historyPrompt || '',
        generationOptions: histOpts || {},
        result: histResult || {},
        imageUrl: histImageUrl || null,
        referenceImages: referenceImageUrls,
        headline,
        score,
        previousInputs: previousInputs || [],
        createdAt: new Date(),
      });

      // ── STUDIO INPUT DATA (mate's chat UI): persist the turn's INPUT (prompt +
      //    reference URLs) so it restores into the composer on conversation reopen. ──
      try {
        const inputCollection = db.collection('studio_input_data');
        await inputCollection.insertOne({
          conversationId: conversationId || creativeId,
          creativeId,
          tab: tab || 'custom',
          prompt: historyPrompt || '',
          referenceImages: referenceImageUrls,
          createdAt: new Date(),
        });
      } catch (e: any) {
        console.warn('[Studio] studio_input_data write failed (non-blocking):', e?.message);
      }

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