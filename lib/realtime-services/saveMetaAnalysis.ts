/**
 * saveMetaAnalysis — write analyzer output back to the `creative_data`
 * collection (the source of truth for Meta ads).
 *
 * The legacy `saveAnalysis()` in mongoService.js is hardcoded to write to
 * `google_data` via mongoose. This function uses the regular MongoDB client
 * (the same one actions/ads.ts reads from) so Meta re-analysis actually
 * lands where the UI reads.
 *
 * Strategy: upsert by adId; $set the analysis fields at the root of the
 * document (matching how the original Meta sync writes them). We do NOT
 * touch unrelated fields (thumbnailUrl, adAccountId, etc.) — only the
 * fields the analyzer produces.
 */

import clientPromise from "@/lib/mongodb-client";

const ANALYSIS_FIELDS = [
  // v3 5-lens × 5-funnel framework (new primary fields)
  "pattern", "platform", "objective",
  "observation", "centralConcept", "designerTradeOffs",
  "lenses",       // NEW: { consumerPsychology, behavioralEconomics, advertisingPrinciples, neuromarketing, behavioralPsychology }
  "funnel",       // NEW: { stage1_hook, stage2_hold, stage3_ctr, stage4_cvr, stage5_fatigue }
  // Legacy compat (Phase 1 cross-populates these from the new structure)
  "metricsStory", "creativeMetricLinks",  // Pattern 1 only — object/array
  "heuristics", "predictedPerformance",   // Pattern 2 only — object
  "diagnosis", "strengths", "risks", "testsToRun",
  // Core legacy fields
  "ctrAnalysis", "cpcAnalysis", "frequencyAnalysis", "primaryBottleneck",
  "creativeType", "dominantColors", "primaryMessage", "secondaryMessage", "ctaText",
  "trustElements", "urgencyElements", "numbersShown", "brandingElements", "keyVisualElements",
  // Scores
  "scoreVisualDesign", "scoreTypography", "scoreColorUsage", "scoreComposition",
  "scoreCTA", "scoreEmotionalAppeal", "scoreTrustSignals", "scoreUrgency",
  "scoreOverall", "performanceScore", "compositeRating",
  // Justifications
  "visualDesignJustification", "typographyJustification", "colorUsageJustification",
  "compositionJustification", "ctaJustification", "emotionalAppealJustification",
  "trustSignalsJustification", "urgencyJustification",
  // Psychology
  "lossAversionPresent", "lossAversionStrength", "lossAversionEvidence",
  "scarcityPresent", "scarcityStrength", "scarcityEvidence",
  "socialProofPresent", "socialProofStrength", "socialProofEvidence",
  "anchoringPresent", "anchoringStrength", "anchoringEvidence",
  // AIDA
  "aidaAttentionScore", "aidaAttentionAnalysis",
  "aidaInterestScore", "aidaInterestAnalysis",
  "aidaDesireScore", "aidaDesireAnalysis",
  "aidaActionScore", "aidaActionAnalysis",
  // Verdict
  "performanceLabel", "designQuality", "psychologyStrength",
  "whatWorks", "whatDoesntWork", "keyInsight", "keyStrengths", "keyWeaknesses",
  "recommendation1", "recommendation1Impact", "recommendation1Effort",
  "recommendation2", "recommendation2Impact", "recommendation2Effort",
  "recommendation3", "recommendation3Impact", "recommendation3Effort",
  "keepElements", "changeElements", "addElements", "hookOptions", "ctaOptions",
  "actionScale", "actionPause", "actionOptimize", "actionTest", "actionRationale",
  "verdictDecision", "verdictRating", "verdictConfidence", "verdictSummary",
  // Deep analysis
  "psychology_analysis", "behavioral_economics_analysis", "neuromarketing_analysis",
  "google_algorithm_analysis", "competitive_differentiation",
  "predicted_performance_impact", "recommended_scaling_strategy", "creative_evolution_path",
  "embeddingText", "searchableContent",
];

/**
 * Save the analyzer's output back to the creative_data collection.
 * Returns the updated document (after the upsert).
 */
export async function saveMetaAnalysis(adId: string, analysis: any) {
  if (!adId) throw new Error("saveMetaAnalysis: adId is required");
  if (!analysis || typeof analysis !== "object") {
    throw new Error("saveMetaAnalysis: analysis must be a non-null object");
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "reddit_data");
  const coll = db.collection("creative_data");

  // Build the $set payload — only fields that exist in the analysis output
  const update: Record<string, any> = {
    lastAnalyzedAt: new Date().toISOString(),
    analyzerVersion: "v2-prop-firm-aware",
  };

  for (const field of ANALYSIS_FIELDS) {
    if (analysis[field] !== undefined && analysis[field] !== null) {
      update[field] = analysis[field];
    }
  }

  // Also mirror into nested ad_analysis for older readers that expect it there
  update.ad_analysis = { ...(analysis || {}) };

  // updateMany — not findOneAndUpdate — because creative_data sometimes has
  // duplicate docs with the same adId (one from the original Python sync, one
  // from a later resync). findOneAndUpdate only touches the first match, so
  // the duplicate keeps stale data and wins when fetchAdsFromMongo dedupes.
  const result = await coll.updateMany(
    { adId: String(adId) },
    { $set: update }
  );

  if (result.matchedCount === 0) {
    console.warn(`[saveMetaAnalysis] No creative_data docs found for adId=${adId} — analysis not persisted`);
    return null;
  }

  console.log(
    `[saveMetaAnalysis] ✓ Updated ${result.modifiedCount}/${result.matchedCount} creative_data doc(s) for adId=${adId} (analyzer=v2)`
  );
  return result;
}
