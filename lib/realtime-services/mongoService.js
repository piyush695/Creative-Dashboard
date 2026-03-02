// // const mongoose = require('mongoose');

// // // Provided connection string with user credentials
// // const MONGO_URI = 'mongodb+srv://n8n_user:23172410@cluster0.drr2ppd.mongodb.net/?appName=Cluster0';
// // const DB_NAME = 'reddit_data';
// // const COLLECTION_NAME = 'google_data';

// // // ─── Schema Definition matching User Requirements ───
// // const analysisSchema = new mongoose.Schema({
// //     adAccountId: String,
// //     adId: String,
// //     adName: String,
// //     creativeId: { type: String, default: '' },
// //     thumbnailUrl: String,
// //     isAdvantagePlus: { type: Boolean, default: false },
// //     adType: String,
// //     analysisMode: { type: String, default: 'VISUAL_AND_METRICS' },

// //     // Metrics (Strings to match user specific format e.g. "51.89")
// //     spend: String,
// //     impressions: Number,
// //     clicks: Number,
// //     ctr: String,
// //     cpc: String,
// //     cpm: String,
// //     roas: String,
// //     aov: { type: String, default: "0.00" }, // Google Ads typically doesn't give AOV directly unless calculated from conv value/convs

// //     // ─── Analysis Fields from Claude ───
// //     ctrAnalysis: String,
// //     cpcAnalysis: String,
// //     frequencyAnalysis: String,
// //     primaryBottleneck: String,

// //     creativeType: String,
// //     dominantColors: String,
// //     primaryMessage: String,
// //     secondaryMessage: String,
// //     ctaText: String,

// //     trustElements: String,
// //     urgencyElements: String,
// //     numbersShown: String,
// //     brandingElements: String,
// //     keyVisualElements: String,

// //     // Scores (0-10)
// //     scoreVisualDesign: Number,
// //     scoreTypography: Number,
// //     scoreColorUsage: Number,
// //     scoreComposition: Number,
// //     scoreCTA: Number,
// //     scoreEmotionalAppeal: Number,
// //     scoreTrustSignals: Number,
// //     scoreUrgency: Number,
// //     scoreOverall: Number,
// //     performanceScore: Number,
// //     compositeRating: Number,

// //     // Justifications
// //     visualDesignJustification: String,
// //     typographyJustification: String,
// //     colorUsageJustification: String,
// //     compositionJustification: String,
// //     ctaJustification: String,
// //     emotionalAppealJustification: String,
// //     trustSignalsJustification: String,
// //     urgencyJustification: String,

// //     // Psychology
// //     lossAversionPresent: Boolean,
// //     lossAversionStrength: String,
// //     lossAversionEvidence: String,
// //     scarcityPresent: Boolean,
// //     scarcityStrength: String,
// //     scarcityEvidence: String,
// //     socialProofPresent: Boolean,
// //     socialProofStrength: String,
// //     socialProofEvidence: String,
// //     anchoringPresent: Boolean,
// //     anchoringStrength: String,
// //     anchoringEvidence: String,

// //     // AIDA Model
// //     aidaAttentionScore: Number,
// //     aidaAttentionAnalysis: String,
// //     aidaInterestScore: Number,
// //     aidaInterestAnalysis: String,
// //     aidaDesireScore: Number,
// //     aidaDesireAnalysis: String,
// //     aidaActionScore: Number,
// //     aidaActionAnalysis: String,

// //     // Verdict
// //     performanceLabel: String,
// //     designQuality: String,
// //     psychologyStrength: String,
// //     whatWorks: String,
// //     whatDoesntWork: String,
// //     keyInsight: String,

// //     // Recommendations
// //     recommendation1: String,
// //     recommendation1Impact: String,
// //     recommendation1Effort: String,
// //     recommendation2: String,
// //     recommendation2Impact: String,
// //     recommendation2Effort: String,
// //     recommendation3: String,
// //     recommendation3Impact: String,
// //     recommendation3Effort: String,

// //     // Changes
// //     keepElements: String,
// //     changeElements: String,
// //     addElements: String,
// //     hookOptions: String,
// //     ctaOptions: String,

// //     // Action Plan
// //     actionScale: Boolean,
// //     actionPause: Boolean,
// //     actionOptimize: Boolean,
// //     actionTest: Boolean,
// //     actionRationale: String,

// //     // Summary
// //     verdictDecision: String,
// //     verdictRating: String,
// //     verdictConfidence: String,
// //     verdictSummary: String,
// //     embeddingText: String,

// //     // Metadata
// //     tags: [String],
// //     searchableContent: String,
// //     analysisDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
// //     analysisVersion: { type: String, default: "2.0" },
// //     isPartialResponse: { type: Boolean, default: false }

// // }, { timestamps: true });

// // // ─── Connection Logic ───
// // let isConnected = false;

// // async function connectDB() {
// //     if (isConnected) return;
// //     try {
// //         await mongoose.connect(MONGO_URI, {
// //             dbName: DB_NAME
// //         });
// //         isConnected = true;
// //         console.log(`[SYSTEM] Connected to MongoDB: ${DB_NAME}`);
// //     } catch (err) {
// //         console.error('[SYSTEM] MongoDB connection error:', err);
// //     }
// // }

// // // Create model with specific collection name
// // const AdAnalysis = mongoose.model('GoogleAdAnalysis', analysisSchema, COLLECTION_NAME);

// // // ─── Save Function ───
// // async function saveAnalysis(data) {
// //     if (!isConnected) await connectDB();

// //     try {
// //         // Upsert based on adId to allow re-analysis updating existing record
// //         const result = await AdAnalysis.findOneAndUpdate(
// //             { adId: data.adId },
// //             data,
// //             { upsert: true, new: true, setDefaultsOnInsert: true }
// //         );
// //         console.log(`[SYSTEM] Saved analysis for Ad ${data.adId} to MongoDB`);
// //         return result;
// //     } catch (err) {
// //         console.error('[SYSTEM] Failed to save analysis:', err);
// //         throw err;
// //     }
// // }

// // module.exports = { connectDB, saveAnalysis };



// const mongoose = require('mongoose');

// // Provided connection string with user credentials
// const MONGO_URI = 'mongodb+srv://n8n_user:23172410@cluster0.drr2ppd.mongodb.net/?appName=Cluster0';
// const DB_NAME = 'reddit_data';
// const COLLECTION_NAME = 'google_data';
// const ASSET_COLLECTION_NAME = 'google_asset_data';

// // ─── Schema Definition matching User Requirements (AD-LEVEL) ───
// const analysisSchema = new mongoose.Schema({
//     adAccountId: String,
//     adId: String,
//     adName: String,
//     creativeId: { type: String, default: '' },
//     thumbnailUrl: String,
//     isAdvantagePlus: { type: Boolean, default: false },
//     adType: String,
//     analysisMode: { type: String, default: 'VISUAL_AND_METRICS' },

//     // Metrics
//     spend: String,
//     impressions: Number,
//     clicks: Number,
//     ctr: String,
//     cpc: String,
//     cpm: String,
//     roas: String,
//     aov: { type: String, default: "0.00" },

//     // Analysis Fields
//     ctrAnalysis: String,
//     cpcAnalysis: String,
//     frequencyAnalysis: String,
//     primaryBottleneck: String,

//     creativeType: String,
//     dominantColors: String,
//     primaryMessage: String,
//     secondaryMessage: String,
//     ctaText: String,

//     trustElements: String,
//     urgencyElements: String,
//     numbersShown: String,
//     brandingElements: String,
//     keyVisualElements: String,

//     // Scores
//     scoreVisualDesign: Number,
//     scoreTypography: Number,
//     scoreColorUsage: Number,
//     scoreComposition: Number,
//     scoreCTA: Number,
//     scoreEmotionalAppeal: Number,
//     scoreTrustSignals: Number,
//     scoreUrgency: Number,
//     scoreOverall: Number,
//     performanceScore: Number,
//     compositeRating: Number,

//     // Justifications
//     visualDesignJustification: String,
//     typographyJustification: String,
//     colorUsageJustification: String,
//     compositionJustification: String,
//     ctaJustification: String,
//     emotionalAppealJustification: String,
//     trustSignalsJustification: String,
//     urgencyJustification: String,

//     // Psychology
//     lossAversionPresent: Boolean,
//     lossAversionStrength: String,
//     lossAversionEvidence: String,
//     scarcityPresent: Boolean,
//     scarcityStrength: String,
//     scarcityEvidence: String,
//     socialProofPresent: Boolean,
//     socialProofStrength: String,
//     socialProofEvidence: String,
//     anchoringPresent: Boolean,
//     anchoringStrength: String,
//     anchoringEvidence: String,

//     // AIDA
//     aidaAttentionScore: Number,
//     aidaAttentionAnalysis: String,
//     aidaInterestScore: Number,
//     aidaInterestAnalysis: String,
//     aidaDesireScore: Number,
//     aidaDesireAnalysis: String,
//     aidaActionScore: Number,
//     aidaActionAnalysis: String,

//     // Verdict
//     performanceLabel: String,
//     designQuality: String,
//     psychologyStrength: String,
//     whatWorks: String,
//     whatDoesntWork: String,
//     keyInsight: String,

//     // Recommendations
//     recommendation1: String,
//     recommendation1Impact: String,
//     recommendation1Effort: String,
//     recommendation2: String,
//     recommendation2Impact: String,
//     recommendation2Effort: String,
//     recommendation3: String,
//     recommendation3Impact: String,
//     recommendation3Effort: String,

//     // Changes
//     keepElements: String,
//     changeElements: String,
//     addElements: String,
//     hookOptions: String,
//     ctaOptions: String,

//     // Action Plan
//     actionScale: Boolean,
//     actionPause: Boolean,
//     actionOptimize: Boolean,
//     actionTest: Boolean,
//     actionRationale: String,

//     // Summary
//     verdictDecision: String,
//     verdictRating: String,
//     verdictConfidence: String,
//     verdictSummary: String,
//     embeddingText: String,

//     // Metadata
//     tags: [String],
//     searchableContent: String,
//     analysisDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
//     analysisVersion: { type: String, default: "2.0" },
//     isPartialResponse: { type: Boolean, default: false }

// }, { timestamps: true });


// // ═══════════════════════════════════════════════════════════════
// //  ASSET-LEVEL SCHEMA (Per-Headline/Image/Video/Description)
// //  Saves to: google_asset_data collection
// // ═══════════════════════════════════════════════════════════════
// const assetAnalysisSchema = new mongoose.Schema({
//     // ─── Asset Identity ───
//     adAccountId: String,
//     assetId: String,                          // Google asset ID (e.g. "331248369786")
//     adId: String,                             // Parent ad/asset group ID
//     campaignName: String,                     // e.g. "144_PMAX_Futures_Pur_New_User_s2s..."
//     asset: String,                            // Asset group name e.g. "Trade Fest Future 26 Future"
//     cutType: String,                          // "headline" | "long_headline" | "description" | "image" | "video"
//     creativeId: { type: String, default: '' },
//     thumbnailUrl: String,                     // Image URL or video thumbnail URL
//     isAdvantagePlus: { type: Boolean, default: false },
//     adType: String,                           // e.g. "PERFORMANCE_MAX"

//     analysisMode: { type: String, default: 'VISUAL_AND_METRICS' },

//     // ─── Asset Metrics ───
//     spend: String,
//     impressions: Number,
//     clicks: Number,
//     ctr: String,
//     cpc: String,
//     cpm: String,
//     roas: String,
//     aov: { type: String, default: "0.00" },

//     // ─── Sibling Context ───
//     rankAmongSiblings: Number,                // e.g. 3
//     totalSiblings: Number,                    // e.g. 14

//     // ─── Analysis Fields from Claude ───
//     ctrAnalysis: String,
//     cpcAnalysis: String,
//     frequencyAnalysis: String,
//     primaryBottleneck: String,

//     creativeType: String,                     // "static image" | "video" | "text copy"
//     dominantColors: String,
//     primaryMessage: String,
//     secondaryMessage: String,
//     ctaText: String,

//     trustElements: String,
//     urgencyElements: String,
//     numbersShown: String,
//     brandingElements: String,
//     keyVisualElements: String,

//     // ─── Scores (0-10) ───
//     scoreVisualDesign: Number,
//     scoreTypography: Number,
//     scoreColorUsage: Number,
//     scoreComposition: Number,
//     scoreCTA: Number,
//     scoreEmotionalAppeal: Number,
//     scoreTrustSignals: Number,
//     scoreUrgency: Number,
//     scoreOverall: Number,
//     performanceScore: Number,
//     compositeRating: Number,

//     // ─── Score Justifications ───
//     visualDesignJustification: String,
//     typographyJustification: String,
//     colorUsageJustification: String,
//     compositionJustification: String,
//     ctaJustification: String,
//     emotionalAppealJustification: String,
//     trustSignalsJustification: String,
//     urgencyJustification: String,

//     // ─── Behavioral Economics / Psychology ───
//     lossAversionPresent: Boolean,
//     lossAversionStrength: String,
//     lossAversionEvidence: String,
//     scarcityPresent: Boolean,
//     scarcityStrength: String,
//     scarcityEvidence: String,
//     socialProofPresent: Boolean,
//     socialProofStrength: String,
//     socialProofEvidence: String,
//     anchoringPresent: Boolean,
//     anchoringStrength: String,
//     anchoringEvidence: String,

//     // ─── AIDA Model ───
//     aidaAttentionScore: Number,
//     aidaAttentionAnalysis: String,
//     aidaInterestScore: Number,
//     aidaInterestAnalysis: String,
//     aidaDesireScore: Number,
//     aidaDesireAnalysis: String,
//     aidaActionScore: Number,
//     aidaActionAnalysis: String,

//     // ─── Verdict ───
//     performanceLabel: String,
//     designQuality: String,
//     psychologyStrength: String,
//     whatWorks: String,
//     whatDoesntWork: String,
//     keyInsight: String,

//     // ─── Recommendations ───
//     recommendation1: String,
//     recommendation1Impact: String,
//     recommendation1Effort: String,
//     recommendation2: String,
//     recommendation2Impact: String,
//     recommendation2Effort: String,
//     recommendation3: String,
//     recommendation3Impact: String,
//     recommendation3Effort: String,

//     // ─── Changes ───
//     keepElements: String,
//     changeElements: String,
//     addElements: String,
//     hookOptions: String,
//     ctaOptions: String,

//     // ─── Action Plan ───
//     actionScale: Boolean,
//     actionPause: Boolean,
//     actionOptimize: Boolean,
//     actionTest: Boolean,
//     actionRationale: String,

//     // ─── Summary ───
//     verdictDecision: String,
//     verdictRating: String,
//     verdictConfidence: String,
//     verdictSummary: String,
//     embeddingText: String,

//     // ─── vs Top Performer ───
//     vsTopPerformer: {
//         topPerformerContent: String,
//         topPerformerCtr: Number,
//         gapAnalysis: String,
//         learnings: String
//     },

//     // ─── Metadata ───
//     tags: [String],
//     searchableContent: String,
//     analysisDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
//     analysisVersion: { type: String, default: "2.0" },
//     isPartialResponse: { type: Boolean, default: false }

// }, { timestamps: true });


// // ─── Connection Logic ───
// let isConnected = false;

// async function connectDB() {
//     if (isConnected) return;
//     try {
//         await mongoose.connect(MONGO_URI, {
//             dbName: DB_NAME
//         });
//         isConnected = true;
//         console.log(`[SYSTEM] Connected to MongoDB: ${DB_NAME}`);
//     } catch (err) {
//         console.error('[SYSTEM] MongoDB connection error:', err);
//     }
// }

// // Create models with specific collection names
// const AdAnalysis = mongoose.model('GoogleAdAnalysis', analysisSchema, COLLECTION_NAME);
// const AssetAnalysis = mongoose.model('GoogleAssetAnalysis', assetAnalysisSchema, ASSET_COLLECTION_NAME);

// // ─── Save Ad-Level Analysis ───
// async function saveAnalysis(data) {
//     if (!isConnected) await connectDB();
//     try {
//         const result = await AdAnalysis.findOneAndUpdate(
//             { adId: data.adId },
//             data,
//             { upsert: true, new: true, setDefaultsOnInsert: true }
//         );
//         console.log(`[SYSTEM] Saved ad analysis for Ad ${data.adId} to ${COLLECTION_NAME}`);
//         return result;
//     } catch (err) {
//         console.error('[SYSTEM] Failed to save ad analysis:', err);
//         throw err;
//     }
// }

// // ─── Save Asset-Level Analysis ───
// async function saveAssetAnalysis(data) {
//     if (!isConnected) await connectDB();
//     try {
//         const result = await AssetAnalysis.findOneAndUpdate(
//             { assetId: data.assetId },
//             data,
//             { upsert: true, new: true, setDefaultsOnInsert: true }
//         );
//         console.log(`[SYSTEM] Saved asset analysis for Asset ${data.assetId} [${data.cutType}] to ${ASSET_COLLECTION_NAME}`);
//         return result;
//     } catch (err) {
//         console.error('[SYSTEM] Failed to save asset analysis:', err);
//         throw err;
//     }
// }

// module.exports = { connectDB, saveAnalysis, saveAssetAnalysis };



import mongoose from 'mongoose';


// Provided connection string with user credentials
const MONGO_URI = 'mongodb+srv://n8n_user:23172410@cluster0.drr2ppd.mongodb.net/?appName=Cluster0';
const DB_NAME = 'reddit_data';
const COLLECTION_NAME = 'google_data';
const ASSET_COLLECTION_NAME = 'google_asset_data';

// ─── Schema Definition matching User Requirements (AD-LEVEL) ───
const analysisSchema = new mongoose.Schema({
    adAccountId: String,
    adId: String,
    adName: String,
    creativeId: { type: String, default: '' },
    thumbnailUrl: String,
    isAdvantagePlus: { type: Boolean, default: false },
    adType: String,
    analysisMode: { type: String, default: 'VISUAL_AND_METRICS' },

    // Metrics
    spend: String,
    impressions: Number,
    clicks: Number,
    ctr: String,
    cpc: String,
    cpm: String,
    roas: String,
    aov: { type: String, default: "0.00" },

    // Analysis Fields
    ctrAnalysis: String,
    cpcAnalysis: String,
    frequencyAnalysis: String,
    primaryBottleneck: String,

    creativeType: String,
    dominantColors: String,
    primaryMessage: String,
    secondaryMessage: String,
    ctaText: String,

    trustElements: String,
    urgencyElements: String,
    numbersShown: String,
    brandingElements: String,
    keyVisualElements: String,

    // Scores
    scoreVisualDesign: Number,
    scoreTypography: Number,
    scoreColorUsage: Number,
    scoreComposition: Number,
    scoreCTA: Number,
    scoreEmotionalAppeal: Number,
    scoreTrustSignals: Number,
    scoreUrgency: Number,
    scoreOverall: Number,
    performanceScore: Number,
    compositeRating: Number,

    // Justifications
    visualDesignJustification: String,
    typographyJustification: String,
    colorUsageJustification: String,
    compositionJustification: String,
    ctaJustification: String,
    emotionalAppealJustification: String,
    trustSignalsJustification: String,
    urgencyJustification: String,

    // Psychology
    lossAversionPresent: Boolean,
    lossAversionStrength: String,
    lossAversionEvidence: String,
    scarcityPresent: Boolean,
    scarcityStrength: String,
    scarcityEvidence: String,
    socialProofPresent: Boolean,
    socialProofStrength: String,
    socialProofEvidence: String,
    anchoringPresent: Boolean,
    anchoringStrength: String,
    anchoringEvidence: String,

    // AIDA
    aidaAttentionScore: Number,
    aidaAttentionAnalysis: String,
    aidaInterestScore: Number,
    aidaInterestAnalysis: String,
    aidaDesireScore: Number,
    aidaDesireAnalysis: String,
    aidaActionScore: Number,
    aidaActionAnalysis: String,

    // Verdict
    performanceLabel: String,
    designQuality: String,
    psychologyStrength: String,
    whatWorks: String,
    whatDoesntWork: String,
    keyInsight: String,

    // Recommendations
    recommendation1: String,
    recommendation1Impact: String,
    recommendation1Effort: String,
    recommendation2: String,
    recommendation2Impact: String,
    recommendation2Effort: String,
    recommendation3: String,
    recommendation3Impact: String,
    recommendation3Effort: String,

    // Changes
    keepElements: String,
    changeElements: String,
    addElements: String,
    hookOptions: String,
    ctaOptions: String,

    // Action Plan
    actionScale: Boolean,
    actionPause: Boolean,
    actionOptimize: Boolean,
    actionTest: Boolean,
    actionRationale: String,

    // Summary
    verdictDecision: String,
    verdictRating: String,
    verdictConfidence: String,
    verdictSummary: String,
    embeddingText: String,

    // Metadata
    tags: [String],
    searchableContent: String,
    analysisDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    analysisVersion: { type: String, default: "2.0" },
    isPartialResponse: { type: Boolean, default: false },

    // Intelligence Analysis (New Fields)
    psychology_analysis: String,
    behavioral_economics_analysis: String,
    neuromarketing_analysis: String,
    google_algorithm_analysis: String,
    competitive_differentiation: String,
    predicted_performance_impact: String,
    recommended_scaling_strategy: String,
    creative_evolution_path: String,
    cognitive_bias_utilization: String,
    neuromarketing_triggers: String,
    google_algorithm_optimization: String,
    competitive_moat: String,
    strategic_roadmap: String,
    predicted_impact: String

}, { timestamps: true });


// ═══════════════════════════════════════════════════════════════
//  ASSET-LEVEL SCHEMA (Per-Headline/Image/Video/Description)
//  Saves to: google_asset_data collection
// ═══════════════════════════════════════════════════════════════
const assetAnalysisSchema = new mongoose.Schema({
    // ─── Asset Identity ───
    adAccountId: String,
    assetId: String,                          // Google asset ID (e.g. "331248369786")
    adId: String,                             // Parent ad/asset group ID
    campaignName: String,                     // e.g. "144_PMAX_Futures_Pur_New_User_s2s..."
    asset: String,                            // Asset group name e.g. "Trade Fest Future 26 Future"
    cutType: String,                          // "headline" | "long_headline" | "description" | "image" | "video"
    creativeId: { type: String, default: '' },
    thumbnailUrl: String,                     // Image URL or video thumbnail URL
    isAdvantagePlus: { type: Boolean, default: false },
    adType: String,                           // e.g. "PERFORMANCE_MAX"

    analysisMode: { type: String, default: 'VISUAL_AND_METRICS' },

    // ─── Asset Metrics ───
    spend: String,
    impressions: Number,
    clicks: Number,
    ctr: String,
    cpc: String,
    cpm: String,
    roas: String,
    aov: { type: String, default: "0.00" },

    // ─── Sibling Context ───
    rankAmongSiblings: Number,                // e.g. 3
    totalSiblings: Number,                    // e.g. 14

    // ─── Analysis Fields from Claude ───
    ctrAnalysis: String,
    cpcAnalysis: String,
    frequencyAnalysis: String,
    primaryBottleneck: String,

    creativeType: String,                     // "static image" | "video" | "text copy"
    dominantColors: String,
    primaryMessage: String,
    secondaryMessage: String,
    ctaText: String,

    trustElements: String,
    urgencyElements: String,
    numbersShown: String,
    brandingElements: String,
    keyVisualElements: String,

    // ─── Scores (0-10) ───
    scoreVisualDesign: Number,
    scoreTypography: Number,
    scoreColorUsage: Number,
    scoreComposition: Number,
    scoreCTA: Number,
    scoreEmotionalAppeal: Number,
    scoreTrustSignals: Number,
    scoreUrgency: Number,
    scoreOverall: Number,
    performanceScore: Number,
    compositeRating: Number,

    // ─── Score Justifications ───
    visualDesignJustification: String,
    typographyJustification: String,
    colorUsageJustification: String,
    compositionJustification: String,
    ctaJustification: String,
    emotionalAppealJustification: String,
    trustSignalsJustification: String,
    urgencyJustification: String,

    // ─── Behavioral Economics / Psychology ───
    lossAversionPresent: Boolean,
    lossAversionStrength: String,
    lossAversionEvidence: String,
    scarcityPresent: Boolean,
    scarcityStrength: String,
    scarcityEvidence: String,
    socialProofPresent: Boolean,
    socialProofStrength: String,
    socialProofEvidence: String,
    anchoringPresent: Boolean,
    anchoringStrength: String,
    anchoringEvidence: String,

    // ─── AIDA Model ───
    aidaAttentionScore: Number,
    aidaAttentionAnalysis: String,
    aidaInterestScore: Number,
    aidaInterestAnalysis: String,
    aidaDesireScore: Number,
    aidaDesireAnalysis: String,
    aidaActionScore: Number,
    aidaActionAnalysis: String,

    // ─── Verdict ───
    performanceLabel: String,
    designQuality: String,
    psychologyStrength: String,
    whatWorks: String,
    whatDoesntWork: String,
    keyInsight: String,

    // ─── Recommendations ───
    recommendation1: String,
    recommendation1Impact: String,
    recommendation1Effort: String,
    recommendation2: String,
    recommendation2Impact: String,
    recommendation2Effort: String,
    recommendation3: String,
    recommendation3Impact: String,
    recommendation3Effort: String,

    // ─── Changes ───
    keepElements: String,
    changeElements: String,
    addElements: String,
    hookOptions: String,
    ctaOptions: String,

    // ─── Action Plan ───
    actionScale: Boolean,
    actionPause: Boolean,
    actionOptimize: Boolean,
    actionTest: Boolean,
    actionRationale: String,

    // ─── Summary ───
    verdictDecision: String,
    verdictRating: String,
    verdictConfidence: String,
    verdictSummary: String,
    embeddingText: String,

    // ─── vs Top Performer ───
    vsTopPerformer: {
        topPerformerContent: String,
        topPerformerCtr: Number,
        gapAnalysis: String,
        learnings: String
    },

    // ─── Metadata ───
    tags: [String],
    searchableContent: String,
    analysisDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    analysisVersion: { type: String, default: "2.0" },
    isPartialResponse: { type: Boolean, default: false },

    // Intelligence Analysis (New Fields)
    psychology_analysis: String,
    behavioral_economics_analysis: String,
    neuromarketing_analysis: String,
    google_algorithm_analysis: String,
    competitive_differentiation: String,
    predicted_performance_impact: String,
    recommended_scaling_strategy: String,
    creative_evolution_path: String,
    cognitive_bias_utilization: String,
    neuromarketing_triggers: String,
    google_algorithm_optimization: String,
    competitive_moat: String,
    strategic_roadmap: String,
    predicted_impact: String

}, { timestamps: true });


// ─── Connection Logic ───
let isConnected = false;

export async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: DB_NAME
        });
        isConnected = true;
        console.log(`[SYSTEM] Connected to MongoDB: ${DB_NAME}`);
    } catch (err) {
        console.error('[SYSTEM] MongoDB connection error:', err);
    }
}

// Create models with specific collection names
const AdAnalysis = mongoose.models.GoogleAdAnalysis || mongoose.model('GoogleAdAnalysis', analysisSchema, COLLECTION_NAME);
const AssetAnalysis = mongoose.models.GoogleAssetAnalysis || mongoose.model('GoogleAssetAnalysis', assetAnalysisSchema, ASSET_COLLECTION_NAME);

// ─── Save Ad-Level Analysis ───
export async function saveAnalysis(data) {
    if (!isConnected) await connectDB();
    try {
        const result = await AdAnalysis.findOneAndUpdate(
            { adId: data.adId },
            data,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`[SYSTEM] Saved ad analysis for Ad ${data.adId} to ${COLLECTION_NAME}`);
        return result;
    } catch (err) {
        console.error('[SYSTEM] Failed to save ad analysis:', err);
        throw err;
    }
}

// ─── Save Asset-Level Analysis ───
export async function saveAssetAnalysis(data) {
    if (!isConnected) {
        console.log('[SYSTEM] Not connected to MongoDB, reconnecting...');
        await connectDB();
    }
    if (!isConnected) {
        throw new Error('MongoDB not connected - cannot save asset analysis');
    }
    try {
        console.log(`[SYSTEM] AssetAnalysis.findOneAndUpdate({ assetId: "${data.assetId}" }) → ${ASSET_COLLECTION_NAME}`);
        const result = await AssetAnalysis.findOneAndUpdate(
            { assetId: data.assetId },
            { $set: data },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`[SYSTEM] Saved asset analysis for Asset ${data.assetId} [${data.cutType}] to ${ASSET_COLLECTION_NAME}`);
        return result;
    } catch (err) {
        console.error('[SYSTEM] Failed to save asset analysis:', err.message);
        console.error('[SYSTEM] Error details:', err);
        throw err;
    }
}

// Exports handled via named exports above
