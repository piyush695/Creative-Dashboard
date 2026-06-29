/**
 * Image Generation Service — Google Gemini & Imagen
 *
 * Two generation paths:
 * 1. Gemini multimodal models: support reference images + text → image output
 * 2. Imagen models: text-to-image only (no reference), higher quality
 *
 * When a referenceUrl is provided (source creative thumbnail), we use Gemini
 * multimodal path so the generated image is visually grounded in the original.
 * Otherwise we try Imagen for pure text-to-image generation.
 *
 * LOGO: Every generated image is post-processed with the Hola Prime logo
 * overlay (see logo-overlay.ts) before being returned.
 */

import { applyLogoOverlay } from './logo-overlay';
import { generateImageIdeogram, normalizeAspectRatio } from './imagegen-ideogram';
import { generateImageOpenAI, normalizeOpenAISize } from './imagegen-openai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Sanitize prompts before sending to Gemini/Imagen.
 * Removes framework terminology, hex codes, section labels, and other
 * metadata that image generators render as VISIBLE TEXT in the output.
 */
function sanitizePromptForImageGen(prompt: string): string {
  let cleaned = prompt;

  // Remove hex color codes — Gemini renders "#2563EB" as visible text
  cleaned = cleaned.replace(/#[0-9A-Fa-f]{6}\b/g, (match) => {
    // Map common hex codes to color names
    const colorMap: Record<string, string> = {
      '#000000': 'black', '#0A0A0F': 'very dark black', '#FFFFFF': 'white',
      '#00E68A': 'neon green', '#00FF88': 'neon green', '#2563EB': 'blue',
      '#3B82F6': 'blue', '#FF6B35': 'orange-red', '#FF4444': 'red',
      '#9333EA': 'purple', '#7C3AED': 'purple', '#FFD700': 'gold',
      '#A0A0A0': 'gray',
    };
    return colorMap[match.toUpperCase()] || colorMap[match.toLowerCase()] || 'accent color';
  });

  // Remove framework section headers that become visible text
  // Patterns like "HOOK:", "Hook Zone:", "VALUE ZONE:", "ACTION ZONE:", "CTA ZONE:"
  cleaned = cleaned.replace(/\b(HOOK|Hook)\s*(ZONE|Zone)?\s*[:—–-]\s*/gi, 'The attention-grabbing top section: ');
  cleaned = cleaned.replace(/\b(VALUE|Value)\s*(ZONE|Zone)\s*[:—–-]\s*/gi, 'The main content area: ');
  cleaned = cleaned.replace(/\b(ACTION|Action)\s*(ZONE|Zone)\s*[:—–-]\s*/gi, 'The call-to-action area: ');
  cleaned = cleaned.replace(/\b(CTA|Cta)\s*(ZONE|Zone)\s*[:—–-]\s*/gi, 'The button area: ');
  cleaned = cleaned.replace(/\bBRANDING\s*ZONE\s*[:—–-]\s*/gi, 'The top-left area which MUST REMAIN COMPLETELY BLACK/EMPTY AND VOID OF ALL TEXT: ');

  // Remove mention of brand name in contexts that trigger logo rendering
  cleaned = cleaned.replace(/the logo area/gi, 'the empty top-left area');
  cleaned = cleaned.replace(/brand (wordmark|logo)/gi, 'brand content');
  cleaned = cleaned.replace(/render "Hola Prime"/gi, 'render the brand name');
  cleaned = cleaned.replace(/draw "Hola Prime"/gi, 'draw the brand name');
  cleaned = cleaned.replace(/logo of Hola Prime/gi, 'brand logo');
  cleaned = cleaned.replace(/Hola[ ]?Prime logo/gi, 'brand logo');
  cleaned = cleaned.replace(/Hola[ ]?Prime wordmark/gi, 'brand wordmark');

  // Remove psychology framework labels that leak into images
  cleaned = cleaned.replace(/\b(PSYCHOLOGY|Psychology)\s*[:—–-]\s*(LOSS AVERSION|SOCIAL PROOF|ANCHORING|SCARCITY|URGENCY|RECIPROCITY|AUTHORITY)/gi, '');
  cleaned = cleaned.replace(/\b(ANTI-PATTERNS?|Anti-Patterns?)\s*[:—–-]/gi, 'Avoid:');
  cleaned = cleaned.replace(/\bVISUAL PARADIGM\s*[:—–-]\s*/gi, 'Visual style: ');

  // Remove "Rule X" or "(Rule 2)" references — Gemini renders these
  cleaned = cleaned.replace(/\(Rule\s+\d+\)/gi, '');
  cleaned = cleaned.replace(/\bRule\s+\d+\b/gi, '');

  // Remove weight percentages like "(15%)" or "Weight: High" that appear as text
  cleaned = cleaned.replace(/\(Weight:\s*\w+(?:[-–]\w+)?\)/gi, '');
  cleaned = cleaned.replace(/\(\d+%\)/g, '');

  // Remove triple-equals section markers
  cleaned = cleaned.replace(/===\s*[^=]+\s*===/g, '');

  // Remove markdown headers that image gen renders as text
  cleaned = cleaned.replace(/^#{1,4}\s+/gm, '');

  // Remove consecutive newlines (clean up after removals)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/** Standard negative prompt additions to prevent metadata leaking into images */
const ANTI_METADATA_NEGATIVE = 'hex color codes as visible text, color codes like #2563EB or #FF6B35, framework labels like Hook or HOOK or Value Zone or Action Zone, section headers, metadata text, technical annotations, design instruction text rendered in the image, psychology labels like Loss Aversion or Anchoring, rule numbers, weight percentages, markdown formatting symbols';

// Gemini multimodal models that can accept image input AND produce image output
// These are VERIFIED working models on this API key (tested 2026-03-18)
const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',          // ✅ Best quality, confirmed working
  'gemini-3-pro-image-preview',      // ✅ Confirmed working
  'gemini-3.1-flash-image-preview',  // ✅ Listed as available
  'gemini-2.0-flash-exp',            // Fallback
];

// Imagen text-to-image models (no reference image support)
// Ultra first for best quality, fast as fallback
const IMAGEN_MODELS = [
  'imagen-4.0-ultra-generate-001', // Best quality
  'imagen-4.0-generate-001',       // Standard
  'imagen-4.0-fast-generate-001',  // Fastest fallback
];

/**
 * Helper: fetch a URL or data URI and return {mimeType, base64}
 */
async function fetchImageBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const commaIndex = url.indexOf(',');
      const meta = url.substring(0, commaIndex);
      const data = url.substring(commaIndex + 1);
      const mimeType = meta.split(':')[1].split(';')[0];
      return { mimeType, data };
    }
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString('base64');
    const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    return { mimeType, data };
  } catch (err: any) {
    console.warn('[ImageGen] Failed to fetch image:', url, err.message);
    return null;
  }
}

/**
 * Try Gemini multimodal models (supports reference image as input + image output)
 */
async function tryGeminiGeneration(prompt: string, referenceImageData: { mimeType: string; data: string } | null): Promise<string | null> {
  const parts: any[] = [];

  // Add reference image FIRST if available (Gemini reads context left-to-right)
  if (referenceImageData) {
    parts.push({
      inlineData: {
        mimeType: referenceImageData.mimeType,
        data: referenceImageData.data,
      }
    });
  }

  parts.push({ text: prompt });
  // Quality boosters for Gemini multimodal
  const qualityBoosterSuffix = '\n\nQUALITY DIRECTIVE: Generate this as a world-class advertising creative. Studio photography quality. Premium graphic design. Award-winning composition. Every element must look intentional, polished, and professionally crafted.';
  
  const criticalRules = 'CRITICAL ABSOLUTE RULES: DO NOT draw any brand logo. DO NOT render the words "Hola", "Prime", "HolaPrime" or any wordmark in the top-left corner. You MUST leave the top-left corner COMPLETELY blank and dark. The authentic logo will be programmatically overlaid later.\n\n';
  
  const finalPrompt = criticalRules + prompt + qualityBoosterSuffix;
  parts[parts.length - 1] = { text: finalPrompt }; // Replace the original prompt part with the enhanced one

  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      // When we have a reference image, we only need IMAGE output — no text commentary
      responseModalities: referenceImageData ? ['IMAGE'] : ['TEXT', 'IMAGE'],
      temperature: 1.0,   // Higher temperature = more creative, distinctive outputs
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ]
  };

  for (const modelId of GEMINI_IMAGE_MODELS) {
    const url = `${BASE_URL}/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`[ImageGen] Trying Gemini model: ${modelId}${referenceImageData ? ' (with reference image)' : ''}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[ImageGen] Model ${modelId} failed (${res.status}):`, errorText.substring(0, 300));
        continue;
      }

      const data = await res.json();
      const candidates = data.candidates || [];

      for (const candidate of candidates) {
        const candParts = candidate.content?.parts || [];
        for (const part of candParts) {
          if (part.inlineData?.data) {
            const dataUri = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            console.log(`[ImageGen] ✓ Success with Gemini model: ${modelId}`);
            return dataUri;
          }
        }
      }

      console.warn(`[ImageGen] Model ${modelId} responded but produced no images.`);
    } catch (err: any) {
      console.warn(`[ImageGen] Model ${modelId} network error:`, err.message);
    }
  }

  return null;
}

/**
 * Try Imagen models (text-to-image, higher quality, no reference support)
 */
async function tryImagenGeneration(prompt: string): Promise<string | null> {
  for (const modelId of IMAGEN_MODELS) {
    const url = `${BASE_URL}/${modelId}:predict?key=${GEMINI_API_KEY}`;
    console.log(`[ImageGen] Trying Imagen model: ${modelId}`);

    const qualityBoosterPrefix = 'Ultra-high quality, professional graphic design, 4K resolution, crisp sharp text, premium advertising creative, standard clean typography, professional legible fonts, award-winning design, studio-grade lighting, perfect composition, Cannes Lions quality, ';
    const criticalRules = 'CRITICAL ABSOLUTE RULES: DO NOT draw the "hola prime" logo. DO NOT render the word "PRIME" or "HOLA" anywhere in the entire image. The top-left corner MUST remain completely blank/empty dark space. Use standard, clean, professional sans-serif typography — absolutely NO distorted, messy, or non-standard fonts.\n\n';

    const enhancedPrompt = `WORLD-CLASS ADVERTISING — CANNES LIONS GRAND PRIX QUALITY:
${criticalRules}
${qualityBoosterPrefix}
${prompt}

TECHNICAL EXECUTION RULES:
- PRICE RENDERING: Prices must be rendered with mathematical precision. If a price is crossed out (strikethrough), the line must be clean and both numbers must be perfectly legible. No digital artifacts or messy overlaps.
- TEXT DISCIPLINE: "#WeAreTraders" in a pill badge top-right EXACTLY ONCE. No duplication.
- COMPOSITION: Professional studio product lighting. Deep depth of field. Ultra-sharp focus.
`;

    const body = {
      instances: [{ prompt: enhancedPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '9:16',   // Mobile-first vertical ads
        safetyFilterLevel: 'block_few',
        personGeneration: 'allow_adult',
        enhancePrompt: true,           // Enable Imagen's automatic quality enhancement
        outputMimeType: 'image/png',   // PNG for maximum quality (no JPEG compression artifacts)
      }
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[ImageGen] Imagen ${modelId} failed (${res.status}):`, errorText.substring(0, 300));
        continue;
      }

      const data = await res.json();
      const predictions = data.predictions || [];

      for (const pred of predictions) {
        if (pred.bytesBase64Encoded) {
          const mimeType = pred.mimeType || 'image/png';
          const dataUri = `data:${mimeType};base64,${pred.bytesBase64Encoded}`;
          console.log(`[ImageGen] ✓ Success with Imagen model: ${modelId}`);
          return dataUri;
        }
      }

      console.warn(`[ImageGen] Imagen ${modelId} responded but produced no images.`);
    } catch (err: any) {
      console.warn(`[ImageGen] Imagen ${modelId} network error:`, err.message);
    }
  }

  return null;
}

/**
 * Main export: generateImage
 *
 * imageSpec:
 *   - detailed: string (the image generation prompt)
 *   - negative: string (things to avoid)
 *   - referenceUrl: string (URL/data URI of source creative — used as visual reference)
 *   - sourceCreativeUrls: string[] (additional source thumbnails for multi-creative mode)
 *   - technicalSpecs: { aspectRatio, resolution }
 *
 * options:
 *   - tier: 'pro' | 'standard'
 */
export async function generateImage(imageSpec: any, options: any = {}) {
  // At least ONE provider must be configured.
  // Priority chain: OpenAI gpt-image-1 → Ideogram V_3 → Gemini/Imagen.
  if (!GEMINI_API_KEY && !IDEOGRAM_API_KEY && !OPENAI_API_KEY) {
    throw new Error(
      'No image generation provider configured. Add one of OPENAI_API_KEY, IDEOGRAM_API_KEY, or GEMINI_API_KEY to your .env file.',
    );
  }

  // ── Build the prompt text ──
  let prompt: string;
  let referenceUrl: string | undefined;
  let sourceCreativeUrls: string[] | undefined;

  if (typeof imageSpec === 'string') {
    prompt = imageSpec;
  } else {
    const { detailed, negative, technicalSpecs } = imageSpec;
    referenceUrl = imageSpec.referenceUrl;
    sourceCreativeUrls = imageSpec.sourceCreativeUrls;

    if (typeof detailed === 'string') {
      prompt = detailed;
    } else if (typeof detailed === 'object' && detailed !== null) {
      prompt = detailed.detailed || detailed.text || JSON.stringify(detailed);
    } else {
      prompt = JSON.stringify(imageSpec);
    }

    if (!prompt || prompt === '{}' || prompt === 'undefined') {
      prompt = 'Generate a professional high-quality advertisement image for a prop trading firm.';
    }

    if (technicalSpecs) {
      prompt += `\n\nAspect ratio: ${technicalSpecs.aspectRatio || '1:1'}, Resolution: ${technicalSpecs.resolution || '1080x1080'}.`;
    }
    if (negative) {
      prompt += `\n\nDo NOT include: ${negative}, ${ANTI_METADATA_NEGATIVE}`;
    } else {
      prompt += `\n\nDo NOT include: ${ANTI_METADATA_NEGATIVE}`;
    }
  }

  // ── BRANDING INSTRUCTION: #WeAreTraders only — the HolaPrime logo is a REAL PNG composited in post-processing ──
  // Check if the prompt already contains these instructions to avoid redundancy
  const hasBranding = prompt.includes('#WeAreTraders') || prompt.includes('TOP-LEFT');
  if (!hasBranding) {
    const brandingInstruction = `\n\nBRANDING: TOP-RIGHT CORNER — place "#WeAreTraders" in white text inside a thin oval/pill border exactly ONCE. DO NOT draw the brand logo. NEVER render "Hola Prime" as a logo in the top-left. The top-left area MUST be left absolutely empty/clear so we can overlay our own PNG logo later.`;
    prompt += brandingInstruction;
  }


  // ── Sanitize: remove framework terminology that Gemini renders as visible text ──
  prompt = sanitizePromptForImageGen(prompt);


  // ── Resolve the primary reference image ──
  // Priority: referenceUrl (user-uploaded or ad thumbnail), then first of sourceCreativeUrls
  const primaryRefUrl = referenceUrl || (sourceCreativeUrls && sourceCreativeUrls[0]);

  let referenceImageData: { mimeType: string; data: string } | null = null;
  if (primaryRefUrl) {
    console.log('[ImageGen] Fetching reference image for visual-grounded generation...');
    referenceImageData = await fetchImageBase64(primaryRefUrl);
    if (referenceImageData) {
      // ── CRITICAL DESIGN DECISION ──
      // Claude's brief generates a DETAILED, LAYOUT-SPECIFIC image prompt (600+ words)
      // describing exact compositions (split-screen, element positions, typography hierarchy, etc.)
      // We MUST preserve that prompt — it's what makes each creative unique.
      //
      // We only:
      // 1. PREPEND a short reference-grounding instruction (tells Gemini to use the source image)
      // 2. APPEND quality guardrails (spelling accuracy, no clutter)
      // 3. Trim if excessively long (Gemini degrades past ~2500 words)
      //
      // We NEVER replace Claude's prompt with a generic template.

      const claudePrompt = prompt; // This is Claude's detailed layout-specific prompt
      
      // Trim only if truly excessive — preserve as much detail as possible
      const maxPromptLength = 2500;
      const trimmedPrompt = claudePrompt.length > maxPromptLength
        ? claudePrompt.substring(0, maxPromptLength) + '\n[...continued — maintain the same direction]'
        : claudePrompt;

      // Short reference header + Claude's full prompt + layout quality guardrails
      // NOTE: Text accuracy (spelling, no duplicates) is handled by the TEXT MANIFEST
      // injected by the studio route BEFORE this prompt. These rules focus on VISUAL quality.
      prompt = `You are given a SOURCE AD CREATIVE image. Generate an improved VERSION 2 that is a premium visual upgrade.

${trimmedPrompt}

PREMIUM LAYOUT RULES (non-negotiable):
0. BRANDING AREA: TOP-LEFT corner should be kept clear/dark (the real HolaPrime logo PNG will be composited on top in post-processing — do NOT draw any logo or wordmark text there). TOP-RIGHT corner = "#WeAreTraders" in white inside a thin oval/pill border, appearing ONLY once.

1. BREATHING ROOM: Minimum 15-20% of the canvas must be empty dark space. Elements never touch edges. Generous margins.
2. COMPLETE VISIBILITY: Every text element including the disclaimer at the very bottom must be fully within the image frame. Nothing cut off.
3. ELEMENT DISCIPLINE: Maximum 5-6 distinct design elements. Every element must earn its place. Remove anything that adds clutter without impact.
4. SINGLE FOCAL POINT: One hero element (dollar amount, headline, or key visual) must visually dominate — making up 30-40% of visual attention. Everything else is supporting.
5. PERFECT ALIGNMENT: All elements align to a clean invisible grid. No floating or misaligned elements. Consistent margins on both sides.
6. TYPOGRAPHY HIERARCHY: Exactly 2 font weights (bold + regular). Hero text minimum 3x size of body text. No more than 3 type sizes total.
7. COLOR DISCIPLINE: Maximum 4 colors (background + text + accent + CTA). Cohesive, purposeful palette. Nothing random.
8. PREMIUM FINISH: This must look like it cost $50,000 to produce. Studio quality. If it looks cheap or template-like, regenerate.
9. TEXT ACCURACY: Render ALL text exactly as provided in the prompt. Zero improvisation on text. Spell every word correctly.
10. PROFESSIONAL PHOTOGRAPHY/RENDER QUALITY: The hero visual (if photographic or 3D) must have realistic lighting, proper shadows, material quality. Not illustrated or cartoon-like.`;

      // Sanitize framework terminology before sending to Gemini
      prompt = sanitizePromptForImageGen(prompt);
      console.log(`[ImageGen] Prompt length: ${prompt.length} chars (Claude's original: ${claudePrompt.length} chars, post-sanitize)`);
    }
  }

  // ── Generation strategy — 3-tier fallback chain ──
  // PRIMARY:    OpenAI gpt-image-1 (best aesthetic + composition)
  // SECONDARY:  Ideogram V_3      (best in-image text fidelity)
  // FINAL:      Gemini/Imagen     (already-paid fallback)
  // Each tier is tried only if the upstream provider's API key is set AND
  // the upstream provider failed. User can disable any tier by removing
  // its API key from .env.
  let dataUri: string | null = null;
  let providerUsed: 'openai' | 'ideogram' | 'gemini' = 'gemini';

  const aspectHint =
    (typeof imageSpec === 'object' && imageSpec?.technicalSpecs?.aspectRatio) ||
    undefined;
  const negativeHint =
    (typeof imageSpec === 'object' && imageSpec?.negative) || undefined;

  // ── TIER 1: Try OpenAI gpt-image-1 first if configured ──
  if (OPENAI_API_KEY) {
    try {
      const openaiResult = await generateImageOpenAI({
        prompt,
        size: normalizeOpenAISize(aspectHint),
        quality: 'high', // premium tier — best for ad creatives
        output_format: 'png', // lossless for text rendering
      });
      if (openaiResult) {
        dataUri = openaiResult.dataUri;
        providerUsed = 'openai';
        console.log(`[ImageGen] ✓ Primary path succeeded: OpenAI gpt-image-1 (${openaiResult.size}, ${openaiResult.quality})`);
      } else {
        console.log('[ImageGen] OpenAI returned null — falling through to Ideogram');
      }
    } catch (err: any) {
      console.warn('[ImageGen] OpenAI threw, falling through to Ideogram:', err.message);
    }
  }

  // ── TIER 2: Try Ideogram V_3 if OpenAI didn't deliver ──
  if (!dataUri && IDEOGRAM_API_KEY) {
    try {
      const ideogramResult = await generateImageIdeogram({
        prompt,
        aspect_ratio: normalizeAspectRatio(aspectHint),
        style_type: 'DESIGN',
        magic_prompt_option: 'OFF',
        negative_prompt: negativeHint,
      });
      if (ideogramResult) {
        dataUri = ideogramResult.dataUri;
        providerUsed = 'ideogram';
        console.log(`[ImageGen] ✓ Secondary path succeeded: Ideogram V_3 (seed: ${ideogramResult.seed})`);
      } else {
        console.log('[ImageGen] Ideogram returned null — falling through to Gemini');
      }
    } catch (err: any) {
      console.warn('[ImageGen] Ideogram threw, falling through to Gemini:', err.message);
    }
  }

  // ── TIER 3: Fall back to Gemini/Imagen ──
  if (!dataUri) {
    if (!GEMINI_API_KEY) {
      const tried: string[] = [];
      if (OPENAI_API_KEY) tried.push('OpenAI');
      if (IDEOGRAM_API_KEY) tried.push('Ideogram');
      throw new Error(
        `All configured image providers failed (${tried.join(', ')}) and no GEMINI_API_KEY set as final fallback. Check API keys and credit balances.`,
      );
    }
    if (referenceImageData) {
      dataUri = await tryGeminiGeneration(prompt, referenceImageData);
      if (!dataUri) {
        console.log('[ImageGen] Gemini multimodal failed, falling back to Imagen (no reference)...');
        dataUri = await tryImagenGeneration(prompt);
      }
    } else {
      dataUri = await tryImagenGeneration(prompt);
      if (!dataUri) {
        console.log('[ImageGen] Imagen failed, falling back to Gemini...');
        dataUri = await tryGeminiGeneration(prompt, null);
      }
    }
  }

  if (!dataUri) {
    throw new Error('Image generation failed after trying all available models (OpenAI, Ideogram, Gemini, Imagen).');
  }

  // ── Logo overlay control ──
  // When the caller passes options.skipLogo=true, we skip the logo overlay here.
  // This is the case when the studio route is in TEXT_OVERLAY_ENABLED mode — the
  // text-overlay step that runs after this draws its own logo, so applying it
  // twice would cause overlap/duplication.
  const skipLogo = options?.skipLogo === true;

  // ── LOGO OVERLAY: Composite the authentic Hola Prime logo onto every generated image ──
  // This guarantees every creative has the brand logo regardless of generation path.
  // Non-blocking: if overlay fails, the original image is returned.
  // Skipped when caller is using the text-overlay compositor — text-overlay draws its
  // own logo, so running both would cause overlap.
  if (!skipLogo) {
    try {
      dataUri = await applyLogoOverlay(dataUri);
    } catch (logoErr: any) {
      console.warn('[ImageGen] Logo overlay failed (non-blocking):', logoErr.message);
    }
  } else {
    console.log('[ImageGen] Skipping logo overlay (caller will composite logo + text together)');
  }

  return {
    provider: providerUsed,
    url: dataUri,
    dataUri,
  };
}
