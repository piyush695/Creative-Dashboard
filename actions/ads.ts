"use server"

import clientPromise from "@/lib/mongodb-client";
import { AdData } from "@/lib/types";

// Meta ad account mapping
const META_ACCOUNT_MAPPING: Record<string, string> = {
    "25613137998288459": "HP FOREX - EU",
    "1333109771382157": "HP FOREX - LATAM",
    "1002675181794911": "HP FOREX - UK",
    "1507386856908357": "HP FOREX - USA + CA",
    "1024147486590417": "HP FUTURES - USA + CA"
};

// Google Ads account mapping
const GOOGLE_ACCOUNT_MAPPING: Record<string, string> = {
    "7791434558": "HP Google - Main",
    // Add more Google account IDs here as needed
};

// AdRoll account mapping
const ADROLL_ACCOUNT_MAPPING: Record<string, string> = {
    "OYOTU3PNRNDAPN4CD2VMYF": "AdRoll Organization",
    "3Q6Z3NN2KZAT3O6TEVBR4L": "AdRoll Advertisable"
};

// Combined mapping
const ACCOUNT_MAPPING: Record<string, string> = {
    ...META_ACCOUNT_MAPPING,
    ...GOOGLE_ACCOUNT_MAPPING,
    ...ADROLL_ACCOUNT_MAPPING,
};

export async function fetchAdsFromMongo(): Promise<AdData[]> {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const [metaAds, adrollDocs] = await Promise.all([
            db.collection("creative_data").find({}).toArray(),
            db.collection("adroll_data").find({}).toArray()
        ]);

        const allDocs = [...metaAds, ...adrollDocs];

        return allDocs.map((doc) => {
            // All root-level fields are the primary source for adroll docs.
            // Merge nested json/ad_analysis as fallback for meta docs.
            let data: any = { ...doc };
            const nestedJson = (doc as any).json;
            const adAnalysis = (doc as any).ad_analysis;

            if (nestedJson) {
                if (typeof nestedJson === 'object') {
                    data = { ...data, ...nestedJson };
                } else if (typeof nestedJson === 'string') {
                    try { data = { ...data, ...JSON.parse(nestedJson) }; } catch (e) { }
                }
            }
            // Merge ad_analysis ONLY if fields don't already exist at root
            if (adAnalysis && typeof adAnalysis === 'object') {
                Object.keys(adAnalysis).forEach(k => {
                    if (data[k] === undefined || data[k] === null || data[k] === '') {
                        data[k] = adAnalysis[k];
                    }
                });
            }

            const adId = String(data.adId || "").trim();
            // For AdRoll, adName is often the same as adId — fall back to adId
            const adName = String(data.adName || data.name || adId || "").trim();
            const adAccountId = String(data.adAccountId || "").trim();

            let accountName = ACCOUNT_MAPPING[adAccountId];
            if (!accountName) accountName = String(data.accountName || "Unknown Account").trim();

            const thumbnailUrl = String(data.thumbnailUrl || data.imageUrl || data.src || "").trim();

            // Smarter platform detection
            let platform = data.platform;
            if (!platform) {
                if (adAccountId.startsWith('3Q')) {
                    platform = 'adroll';
                } else if (GOOGLE_ACCOUNT_MAPPING[adAccountId]) {
                    platform = 'google';
                } else if (adAccountId.length === 10 && /^\d+$/.test(adAccountId)) {
                    platform = 'google';
                } else {
                    platform = 'meta';
                }
            }

            return {
                ...data,
                id: doc._id.toString(),
                _id: doc._id.toString(),
                adId,
                adName,
                adAccountId,
                accountName,
                platform: platform as any,
                thumbnailUrl,
                // ── Numeric metrics ──────────────────────────────────
                spend: Number(data.spend) || 0,
                impressions: Number(data.impressions) || 0,
                clicks: Number(data.clicks) || 0,
                ctr: Number(data.ctr) || 0,
                cpc: Number(data.cpc) || 0,
                cpm: Number(data.cpm) || 0,
                roas: Number(data.roas) || 0,
                purchases: Number(data.purchases || data.total_conversions) || 0,
                purchaseValue: Number(data.purchaseValue || data.revenue || data.attributed_rev) || 0,
                // ── Analysis scores ───────────────────────────────────
                scoreOverall: Number(data.scoreOverall || data.compositeRating) || 0,
                compositeRating: Number(data.compositeRating || data.scoreOverall) || 0,
                scoreVisualDesign: Number(data.scoreVisualDesign) || 0,
                scoreTypography: Number(data.scoreTypography) || 0,
                scoreColorUsage: Number(data.scoreColorUsage) || 0,
                scoreComposition: Number(data.scoreComposition) || 0,
                scoreCTA: Number(data.scoreCTA) || 0,
                scoreEmotionalAppeal: Number(data.scoreEmotionalAppeal) || 0,
                scoreTrustSignals: Number(data.scoreTrustSignals) || 0,
                scoreUrgency: Number(data.scoreUrgency) || 0,
                // ── AIDA ─────────────────────────────────────────────
                aidaAttentionScore: Number(data.aidaAttentionScore) || 0,
                aidaAttentionAnalysis: String(data.aidaAttentionAnalysis || ""),
                aidaInterestScore: Number(data.aidaInterestScore) || 0,
                aidaInterestAnalysis: String(data.aidaInterestAnalysis || ""),
                aidaDesireScore: Number(data.aidaDesireScore) || 0,
                aidaDesireAnalysis: String(data.aidaDesireAnalysis || ""),
                aidaActionScore: Number(data.aidaActionScore) || 0,
                aidaActionAnalysis: String(data.aidaActionAnalysis || ""),
                // ── Verdict / label ───────────────────────────────────
                performanceLabel: String(data.performanceLabel || "").trim(),
                verdictRating: String(data.verdictRating || "").trim(),
                verdictDecision: String(data.verdictDecision || "").trim(),
                verdictSummary: String(data.verdictSummary || "").trim(),
                verdictConfidence: String(data.verdictConfidence || "").trim(),
                // ── Text fields ───────────────────────────────────────
                keyStrengths: String(data.keyStrengths || data.whatWorks || "").trim(),
                keyWeaknesses: String(data.keyWeaknesses || data.whatDoesntWork || "").trim(),
                topInsight: String(data.topInsight || data.keyInsight || "").trim(),
                whatWorks: String(data.whatWorks || data.keyStrengths || "").trim(),
                whatDoesntWork: String(data.whatDoesntWork || data.keyWeaknesses || "").trim(),
                keyInsight: String(data.keyInsight || data.topInsight || "").trim(),
                primaryMessage: String(data.primaryMessage || "").trim(),
                ctaText: String(data.ctaText || "").trim(),
                // ── Recommendations ───────────────────────────────────
                primaryRecommendation: String(data.primaryRecommendation || data.recommendation1 || "").trim(),
                recommendation1: String(data.recommendation1 || "").trim(),
                recommendation1Impact: String(data.recommendation1Impact || "").trim(),
                recommendation1Effort: String(data.recommendation1Effort || "").trim(),
                recommendation2: String(data.recommendation2 || "").trim(),
                recommendation2Impact: String(data.recommendation2Impact || "").trim(),
                recommendation2Effort: String(data.recommendation2Effort || "").trim(),
                recommendation3: String(data.recommendation3 || "").trim(),
                recommendation3Impact: String(data.recommendation3Impact || "").trim(),
                recommendation3Effort: String(data.recommendation3Effort || "").trim(),
                // ── Actions ───────────────────────────────────────────
                actionScale: Boolean(data.actionScale),
                actionPause: Boolean(data.actionPause),
                actionOptimize: Boolean(data.actionOptimize),
                actionTest: Boolean(data.actionTest),
                actionRationale: String(data.actionRationale || "").trim(),
                addElements: String(data.addElements || "").trim(),
                // ── Behavioral economics ──────────────────────────────
                lossAversionPresent: Boolean(data.lossAversionPresent),
                lossAversionStrength: String(data.lossAversionStrength || "").trim(),
                lossAversionEvidence: String(data.lossAversionEvidence || "").trim(),
                scarcityPresent: Boolean(data.scarcityPresent),
                scarcityStrength: String(data.scarcityStrength || "").trim(),
                scarcityEvidence: String(data.scarcityEvidence || "").trim(),
                socialProofPresent: Boolean(data.socialProofPresent),
                socialProofStrength: String(data.socialProofStrength || "").trim(),
                socialProofEvidence: String(data.socialProofEvidence || "").trim(),
                anchoringPresent: Boolean(data.anchoringPresent),
                anchoringStrength: String(data.anchoringStrength || "").trim(),
                anchoringEvidence: String(data.anchoringEvidence || "").trim(),
                // ── Intelligence Analysis (New) ───────────────────
                psychology_analysis: String(data.psychology_analysis || "").trim(),
                behavioral_economics_analysis: String(data.behavioral_economics_analysis || "").trim(),
                neuromarketing_analysis: String(data.neuromarketing_analysis || "").trim(),
                google_algorithm_analysis: String(data.google_algorithm_analysis || "").trim(),
                competitive_differentiation: String(data.competitive_differentiation || "").trim(),
                predicted_performance_impact: String(data.predicted_performance_impact || "").trim(),
                recommended_scaling_strategy: String(data.recommended_scaling_strategy || "").trim(),
                creative_evolution_path: String(data.creative_evolution_path || "").trim(),
                cognitive_bias_utilization: String(data.cognitive_bias_utilization || "").trim(),
                neuromarketing_triggers: String(data.neuromarketing_triggers || "").trim(),
                google_algorithm_optimization: String(data.google_algorithm_optimization || "").trim(),
                competitive_moat: String(data.competitive_moat || "").trim(),
                strategic_roadmap: String(data.strategic_roadmap || "").trim(),
                predicted_impact: String(data.predicted_impact || "").trim(),

                // ── AdRoll/Platform Metadata ────────────────────────
                campaignName: String(data.campaignName || data.campaign_name || "").trim(),
                campaignId: String(data.campaignId || "").trim(),
                adType: String(data.adType || data.type || "").trim(),
            } as any as AdData;
        });
    } catch (e) {
        console.error("Failed to fetch ads from MongoDB:", e);
        return [];
    }
}

export async function fetchGoogleAdsFromMongo(): Promise<AdData[]> {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const docs = await db.collection("google_asset_data").find({}).toArray();

        return docs.map((doc) => {
            const data = doc as any;
            const adId = String(data.adId || data.assetId || "").trim();
            const adName = String(data.asset || data.adName || "").trim();
            const adAccountId = String(data.adAccountId || "").trim();

            let accountName = String(data.accountName || "Google Ads Account").trim();
            const thumbnailUrl = String(data.thumbnailUrl || data.imageUrl || "").trim();

            return {
                ...data,
                id: doc._id.toString(),
                _id: doc._id.toString(),
                adId,
                adName,
                adAccountId,
                accountName,
                platform: (data.platform || 'google') as any,
                thumbnailUrl,
                spend: Number(data.spend) || 0,
                impressions: Number(data.impressions) || 0,
                clicks: Number(data.clicks) || 0,
                scoreOverall: Number(data.scoreOverall) || 0,
                performanceLabel: String(data.performanceLabel || "").trim(),
                campaignName: String(data.campaignName || data.campaign_name || "").trim(),
                adType: String(data.adType || data.type || "").trim(),
                psychology_analysis: String(data.psychology_analysis || "").trim(),
                behavioral_economics_analysis: String(data.behavioral_economics_analysis || "").trim(),
                neuromarketing_analysis: String(data.neuromarketing_analysis || "").trim(),
                google_algorithm_analysis: String(data.google_algorithm_analysis || "").trim(),
                competitive_differentiation: String(data.competitive_differentiation || "").trim(),
                predicted_performance_impact: String(data.predicted_performance_impact || "").trim(),
                recommended_scaling_strategy: String(data.recommended_scaling_strategy || "").trim(),
                creative_evolution_path: String(data.creative_evolution_path || "").trim(),
                cognitive_bias_utilization: String(data.cognitive_bias_utilization || "").trim(),
                neuromarketing_triggers: String(data.neuromarketing_triggers || "").trim(),
                google_algorithm_optimization: String(data.google_algorithm_optimization || "").trim(),
                competitive_moat: String(data.competitive_moat || "").trim(),
                strategic_roadmap: String(data.strategic_roadmap || "").trim(),
                predicted_impact: String(data.predicted_impact || "").trim(),
            } as any as AdData;
        });
    } catch (e) {
        return [];
    }
}

export async function saveAdToMongo(adData: Partial<AdData>) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const { _id, ...rest } = adData;

        // Correctly partition data by platform
        const googlePlatforms = ['google', 'youtube'];
        let collection = 'creative_data';

        if (adData.platform === 'adroll') {
            collection = 'adroll_data';
        } else if (googlePlatforms.includes(adData.platform as string)) {
            collection = 'google_asset_data';
        }

        const result = await db.collection(collection).insertOne({
            ...rest,
            analysisDate: new Date().toISOString()
        });
        return { success: true, id: result.insertedId.toString() };
    } catch (e) {
        return { success: false, error: "Database error" };
    }
}

