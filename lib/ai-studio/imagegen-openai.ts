/**
 * OpenAI Image Generation Client (gpt-image-1)
 *
 * Calls OpenAI's gpt-image-1 model — the successor to DALL-E 3. Strong on
 * premium aesthetic, composition, and product photography. Decent (not best)
 * at in-image text rendering — but combined with the hardened prompt rules
 * in studio/route.ts, text quality is generally acceptable for ad creatives.
 *
 * Key differences from Ideogram/Gemini:
 *   - Native portrait sizes: 1024x1536 (closest to 9:16, good for Stories/Reels)
 *   - Returns base64 directly — no URL expiry concerns
 *   - "high" quality tier produces the most premium output but costs ~$0.17/image
 *   - "medium" tier at ~$0.04/image is the sweet spot for testing
 *
 * Auth: OPENAI_API_KEY in .env. Get one at https://platform.openai.com/api-keys.
 * The "openai" npm SDK (v6+) handles the HTTP client; we use its images.generate().
 *
 * Response shape matches Gemini/Ideogram so generateImage() can swap providers
 * transparently.
 */

import OpenAI, { toFile } from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return _client;
}

// gpt-image-1 supports these sizes only (per OpenAI docs)
export type OpenAIImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

// Quality tier — higher = better but more expensive
export type OpenAIImageQuality = "low" | "medium" | "high" | "auto";

export interface OpenAIGenerateParams {
  /** The image generation prompt — max 32,000 chars for gpt-image-1. */
  prompt: string;

  /**
   * Output size:
   *   - 1024x1024  → square (1:1)
   *   - 1024x1536  → portrait (2:3, closest to 9:16 — use for Stories/Reels)
   *   - 1536x1024  → landscape (3:2)
   *   - auto       → let OpenAI choose
   *
   * Default 1024x1536 (portrait) since our ads are 9:16 vertical.
   */
  size?: OpenAIImageSize;

  /**
   * Quality tier. "high" gives the most premium output; "medium" is the
   * cost-effective default for active testing. Default "high".
   *
   * Approx costs:
   *   - low:    ~$0.011/img (1024x1024) or $0.016 (portrait/landscape)
   *   - medium: ~$0.042/img
   *   - high:   ~$0.167/img
   */
  quality?: OpenAIImageQuality;

  /** Output format. PNG is lossless — best for text rendering. JPEG is smaller. */
  output_format?: "png" | "jpeg" | "webp";

  /** Compression level 0-100 (only applies to jpeg/webp). */
  output_compression?: number;

  /** Background. "auto" lets the model choose; "opaque" forces a solid background. */
  background?: "transparent" | "opaque" | "auto";
}

export interface OpenAIResult {
  /** Base64 data URI ready for the rest of the pipeline. */
  dataUri: string;
  /** Same as dataUri — kept for API parity with other providers. */
  url: string;
  provider: "openai";
  model: "gpt-image-1";
  /** Size the model actually rendered. */
  size: string;
  /** Quality tier used. */
  quality: string;
}

/**
 * Generate one image via OpenAI gpt-image-1. Returns null on failure so the
 * caller can fall back to another provider.
 *
 * gpt-image-1 always returns base64 directly (no temporary URL), so we don't
 * need a download step like Ideogram requires.
 */
export async function generateImageOpenAI(
  params: OpenAIGenerateParams,
): Promise<OpenAIResult | null> {
  if (!OPENAI_API_KEY) {
    console.log("[OpenAI] OPENAI_API_KEY not set — skipping OpenAI path");
    return null;
  }

  const requestBody = {
    model: "gpt-image-1" as const,
    prompt: params.prompt,
    size: params.size ?? ("1024x1536" as const),
    quality: params.quality ?? ("high" as const),
    output_format: params.output_format ?? ("png" as const),
    n: 1,
    ...(params.output_compression !== undefined && (params.output_format === "jpeg" || params.output_format === "webp")
      ? { output_compression: params.output_compression }
      : {}),
    ...(params.background ? { background: params.background } : {}),
  };

  console.log(
    `[OpenAI] Generating image (model: gpt-image-1, size: ${requestBody.size}, quality: ${requestBody.quality}, prompt: ${params.prompt.length} chars)`,
  );

  let response: any;
  try {
    response = await getClient().images.generate(requestBody as any);
  } catch (err: any) {
    // Friendly error messages for common failure modes
    const status = err?.status;
    const message = err?.message || String(err);

    if (status === 401 || status === 403) {
      console.error(
        `[OpenAI] Auth failed (${status}). Check OPENAI_API_KEY in .env. Message: ${message.substring(0, 300)}`,
      );
    } else if (status === 402 || /billing|quota|insufficient/i.test(message)) {
      console.error(
        "[OpenAI] Billing / quota issue. Top up at https://platform.openai.com/settings/organization/billing/overview",
      );
    } else if (status === 429) {
      console.warn("[OpenAI] Rate limited. Backing off.");
    } else if (status === 400 || /content_policy|moderation/i.test(message)) {
      console.error(
        `[OpenAI] Prompt rejected (likely content policy): ${message.substring(0, 400)}`,
      );
    } else if (status >= 500) {
      console.warn(`[OpenAI] Server error (${status}). Will fall back.`);
    } else {
      console.error(`[OpenAI] Generation failed: ${message.substring(0, 400)}`);
    }
    return null;
  }

  const image = response?.data?.[0];
  if (!image?.b64_json) {
    console.error(
      "[OpenAI] Response had no b64_json. Full response:",
      JSON.stringify(response).substring(0, 500),
    );
    return null;
  }

  // gpt-image-1 returns base64 directly — wrap it in a data URI
  const mimeType =
    requestBody.output_format === "jpeg"
      ? "image/jpeg"
      : requestBody.output_format === "webp"
      ? "image/webp"
      : "image/png";
  const dataUri = `data:${mimeType};base64,${image.b64_json}`;
  const approxKB = Math.round((image.b64_json.length * 3) / 4 / 1024);

  console.log(
    `[OpenAI] ✓ Generated image (size: ${requestBody.size}, quality: ${requestBody.quality}, ~${approxKB}KB)`,
  );

  return {
    dataUri,
    url: dataUri,
    provider: "openai",
    model: "gpt-image-1",
    size: requestBody.size,
    quality: requestBody.quality,
  };
}

/**
 * Image-to-image: transform a REFERENCE image with a text prompt via
 * gpt-image-1's edits endpoint. Used when the user attaches a reference in the
 * Studio so the output is visually grounded in their image. Returns null on
 * failure so the caller can fall back to text-to-image.
 */
export async function editImageOpenAI(params: {
  prompt: string;
  imageDataUri: string;
  size?: OpenAIImageSize;
  quality?: OpenAIImageQuality;
}): Promise<OpenAIResult | null> {
  if (!OPENAI_API_KEY) return null;
  if (!params.imageDataUri || !params.imageDataUri.startsWith("data:image")) {
    console.log("[OpenAI] editImage: reference is not an image data URI — skipping edit");
    return null;
  }
  try {
    const comma = params.imageDataUri.indexOf(",");
    const semi = params.imageDataUri.indexOf(";");
    const mime = params.imageDataUri.substring(5, semi > 5 ? semi : params.imageDataUri.indexOf(",")) || "image/png";
    const buf = Buffer.from(params.imageDataUri.substring(comma + 1), "base64");
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : (mime.includes("jpeg") || mime.includes("jpg")) ? "jpg" : "png";
    const file = await toFile(buf, `reference.${ext}`, { type: mime });

    const size = params.size ?? ("1024x1536" as const);
    const quality = params.quality ?? ("high" as const);
    console.log(`[OpenAI] images.edit (gpt-image-1, ${size}, ${quality}, ref ${Math.round(buf.length / 1024)}KB, prompt ${params.prompt.length} chars)`);

    const resp: any = await getClient().images.edit({
      model: "gpt-image-1",
      image: file as any,
      prompt: params.prompt,
      size,
      quality,
    } as any);

    const b64 = resp?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[OpenAI] images.edit returned no b64_json");
      return null;
    }
    const dataUri = `data:image/png;base64,${b64}`;
    console.log("[OpenAI] ✓ images.edit complete (reference-grounded)");
    return { dataUri, url: dataUri, provider: "openai", model: "gpt-image-1", size: String(size), quality: String(quality) };
  } catch (err: any) {
    console.warn("[OpenAI] images.edit failed:", err?.status, (err?.message || String(err)).substring(0, 240));
    return null;
  }
}

/**
 * Map a free-form aspect-ratio hint (e.g. "9:16", "1080x1920", "vertical") to
 * an OpenAI-supported size string. gpt-image-1 only supports 3 fixed sizes +
 * auto, so we pick the closest match.
 */
export function normalizeOpenAISize(aspectRatioHint?: string): OpenAIImageSize {
  if (!aspectRatioHint) return "1024x1536"; // portrait default for ad creatives
  const s = aspectRatioHint.toLowerCase().trim();

  // Square
  if (s === "1:1" || s === "1x1" || s.includes("square")) return "1024x1024";

  // Landscape variants
  if (
    s === "16:9" ||
    s === "16x9" ||
    s === "1920x1080" ||
    s === "3:2" ||
    s === "3x2" ||
    s.includes("landscape") ||
    s.includes("horizontal")
  ) {
    return "1536x1024";
  }

  // Portrait variants (everything 9:16-ish, 2:3, 4:5, vertical, story, reel)
  if (
    s === "9:16" ||
    s === "9x16" ||
    s === "1080x1920" ||
    s === "2:3" ||
    s === "2x3" ||
    s === "4:5" ||
    s === "4x5" ||
    s.includes("vertical") ||
    s.includes("portrait") ||
    s.includes("story") ||
    s.includes("reel")
  ) {
    return "1024x1536";
  }

  // Default to portrait for ad-creative use cases
  return "1024x1536";
}
