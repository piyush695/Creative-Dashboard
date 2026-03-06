import { NextRequest, NextResponse } from "next/server";
import { fetchAds as fetchGoogleAds, fetchCampaigns as fetchGoogleCampaigns, fetchAdAssets } from "@/lib/realtime-services/googleAdsService";
import { analyzeAd } from "@/lib/realtime-services/claudeAnalyzer";
import { connectDB, saveAnalysis } from "@/lib/realtime-services/mongoService";
import clientPromise from "@/lib/mongodb-client";
import fs from "fs";

const jsonResponse = (data: any, status = 200) => NextResponse.json(data, { status });

const logDebug = (msg: string) => {
    try {
        console.log(`[Analyzer] ${msg}`);
        fs.appendFileSync("api_debug.log", `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { }
};

// ─── Fetch AdRoll data directly from MongoDB ───────────────────────────────── 
async function getAdrollDataFromMongo() {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "reddit_data");
    const docs = await db.collection("adroll_data").find({}).toArray();
    return docs;
}

// ─── Build AdRoll campaigns from adroll_data collection ───────────────────────
async function getAdrollCampaignsFromMongo() {
    const docs = await getAdrollDataFromMongo();
    // Group by campaignName (or adAccountId as fallback)
    const campaignMap = new Map<string, any>();

    for (const doc of docs) {
        const data = doc as any;
        const adAnalysis = data.ad_analysis || {};
        const merged = { ...data, ...adAnalysis };

        const campaignName = merged.campaignName || merged.campaign_name || "AdRoll Campaign";
        const campaignId = merged.campaignId || merged.campaign_eid || campaignName;

        if (!campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, {
                id: campaignId,
                name: campaignName,
                platform: "adroll",
                status: merged.status || "active",
                isActive: merged.isActive !== false,
                adType: merged.adType || "image",
                spend: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
                adCount: 0,
            });
        }
        const camp = campaignMap.get(campaignId);
        camp.spend += Number(merged.spend) || 0;
        camp.impressions += Number(merged.impressions) || 0;
        camp.clicks += Number(merged.clicks) || 0;
        camp.conversions += Number(merged.purchases || merged.total_conversions) || 0;
        camp.adCount += 1;
    }

    const campaigns = Array.from(campaignMap.values()).map(c => ({
        ...c,
        ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00",
        cpc: c.clicks > 0 ? (c.spend / c.clicks).toFixed(2) : "0.00",
        roas: "0.00",
        channelType: "AdRoll",
    }));

    return campaigns;
}

// ─── Build AdRoll ads for a campaign from adroll_data collection ──────────────
async function getAdrollAdsFromMongo(campaignId?: string) {
    const docs = await getAdrollDataFromMongo();

    return docs.map((doc: any) => {
        // All fields are at the ROOT level of the document (saved by claudeAnalyzer.js)
        const d = doc as any;

        const docCampaignId = d.campaignId || d.campaign_eid || d.campaignName || "AdRoll Campaign";

        // Filter by campaign if campaignId is provided
        if (campaignId && campaignId !== "all" && String(docCampaignId) !== String(campaignId)) {
            return null;
        }

        return {
            id: d._id.toString(),
            adId: String(d.adId || "").trim(),
            adName: String(d.adName || d.name || d.adId || "Creative").trim(),
            adAccountId: String(d.adAccountId || "").trim(),
            platform: "adroll",
            thumbnailUrl: String(d.thumbnailUrl || d.src || "").trim(),
            adType: String(d.adType || "image").trim(),
            status: d.status || "active",
            isActive: d.isActive !== false,
            campaignName: String(d.campaignName || d.campaign_name || "AdRoll Campaign").trim(),
            campaignId: docCampaignId,
            // ── Performance metrics ──────────────────────────
            spend: Number(d.spend) || 0,
            impressions: Number(d.impressions) || 0,
            clicks: Number(d.clicks) || 0,
            ctr: String(d.ctr || "0.00"),
            cpc: String(d.cpc || "0.00"),
            roas: String(d.roas || "0.00"),
            // ── Root-level analysis fields (Claude schema) ───
            compositeRating: Number(d.compositeRating || d.scoreOverall) || 0,
            scoreOverall: Number(d.compositeRating || d.scoreOverall) || 0,
            verdictRating: d.verdictRating || "",
            verdictDecision: d.verdictDecision || "",
            verdictSummary: d.verdictSummary || "",
            verdictConfidence: d.verdictConfidence || "",
            performanceLabel: d.performanceLabel || "",
            // Creative scores
            scoreVisualDesign: Number(d.scoreVisualDesign) || 0,
            scoreTypography: Number(d.scoreTypography) || 0,
            scoreColorUsage: Number(d.scoreColorUsage) || 0,
            scoreComposition: Number(d.scoreComposition) || 0,
            scoreCTA: Number(d.scoreCTA) || 0,
            scoreEmotionalAppeal: Number(d.scoreEmotionalAppeal) || 0,
            scoreTrustSignals: Number(d.scoreTrustSignals) || 0,
            scoreUrgency: Number(d.scoreUrgency) || 0,
            // AIDA
            aidaAttentionScore: Number(d.aidaAttentionScore) || 0,
            aidaAttentionAnalysis: d.aidaAttentionAnalysis || "",
            aidaInterestScore: Number(d.aidaInterestScore) || 0,
            aidaInterestAnalysis: d.aidaInterestAnalysis || "",
            aidaDesireScore: Number(d.aidaDesireScore) || 0,
            aidaDesireAnalysis: d.aidaDesireAnalysis || "",
            aidaActionScore: Number(d.aidaActionScore) || 0,
            aidaActionAnalysis: d.aidaActionAnalysis || "",
            // Behavioral economics
            lossAversionPresent: d.lossAversionPresent || false,
            lossAversionStrength: d.lossAversionStrength || "",
            lossAversionEvidence: d.lossAversionEvidence || "",
            scarcityPresent: d.scarcityPresent || false,
            scarcityStrength: d.scarcityStrength || "",
            scarcityEvidence: d.scarcityEvidence || "",
            socialProofPresent: d.socialProofPresent || false,
            socialProofStrength: d.socialProofStrength || "",
            socialProofEvidence: d.socialProofEvidence || "",
            anchoringPresent: d.anchoringPresent || false,
            anchoringStrength: d.anchoringStrength || "",
            anchoringEvidence: d.anchoringEvidence || "",
            // Narrative
            whatWorks: d.whatWorks || d.keyStrengths || "",
            whatDoesntWork: d.whatDoesntWork || d.keyWeaknesses || "",
            keyInsight: d.keyInsight || d.topInsight || "",
            keyStrengths: d.keyStrengths || d.whatWorks || "",
            keyWeaknesses: d.keyWeaknesses || d.whatDoesntWork || "",
            topInsight: d.topInsight || d.keyInsight || "",
            primaryMessage: d.primaryMessage || "",
            dominantColors: d.dominantColors || "",
            ctaText: d.ctaText || "",
            primaryBottleneck: d.primaryBottleneck || "",
            ctrAnalysis: d.ctrAnalysis || "",
            cpcAnalysis: d.cpcAnalysis || "",
            // Actions
            actionScale: d.actionScale || false,
            actionPause: d.actionPause || false,
            actionOptimize: d.actionOptimize || false,
            actionTest: d.actionTest || false,
            actionRationale: d.actionRationale || "",
            addElements: d.addElements || "",
            // Recommendations
            recommendation1: d.recommendation1 || "",
            recommendation1Impact: d.recommendation1Impact || "",
            recommendation1Effort: d.recommendation1Effort || "",
            recommendation2: d.recommendation2 || "",
            recommendation2Impact: d.recommendation2Impact || "",
            recommendation2Effort: d.recommendation2Effort || "",
            recommendation3: d.recommendation3 || "",
            recommendation3Impact: d.recommendation3Impact || "",
            recommendation3Effort: d.recommendation3Effort || "",
            // Also expose the nested ad_analysis for any newer docs that use that format
            ad_analysis: d.ad_analysis || null,
        };
    }).filter(Boolean);
}

// ─── GET Handler ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: any }) {
    let path = "unknown";
    try {
        const url = new URL(req.url);
        const searchParams = url.searchParams;
        const platform = searchParams.get("platform") || "google";

        const p = await params;
        const { slug } = p;
        path = slug.join("/");

        logDebug(`GET ${path} | platform=${platform}`);

        if (path === "health") {
            return jsonResponse({
                status: "ok",
                googleAdsConnected: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
                adRollConnected: !!process.env.ADROLL_ACCESS_TOKEN,
                timestamp: new Date().toISOString(),
            });
        }

        if (path === "campaigns") {
            const dateRange = searchParams.get("dateRange") || "LAST_30_DAYS";
            if (platform === "adroll") {
                // Read from MongoDB directly — fast and reliable
                const campaigns = await getAdrollCampaignsFromMongo();
                return jsonResponse({ success: true, data: campaigns });
            }
            const campaigns = await fetchGoogleCampaigns(dateRange);
            return jsonResponse({ success: true, data: campaigns });
        }

        if (path === "ads") {
            const dateRange = searchParams.get("dateRange") || "LAST_30_DAYS";
            const campaignId = searchParams.get("campaignId");
            if (platform === "adroll") {
                // Read from MongoDB directly — includes full analysis data
                const ads = await getAdrollAdsFromMongo(campaignId || undefined);
                return jsonResponse({ success: true, data: ads });
            }
            const ads = await fetchGoogleAds(dateRange, (campaignId || null) as any);
            return jsonResponse({ success: true, data: ads });
        }

        if (path.startsWith("ads/") && path.endsWith("/assets")) {
            const parts = path.split("/");
            const adId = parts[1];
            const dateRange = searchParams.get("dateRange") || "LAST_30_DAYS";
            const campaignId = searchParams.get("campaignId");

            if (platform === "adroll") {
                // For AdRoll, return the ad's own analysis data as its "asset"
                const ads = await getAdrollAdsFromMongo();
                const ad = ads.find((a: any) => a.adId === adId || a.id === adId);
                return jsonResponse({ success: true, data: ad ? [ad] : [] });
            }
            const assets = await (fetchAdAssets as any)(adId, dateRange, campaignId || null);
            return jsonResponse({ success: true, data: assets });
        }

        return jsonResponse({ success: false, error: "Not found" }, 404);
    } catch (err: any) {
        logDebug(`ERROR in GET ${path}: ${err.message}`);
        console.error(err.stack);
        return jsonResponse({ success: false, error: err.message }, 500);
    }
}

// ─── POST Handler ───────────────────────────────────────────────────────────── 
export async function POST(req: NextRequest, { params }: { params: any }) {
    let path = "unknown";
    try {
        const p = await params;
        const { slug } = p;
        path = slug.join("/");

        logDebug(`POST ${path}`);

        // AdRoll ad analysis: POST /api/realtime/ads/:adId/analyze
        if (slug.length === 3 && slug[0] === "ads" && slug[2] === "analyze") {
            const adId = slug[1];
            const body = await req.json();
            const adData = body.adData || body.ad;

            if (!adData) {
                return jsonResponse({ success: false, error: "Missing ad data" }, 400);
            }

            // Use the thumbnail URL for image analysis (AdRoll has images)
            const imageUrl = adData.thumbnailUrl || adData.src || null;

            logDebug(`Analyzing AdRoll ad: ${adId} | image: ${imageUrl}`);

            await connectDB();

            // Run AI analysis via Claude
            const analysis = await analyzeAd(
                { ...adData, platform: adData.platform || "adroll" },
                imageUrl
            );

            // Save to MongoDB
            try {
                await saveAnalysis({ ...analysis, adId: adData.adId || adId });
            } catch (saveErr: any) {
                logDebug(`Warning: could not save analysis: ${saveErr.message}`);
            }

            return jsonResponse({ success: true, data: { analysis } });
        }

        // Generic analyze endpoint: POST /api/realtime/analyze  
        if (path === "analyze") {
            const body = await req.json();
            const { ad, platform } = body;

            await connectDB();
            const analysis = await analyzeAd(ad, ad?.thumbnailUrl || null);
            await saveAnalysis(analysis);

            return jsonResponse({ success: true, data: analysis });
        }

        return jsonResponse({ success: false, error: "Not found" }, 404);
    } catch (err: any) {
        logDebug(`ERROR in POST ${path}: ${err.message}`);
        console.error(err.stack);
        return jsonResponse({ success: false, error: err.message }, 500);
    }
}
