/**
 * Pattern Extractor
 * Pulls winning elements from top-performing creatives
 * and synthesizes them into actionable patterns for generation
 */

/**
 * Extract winning patterns from an array of analyzed creatives
 * @param {Array} creatives - Array of creative analysis documents from MongoDB
 * @returns {object} Synthesized winning patterns
 */
export function extractWinningPatterns(creatives: any[]) {
  if (!creatives || creatives.length === 0) {
    throw new Error('No creatives provided for pattern extraction');
  }

  // ─── Collect all "what works" elements ───
  const allWhatWorks: string[] = [];
  const allWhatDoesntWork: string[] = [];

  for (const c of creatives) {
    if (c.whatWorks) {
      const items = Array.isArray(c.whatWorks) ? c.whatWorks : String(c.whatWorks).split(' | ');
      allWhatWorks.push(...items);
    }
    if (c.whatDoesntWork) {
      const items = Array.isArray(c.whatDoesntWork) ? c.whatDoesntWork : String(c.whatDoesntWork).split(' | ');
      allWhatDoesntWork.push(...items);
    }
  }

  // ─── Score analysis ───
  const scoreFields = [
    'scoreVisualDesign', 'scoreTypography', 'scoreColorUsage',
    'scoreComposition', 'scoreCTA', 'scoreEmotionalAppeal',
    'scoreTrustSignals', 'scoreUrgency'
  ];

  const avgScores: any = {};
  const highScoreElements: any = {};

  for (const field of scoreFields) {
    const values = creatives.map(c => Number(c[field]) || 0).filter(v => v > 0);
    avgScores[field] = values.length > 0
      ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
      : 0;

    // Find creatives that scored highest on this dimension
    const best = creatives.reduce((max, c) => (Number(c[field]) || 0) > (Number(max[field]) || 0) ? c : max, creatives[0]);
    const justificationField = field.replace('score', '').charAt(0).toLowerCase() + field.replace('score', '').slice(1) + 'Justification';
    highScoreElements[field] = {
      score: Number(best[field]) || 0,
      adId: best.adId,
      adName: best.adName,
      justification: best[justificationField] || ''
    };
  }

  // ─── Psychology patterns ───
  const psychologyPatterns = {
    lossAversion: {
      used: creatives.filter(c => c.lossAversionPresent === true).length,
      total: creatives.length,
      strongExamples: creatives
        .filter(c => c.lossAversionStrength === 'STRONG')
        .map(c => ({ adId: c.adId, evidence: c.lossAversionEvidence })),
    },
    scarcity: {
      used: creatives.filter(c => c.scarcityPresent === true).length,
      total: creatives.length,
      strongExamples: creatives
        .filter(c => c.scarcityStrength === 'STRONG')
        .map(c => ({ adId: c.adId, evidence: c.scarcityEvidence })),
    },
    socialProof: {
      used: creatives.filter(c => c.socialProofPresent === true).length,
      total: creatives.length,
      strongExamples: creatives
        .filter(c => c.socialProofStrength === 'STRONG')
        .map(c => ({ adId: c.adId, evidence: c.socialProofEvidence })),
    },
    anchoring: {
      used: creatives.filter(c => c.anchoringPresent === true).length,
      total: creatives.length,
      strongExamples: creatives
        .filter(c => c.anchoringStrength === 'STRONG')
        .map(c => ({ adId: c.adId, evidence: c.anchoringEvidence })),
    },
  };

  // ─── Visual patterns ───
  const creativeTypes = countValues(creatives, 'creativeType');
  const dominantColorSets = creatives.map(c => c.dominantColors).filter(Boolean);
  const ctaTexts = creatives.map(c => c.ctaText).filter(Boolean);
  const primaryMessages = creatives.map(c => c.primaryMessage).filter(Boolean);
  const secondaryMessages = creatives.map(c => c.secondaryMessage).filter(Boolean);
  const brandingElements = creatives.map(c => c.brandingElements).filter(Boolean);

  // ─── Performance patterns ───
  const performanceMetrics = {
    avgCtr: avg(creatives, 'ctr'),
    avgCpc: avg(creatives, 'cpc'),
    avgCpm: avg(creatives, 'cpm'),
    avgRoas: avg(creatives, 'roas'),
    avgAov: avg(creatives, 'aov'),
    avgPurchases: avg(creatives, 'purchases'),
    avgPurchaseValue: avg(creatives, 'purchaseValue'),
    avgCpp: avg(creatives, 'cpp'),
    totalSpend: sum(creatives, 'spend'),
    totalPurchases: sum(creatives, 'purchases'),
    totalRevenue: sum(creatives, 'purchaseValue'),
  };

  // ─── AIDA patterns ───
  const aidaAvg = {
    attention: avg(creatives, 'aidaAttentionScore'),
    interest: avg(creatives, 'aidaInterestScore'),
    desire: avg(creatives, 'aidaDesireScore'),
    action: avg(creatives, 'aidaActionScore'),
  };

  // ─── Best performing creative overall ───
  const bestCreative = creatives.reduce((best, c) => {
    const score = parseFloat(c.compositeRating) || 0;
    const bestScore = parseFloat(best.compositeRating) || 0;
    return score > bestScore ? c : best;
  }, creatives[0]);

  // ─── Recommendations synthesis ───
  const allRecommendations: string[] = [];
  for (const c of creatives) {
    if (c.recommendation1) allRecommendations.push(c.recommendation1);
    if (c.recommendation2) allRecommendations.push(c.recommendation2);
    if (c.recommendation3) allRecommendations.push(c.recommendation3);
  }

  // ─── Keep/Change/Add synthesis ───
  const keepElements = creatives.map(c => c.keepElements).filter(Boolean);
  const changeElements = creatives.map(c => c.changeElements).filter(Boolean);
  const addElements = creatives.map(c => c.addElements).filter(Boolean);
  const hookOptions = creatives.map(c => c.hookOptions).filter(Boolean);
  const ctaOptions = creatives.map(c => c.ctaOptions).filter(Boolean);

  const patterns = {
    sourceCreatives: creatives.map(c => ({
      adId: c.adId,
      adName: c.adName,
      thumbnailUrl: c.thumbnailUrl,
      adType: c.adType,
      verdictRating: c.verdictRating,
      compositeRating: c.compositeRating,
      scoreOverall: c.scoreOverall,
      performanceScore: c.performanceScore,
    })),

    whatWorks: allWhatWorks,
    whatDoesntWork: allWhatDoesntWork,

    scores: { averages: avgScores, bestPerDimension: highScoreElements },

    psychology: psychologyPatterns,

    visual: {
      creativeTypes,
      dominantColors: dominantColorSets,
      ctaTexts,
      primaryMessages,
      secondaryMessages,
      brandingElements,
    },

    performance: performanceMetrics,

    aida: aidaAvg,

    bestCreative: {
      adId: bestCreative.adId,
      adName: bestCreative.adName,
      thumbnailUrl: bestCreative.thumbnailUrl,
      compositeRating: bestCreative.compositeRating,
      keyInsight: bestCreative.keyInsight,
      verdictSummary: bestCreative.verdictSummary,
    },

    optimizationSynthesis: {
      keepElements,
      changeElements,
      addElements,
      hookOptions,
      ctaOptions,
      recommendations: allRecommendations,
    },

    extractedAt: new Date().toISOString(),
  };

  return patterns;
}

/**
 * Filter extracted patterns based on user's aspect selections
 * selectedAspects format: { adId: { whatWorks: [0,1], scores: ["visualDesign"], psychology: ["lossAversion"], ... } }
 */
export function filterPatternsBySelection(patterns: any, selectedAspects: any, creatives: any[]) {
  const filtered = { ...patterns };

  // Collect selected items across all creatives
  let selectedWhatWorks: string[] = [];
  let selectedWhatDoesntWork: string[] = [];
  let selectedScoreKeys = new Set<string>();
  let selectedPsychology = new Set<string>();
  let selectedVisualKeys = new Set<string>();
  let selectedCopyKeys = new Set<string>();
  let selectedAidaKeys = new Set<string>();
  let selectedRecommendations: string[] = [];

  for (const [adId, sel] of Object.entries(selectedAspects) as [string, any][]) {
    const creative = creatives.find(c => c.adId === adId);
    if (!creative) continue;

    // What Works — filter by indices
    if (sel.whatWorks?.length > 0 && creative.whatWorks) {
      const items = typeof creative.whatWorks === 'string'
        ? creative.whatWorks.split(' | ')
        : Array.isArray(creative.whatWorks) ? creative.whatWorks : [];
      sel.whatWorks.forEach((i: number) => { if (items[i]) selectedWhatWorks.push(items[i]); });
    }

    // What Doesn't Work
    if (sel.whatDoesntWork?.length > 0 && creative.whatDoesntWork) {
      const items = typeof creative.whatDoesntWork === 'string'
        ? creative.whatDoesntWork.split(' | ')
        : Array.isArray(creative.whatDoesntWork) ? creative.whatDoesntWork : [];
      sel.whatDoesntWork.forEach((i: number) => { if (items[i]) selectedWhatDoesntWork.push(items[i]); });
    }

    // Scores
    if (sel.scores?.length > 0) {
      sel.scores.forEach((k: string) => selectedScoreKeys.add(k));
    }

    // Psychology
    if (sel.psychology?.length > 0) {
      sel.psychology.forEach((k: string) => selectedPsychology.add(k));
    }

    // Visual
    if (sel.visual?.length > 0) {
      sel.visual.forEach((k: string) => selectedVisualKeys.add(k));
    }

    // Copy
    if (sel.copy?.length > 0) {
      sel.copy.forEach((k: string) => selectedCopyKeys.add(k));
    }

    // AIDA
    if (sel.aida?.length > 0) {
      sel.aida.forEach((k: string) => selectedAidaKeys.add(k));
    }

    // Recommendations
    if (sel.recommendations?.length > 0) {
      const recs = [creative.recommendation1, creative.recommendation2, creative.recommendation3].filter(Boolean);
      sel.recommendations.forEach((i: number) => { if (recs[i]) selectedRecommendations.push(recs[i]); });
    }
  }

  // Apply filters
  if (selectedWhatWorks.length > 0) filtered.whatWorks = selectedWhatWorks;
  if (selectedWhatDoesntWork.length > 0) filtered.whatDoesntWork = selectedWhatDoesntWork;

  return filtered;
}


// ─── Helpers ───

function avg(arr: any[], field: string) {
  const values = arr.map(c => parseFloat(c[field]) || 0).filter(v => v > 0);
  if (values.length === 0) return 0;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function sum(arr: any[], field: string) {
  return parseFloat(arr.reduce((total, c) => total + (parseFloat(c[field]) || 0), 0).toFixed(2));
}

function countValues(arr: any[], field: string) {
  const counts: any = {};
  for (const item of arr) {
    const val = item[field];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}
