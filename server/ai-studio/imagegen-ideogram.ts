/**
 * Ideogram Image Generation Client
 *
 * Calls Ideogram's V_3 API for image generation. Ideogram is purpose-built for
 * typography-heavy ad creatives — it handles in-image text far better than
 * general-purpose image models (DALL-E, Gemini, SDXL).
 *
 * Key differences from Gemini:
 *   - Text rendering: best-in-class. Drops/doubles characters extremely rarely.
 *   - Aesthetic: "design" style is the ad-creative default — premium, clean.
 *   - URLs expire: response gives temporary URL that we must download immediately.
 *   - Pricing: pay-per-image, separate from Ideogram consumer subscriptions.
 *
 * Auth: IDEOGRAM_API_KEY in .env. Get one at https://ideogram.ai (Settings →
 * API Beta → accept developer agreement → add payment → create key).
 *
 * Response shape matches Gemini's so generateImage() in imagegen.ts can swap
 * providers transparently.
 */

const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY || "";
const IDEOGRAM_BASE_URL = "https://api.ideogram.ai/v1";

// Ideogram V_3 aspect ratios — use 'x' separator, not ':'
export type IdeogramAspectRatio =
  | "1x1"
  | "16x9"
  | "9x16"
  | "4x3"
  | "3x4"
  | "3x2"
  | "2x3"
  | "16x10"
  | "10x16"
  | "5x4"
  | "4x5";

// Ideogram V_3 style types
// "DESIGN" is best for ad creatives (typography-heavy, clean layouts)
// "REALISTIC" is best for product photography
// "GENERAL" is the catch-all default
export type IdeogramStyleType =
  | "AUTO"
  | "GENERAL"
  | "REALISTIC"
  | "DESIGN"
  | "RENDER_3D"
  | "ANIME";

export interface IdeogramGenerateParams {
  /** The image generation prompt — what we want Ideogram to render. */
  prompt: string;

  /** Things to avoid in the rendered image. */
  negative_prompt?: string;

  /** Output aspect ratio. Default 9x16 (Stories/Reels vertical) for our ad creatives. */
  aspect_ratio?: IdeogramAspectRatio;

  /** Visual style. Default DESIGN for ad creatives. */
  style_type?: IdeogramStyleType;

  /**
   * Whether to let Ideogram "enhance" the prompt itself.
   * OFF means our prompt is sent verbatim — we want this because we control the prompt.
   */
  magic_prompt_option?: "AUTO" | "ON" | "OFF";

  /** Number of images per call. We use 1 (Studio renders one per variant). */
  num_images?: number;

  /** Reproducibility — same seed + prompt = same image. */
  seed?: number;
}

interface IdeogramApiResponse {
  data: Array<{
    prompt: string;
    resolution: string;
    is_image_safe: boolean;
    seed: number;
    url: string;
    style_type: string;
  }>;
}

export interface IdeogramResult {
  /** Base64 data URI of the generated image (downloaded immediately because Ideogram URLs expire). */
  dataUri: string;
  /** Same as dataUri — kept for API parity with Gemini return shape. */
  url: string;
  provider: "ideogram";
  model: "V_3";
  /** Reproducibility seed Ideogram used. */
  seed: number;
  /** Resolution Ideogram chose (e.g. "1024x1024" or "768x1366"). */
  resolution: string;
}

/**
 * Generate one image via Ideogram V_3. Returns null on failure so the caller
 * can fall back to another provider.
 *
 * Important: Ideogram URLs expire (typically within minutes). This function
 * downloads the image immediately and returns a base64 data URI so the rest
 * of the pipeline doesn't need to worry about expiry.
 */
export async function generateImageIdeogram(
  params: IdeogramGenerateParams,
): Promise<IdeogramResult | null> {
  if (!IDEOGRAM_API_KEY) {
    console.log("[Ideogram] IDEOGRAM_API_KEY not set — skipping Ideogram path");
    return null;
  }

  const body = {
    prompt: params.prompt,
    aspect_ratio: params.aspect_ratio ?? "9x16",
    style_type: params.style_type ?? "DESIGN",
    magic_prompt_option: params.magic_prompt_option ?? "OFF",
    num_images: params.num_images ?? 1,
    ...(params.negative_prompt ? { negative_prompt: params.negative_prompt } : {}),
    ...(params.seed !== undefined ? { seed: params.seed } : {}),
  };

  const url = `${IDEOGRAM_BASE_URL}/ideogram-v3/generate`;
  console.log(
    `[Ideogram] Generating image (aspect: ${body.aspect_ratio}, style: ${body.style_type}, prompt: ${body.prompt.length} chars)`,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Api-Key": IDEOGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    console.error("[Ideogram] Network error calling generate endpoint:", err.message);
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    // Friendly error messages for common failure modes
    if (res.status === 401 || res.status === 403) {
      console.error(
        `[Ideogram] Auth failed (${res.status}). Check IDEOGRAM_API_KEY in .env. Body: ${text.substring(0, 300)}`,
      );
    } else if (res.status === 402) {
      console.error(
        "[Ideogram] Insufficient credits. Top up via https://ideogram.ai → Settings → API Beta → Manage Payment.",
      );
    } else if (res.status === 429) {
      console.warn("[Ideogram] Rate limited. Backing off.");
    } else if (res.status >= 500) {
      console.warn(`[Ideogram] Server error (${res.status}). Will retry / fall back.`);
    } else {
      console.error(`[Ideogram] API error (${res.status}): ${text.substring(0, 400)}`);
    }
    return null;
  }

  let json: IdeogramApiResponse;
  try {
    json = (await res.json()) as IdeogramApiResponse;
  } catch (err: any) {
    console.error("[Ideogram] Could not parse JSON response:", err.message);
    return null;
  }

  const image = json.data?.[0];
  if (!image?.url) {
    console.error(
      "[Ideogram] Response had no image URL. Full response:",
      JSON.stringify(json).substring(0, 500),
    );
    return null;
  }

  if (image.is_image_safe === false) {
    console.warn("[Ideogram] Image flagged as unsafe by Ideogram. Skipping.");
    return null;
  }

  // Download the image immediately — Ideogram URLs expire within minutes.
  let imgRes: Response;
  try {
    imgRes = await fetch(image.url);
  } catch (err: any) {
    console.error("[Ideogram] Could not download generated image:", err.message);
    return null;
  }

  if (!imgRes.ok) {
    console.error(`[Ideogram] Image download failed (${imgRes.status}). URL may have expired already.`);
    return null;
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await imgRes.arrayBuffer();
  } catch (err: any) {
    console.error("[Ideogram] Could not read image bytes:", err.message);
    return null;
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const dataUri = `data:${mimeType};base64,${base64}`;

  console.log(
    `[Ideogram] ✓ Generated image (seed: ${image.seed}, resolution: ${image.resolution}, size: ${Math.round(buffer.byteLength / 1024)}KB)`,
  );

  return {
    dataUri,
    url: dataUri,
    provider: "ideogram",
    model: "V_3",
    seed: image.seed,
    resolution: image.resolution,
  };
}

/**
 * Map a free-form aspect-ratio hint (Claude's brief often outputs "9:16" or
 * "1080x1920" or "vertical") into an Ideogram-compatible aspect ratio string.
 */
export function normalizeAspectRatio(input?: string): IdeogramAspectRatio {
  if (!input) return "9x16";
  const s = input.toLowerCase().trim();

  // Direct matches
  if (s === "1:1" || s === "1x1" || s.includes("square")) return "1x1";
  if (s === "9:16" || s === "9x16" || s === "1080x1920" || s.includes("vertical") || s.includes("story") || s.includes("reel")) return "9x16";
  if (s === "16:9" || s === "16x9" || s === "1920x1080" || s.includes("horizontal") || s.includes("landscape")) return "16x9";
  if (s === "4:5" || s === "4x5" || s.includes("portrait")) return "4x5";
  if (s === "5:4" || s === "5x4") return "5x4";
  if (s === "3:4" || s === "3x4") return "3x4";
  if (s === "4:3" || s === "4x3") return "4x3";
  if (s === "2:3" || s === "2x3") return "2x3";
  if (s === "3:2" || s === "3x2") return "3x2";

  // Fallback default for ad creatives
  return "9x16";
}
