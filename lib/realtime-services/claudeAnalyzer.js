const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── Build Analyzer Prompt (JSON Output) ───
function buildPrompt(ad) {
    const isAdroll = ad.platform === 'adroll';

    const pctDiff = (val, avg) => {
        if (!avg || avg === 0) return '0%';
        const diff = ((val - avg) / avg * 100).toFixed(1);
        return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const platformContext = isAdroll
        ? `AdRoll retargeting ad. Frameworks: Re-engagement psychology, Mere Exposure Effect, Retargeting fatigue, Endowment Effect, Sunk Cost, Loss Aversion.`
        : `Google Ad using advanced frameworks from Consumer Psychology, Behavioral Economics, Neuromarketing, and Persuasion Science.`;

    return `You are Analyzer, an elite AI Creative Intelligence Analyst. Analyze this ${platformContext}

CRITICAL: All analysis is at the INDIVIDUAL AD LEVEL. Every insight must reference THIS specific ad.
Provide DETAILED multi-sentence analysis for every text field. No placeholders.

## AD IDENTIFICATION
- Platform: ${ad.platform || 'google'}
- Ad ID: ${ad.adId || ad.id}
- Ad Name: ${ad.adName || ad.name}
- Ad Type: ${ad.adType || ad.type}
${isAdroll ? `- Image URL: ${ad.thumbnailUrl || ad.src}` : `- Headlines: ${JSON.stringify(ad.headlines || [])}\n- Descriptions: ${JSON.stringify(ad.descriptions || [])}`}
- Target URL: ${ad.finalUrl || ad.destination_url || 'N/A'}

## PERFORMANCE METRICS
- Spend: $${ad.spend}
- Impressions: ${ad.impressions}
- Clicks: ${ad.clicks}
- CTR: ${ad.ctr}% ${!isAdroll ? `(vs Ad Group Avg: ${pctDiff(ad.ctr, ad.adGroupAvg?.ctr)})` : ''}
- CPC: $${ad.cpc} ${!isAdroll ? `(vs Ad Group Avg: ${pctDiff(ad.cpc, ad.adGroupAvg?.cpc)})` : ''}
- ROAS: ${ad.roas}x ${!isAdroll ? `(vs Ad Group Avg: ${pctDiff(ad.roas, ad.adGroupAvg?.roas)})` : ''}

## YOUR TASK
Provide a detailed analysis in STRICT JSON format matching the schema below. Do not include any markdown formatting, code blocks, or introductory text. JUST THE RAW JSON OBJECT.

Schema Requirements:
{
  "adId": "${ad.adId || ad.id}",
  "adName": "${ad.adName || ad.name}",
  "adType": "${ad.adType || ad.type}",
  "spend": "${ad.spend}",
  "impressions": ${ad.impressions},
  "clicks": ${ad.clicks},
  "ctr": "${ad.ctr}",
  "cpc": "${ad.cpc}",
  "roas": "${ad.roas}",
  
  "ctrAnalysis": "Thorough analysis of CTR relative to benchmarks and specific creative elements (copy, visuals, hooks)",
  "cpcAnalysis": "In-depth CPC analysis indicating relevance, auction competition, and quality signals",
  "frequencyAnalysis": "Comment on impression volume, frequency patterns, and potential creative fatigue",
  "primaryBottleneck": "Identify the primary friction point (CPM, CTR, or CVR) and why",

  "creativeType": "Describe the format (Search, Display, Video, etc.)",
  "dominantColors": "Describe color palette and its psychological impact on the viewer",
  "primaryMessage": "The main value proposition as perceived by the user",
  "secondaryMessage": "Supporting messages, benefits, or subtext",
  "ctaText": "Analysis of the Call to Action and its effectiveness",
  
  "trustElements": "Detailed list of trust signals (social proof, logos, reviews, logic)",
  "urgencyElements": "Detailed list of urgency/scarcity triggers",
  "numbersShown": "Specific quantitative data used in copy/visuals",
  "brandingElements": "How brand identity is maintained and presented",
  "keyVisualElements": "Key imagery components or layout structures",

  "scoreVisualDesign": 0,
  "scoreTypography": 0,
  "scoreColorUsage": 0,
  "scoreComposition": 0,
  "scoreCTA": 0,
  "scoreEmotionalAppeal": 0,
  "scoreTrustSignals": 0,
  "scoreUrgency": 0,
  "scoreOverall": 0.0,
  "performanceScore": 0,
  "compositeRating": 0.0,

  "visualDesignJustification": "1-2 sentence justification for score",
  "typographyJustification": "1-2 sentence justification",
  "colorUsageJustification": "1-2 sentence justification",
  "compositionJustification": "1-2 sentence justification",
  "ctaJustification": "1-2 sentence justification",
  "emotionalAppealJustification": "1-2 sentence justification",
  "trustSignalsJustification": "1-2 sentence justification",
  "urgencyJustification": "1-2 sentence justification",

  "lossAversionPresent": false,
  "lossAversionStrength": "ABSENT/WEAK/MODERATE/STRONG",
  "lossAversionEvidence": "Specific evidence from the creative",
  "scarcityPresent": false,
  "scarcityStrength": "...",
  "scarcityEvidence": "...",
  "socialProofPresent": false,
  "socialProofStrength": "...",
  "socialProofEvidence": "...",
  "anchoringPresent": false,
  "anchoringStrength": "...",
  "anchoringEvidence": "...",

  "aidaAttentionScore": 0,
  "aidaAttentionAnalysis": "How well it grabs initial attention",
  "aidaInterestScore": 0,
  "aidaInterestAnalysis": "How well it maintains interest",
  "aidaDesireScore": 0,
  "aidaDesireAnalysis": "How well it creates desire",
  "aidaActionScore": 0,
  "aidaActionAnalysis": "How well it drives the final action",

  "performanceLabel": "TOP_PERFORMER / SOLID_PERFORMER / UNDERPERFORMER",
  "designQuality": "PROFESSIONAL / AVERAGE / POOR",
  "psychologyStrength": "STRONG / MODERATE / WEAK",
  "whatWorks": "List of 3 specific effective elements with explanations",
  "whatDoesntWork": "List of weak elements with explanations",
  "keyInsight": "One strategic high-level insight about this ad",

  "recommendation1": "Specific actionable recommendation with expected impact",
  "recommendation1Impact": "...",
  "recommendation1Effort": "LOW/MEDIUM/HIGH",
  "recommendation2": "...",
  "recommendation2Impact": "...",
  "recommendation2Effort": "...",
  "recommendation3": "...",
  "recommendation3Impact": "...",
  "recommendation3Effort": "...",

  "keepElements": "Specific elements that must be retained in future iterations",
  "changeElements": "Elements that should be modified",
  "addElements": "Elements that are missing and should be added",
  "hookOptions": "3 completely new alternative hook/headline variations",
  "ctaOptions": "3 alternative CTA variations",

  "actionScale": false,
  "actionPause": false,
  "actionOptimize": false,
  "actionTest": false,
  "actionRationale": "Why take this specific action? Reference performance vs benchmarks.",

  "verdictDecision": "SCALE / OPTIMIZE / PAUSE",
  "verdictRating": "A+ / A / B+ / B / C+ / C / D / F",
  "verdictConfidence": "HIGH/MEDIUM/LOW",
  "verdictSummary": "Final comprehensive executive summary of this ad's performance and potential",
  
  "psychology_analysis": "Deep dive into the psychological triggers and consumer behavior patterns in this creative",
  "behavioral_economics_analysis": "Analysis of heuristics, biases, and behavioral economics principles applied",
  "neuromarketing_analysis": "Analysis of neuro-linguistic and visual patterns that impact subconscious processing",
  "google_algorithm_analysis": "How this ad is likely to be weighted by Google's auction and relevance algorithms",
  "competitive_differentiation": "How this creative stands out or fails against competitors in the same vertical",
  "predicted_performance_impact": "Predicted shift in primary metrics if recommendations are implemented",
  "recommended_scaling_strategy": "Specific roadmap for scaling this creative (budget, audience, variations)",
  "creative_evolution_path": "How to iterate this creative for long-term performance stability",

  "embeddingText": "Summary for vector search",

  "tags": ["tag1", "tag2"],
  "searchableContent": "concise description of ad content"
}`;
}

// ─── Analyze Ad ───
export async function analyzeAd(adData, imageUrl = null) {
    const client = getClient();
    const content = [];

    if (imageUrl) {
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mediaType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64
                }
            });
        } catch (err) {
            console.warn(`[Analyzer] Could not fetch image for Claude: ${err.message}. Proceeding with text-only analysis.`);
        }
    }

    content.push({
        type: 'text',
        text: buildPrompt(adData)
    });

    const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content }]
    });

    const text = response.content[0].text;

    // Parse JSON (handle potential markdown wrapping)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
        const data = JSON.parse(jsonStr);

        // ─── Sanitize Numeric Fields ───
        const safeNum = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const match = val.match(/-?\d+(\.\d+)?/);
                return match ? Number(match[0]) : 0;
            }
            return 0;
        };

        const numericFields = [
            'impressions', 'clicks',
            'scoreVisualDesign', 'scoreTypography', 'scoreColorUsage', 'scoreComposition',
            'scoreCTA', 'scoreEmotionalAppeal', 'scoreTrustSignals', 'scoreUrgency',
            'scoreOverall', 'performanceScore', 'compositeRating',
            'aidaAttentionScore', 'aidaInterestScore', 'aidaDesireScore', 'aidaActionScore'
        ];

        numericFields.forEach(field => {
            if (data[field] !== undefined) {
                data[field] = safeNum(data[field]);
            }
        });

        // Ensure string fields exist and handle arrays
        const stringFields = [
            'adId', 'adName', 'adType', 'spend', 'ctr', 'cpc', 'cpm', 'roas',
            'ctrAnalysis', 'cpcAnalysis', 'frequencyAnalysis', 'primaryBottleneck',
            'creativeType', 'dominantColors', 'primaryMessage', 'secondaryMessage', 'ctaText',
            'trustElements', 'urgencyElements', 'numbersShown', 'brandingElements', 'keyVisualElements',
            'visualDesignJustification', 'typographyJustification', 'colorUsageJustification',
            'compositionJustification', 'ctaJustification', 'emotionalAppealJustification',
            'trustSignalsJustification', 'urgencyJustification',
            'lossAversionStrength', 'lossAversionEvidence',
            'scarcityStrength', 'scarcityEvidence',
            'socialProofStrength', 'socialProofEvidence',
            'anchoringStrength', 'anchoringEvidence',
            'aidaAttentionAnalysis', 'aidaInterestAnalysis', 'aidaDesireAnalysis', 'aidaActionAnalysis',
            'performanceLabel', 'designQuality', 'psychologyStrength',
            'whatWorks', 'whatDoesntWork', 'keyInsight',
            'recommendation1', 'recommendation1Impact', 'recommendation1Effort',
            'recommendation2', 'recommendation2Impact', 'recommendation2Effort',
            'recommendation3', 'recommendation3Impact', 'recommendation3Effort',
            'keepElements', 'changeElements', 'addElements', 'hookOptions', 'ctaOptions',
            'actionRationale', 'verdictDecision', 'verdictRating', 'verdictConfidence', 'verdictSummary',
            'psychology_analysis', 'behavioral_economics_analysis', 'neuromarketing_analysis',
            'google_algorithm_analysis', 'competitive_differentiation',
            'predicted_performance_impact', 'recommended_scaling_strategy', 'creative_evolution_path',
            'embeddingText', 'searchableContent'
        ];
        stringFields.forEach(field => {
            if (data[field] === null || data[field] === undefined) {
                data[field] = '';
            } else if (Array.isArray(data[field])) {
                data[field] = data[field].join('\n');
            } else {
                data[field] = String(data[field]);
            }
        });

        return data;

    } catch (e) {
        console.error('[Analyzer] Failed to parse Claude JSON response:', e);
        return {
            error: 'JSON parse failed',
            rawResponse: text,
            adId: adData.adId
        };
    }
}
