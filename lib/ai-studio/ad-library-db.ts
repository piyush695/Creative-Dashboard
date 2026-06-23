/**
 * Ad Library Persistence Layer
 *
 * Stores ads fetched from Meta Ad Library API in MongoDB so they survive
 * across server restarts and can be queried for winning patterns.
 *
 * Collection: `ad_library`
 *   Indexed on: { brand: 1, isActive: 1, daysRunning: -1 } for top-performer queries
 *
 * Lifecycle:
 *   1. Sync runs (manual or scheduled) -> upsertAds() called per ad
 *   2. For each new ad, extractPatterns() runs Claude Vision once
 *   3. Studio generation reads top-N ads via getTopPerformingAds() and
 *      passes them as reference images + pattern context to Claude
 */

import clientPromise from "@/lib/mongodb-client";
import type { AdLibraryAd } from "./adlibrary";

const DB_NAME = process.env.MONGODB_DB_NAME || "reddit_data";
const COLLECTION = "ad_library";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AdSource = "own" | "competitor";

/** Per-ad pattern extracted by Claude Vision. Stored once per ad. */
export interface AdPattern {
  hook: {
    visual: string; // What grabs the eye first (large price, face, sphere, etc.)
    verbal: string; // Opening 3-5 words of the ad copy
  };
  layoutType: string; // "price-hero" | "product-hero" | "testimonial" | "offer-stack" | "urgency-banner" | "brand-build"
  colorPalette: string[]; // Dominant colors as hex or names
  ctaCopy: string; // Exact CTA text
  ctaStyle: string; // "blue-pill" | "green-pill" | "underline-link" | "outline-button" | etc.
  psychology: string[]; // ["scarcity", "anchoring", "loss-aversion", "social-proof", "authority", "reciprocity"]
  format: string; // "offer" | "brand" | "educational" | "urgency" | "testimonial" | "comparison"
  uniqueWinning: string[]; // Free-text: 1-3 reasons this ad likely converts
  visualReferences: string[]; // What's in the image: "phone-mockup", "3d-coin", "candlestick-chart", etc.
  copyTone: string; // "direct" | "playful" | "urgent" | "authoritative" | "aspirational"
  language: string; // primary language code
  extractedAt: Date;
}

/** Database document for a stored ad. */
export interface StoredAd {
  _id: string; // Meta ad ID
  source: AdSource;
  brand: string;
  pageId?: string;
  pageName?: string;
  country?: string;

  // Raw creative content
  creativeBodies: string[];
  linkTitles: string[];
  linkDescriptions: string[];
  linkCaptions: string[];
  snapshotUrl?: string;
  imageUrl?: string;
  bylines?: string;
  publisherPlatforms: string[];

  // Metrics from Meta
  spend?: { lower_bound: string; upper_bound: string };
  impressions?: { lower_bound: string; upper_bound: string };
  estimatedAudienceSize?: { lower_bound: number; upper_bound: number };
  currency?: string;
  languages: string[];

  // Computed at upsert time
  isActive: boolean;
  daysRunning: number;
  performanceScore: number; // 0–100 composite

  // Pattern extraction (filled in by extractPatternsForAd)
  patterns?: AdPattern;
  patternsExtractedAt?: Date;

  // Lifecycle
  firstSeenAt: Date;
  lastSeenAt: Date;
  adCreationTime?: Date;
  adDeliveryStartTime?: Date;
  adDeliveryStopTime?: Date;
}

// ─── Indexes ────────────────────────────────────────────────────────────────
// Called lazily once per process to keep the collection performant.

let _indexesEnsured = false;

async function ensureIndexes() {
  if (_indexesEnsured) return;
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION);
    await Promise.all([
      col.createIndex({ brand: 1, isActive: 1 }),
      col.createIndex({ source: 1, performanceScore: -1 }),
      col.createIndex({ lastSeenAt: -1 }),
      col.createIndex({ "patterns.format": 1 }),
    ]);
    _indexesEnsured = true;
  } catch (err: any) {
    console.warn("[AdLibraryDB] Failed to ensure indexes:", err.message);
  }
}

// ─── Performance score ──────────────────────────────────────────────────────
/**
 * Heuristic score (0-100) used for "what's winning" ranking.
 * Active + long-running ads score higher. Spend range, when available,
 * pushes the score up further. The actual numbers don't have to be perfect;
 * they just need to be a consistent ordering.
 */
function computePerformanceScore(ad: AdLibraryAd): number {
  const daysRunning = ad.daysRunning ?? 0;
  const active = ad.isActive ? 1 : 0;

  // Days running: 0 -> 0pts, 30 -> 30pts, 90+ -> 60pts (caps)
  const runningPts = Math.min(daysRunning, 90) * (60 / 90);

  // Active bonus: 25pts
  const activePts = active * 25;

  // Spend signal: if upper bound exists and is high, add up to 15pts
  let spendPts = 0;
  if (ad.spend?.upper_bound) {
    const upper = parseFloat(ad.spend.upper_bound) || 0;
    // > $10k = full points, < $100 = 0, log-scale in between
    spendPts = Math.min(15, Math.max(0, Math.log10(Math.max(upper, 1)) * 4 - 4));
  }

  return Math.round(Math.min(100, runningPts + activePts + spendPts));
}

// ─── Conversion: API ad -> stored doc ──────────────────────────────────────

function adToDoc(
  ad: AdLibraryAd,
  source: AdSource,
  brand: string,
  country?: string,
): Omit<StoredAd, "firstSeenAt"> & { firstSeenAt?: Date } {
  const now = new Date();
  return {
    _id: ad.id,
    source,
    brand,
    pageId: ad.page_id,
    pageName: ad.page_name,
    country,
    creativeBodies: ad.ad_creative_bodies ?? [],
    linkTitles: ad.ad_creative_link_titles ?? [],
    linkDescriptions: ad.ad_creative_link_descriptions ?? [],
    linkCaptions: ad.ad_creative_link_captions ?? [],
    snapshotUrl: ad.ad_snapshot_url,
    imageUrl: ad.imageUrl,
    bylines: ad.bylines,
    publisherPlatforms: ad.publisher_platforms ?? [],
    spend: ad.spend,
    impressions: ad.impressions,
    estimatedAudienceSize: ad.estimated_audience_size,
    currency: ad.currency,
    languages: ad.languages ?? [],
    isActive: ad.isActive ?? false,
    daysRunning: ad.daysRunning ?? 0,
    performanceScore: computePerformanceScore(ad),
    lastSeenAt: now,
    adCreationTime: ad.ad_creation_time ? new Date(ad.ad_creation_time) : undefined,
    adDeliveryStartTime: ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : undefined,
    adDeliveryStopTime: ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Upsert a single ad. Preserves firstSeenAt on existing records.
 * Returns true if this was a new record.
 */
export async function upsertAd(
  ad: AdLibraryAd,
  source: AdSource,
  brand: string,
  country?: string,
): Promise<{ inserted: boolean }> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  const doc = adToDoc(ad, source, brand, country);

  const result = await col.updateOne(
    { _id: ad.id },
    {
      $set: doc,
      $setOnInsert: { firstSeenAt: new Date() },
    },
    { upsert: true },
  );
  return { inserted: !!result.upsertedId };
}

/**
 * Bulk upsert. Returns counts for the caller's progress logging.
 */
export async function upsertAds(
  ads: AdLibraryAd[],
  source: AdSource,
  brand: string,
  country?: string,
): Promise<{ inserted: number; updated: number; total: number }> {
  if (!ads.length) return { inserted: 0, updated: 0, total: 0 };
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  const now = new Date();

  const ops = ads.map((ad) => {
    const doc = adToDoc(ad, source, brand, country);
    return {
      updateOne: {
        filter: { _id: ad.id },
        update: {
          $set: doc,
          $setOnInsert: { firstSeenAt: now },
        },
        upsert: true,
      },
    };
  });

  const result = await col.bulkWrite(ops, { ordered: false });
  return {
    inserted: result.upsertedCount ?? 0,
    updated: result.modifiedCount ?? 0,
    total: ads.length,
  };
}

/** Pull the top-N performers from the library, optionally filtered. */
export async function getTopPerformingAds(
  opts: {
    limit?: number;
    source?: AdSource;
    brand?: string;
    activeOnly?: boolean;
  } = {},
): Promise<StoredAd[]> {
  await ensureIndexes();
  const { limit = 10, source, brand, activeOnly = true } = opts;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);

  const filter: Record<string, any> = {};
  if (source) filter.source = source;
  if (brand) filter.brand = brand;
  if (activeOnly) filter.isActive = true;

  return await col
    .find(filter)
    .sort({ performanceScore: -1, daysRunning: -1 })
    .limit(limit)
    .toArray();
}

/** Pull ads by brand for the browse-library UI. */
export async function getAdsByBrand(brand: string, limit = 50): Promise<StoredAd[]> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  return await col.find({ brand }).sort({ performanceScore: -1 }).limit(limit).toArray();
}

/** Pull a single ad for the detail view. */
export async function getAdById(id: string): Promise<StoredAd | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  return await col.findOne({ _id: id });
}

/** Save extracted patterns onto an ad. */
export async function setAdPatterns(id: string, patterns: AdPattern): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  await col.updateOne(
    { _id: id },
    {
      $set: {
        patterns,
        patternsExtractedAt: new Date(),
      },
    },
  );
}

/** Ads needing pattern extraction (no patterns yet, or patterns older than ad). */
export async function getAdsNeedingPatternExtraction(limit = 20): Promise<StoredAd[]> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  return await col
    .find({
      patterns: { $exists: false },
      snapshotUrl: { $exists: true, $ne: null as any },
    })
    .sort({ performanceScore: -1 })
    .limit(limit)
    .toArray();
}

/** Aggregate stats for the UI banner ("X ads from Y brands, last synced Z ago"). */
export interface AdLibraryStats {
  totalAds: number;
  activeAds: number;
  ownAds: number;
  competitorAds: number;
  brandBreakdown: { brand: string; total: number; active: number }[];
  patternsExtracted: number;
  lastSyncAt: Date | null;
}

export async function getAdLibraryStats(): Promise<AdLibraryStats> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);

  const [
    totalAds,
    activeAds,
    ownAds,
    competitorAds,
    patternsExtracted,
    lastSeen,
    perBrand,
  ] = await Promise.all([
    col.countDocuments({}),
    col.countDocuments({ isActive: true }),
    col.countDocuments({ source: "own" }),
    col.countDocuments({ source: "competitor" }),
    col.countDocuments({ patterns: { $exists: true } }),
    col
      .find({})
      .sort({ lastSeenAt: -1 })
      .limit(1)
      .project<{ lastSeenAt: Date }>({ lastSeenAt: 1 })
      .toArray(),
    col
      .aggregate<{ _id: string; total: number; active: number }>([
        {
          $group: {
            _id: "$brand",
            total: { $sum: 1 },
            active: { $sum: { $cond: ["$isActive", 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray(),
  ]);

  return {
    totalAds,
    activeAds,
    ownAds,
    competitorAds,
    patternsExtracted,
    lastSyncAt: lastSeen[0]?.lastSeenAt ?? null,
    brandBreakdown: perBrand.map((r) => ({ brand: r._id, total: r.total, active: r.active })),
  };
}

/**
 * One-line helper used by the Studio: pull top-N ads + summarize patterns +
 * return ready-to-inject text context. Returns an empty string if there's
 * nothing useful (no stored ads, no patterns extracted).
 */
export async function getStoredAdContext(
  opts: { limit?: number; source?: AdSource } = {},
): Promise<{ context: string; sourceAds: StoredAd[]; sourceImageUrls: string[] }> {
  // Imports are inline-ish to avoid a top-of-file cycle if anyone refactors
  // pattern-extractor later.
  const { summarizePatterns, buildPatternContext } = await import("./ad-pattern-extractor");

  const sourceAds = await getTopPerformingAds({
    limit: opts.limit ?? 12,
    source: opts.source,
    activeOnly: true,
  });

  if (sourceAds.length === 0) {
    return { context: "", sourceAds: [], sourceImageUrls: [] };
  }

  const summary = summarizePatterns(sourceAds);
  const context = buildPatternContext(summary);
  const sourceImageUrls = sourceAds
    .map((a) => a.imageUrl || a.snapshotUrl)
    .filter((u): u is string => Boolean(u))
    .slice(0, 5);

  return { context, sourceAds, sourceImageUrls };
}

/** Mark ads as no-longer-seen-in-API (used after a sync to detect retired ads). */
export async function markAdsAsRetired(currentIds: string[], beforeDate: Date): Promise<number> {
  if (!currentIds.length) return 0;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const col = db.collection<StoredAd>(COLLECTION);
  const result = await col.updateMany(
    {
      _id: { $nin: currentIds },
      lastSeenAt: { $lt: beforeDate },
      isActive: true,
    },
    { $set: { isActive: false } },
  );
  return result.modifiedCount ?? 0;
}
