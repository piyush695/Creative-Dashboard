export interface AdData {
    // Basic Identifiers
    id: string
    _id: string
    adId: string
    adAccountId: string
    accountName: string
    adName: string
    creativeId?: string
    thumbnailUrl: string
    isAdvantagePlus?: boolean
    adType?: string
    analysisMode?: string
    platform?: PlatformType

    // Performance Metrics
    spend: string | number
    impressions?: number
    clicks?: number
    ctr: string | number
    cpc: string | number
    cpm: string | number
    reach?: number
    frequency?: string | number

    // Performance Analysis
    ctrAnalysis?: string
    cpcAnalysis?: string
    frequencyAnalysis?: string
    primaryBottleneck?: string

    // Legacy Metrics (may be used in older components)
    purchaseValue?: number
    purchases?: number
    roas?: number
    cpp?: number
    aov?: number

    // Content Details
    creativeType?: string
    dominantColors?: string
    primaryMessage?: string
    secondaryMessage?: string
    ctaText?: string
    trustElements?: string
    urgencyElements?: string
    numbersShown?: string
    brandingElements?: string
    keyVisualElements?: string

    // Scores
    scoreVisualDesign: number
    scoreTypography: number
    scoreColorUsage: number
    scoreComposition: number
    scoreCTA: number
    scoreEmotionalAppeal: number
    scoreTrustSignals: number
    scoreUrgency: number
    scoreOverall: number
    performanceScore?: number
    compositeRating?: number

    // Score Justifications
    visualDesignJustification: string
    typographyJustification: string
    colorUsageJustification: string
    compositionJustification: string
    ctaJustification: string
    emotionalAppealJustification: string
    trustSignalsJustification: string
    urgencyJustification: string

    // Psychological Principles
    lossAversionPresent?: boolean
    lossAversionStrength?: string
    lossAversionEvidence?: string
    scarcityPresent?: boolean
    scarcityStrength?: string
    scarcityEvidence?: string
    socialProofPresent?: boolean
    socialProofStrength?: string
    socialProofEvidence?: string
    anchoringPresent?: boolean
    anchoringStrength?: string
    anchoringEvidence?: string

    // AIDA Model
    aidaAttentionScore?: number
    aidaAttentionAnalysis?: string
    aidaInterestScore?: number
    aidaInterestAnalysis?: string
    aidaDesireScore?: number
    aidaDesireAnalysis?: string
    aidaActionScore?: number
    aidaActionAnalysis?: string

    // Qualitative Labels
    performanceLabel: string
    designQuality: string
    psychologyStrength: string

    // Insights & Strengths/Weaknesses
    keyStrengths: string
    keyWeaknesses: string
    whatWorks?: string
    whatDoesntWork?: string
    topInsight: string
    keyInsight?: string // New field from DB

    // Recommendations
    primaryRecommendation: string
    recommendation1: string
    recommendation1Impact: string
    recommendation1Effort: string
    recommendation2: string
    recommendation2Impact: string
    recommendation2Effort: string
    recommendation3: string
    recommendation3Impact: string
    recommendation3Effort: string

    // Strategic Elements
    keepElements?: string
    changeElements?: string
    addElements?: string
    hookOptions?: string
    ctaOptions?: string

    // Actions & Verdict
    actionScale: boolean
    actionPause: boolean
    actionOptimize: boolean
    actionTest: boolean
    actionRationale?: string
    verdictDecision?: string
    verdictRating?: string
    verdictConfidence?: string
    verdictSummary?: string

    // Technical/Metadata
    analysisDate: string
    analysisVersion?: string
    isPartialResponse?: boolean
    rawAnalysis?: string
    embeddingText?: string
    tags?: string[]
    searchableContent?: string

    // Layout/Legacy
    hierarchyAnalysis?: string
    colorPsychology?: string
    typographyNotes?: string
    compositionNotes?: string
    mobileReadiness?: string
}

export type PlatformType = 'all' | 'meta' | 'tiktok' | 'google' | 'linkedin' | 'youtube' | 'pinterest' | 'x' | 'shopify' | 'instagram' | 'telegram'
