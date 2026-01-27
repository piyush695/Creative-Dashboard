export interface AdData {
    id: string
    adId: string
    adAccountId: string
    accountName: string
    adName: string
    thumbnailUrl: string
    spend: number
    purchaseValue: number
    purchases: number
    roas: number
    ctr: number
    cpc: number
    cpm: number
    cpp: number
    aov: number
    scoreVisualDesign: number
    scoreTypography: number
    scoreColorUsage: number
    scoreComposition: number
    scoreCTA: number
    scoreEmotionalAppeal: number
    scoreTrustSignals: number
    scoreUrgency: number
    scoreOverall: number
    performanceLabel: string
    designQuality: string
    psychologyStrength: string
    keyStrengths: string
    keyWeaknesses: string
    topInsight: string
    primaryRecommendation: string
    hierarchyAnalysis: string
    colorPsychology: string
    typographyNotes: string
    compositionNotes: string
    mobileReadiness: string
    visualDesignJustification: string
    typographyJustification: string
    colorUsageJustification: string
    compositionJustification: string
    ctaJustification: string
    emotionalAppealJustification: string
    trustSignalsJustification: string
    urgencyJustification: string
    recommendation1: string
    recommendation1Impact: string
    recommendation1Effort: string
    recommendation2: string
    recommendation2Impact: string
    recommendation2Effort: string
    recommendation3: string
    recommendation3Impact: string
    recommendation3Effort: string
    actionScale: boolean | string
    actionPause: boolean | string
    actionOptimize: boolean | string
    actionTest: boolean | string
    analysisDate: string
    rawAnalysis: string
    _id?: string
}
