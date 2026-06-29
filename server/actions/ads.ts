"use server"

import { ObjectId } from "mongodb";
import clientPromise from "@/server/mongodb-client";
import { AdData } from "@/lib/types";

// Meta ad account mapping — all 19 visible to the token
const META_ACCOUNT_MAPPING: Record<string, string> = {
    "25613137998288459": "HP FOREX - EU",
    "1333109771382157": "HP FOREX - LATAM",
    "1002675181794911": "HP FOREX - UK",
    "1507386856908357": "HP FOREX - USA + CA",
    "1024147486590417": "HP FUTURES - USA + CA",
    "1470715300596847": "HP Affiliates",
    "1080442027052682": "Hola Prime - Philippines",
    "898790545438755":  "HP-Testing",
    "1685822631995541": "05_Africa",
    "1570253877213015": "Hola Prime Zocket Manager",
    "1252130839875965": "Hola Prime US Zocket Manager",
    "739741928947398":  "Hola Prime X Zocket Manager",
    "1068261556366484": "Hola Prime (Read-Only) #1",
    "1249213144086506": "Hola Prime (Read-Only) #2",
    "1955053831574713": "Himanshu Chandel Trader",
    // Disabled accounts — historical ads will still resolve to these names
    "953858236647175":  "Hola Prime - NON US (disabled)",
    "1666802993879148": "Hola Prime - US (disabled)",
    "1209058433960342": "01_HP_NON-US (disabled)",
    "2190288381392813": "02_UK (disabled)",
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

// ─── List-view projection ──────────────────────────────────────────────────
// creative_data docs are ~38 KB each (×28k docs). The grid, filters, sort,
// search, account summaries and the meta-ads-view aggregates only read the
// lightweight scalar fields below. A tight *inclusion* projection lets MongoDB
// return ~1 KB/doc instead of reading + stripping the full 38 KB doc, which is
// markedly faster than an exclusion projection. Everything else (heavy analysis
// prose + nested objects) is hydrated on demand by fetchAdDetailById when the
// detail panel opens. _id is included automatically.
//
// IMPORTANT: this is the complete set of fields any meta list/grid view touches.
// If a list view starts reading a new field, add it here or it will read empty.
const CREATIVE_LIST_PROJECTION: Record<string, 1> = {
    // Identity / routing
    adId: 1, adName: 1, name: 1, adAccountId: 1, accountName: 1, platform: 1,
    // Thumbnail (+ fallbacks used by normalizeMetaDoc)
    thumbnailUrl: 1, imageUrl: 1, src: 1,
    // Numeric metrics (+ aggregate fallbacks)
    spend: 1, impressions: 1, clicks: 1, ctr: 1, cpc: 1, cpm: 1, roas: 1,
    purchases: 1, purchaseValue: 1, total_conversions: 1, revenue: 1, attributed_rev: 1,
    // Scores shown on grid cards
    scoreOverall: 1, compositeRating: 1, scoreVisualDesign: 1, scoreTypography: 1,
    scoreColorUsage: 1, scoreComposition: 1, scoreCTA: 1, scoreTrustSignals: 1,
    scoreEmotionalAppeal: 1, scoreUrgency: 1,
    // Verdict / label used for filtering + badges
    performanceLabel: 1, verdictDecision: 1, verdictRating: 1, verdictConfidence: 1,
    // Sort / dedupe freshness signals
    analysisDate: 1, lastAnalyzedAt: 1, analyzerVersion: 1,
    // Campaign / type
    campaignName: 1, campaign_name: 1, campaignId: 1, adType: 1, type: 1,
};

// Per-document normalization for meta + adroll docs (creative_data / adroll_data).
// Shared by the list fetch and the single-doc detail fetch so both produce the
// exact same AdData shape.
function normalizeMetaDoc(doc: any): AdData {
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
}

// Per-document normalization for google docs (google_asset_data).
function normalizeGoogleDoc(doc: any): AdData {
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
}

export async function fetchAdsFromMongo(opts?: { analyzedOnly?: boolean }): Promise<AdData[]> {
    try {
        const analyzedOnly = opts?.analyzedOnly ?? false;
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");

        // When analyzedOnly is set we ship just the scored creatives (a handful
        // of docs) for an instant first paint. The full catalog is loaded in a
        // second pass. Without it we read the whole collection.
        const metaFilter = analyzedOnly
            ? { $or: [{ scoreOverall: { $gt: 0 } }, { compositeRating: { $gt: 0 } }] }
            : {};

        const [metaAdsRaw, adrollDocs] = await Promise.all([
            // Lean projection on the large creative_data collection only.
            // adroll_data is tiny and its overview aggregates recommendation
            // prose, so it stays unprojected.
            db.collection("creative_data").find(metaFilter, { projection: CREATIVE_LIST_PROJECTION }).toArray(),
            db.collection("adroll_data").find({}).toArray()
        ]);

        // ─── Dedupe duplicate creative_data docs by adId ───
        // The collection sometimes has multiple docs with the same adId (an
        // original Python-sync doc + a later resync). When that happens, we
        // want the FRESHEST one (with the newest analyzer output) to win — not
        // whichever happens to come back first from MongoDB.
        //
        // Ranking signal (descending): lastAnalyzedAt ISO string > analyzerVersion
        // present > analysisDate > raw _id timestamp.
        const scoreDocFreshness = (d: any): string => {
            // Higher (lexicographically) wins. ISO timestamps sort correctly as strings.
            return (
                d.lastAnalyzedAt ||
                (d.analyzerVersion ? '~analyzer-' + d.analyzerVersion : '') ||
                d.analysisDate ||
                (d._id?.getTimestamp?.()?.toISOString() ?? '')
            );
        };
        const byAdId = new Map<string, any>();
        for (const doc of metaAdsRaw as any[]) {
            const key = String(doc?.adId || doc?._id);
            const existing = byAdId.get(key);
            if (!existing || scoreDocFreshness(doc) > scoreDocFreshness(existing)) {
                byAdId.set(key, doc);
            }
        }
        const metaAds = Array.from(byAdId.values());
        const originalCount = metaAdsRaw.length;
        const dedupedCount = metaAds.length;
        if (originalCount !== dedupedCount) {
            console.log(`[fetchAdsFromMongo] Deduped creative_data: ${originalCount} → ${dedupedCount} (kept freshest per adId)`);
        }

        const allDocs = [...metaAds, ...adrollDocs];

        return allDocs.map(normalizeMetaDoc);
    } catch (e) {
        console.error("Failed to fetch ads from MongoDB:", e);
        return [];
    }
}

// ─── Server-side pagination for the Meta grid ───────────────────────────────
// The grid used to receive the entire creative_data collection (~24k docs) in
// the browser and paginate client-side — heavy payload + heavy in-memory work.
// These actions push the paging/filtering/counting into MongoDB so the browser
// only ever holds the ~12 docs it is currently showing.

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMetaFilter(accountId?: string, search?: string): Record<string, any> {
    const filter: Record<string, any> = {};
    if (accountId && accountId !== "all") filter.adAccountId = accountId;
    const term = (search || "").trim();
    if (term) {
        const rx = new RegExp(escapeRegex(term), "i");
        filter.$or = [{ adName: rx }, { adId: rx }, { campaignName: rx }];
    }
    return filter;
}

// One page of meta ads + the total matching count (for the pager). Newest first.
export async function fetchMetaAdsPage(opts: {
    accountId?: string;
    search?: string;
    page?: number;
    perPage?: number;
}): Promise<{ ads: AdData[]; total: number }> {
    try {
        const { accountId = "all", search = "", page = 1, perPage = 12 } = opts || {};
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const coll = db.collection("creative_data");
        const filter = buildMetaFilter(accountId, search);
        const skip = (Math.max(1, page) - 1) * perPage;
        const [docs, total] = await Promise.all([
            coll.find(filter, { projection: CREATIVE_LIST_PROJECTION })
                .sort({ _id: -1 })
                .skip(skip)
                .limit(perPage)
                .toArray(),
            coll.countDocuments(filter),
        ]);
        return { ads: docs.map(normalizeMetaDoc), total };
    } catch (e) {
        console.error("fetchMetaAdsPage failed:", e);
        return { ads: [], total: 0 };
    }
}

// The full filtered set — used on demand by the Overview (KPIs + charts need
// aggregates across all matching ads) and capped lookups (search dropdown).
export async function fetchMetaAdsAll(opts?: {
    accountId?: string;
    search?: string;
    limit?: number;
}): Promise<AdData[]> {
    try {
        const { accountId = "all", search = "", limit = 0 } = opts || {};
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const coll = db.collection("creative_data");
        const filter = buildMetaFilter(accountId, search);
        let cursor = coll.find(filter, { projection: CREATIVE_LIST_PROJECTION }).sort({ _id: -1 });
        if (limit > 0) cursor = cursor.limit(limit);
        const docs = await cursor.toArray();
        return docs.map(normalizeMetaDoc);
    } catch (e) {
        console.error("fetchMetaAdsAll failed:", e);
        return [];
    }
}

// Cheap per-account counts (and grand total) via aggregation, so the account
// switcher badges + breadcrumb totals don't require loading every doc.
export async function fetchMetaFacets(): Promise<{ total: number; byAccount: Record<string, number> }> {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const coll = db.collection("creative_data");
        const [total, grouped] = await Promise.all([
            coll.estimatedDocumentCount(),
            coll.aggregate([{ $group: { _id: "$adAccountId", count: { $sum: 1 } } }]).toArray(),
        ]);
        const byAccount: Record<string, number> = {};
        for (const g of grouped as any[]) if (g._id) byAccount[String(g._id)] = g.count;
        return { total, byAccount };
    } catch (e) {
        console.error("fetchMetaFacets failed:", e);
        return { total: 0, byAccount: {} };
    }
}

// Fetch a single full document (no projection) for the detail panel. Hydrates
// the heavy analysis fields the list query intentionally drops.
export async function fetchAdDetailById(id: string, platform?: string): Promise<AdData | null> {
    try {
        if (!id || !ObjectId.isValid(id)) return null;
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const _id = new ObjectId(id);

        const isGoogle = platform === "google" || platform === "youtube";
        if (isGoogle) {
            const doc = await db.collection("google_asset_data").findOne({ _id });
            return doc ? normalizeGoogleDoc(doc) : null;
        }

        // Meta + AdRoll share the same normalizer. We don't always know the exact
        // collection, so prefer the platform hint and fall back to the other.
        const primary = platform === "adroll" ? "adroll_data" : "creative_data";
        const secondary = platform === "adroll" ? "creative_data" : "adroll_data";
        const doc =
            (await db.collection(primary).findOne({ _id })) ||
            (await db.collection(secondary).findOne({ _id }));
        return doc ? normalizeMetaDoc(doc) : null;
    } catch (e) {
        console.error("Failed to fetch ad detail from MongoDB:", e);
        return null;
    }
}

export async function fetchGoogleAdsFromMongo(): Promise<AdData[]> {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const docs = await db.collection("google_asset_data").find({}).toArray();

        return docs.map(normalizeGoogleDoc);
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

