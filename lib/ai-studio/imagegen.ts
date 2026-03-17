/**
 * Image Generation Service — Google Gemini Native Image Generation
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Models that support native image generation (responseModalities: IMAGE)
const IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  'imagen-4.0-generate-001'
];

export async function generateImage(imageSpec: any, options: any = {}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured. Add it to your .env file.');

  // Handle both object and string prompts
  let prompt: string;
  let referenceUrl: string | undefined;

  if (typeof imageSpec === 'string') {
    prompt = imageSpec;
  } else {
    const { detailed, negative, technicalSpecs } = imageSpec;
    referenceUrl = imageSpec.referenceUrl;
    
    // Extract prompt text from various formats
    if (typeof detailed === 'string') {
      prompt = detailed;
    } else if (typeof detailed === 'object' && detailed !== null) {
      prompt = detailed.detailed || detailed.text || JSON.stringify(detailed);
    } else {
      prompt = JSON.stringify(imageSpec);
    }
    
    if (technicalSpecs) {
      prompt += `\n\nTechnical specs: ${technicalSpecs.aspectRatio || '1:1'} aspect ratio, ${technicalSpecs.resolution || '1080x1080'} resolution.`;
    }
    if (negative) prompt += `\n\nAvoid including: ${negative}`;
  }

  // Ensure prompt is not empty
  if (!prompt || prompt === '{}' || prompt === 'undefined') {
    prompt = 'Generate a professional, high-quality advertisement creative image for a trading platform.';
  }

  const parts: any[] = [];
  
  // Add reference image if provided
  if (referenceUrl) {
    try {
      if (referenceUrl.startsWith('data:')) {
        const commaIndex = referenceUrl.indexOf(',');
        const meta = referenceUrl.substring(0, commaIndex);
        const data = referenceUrl.substring(commaIndex + 1);
        const mimeType = meta.split(':')[1].split(';')[0];
        parts.push({ inlineData: { mimeType, data } });
      } else {
        const imgRes = await fetch(referenceUrl);
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const data = Buffer.from(buffer).toString('base64');
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          parts.push({ inlineData: { mimeType, data } });
        }
      }
      prompt = `Using the attached image as a style/structure reference, create a new creative: ${prompt}`;
    } catch (err) {
      console.warn('[ImageGen] Failed to attach reference image:', err);
    }
  }

  parts.push({ text: `Generate a high-quality advertisement image based on this description: ${prompt}` });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 1.0,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ]
  };

  // Try each model in order until one works
  let lastError = '';
  for (const modelId of IMAGE_MODELS) {
    const url = `${BASE_URL}/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`[ImageGen] Trying model: ${modelId}`);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[ImageGen] Model ${modelId} failed (${res.status}):`, errorText.substring(0, 300));
        lastError = `Model ${modelId}: ${res.status}`;
        continue; // Try next model
      }

      const data = await res.json();
      const images: any[] = [];

      const candidates = data.candidates || [];
      for (const candidate of candidates) {
        const candParts = candidate.content?.parts || [];
        for (const part of candParts) {
          if (part.inlineData) {
            images.push({
              dataUri: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mimeType: part.inlineData.mimeType,
            });
          }
        }
      }

      if (images.length > 0) {
        console.log(`[ImageGen] Success with model: ${modelId}, generated ${images.length} image(s)`);
        return {
          provider: 'gemini',
          model: modelId,
          url: images[0].dataUri,
          dataUri: images[0].dataUri,
          images
        };
      }

      // Model responded but didn't produce images
      console.warn(`[ImageGen] Model ${modelId} responded but produced no images. Candidates:`, JSON.stringify(data).substring(0, 300));
      lastError = `Model ${modelId}: No images in response`;

    } catch (err: any) {
      console.warn(`[ImageGen] Model ${modelId} network error:`, err.message);
      lastError = `Model ${modelId}: ${err.message}`;
    }
  }

  throw new Error(`Image generation failed after trying all models. Last error: ${lastError}`);
}
