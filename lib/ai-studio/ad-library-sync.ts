/**
 * Ad Library Sync Engine
 *
 * Pulls HolaPrime's own ads + every known competitor across a list of
 * countries, persists them to MongoDB, then extracts patterns per ad.
 *
 * Designed to be safe to call repeatedly — uses upsert + per-ad patterns
 * only extract when missing. The sync is long-running but idempotent.
 *
 * Triggered by /api/adlibrary?action=sync-all.
 */

import {
  fetchAdLibrary,
  fetchOwnAds,
  getKnownCompetitors,
} from "./adlibrary";
import {
  upsertAds,
  getAdsNeedingPatternExtraction,
  setAdPatterns,
} from "./ad-library-db";
import { extractPatternsForAd } from "./ad-pattern-extractor";

// Countries we sweep. Prop-firm traders are predominantly in these markets.
// Adding more is cheap (one API call per country per brand) — the cap below
// keeps total work bounded.
const SYNC_COUNTRIES = ["US", "GB", "IN", "AU", "CA", "DE", "BR", "MX", "PH", "ZA"];

// How many ads to fetch per (brand × country). Meta API max is 50/request.
const ADS_PER_BRAND_PER_COUNTRY = 15;

// How many ads we'll run pattern extraction on per sync. Hard cap to avoid
// runaway Claude Vision spend. Highest-scoring ads are prioritized.
const PATTERN_EXTRACTION_BUDGET = 60;

// Pause between Meta API calls to avoid rate limits (Meta returns 32-rps soft cap).
const META_THROTTLE_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncResult {
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  brands: Array<{
    brand: string;
    source: "own" | "competitor";
    totalFetched: number;
    inserted: number;
    updated: number;
    errors: string[];
  }>;
  patternsExtracted: number;
  patternsAttempted: number;
  totalNewAds: number;
  totalUpdatedAds: number;
}

/**
 * Run the full sync. Optional progress callback fires after each brand
 * so the UI (or logs) can stream status.
 */
export async function syncAdLibrary(
  options: {
    countries?: string[];
    adsPerBrand?: number;
    patternBudget?: number;
    skipPatterns?: boolean;
    onProgress?: (msg: string) => void;
  } = {},
): Promise<SyncResult> {
  const {
    countries = SYNC_COUNTRIES,
    adsPerBrand = ADS_PER_BRAND_PER_COUNTRY,
    patternBudget = PATTERN_EXTRACTION_BUDGET,
    skipPatterns = false,
    onProgress = (m) => console.log(`[Sync] ${m}`),
  } = options;

  const startedAt = new Date();
  const result: SyncResult = {
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    brands: [],
    patternsExtracted: 0,
    patternsAttempted: 0,
    totalNewAds: 0,
    totalUpdatedAds: 0,
  };

  // ── Phase 1: Fetch + upsert HolaPrime own ads ─────────────────────────
  onProgress("Phase 1/3: Fetching Hola Prime ads…");
  for (const country of countries) {
    const brandEntry = {
      brand: "Hola Prime",
      source: "own" as const,
      totalFetched: 0,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };
    try {
      const fetched = await fetchOwnAds({ limit: adsPerBrand });
      brandEntry.totalFetched = fetched.ads.length;

      if (fetched.ads.length > 0) {
        const upserted = await upsertAds(fetched.ads, "own", "Hola Prime", country);
        brandEntry.inserted = upserted.inserted;
        brandEntry.updated = upserted.updated;
        result.totalNewAds += upserted.inserted;
        result.totalUpdatedAds += upserted.updated;
      }
      onProgress(
        `  Hola Prime [${country}] — ${fetched.ads.length} fetched (+${brandEntry.inserted} new, ${brandEntry.updated} updated)`,
      );
    } catch (err: any) {
      brandEntry.errors.push(err.message);
      onProgress(`  Hola Prime [${country}] FAILED — ${err.message}`);
    }
    result.brands.push(brandEntry);
    await sleep(META_THROTTLE_MS);
  }

  // ── Phase 2: Fetch + upsert competitor ads ────────────────────────────
  const competitors = getKnownCompetitors();
  onProgress(`Phase 2/3: Fetching ${competitors.length} competitors × ${countries.length} countries…`);

  for (const competitor of competitors) {
    for (const country of countries) {
      const brandEntry = {
        brand: competitor.name,
        source: "competitor" as const,
        totalFetched: 0,
        inserted: 0,
        updated: 0,
        errors: [] as string[],
      };
      try {
        const fetched = await fetchAdLibrary(competitor.name, {
          adActiveStatus: "ALL",
          limit: adsPerBrand,
          country,
          pageId: competitor.pageId,
        });
        brandEntry.totalFetched = fetched.ads.length;

        if (fetched.ads.length > 0) {
          const upserted = await upsertAds(
            fetched.ads,
            "competitor",
            competitor.name,
            country,
          );
          brandEntry.inserted = upserted.inserted;
          brandEntry.updated = upserted.updated;
          result.totalNewAds += upserted.inserted;
          result.totalUpdatedAds += upserted.updated;
        }
        onProgress(
          `  ${competitor.name} [${country}] — ${fetched.ads.length} fetched (+${brandEntry.inserted} new)`,
        );
      } catch (err: any) {
        brandEntry.errors.push(err.message);
        onProgress(`  ${competitor.name} [${country}] FAILED — ${err.message}`);
      }
      result.brands.push(brandEntry);
      await sleep(META_THROTTLE_MS);
    }
  }

  // ── Phase 3: Extract patterns on the highest-scoring un-analyzed ads ──
  if (!skipPatterns) {
    onProgress(`Phase 3/3: Extracting patterns (budget: ${patternBudget} ads)…`);
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
        console.warn(`[Sync] Pattern extraction failed for ${ad._id}:`, err.message);
      }
    }
  } else {
    onProgress("Phase 3/3: Skipped pattern extraction (skipPatterns=true)");
  }

  result.finishedAt = new Date();
  result.durationMs = result.finishedAt.getTime() - startedAt.getTime();
  onProgress(
    `Sync complete in ${(result.durationMs / 1000).toFixed(1)}s · ${result.totalNewAds} new · ${result.totalUpdatedAds} updated · ${result.patternsExtracted} patterns`,
  );

  return result;
}
