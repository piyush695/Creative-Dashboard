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
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      // When we have a reference image, we only need IMAGE output — no text commentary
      responseModalities: referenceImageData ? ['IMAGE'] : ['TEXT', 'IMAGE'],
      temperature: 0.7,
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

    const body = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '9:16',   // Mobile-first vertical ads
        safetyFilterLevel: 'block_few',
        personGeneration: 'allow_adult',
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
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured. Add it to your .env file.');

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
      prompt += `\n\nDo NOT include: ${negative}`;
    }
  }

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
      prompt = `You are given a SOURCE AD CREATIVE image. Generate an improved VERSION 2 that is a premium visual upgrade of the source.

${trimmedPrompt}

LAYOUT QUALITY RULES (override the above if there's a conflict):
1. WHITESPACE — at least 15-20% of the image must be empty breathing room. Generous margins on all sides and between elements. Nothing touches the edges of the image.
2. ALL TEXT MUST FIT — every text element, including the disclaimer at the bottom, must be fully visible within the image boundaries. Nothing gets cut off.
3. MAXIMUM 5-6 DISTINCT ELEMENTS — logo, hero text, visual/illustration, bullet block, CTA button, disclaimer. If there are more, remove the least important. Less is more.
4. SINGLE FOCAL POINT — one element (hero dollar amount or key visual) must be dramatically larger than everything else, occupying 30-40% of visual attention.
5. CLEAR GRID ALIGNMENT — all text blocks and boxes align cleanly on an invisible grid. No randomly floating or misaligned elements.
6. RENDER ONLY TEXT FROM THE PROMPT — do not add labels, captions, watermarks, or any text not explicitly provided in the prompt above. If a text manifest was provided, follow it exactly.`;

      console.log(`[ImageGen] Prompt length: ${prompt.length} chars (Claude's original: ${claudePrompt.length} chars)`);
    }
  }

  // ── Generation strategy ──
  // If we have a reference image → use Gemini multimodal (can take image input)
  // Otherwise → try Imagen (better quality for text-to-image)
  let dataUri: string | null = null;

  if (referenceImageData) {
    // Path 1: Reference-grounded generation using Gemini multimodal
    dataUri = await tryGeminiGeneration(prompt, referenceImageData);
    // Fallback: try without reference but with Imagen
    if (!dataUri) {
      console.log('[ImageGen] Gemini multimodal failed, falling back to Imagen (no reference)...');
      dataUri = await tryImagenGeneration(prompt);
    }
  } else {
    // Path 2: Pure text-to-image — try Imagen first, then Gemini
    dataUri = await tryImagenGeneration(prompt);
    if (!dataUri) {
      console.log('[ImageGen] Imagen failed, falling back to Gemini...');
      dataUri = await tryGeminiGeneration(prompt, null);
    }
  }

  if (!dataUri) {
    throw new Error('Image generation failed after trying all available models.');
  }

  return {
    provider: 'gemini',
    url: dataUri,
    dataUri,
  };
}
