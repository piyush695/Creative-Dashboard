"use server"

import clientPromise from "@/lib/mongodb-client";
import { AdData } from "@/lib/types";

// Define account mapping
const ACCOUNT_MAPPING: Record<string, string> = {
    "25613137998288459": "HP FOREX - EU",
    "1333109771382157": "HP FOREX - LATAM",
    "1002675181794911": "HP FOREX - UK",
    "1507386856908357": "HP FOREX - USA + CA",
    "1024147486590417": "HP FUTURES - USA + CA"
};

export async function fetchAdsFromMongo(): Promise<AdData[]> {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");
        const ads = await db.collection("creative_data").find({}).toArray();

        return ads.map((doc, index) => {
            // Check for nested 'json' object structure
            let data = doc;
            const nestedJson = (doc as any).json;

            if (nestedJson) {
                if (typeof nestedJson === 'object') {
                    data = { ...doc, ...nestedJson };
                } else if (typeof nestedJson === 'string') {
                    try {
                        data = { ...doc, ...JSON.parse(nestedJson) };
                    } catch (e) {
                        console.error("Failed to parse json string field", e);
                    }
                }
            }

            const adId = String(data.adId || "").trim();
            const adName = String(data.adName || "").trim();
            const adAccountId = String(data.adAccountId || "").trim();

            // Map account name based on ID, fallback to existing name or unknown
            let accountName = ACCOUNT_MAPPING[adAccountId];
            if (!accountName) {
                accountName = String(data.accountName || "Unknown Account").trim();
            }

            // Get the best quality image URL available
            let thumbnailUrl = String(data.thumbnailUrl || data.imageUrl || "").trim();

            return {
                ...data, // Use the merged/flattened data
                id: doc._id.toString(), // Use MongoDB's _id as the unique key
                adId: adId,
                adName: adName,
                adAccountId: adAccountId,
                accountName: accountName,
                platform: (data.platform || 'meta') as any, // Default to meta for current inventory
                thumbnailUrl: thumbnailUrl,
                spend: Number(data.spend) || 0,
                purchaseValue: Number(data.purchaseValue) || 0,
                purchases: Number(data.purchases) || 0,
                roas: Number(data.roas) || 0,
                ctr: Number(data.ctr) || 0,
                cpc: Number(data.cpc) || 0,
                cpm: Number(data.cpm) || 0,
                cpp: Number(data.cpp) || 0,
                aov: Number(data.aov) || 0,
                scoreVisualDesign: Number(data.scoreVisualDesign) || 0,
                scoreTypography: Number(data.scoreTypography) || 0,
                scoreColorUsage: Number(data.scoreColorUsage) || 0,
                scoreComposition: Number(data.scoreComposition) || 0,
                scoreCTA: Number(data.scoreCTA) || 0,
                scoreEmotionalAppeal: Number(data.scoreEmotionalAppeal) || 0,
                scoreTrustSignals: Number(data.scoreTrustSignals) || 0,
                scoreUrgency: Number(data.scoreUrgency) || 0,
                scoreOverall: Number(data.scoreOverall) || 0,
                performanceLabel: String(data.performanceLabel || "").trim(),
                designQuality: String(data.designQuality || "").trim(),
                psychologyStrength: String(data.psychologyStrength || "").trim(),
                visualDesignJustification: String(data.visualDesignJustification || "").trim(),
                typographyJustification: String(data.typographyJustification || "").trim(),
                colorUsageJustification: String(data.colorUsageJustification || "").trim(),
                compositionJustification: String(data.compositionJustification || "").trim(),
                ctaJustification: String(data.ctaJustification || "").trim(),
                emotionalAppealJustification: String(data.emotionalAppealJustification || "").trim(),
                trustSignalsJustification: String(data.trustSignalsJustification || "").trim(),
                urgencyJustification: String(data.urgencyJustification || "").trim(),
                _id: doc._id.toString()
            } as any as AdData;
        });
    } catch (e) {
        console.error("Failed to fetch ads from MongoDB:", e);
        return [];
    }
}

export async function saveAdToMongo(adData: Partial<AdData>) {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "reddit_data");

        // Normalize data with smart defaults
        const { _id, ...rest } = adData;
        const newAd = {
            ...rest,
            adId: adData.adId || `AD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            adAccountId: adData.adAccountId || "manual_upload",
            accountName: adData.accountName || "Manual Upload",
            analysisDate: new Date().toISOString(),
            spend: Number(adData.spend || 0),
            ctr: Number(adData.ctr || 0),
            roas: Number(adData.roas || 0),
            scoreOverall: Number(adData.scoreOverall || 5),
            performanceLabel: adData.performanceLabel || "NEW",
            thumbnailUrl: adData.thumbnailUrl || "/api/placeholder/400/320"
        };

        const result = await db.collection("creative_data").insertOne(newAd);
        return { success: true, id: result.insertedId.toString() };
    } catch (e) {
        console.error("Failed to save ad:", e);
        return { success: false, error: "Database error" };
    }
}
