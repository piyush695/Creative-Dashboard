/**
 * Ad Library Local Sync
 *
 * Manual fallback for users who can't (yet) hit the Meta Ad Library API.
 * Reads image files from `public/ad-library-uploads/<brand-slug>/*.png|jpg|...`
 * and upserts each as a stored ad in the same `ad_library` MongoDB collection
 * the Meta sync writes to. Studio generation reads from the same collection,
 * so once an ad is in the DB it behaves identically regardless of origin.
 *
 * Brand slug → display name:
 *   hola-prime    → "Hola Prime"  (source: "own")
 *   ftmo          → "FTMO"        (source: "competitor")
 *   ... etc
 *
 * Idempotent: re-running won't duplicate. Each ad ID is synthetic and stable
 * (derived from `local-<slug>-<filename-without-ext>`).
 */

import { promises as fs } from "fs";
import path from "path";
import {
  upsertAds,
  getAdsNeedingPatternExtraction,
  setAdPatterns,
} from "./ad-library-db";
import { extractPatternsForAd } from "./ad-pattern-extractor";
import type { AdLibraryAd } from "./adlibrary";

// Where uploaded images live (relative to project root)
const UPLOADS_ROOT = path.join(process.cwd(), "public", "ad-library-uploads");

// Public URL prefix (Next.js serves /public/* at the root)
const PUBLIC_URL_PREFIX = "/ad-library-uploads";

// Known brand slug → display name overrides. Anything not in here gets
// title-cased from the slug.
const BRAND_NAME_OVERRIDES: Record<string, string> = {
  "hola-prime": "Hola Prime",
  "ftmo": "FTMO",
  "funded-next": "Funded Next",
  "the-funded-trader": "The Funded Trader",
  "true-forex-funds": "True Forex Funds",
  "myforexfunds": "MyForexFunds",
  "topstep": "Topstep",
  "apex-trader-funding": "Apex Trader Funding",
  "e8-funding": "E8 Funding",
  "the5ers": "The5ers",
  "lux-trading-firm": "Lux Trading Firm",
  "fundedbull": "FundedBull",
  "blue-guardian": "Blue Guardian",
};

const SUPPORTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const PATTERN_EXTRACTION_BUDGET = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

function brandNameFromSlug(slug: string): string {
  if (BRAND_NAME_OVERRIDES[slug]) return BRAND_NAME_OVERRIDES[slug];
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();
}

function isOwnBrand(slug: string): boolean {
  return slug === "hola-prime";
}

/**
 * Build a synthetic AdLibraryAd object from a file on disk. The ID is stable
 * (slug + filename) so re-syncs upsert the same record.
 */
function buildAdFromFile(slug: string, filename: string): AdLibraryAd {
  const filenameNoExt = filename.replace(/\.[^.]+$/, "");
  const id = `local-${slug}-${filenameNoExt}`;
  const imageUrl = `${PUBLIC_URL_PREFIX}/${slug}/${filename}`;
  return {
    id,
    page_name: brandNameFromSlug(slug),
    imageUrl,
    ad_snapshot_url: imageUrl,
    // We have no copy or metrics — those fields stay empty.
    ad_creative_bodies: [],
    ad_creative_link_titles: [],
    ad_creative_link_descriptions: [],
    ad_creative_link_captions: [],
    publisher_platforms: ["facebook", "instagram"],
    languages: [],
    // Mark as active with a moderate days-running so the performance score
    // lands in the middle band by default — Claude can still rank between
    // them after pattern extraction.
    isActive: true,
    daysRunning: 30,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface LocalSyncResult {
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  scannedFolders: number;
  filesFound: number;
  brands: Array<{
    brand: string;
    slug: string;
    source: "own" | "competitor";
    filesFound: number;
    inserted: number;
    updated: number;
  }>;
  patternsExtracted: number;
  patternsAttempted: number;
  totalNewAds: number;
  totalUpdatedAds: number;
  warnings: string[];
}

export async function syncLocalAdLibrary(
  options: {
    patternBudget?: number;
    skipPatterns?: boolean;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<LocalSyncResult> {
  const {
    patternBudget = PATTERN_EXTRACTION_BUDGET,
    skipPatterns = false,
    onProgress = (m) => console.log(`[LocalSync] ${m}`),
  } = options;

  const startedAt = new Date();
  const result: LocalSyncResult = {
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    scannedFolders: 0,
    filesFound: 0,
    brands: [],
    patternsExtracted: 0,
    patternsAttempted: 0,
    totalNewAds: 0,
    totalUpdatedAds: 0,
    warnings: [],
  };

  // ── Step 1: Confirm the uploads root exists ────────────────────────────
  try {
    await fs.access(UPLOADS_ROOT);
  } catch {
    result.warnings.push(
      `Uploads folder not found at ${UPLOADS_ROOT}. Create it and drop images into per-brand subfolders.`,
    );
    result.finishedAt = new Date();
    result.durationMs = result.finishedAt.getTime() - startedAt.getTime();
    return result;
  }

  // ── Step 2: List brand subfolders ──────────────────────────────────────
  const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
  const brandFolders = entries.filter((e) => e.isDirectory());
  onProgress(`Scanning ${brandFolders.length} brand folders…`);

  for (const folder of brandFolders) {
    const slug = folder.name;
    const folderPath = path.join(UPLOADS_ROOT, slug);
    const brand = brandNameFromSlug(slug);
    const source: "own" | "competitor" = isOwnBrand(slug) ? "own" : "competitor";
    result.scannedFolders++;

    // List image files inside this folder
    let files: string[];
    try {
      const folderEntries = await fs.readdir(folderPath, { withFileTypes: true });
      files = folderEntries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()));
    } catch (err: any) {
      result.warnings.push(`Could not read folder ${slug}: ${err.message}`);
      continue;
    }

    const brandEntry = {
      brand,
      slug,
      source,
      filesFound: files.length,
      inserted: 0,
      updated: 0,
    };
    result.filesFound += files.length;

    if (files.length === 0) {
      result.brands.push(brandEntry);
      continue;
    }

    // ── Step 3: Build ad records and bulk-upsert ────────────────────────
    const ads = files.map((filename) => buildAdFromFile(slug, filename));
    try {
      const upserted = await upsertAds(ads, source, brand);
      brandEntry.inserted = upserted.inserted;
      brandEntry.updated = upserted.updated;
      result.totalNewAds += upserted.inserted;
      result.totalUpdatedAds += upserted.updated;
      onProgress(
        `  ${brand} (${slug}) — ${files.length} files: +${upserted.inserted} new, ${upserted.updated} updated`,
      );
    } catch (err: any) {
      result.warnings.push(`Upsert failed for ${slug}: ${err.message}`);
    }
    result.brands.push(brandEntry);
  }

  // ── Step 4: Extract patterns on highest-scoring un-analyzed ads ────────
  if (!skipPatterns) {
    onProgress(`Extracting patterns (budget: ${patternBudget})…`);
    const todo = await getAdsNeedingPatternExtraction(patternBudget);
    onProgress(`  Found ${todo.length} ads needing pattern extraction`);

    for (let i = 0; i < todo.length; i++) {
      const ad = todo[i];
      result.patternsAttempted++;
      try {
        const pattern = await extractPatternsForAd(ad);
        if (pattern) {
          await setAdPatterns(ad._id, pattern);
          result.patternsExtracted++;
          if ((i + 1) % 5 === 0 || i === todo.length - 1) {
            onProgress(
              `  Patterns: ${result.patternsExtracted}/${todo.length} done (${ad.brand})`,
            );
          }
        }
      } catch (err: any) {
        result.warnings.push(`Pattern extraction failed for ${ad._id}: ${err.message}`);
      }
    }
  } else {
    onProgress("Skipped pattern extraction (skipPatterns=true)");
  }

  result.finishedAt = new Date();
  result.durationMs = result.finishedAt.getTime() - startedAt.getTime();
  onProgress(
    `Local sync complete in ${(result.durationMs / 1000).toFixed(1)}s · ${result.filesFound} files · ${result.totalNewAds} new · ${result.patternsExtracted} patterns`,
  );

  return result;
}
