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

// Last human-readable failure reason from generateImageOpenAI(). The function
// returns null on failure (so provider-fallback callers keep working), so this
// lets the direct-mode path surface WHY it failed instead of a generic message.
let _lastError: string | null = null;
export function getLastOpenAIError(): string | null {
  return _lastError;
}

// Map an OpenAI SDK error to a short, actionable message for the end user.
function friendlyOpenAIError(err: any): string {
  const status = err?.status;
  const code = err?.code || err?.error?.code || "";
  const message = err?.message || String(err);
  if (code === "billing_hard_limit_reached" || /billing|quota|insufficient/i.test(message) || status === 402) {
    return "OpenAI billing limit reached. Add credits or raise your usage limit at platform.openai.com → Settings → Billing, then try again.";
  }
  if (status === 401 || status === 403) {
    return "OpenAI rejected the API key (auth failed). Check OPENAI_API_KEY in .env.";
  }
  if (status === 429) {
    return "OpenAI rate limit hit. Wait a moment and try again.";
  }
  if (status === 400 && /content_policy|moderation|safety/i.test(message)) {
    return "OpenAI rejected the prompt (content policy). Try rephrasing the request.";
  }
  return `OpenAI image generation failed: ${message.substring(0, 200)}`;
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

  _lastError = null;
  let response: any;
  try {
    response = await getClient().images.generate(requestBody as any);
  } catch (err: any) {
    _lastError = friendlyOpenAIError(err);
    console.error(`[OpenAI] ${_lastError} (status: ${err?.status}, code: ${err?.code || err?.error?.code || "?"})`);
    return null;
  }

  const image = response?.data?.[0];
  if (!image?.b64_json) {
    _lastError = "OpenAI returned an empty response (no image data).";
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
 * Convert a reference image (data URI or remote URL) into an OpenAI-uploadable
 * File. Returns null if the source can't be read (bad URL, fetch failure) so the
 * caller can skip it instead of aborting the whole edit.
 */
async function referenceToFile(ref: string, idx: number): Promise<any | null> {
  try {
    if (ref.startsWith("data:")) {
      const [meta, data] = ref.split(",");
      const mimeType = meta.split(":")[1]?.split(";")[0] || "image/png";
      const ext = mimeType.split("/")[1] || "png";
      const buffer = Buffer.from(data, "base64");
      return await toFile(buffer, `reference-${idx}.${ext}`, { type: mimeType });
    }
    // Remote URL — download then wrap.
    const resp = await fetch(ref);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const mimeType = resp.headers.get("content-type") || "image/png";
    const ext = mimeType.split("/")[1] || "png";
    const buffer = Buffer.from(await resp.arrayBuffer());
    return await toFile(buffer, `reference-${idx}.${ext}`, { type: mimeType });
  } catch (err: any) {
    console.warn(`[OpenAI] Reference image ${idx} could not be loaded (skipping):`, err?.message);
    return null;
  }
}

export interface OpenAIEditParams extends OpenAIGenerateParams {
  /** One or more reference images (data URIs or remote URLs) to edit/remix. */
  references: string[];
}

/**
 * Edit / remix using OpenAI gpt-image-1's images.edit endpoint. Unlike
 * images.generate (text-only), this takes the user's attached image(s) as the
 * visual base so the output is grounded in what they uploaded. Used by the
 * Studio's Direct mode whenever the user attaches a reference image.
 *
 * gpt-image-1 accepts multiple input images — we pass all of them so the model
 * can compose/blend the references. Returns null on failure so callers can fall
 * back to text-only generation.
 */
export async function editImageOpenAI(
  params: OpenAIEditParams,
): Promise<OpenAIResult | null> {
  if (!OPENAI_API_KEY) {
    console.log("[OpenAI] OPENAI_API_KEY not set — skipping OpenAI edit path");
    return null;
  }

  _lastError = null;

  const files = (
    await Promise.all(params.references.map((ref, i) => referenceToFile(ref, i)))
  ).filter(Boolean);

  if (files.length === 0) {
    _lastError = "None of the attached reference images could be loaded for editing.";
    console.error(`[OpenAI] ${_lastError}`);
    return null;
  }

  const size = params.size ?? ("1024x1536" as const);
  const quality = params.quality ?? ("high" as const);

  console.log(
    `[OpenAI] Editing image (model: gpt-image-1, ${files.length} reference image(s), size: ${size}, quality: ${quality}, prompt: ${params.prompt.length} chars)`,
  );

  let response: any;
  try {
    response = await getClient().images.edit({
      model: "gpt-image-1",
      image: files.length === 1 ? files[0] : (files as any),
      prompt: params.prompt,
      size,
      quality,
      n: 1,
    } as any);
  } catch (err: any) {
    _lastError = friendlyOpenAIError(err);
    console.error(`[OpenAI] ${_lastError} (status: ${err?.status}, code: ${err?.code || err?.error?.code || "?"})`);
    return null;
  }

  const image = response?.data?.[0];
  if (!image?.b64_json) {
    _lastError = "OpenAI returned an empty response (no image data) for the edit request.";
    console.error("[OpenAI] Edit response had no b64_json. Full response:", JSON.stringify(response).substring(0, 500));
    return null;
  }

  // gpt-image-1 edit always returns PNG base64
  const dataUri = `data:image/png;base64,${image.b64_json}`;
  const approxKB = Math.round((image.b64_json.length * 3) / 4 / 1024);
  console.log(`[OpenAI] ✓ Edited image (size: ${size}, quality: ${quality}, ~${approxKB}KB)`);

  return {
    dataUri,
    url: dataUri,
    provider: "openai",
    model: "gpt-image-1",
    size,
    quality,
  };
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
