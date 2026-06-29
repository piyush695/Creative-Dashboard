/**
 * metaInsightsEnrich — fetch the Phase-2 metrics directly from Meta's
 * Marketing Insights API (v24.0) and persist them onto the corresponding
 * `creative_data` document so the analyzer can actually diagnose Stages 1
 * through 4 instead of marking them `cannot_assess`.
 *
 * What it fetches (beyond what's already in your sync):
 *   • outbound_clicks / outbound_clicks_ctr        → true link CTR (Stage 3)
 *   • inline_link_clicks / inline_link_click_ctr   → cleaner CTR (Stage 3)
 *   • actions[]                                     → purchases, leads, video_views, etc.
 *   • cost_per_action_type[]                       → CPA per goal (Stage 4)
 *   • action_values[]                              → revenue per action (Stage 4 ROAS)
 *   • video_*_watched_actions                      → retention curve (Stage 2, video-only)
 *   • quality_ranking, engagement_rate_ranking,
 *     conversion_rate_ranking                      → Meta's own diagnostics
 *
 * Derived metrics it computes:
 *   • video_3sec_views     = actions[action_type=video_view].value
 *   • thumb_stop_ratio     = video_3sec_views / impressions  (Stage 1 KPI)
 *   • p25/p50/p75/p100_retention = video_pNN / video_3sec
 *   • cvr_purchase         = purchase_count / inline_link_clicks
 *   • cvr_lead             = lead_count / inline_link_clicks
 *
 * All fields are persisted at the ROOT of the creative_data doc so the
 * existing fetchAdsFromMongo spread picks them up automatically. The
 * analyzer prompt reads them and unlocks real per-stage diagnosis.
 *
 * Idempotent. Re-running on the same ad just refreshes the metrics.
 */

import clientPromise from "@/server/mongodb-client";

const META_API_VERSION = process.env.META_API_VERSION || "v24.0";

// ─── Field list we request from Meta ───
// Note: 3-sec video views come through `actions` with action_type=video_view,
// NOT as a top-level field (Meta deprecated `video_3_sec_watched_actions`).
const INSIGHTS_FIELDS = [
  "impressions",
  "spend",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "reach",
  "frequency",
  "outbound_clicks",
  "outbound_clicks_ctr",
  "inline_link_clicks",
  "inline_link_click_ctr",
  "actions",
  "cost_per_action_type",
  "action_values",
  "video_play_actions",
  "video_avg_time_watched_actions",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p100_watched_actions",
  "quality_ranking",
  "engagement_rate_ranking",
  "conversion_rate_ranking",
].join(",");

export interface EnrichedMetrics {
  // ── Raw from Meta ──
  outbound_clicks: number | null;
  outbound_clicks_ctr: number | null;
  inline_link_clicks: number | null;
  inline_link_click_ctr: number | null;
  quality_ranking: string | null;
  engagement_rate_ranking: string | null;
  conversion_rate_ranking: string | null;

  // ── Stage 1 (Hook) — derived from actions[video_view] ──
  video_3sec_views: number | null;
  thumb_stop_ratio: number | null; // 3sec / impressions

  // ── Stage 2 (Hold) — video only ──
  video_avg_time_watched_ms: number | null;
  p25_retention: number | null; // video_p25 / video_3sec
  p50_retention: number | null;
  p75_retention: number | null;
  p100_retention: number | null;

  // ── Stage 4 (CVR) — derived from actions[] + cost_per_action_type[] ──
  purchase_count: number | null;
  lead_count: number | null;
  initiate_checkout_count: number | null;
  landing_page_view_count: number | null;
  page_engagement_count: number | null;
  link_click_count_action: number | null; // from actions, distinct from total clicks
  purchase_value: number | null;
  cost_per_purchase: number | null;
  cost_per_lead: number | null;
  cvr_purchase: number | null; // purchases / inline_link_clicks
  cvr_lead: number | null;     // leads / inline_link_clicks

  // ── Metadata ──
  enrichedAt: string;
  enrichSource: "meta_insights_api_v24";
}

// ─── Helpers ───
function findActionValue(arr: any, type: string): number | null {
  if (!Array.isArray(arr)) return null;
  const found = arr.find((a: any) => a?.action_type === type);
  if (!found || found.value === undefined || found.value === null) return null;
  const n = Number(found.value);
  return Number.isFinite(n) ? n : null;
}

function safeNum(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeDiv(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

/**
 * Hit Meta Insights API for a single ad and parse out the enriched metrics.
 * Returns null if the API call fails or returns no data.
 */
export async function fetchMetaInsightsForAd(
  adId: string,
  options: { datePreset?: string } = {}
): Promise<{ raw: any; enriched: EnrichedMetrics } | null> {
  const TOKEN = process.env.META_ACCESS_TOKEN;
  if (!TOKEN) throw new Error("META_ACCESS_TOKEN not set in .env");

  const datePreset = options.datePreset || "maximum";
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/${adId}/insights`);
  url.searchParams.set("fields", INSIGHTS_FIELDS);
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("access_token", TOKEN);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err: any) {
    console.error(`[metaInsightsEnrich] Network error for ad ${adId}: ${err.message}`);
    return null;
  }

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    console.error(`[metaInsightsEnrich] Meta API error for ad ${adId}: ${msg}`);
    return null;
  }

  const row = Array.isArray(json?.data) ? json.data[0] : null;
  if (!row) {
    console.warn(`[metaInsightsEnrich] No insights row returned for ad ${adId} (likely no impressions yet)`);
    return null;
  }

  // ─── Parse actions[] for Stages 1 / 3 / 4 ───
  const actions = row.actions || [];
  const costs = row.cost_per_action_type || [];
  const values = row.action_values || [];

  const video_3sec_views = findActionValue(actions, "video_view");
  const purchase_count = findActionValue(actions, "purchase");
  const lead_count = findActionValue(actions, "lead");
  const initiate_checkout_count = findActionValue(actions, "initiate_checkout");
  const landing_page_view_count = findActionValue(actions, "landing_page_view");
  const page_engagement_count = findActionValue(actions, "page_engagement");
  const link_click_count_action = findActionValue(actions, "link_click");

  // ─── Top-level Meta fields ───
  const impressions = safeNum(row.impressions);
  const outbound_clicks = safeNum(row.outbound_clicks);
  const outbound_clicks_ctr = safeNum(row.outbound_clicks_ctr);
  const inline_link_clicks = safeNum(row.inline_link_clicks);
  const inline_link_click_ctr = safeNum(row.inline_link_click_ctr);

  // ─── Video retention (Stage 2) ───
  const video_avg_time_watched_ms = findActionValue(row.video_avg_time_watched_actions, "video_view");
  const vp25 = findActionValue(row.video_p25_watched_actions, "video_view");
  const vp50 = findActionValue(row.video_p50_watched_actions, "video_view");
  const vp75 = findActionValue(row.video_p75_watched_actions, "video_view");
  const vp100 = findActionValue(row.video_p100_watched_actions, "video_view");

  const enriched: EnrichedMetrics = {
    outbound_clicks,
    outbound_clicks_ctr,
    inline_link_clicks,
    inline_link_click_ctr,
    quality_ranking: row.quality_ranking || null,
    engagement_rate_ranking: row.engagement_rate_ranking || null,
    conversion_rate_ranking: row.conversion_rate_ranking || null,

    // Stage 1
    video_3sec_views,
    thumb_stop_ratio: safeDiv(video_3sec_views, impressions),

    // Stage 2
    video_avg_time_watched_ms,
    p25_retention: safeDiv(vp25, video_3sec_views),
    p50_retention: safeDiv(vp50, video_3sec_views),
    p75_retention: safeDiv(vp75, video_3sec_views),
    p100_retention: safeDiv(vp100, video_3sec_views),

    // Stage 4
    purchase_count,
    lead_count,
    initiate_checkout_count,
    landing_page_view_count,
    page_engagement_count,
    link_click_count_action,
    purchase_value: findActionValue(values, "purchase"),
    cost_per_purchase: findActionValue(costs, "purchase"),
    cost_per_lead: findActionValue(costs, "lead"),
    cvr_purchase: safeDiv(purchase_count, inline_link_clicks),
    cvr_lead: safeDiv(lead_count, inline_link_clicks),

    enrichedAt: new Date().toISOString(),
    enrichSource: "meta_insights_api_v24",
  };

  return { raw: row, enriched };
}

/**
 * Fetch enriched metrics from Meta + persist to creative_data.
 * Uses updateMany so duplicate docs (same adId) all get the new data.
 */
export async function enrichAndSaveForAd(adId: string): Promise<EnrichedMetrics | null> {
  if (!adId) throw new Error("enrichAndSaveForAd: adId is required");

  const result = await fetchMetaInsightsForAd(adId);
  if (!result) return null;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "reddit_data");
  const coll = db.collection("creative_data");

  const updateResult = await coll.updateMany(
    { adId: String(adId) },
    { $set: { ...result.enriched, lastEnrichedAt: result.enriched.enrichedAt } }
  );

  console.log(
    `[metaInsightsEnrich] ✓ Enriched ${updateResult.modifiedCount}/${updateResult.matchedCount} creative_data doc(s) for adId=${adId}`
  );

  return result.enriched;
}
