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
// Confirmed available on this API key (tested 2026-03-18)
const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',       // ✅ Confirmed available
  'imagen-4.0-fast-generate-001',  // ✅ Confirmed available (faster)
  'imagen-4.0-ultra-generate-001', // ✅ Confirmed available (best quality)
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
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.9,
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
        aspectRatio: '1:1',
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
      // Prepend a rich, rule-driven instruction for reference-grounded generation
      prompt = `You are given a SOURCE AD CREATIVE image for Hola Prime, a prop trading firm. Generate a VERSION 2 — a visually improved ad creative that looks like a premium upgrade of the source creative.

CRITICAL CONVERSION RULES — APPLY ALL TO THE IMAGE:
1. URGENCY: Include a countdown timer OR 'Only X Spots Left!' OR 'Limited Time' badge — MANDATORY
2. HERO DOLLAR AMOUNT: The challenge size (e.g. $2K, $25K) MUST appear as a LARGE, BOLD, 3D-style typographic hero element — the dollar amount IS the #1 visual
3. DISCOUNT BADGE: Include '40% OFF' badge OR promo code 'TAKEOFF40' prominently
4. LOW BARRIER TEXT: Include 'Lowest Barrier Ever', 'Risk-Free', or 'Your Easiest Path to Funded Trading'
5. BULLET BENEFITS: Rounded container with 3 checkmarks: '1-Step Process', '5% Profit Target', 'No Time Limits'
6. CTA BUTTON: Full-width, high-contrast button — text: 'CLAIM YOUR $2K CHALLENGE NOW' or similar commanding verb
7. COLOR: Dark navy/black background, white bold text, electric blue accents — NO bright white backgrounds
8. VISUAL MOTIFS: Subtle trading chart grid pattern in background, rocket or upward arrow motifs
9. SOCIAL PROOF: 'Trusted by X+ traders' badge OR '#WeAreTraders' hashtag
10. MOBILE-FIRST: Top 30% of image MUST immediately hook — lead with discount badge or dollar amount

STYLE: Match source creative's exact color palette, layout structure, and brand aesthetic. This is an UPGRADE not a replacement. Hola Prime logo top-left. Fine print disclaimer at bottom.

NOW APPLY THE SPECIFIC IMPROVEMENTS BELOW:\n\n${prompt}`;
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
