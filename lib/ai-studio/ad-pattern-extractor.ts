/**
 * Per-Ad Pattern Extractor
 *
 * Runs Claude Vision on a single ad's snapshot URL and extracts structured
 * patterns (hook, layout type, color palette, CTA style, psychology tactics,
 * format, what makes it likely to convert).
 *
 * Patterns are stored alongside the ad in `ad_library` and surfaced to the
 * Studio generation prompt as text context.
 *
 * Cost note: each ad costs ~1 Claude Vision call. Sync runs over ~13 brands x
 * ~15 ads = ~200 calls. We rate-limit + batch + only extract for ads without
 * existing patterns.
 */

import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { extractAndRepairJson } from "./parser";
import type { AdPattern, StoredAd } from "./ad-library-db";

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are an ad creative analyst. Given a single ad image and its copy, you extract a structured JSON description of WHY this ad likely works. Be specific, observational, and concise. Do NOT moralize, do NOT add caveats. Return ONLY raw JSON — no markdown, no preamble.`;

const SCHEMA_INSTRUCTION = `Return JSON matching this exact shape:
{
  "hook": {
    "visual": "<one sentence: what catches the eye first — a giant price, a face, a glowing orb, etc>",
    "verbal": "<the literal opening 3-5 words of the ad text, in quotes if visible>"
  },
  "layoutType": "<one of: price-hero | product-hero | testimonial | offer-stack | urgency-banner | brand-build | comparison | data-driven>",
  "colorPalette": ["<3-5 dominant colors as hex or names>"],
  "ctaCopy": "<exact CTA button text, or empty string if none visible>",
  "ctaStyle": "<one of: blue-pill | green-pill | dark-pill | underline-link | outline-button | text-only | none>",
  "psychology": ["<from: scarcity, anchoring, loss-aversion, social-proof, authority, reciprocity, urgency, novelty — pick 1-3 most evident>"],
  "format": "<one of: offer | brand | educational | urgency | testimonial | comparison>",
  "uniqueWinning": ["<1-3 concrete reasons this ad likely converts — be specific>"],
  "visualReferences": ["<concrete visual elements: phone-mockup | 3d-coin | candlestick-chart | human-face | iridescent-sphere | typography-only | logo-only | etc>"],
  "copyTone": "<one of: direct | playful | urgent | authoritative | aspirational | educational>",
  "language": "<2-letter ISO code, default 'en'>"
}`;

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

function mediaTypeFromExt(ext: string): ImageMediaType {
  const lower = ext.toLowerCase();
  if (lower === ".png") return "image/png";
  if (lower === ".webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Read a local upload (served from /public/...) directly off disk and return
 * as base64. Triggered when the image URL starts with `/ad-library-uploads/`
 * — these are saved by the manual sync and aren't reachable via fetch() in
 * server-side code without spinning up an HTTP request to ourselves.
 */
async function readLocalImageAsBase64(
  publicUrl: string,
): Promise<{ data: string; media_type: ImageMediaType } | null> {
  try {
    // /ad-library-uploads/<slug>/<filename> → public/ad-library-uploads/...
    const relativePath = publicUrl.replace(/^\/+/, ""); // strip leading slash
    const absPath = path.join(process.cwd(), "public", relativePath);
    const buffer = await fs.readFile(absPath);
    const data = buffer.toString("base64");
    return { data, media_type: mediaTypeFromExt(path.extname(absPath)) };
  } catch {
    return null;
  }
}

/**
 * Fetch an ad snapshot URL and return as base64 for Claude Vision.
 * Meta serves these as HTML pages that contain the image — we have to be tolerant
 * about the response shape. If it's not an image, we bail and let pattern extraction
 * skip this ad.
 *
 * For local uploads (URLs starting with `/ad-library-uploads/`), reads directly
 * from disk since fetch() can't resolve relative URLs in server-side code.
 */
async function fetchSnapshotAsBase64(
  url: string,
): Promise<{ data: string; media_type: ImageMediaType } | null> {
  // Local upload path → filesystem read
  if (url.startsWith("/ad-library-uploads/")) {
    return await readLocalImageAsBase64(url);
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (ad-pattern-extractor)" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    // Some snapshot URLs are HTML pages that contain the actual image. We only
    // proceed if the response is a direct image. For HTML, the calling code
    // should pre-resolve to imageUrl.
    if (!contentType.startsWith("image/")) return null;

    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    const mediaType: ImageMediaType =
      contentType.includes("png")
        ? "image/png"
        : contentType.includes("webp")
        ? "image/webp"
        : "image/jpeg";

    return { data, media_type: mediaType };
  } catch {
    return null;
  }
}

/**
 * Extract patterns for one ad. Returns null if the image can't be fetched
 * or Claude can't parse a usable response.
 */
export async function extractPatternsForAd(ad: StoredAd): Promise<AdPattern | null> {
  // Prefer direct imageUrl; fall back to snapshotUrl. Bail if neither.
  const imageSource = ad.imageUrl || ad.snapshotUrl;
  if (!imageSource) return null;

  const image = await fetchSnapshotAsBase64(imageSource);
  if (!image) {
    console.warn(`[PatternExtractor] Could not fetch image for ad ${ad._id} (${imageSource.slice(0, 80)}...)`);
    return null;
  }

  const copyContext = [
    ad.creativeBodies.length ? `Body: ${ad.creativeBodies.slice(0, 2).join(" | ")}` : null,
    ad.linkTitles.length ? `Headline: ${ad.linkTitles[0]}` : null,
    ad.linkDescriptions.length ? `Description: ${ad.linkDescriptions[0]}` : null,
    ad.bylines ? `Advertiser: ${ad.bylines}` : null,
    `Active: ${ad.isActive ? "yes" : "no"}, Days running: ${ad.daysRunning}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.media_type,
                data: image.data,
              },
            },
            {
              type: "text",
              text: `Analyze this ad and return the JSON described below.\n\nContext:\n${copyContext}\n\n${SCHEMA_INSTRUCTION}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractAndRepairJson(text);
    const pattern = parsed?.parsed as Partial<AdPattern> | null;
    if (!pattern || !pattern.hook) {
      console.warn(`[PatternExtractor] Could not parse pattern for ad ${ad._id}`);
      return null;
    }

    return {
      hook: {
        visual: pattern.hook?.visual ?? "",
        verbal: pattern.hook?.verbal ?? "",
      },
      layoutType: pattern.layoutType ?? "unknown",
      colorPalette: Array.isArray(pattern.colorPalette) ? pattern.colorPalette : [],
      ctaCopy: pattern.ctaCopy ?? "",
      ctaStyle: pattern.ctaStyle ?? "unknown",
      psychology: Array.isArray(pattern.psychology) ? pattern.psychology : [],
      format: pattern.format ?? "unknown",
      uniqueWinning: Array.isArray(pattern.uniqueWinning) ? pattern.uniqueWinning : [],
      visualReferences: Array.isArray(pattern.visualReferences) ? pattern.visualReferences : [],
      copyTone: pattern.copyTone ?? "direct",
      language: pattern.language ?? "en",
      extractedAt: new Date(),
    };
  } catch (err: any) {
    console.warn(`[PatternExtractor] Claude call failed for ad ${ad._id}:`, err.message);
    return null;
  }
}

/**
 * Roll up patterns across many ads into a brand-level summary that can be
 * pasted into a generation prompt. This is what gets fed back into Studio.
 */
export interface PatternSummary {
  totalAdsAnalyzed: number;
  topLayouts: Array<{ name: string; count: number }>;
  topPsychology: Array<{ name: string; count: number }>;
  topFormats: Array<{ name: string; count: number }>;
  topVisualReferences: Array<{ name: string; count: number }>;
  ctaStyleDistribution: Array<{ style: string; count: number }>;
  commonHookVerbals: string[];
  commonColors: string[];
}

export function summarizePatterns(ads: StoredAd[]): PatternSummary {
  const withPatterns = ads.filter((a) => a.patterns);

  const countBy = <T>(items: T[]): Array<{ name: string; count: number }> => {
    const map = new Map<string, number>();
    for (const item of items) {
      const k = String(item);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const layouts = withPatterns.map((a) => a.patterns!.layoutType);
  const psychology = withPatterns.flatMap((a) => a.patterns!.psychology);
  const formats = withPatterns.map((a) => a.patterns!.format);
  const visualRefs = withPatterns.flatMap((a) => a.patterns!.visualReferences);
  const ctaStyles = withPatterns.map((a) => a.patterns!.ctaStyle);
  const hookVerbals = withPatterns
    .map((a) => a.patterns!.hook.verbal)
    .filter(Boolean)
    .slice(0, 12);
  const colors = withPatterns.flatMap((a) => a.patterns!.colorPalette);

  return {
    totalAdsAnalyzed: withPatterns.length,
    topLayouts: countBy(layouts),
    topPsychology: countBy(psychology),
    topFormats: countBy(formats),
    topVisualReferences: countBy(visualRefs),
    ctaStyleDistribution: countBy(ctaStyles).map((r) => ({ style: r.name, count: r.count })),
    commonHookVerbals: hookVerbals,
    commonColors: countBy(colors)
      .slice(0, 6)
      .map((r) => r.name),
  };
}

/**
 * Format a pattern summary as a text block suitable for injection into a
 * Claude generation prompt.
 */
export function buildPatternContext(summary: PatternSummary, label = "STORED AD INSIGHTS"): string {
  if (summary.totalAdsAnalyzed === 0) return "";

  return `=== ${label} (${summary.totalAdsAnalyzed} ads analyzed) ===
Top layout patterns:
${summary.topLayouts.map((l) => `  - ${l.name} (${l.count})`).join("\n")}

Top psychology tactics:
${summary.topPsychology.map((p) => `  - ${p.name} (${p.count})`).join("\n")}

Top ad formats:
${summary.topFormats.map((f) => `  - ${f.name} (${f.count})`).join("\n")}

Top visual elements:
${summary.topVisualReferences.map((v) => `  - ${v.name} (${v.count})`).join("\n")}

CTA styles in use:
${summary.ctaStyleDistribution.map((c) => `  - ${c.style} (${c.count})`).join("\n")}

Common hook openers:
${summary.commonHookVerbals.map((h) => `  - "${h}"`).join("\n")}

Dominant colors:
${summary.commonColors.map((c) => `  - ${c}`).join("\n")}

USAGE RULES — READ CAREFULLY:
1. STYLE ONLY, NEVER CONTENT. Use the patterns above (layout, palette, CTA style, hook FORM) to inform aesthetic decisions. Do NOT copy headlines, prices, promo codes, or specific offers from the reference ads — those are inputs to learn from, not templates to clone.
2. GENERATE A FRESH IDEA. The headline, hook, and concept must be NEW. If the references all say "$2K Challenge for $9", you do NOT say that. Invent a different angle — a different offer framing, a different objection-handler, a different cultural hook.
3. RIDE CURRENT TRENDS. Pull from what's hot in the ad market RIGHT NOW: meme formats, current events, seasonal moments (e.g. World Cup, holiday sales, market volatility news), bold typography trends, AI-era visual cliches done sincerely, retro-futurist callbacks. Don't be afraid to be culturally specific or topical.
4. MATCH THE CRAFT BAR. The references represent the QUALITY CEILING — sharp typography, premium dark aesthetic, restrained element count (5-7 elements max), strong focal hierarchy. New idea, same craft.
5. KEEP NON-NEGOTIABLES. HolaPrime logo top-left, #WeAreTraders top-right, "Buy Challenge" or equivalent CTA, dark background, legal disclaimer at bottom.
=== END ${label} ===
`;
}
