// ═══════════════════════════════════════════════════════════════
//  Analyzer — Asset-Level Creative Intelligence Analysis
//  Analyzes individual Headlines, Descriptions, Images, Videos
//  using Consumer Psychology, Behavioral Economics, Neuromarketing
// ═══════════════════════════════════════════════════════════════

// ─── Asset Type Specific Framework Definitions ───
const ASSET_FRAMEWORKS = {

    // ═══════════════════════════════════════════
    //  HEADLINE ANALYSIS FRAMEWORK
    // ═══════════════════════════════════════════
    HEADLINE: {
        name: 'Headline',
        psychologyPrinciples: [
            'Pattern Interrupt — Does the headline break the user\'s scroll pattern?',
            'Curiosity Gap — Does it create an information gap the user wants to close?',
            'Self-Reference Effect — Does it speak directly to the user\'s identity/situation?',
            'Processing Fluency — Is it easy to read and understand in <2 seconds?',
            'Von Restorff Effect — Does it stand out from competing ads in the SERP/feed?',
            'Zeigarnik Effect — Does it create an open loop that demands resolution?'
        ],
        behavioralEconomics: [
            'Loss Aversion — Does it frame the value as avoiding a loss vs gaining a benefit?',
            'Anchoring — Does it set a numerical or conceptual anchor?',
            'Framing Effect — How is the value proposition framed (positive/negative)?',
            'Endowment Effect — Does it make the user feel they already have something at stake?',
            'Hyperbolic Discounting — Does it emphasize immediate vs future rewards?'
        ],
        neuromarketing: [
            'Amygdala Activation — Does it trigger an emotional response (fear, excitement, urgency)?',
            'Dopamine Loop — Does it promise a reward or satisfying outcome?',
            'Cognitive Load — How many mental resources does it require to process?',
            'Mirror Neuron Response — Does it create empathy or identification?'
        ],
        googleAlgorithm: [
            'Keyword Relevance — Does the headline match the user\'s search intent?',
            'Ad Strength Signal — Does it contribute to overall ad strength (Excellent/Good/Average/Poor)?',
            'RSA Combination — How well does it pair with other headlines in the group?',
            'Character Utilization — Does it use the 30-char limit effectively?',
            'Pin Position Suitability — Is it suitable for H1, H2, or H3 position?',
            'Differentiation — Is it sufficiently different from other headlines in the group?'
        ],
        scoringCriteria: {
            attentionCapture: 'Ability to stop the scroll and capture attention in <1 second',
            valueClarity: 'How clearly the value proposition is communicated',
            emotionalResonance: 'Strength of emotional trigger',
            urgencyDrive: 'Level of urgency or FOMO created',
            relevanceMatch: 'Alignment with likely search intent',
            differentiationPower: 'How unique vs competitors and sibling headlines',
            actionMotivation: 'How strongly it drives toward the click'
        }
    },

    // ═══════════════════════════════════════════
    //  LONG HEADLINE ANALYSIS FRAMEWORK
    // ═══════════════════════════════════════════
    LONG_HEADLINE: {
        name: 'Long Headline',
        psychologyPrinciples: [
            'Narrative Transportation — Does it tell a micro-story that draws the user in?',
            'Elaboration Likelihood — Does it provide enough substance for central-route processing?',
            'Self-Reference Effect — Does it speak to the user\'s specific situation?',
            'Dual Process Theory — Does it appeal to both System 1 (fast/emotional) and System 2 (slow/rational)?',
            'Cognitive Fluency — Is the longer format still easy to scan and process?'
        ],
        behavioralEconomics: [
            'Loss Aversion — Does it frame avoiding a negative outcome?',
            'Value Framing — How is the proposition framed vs alternatives?',
            'Social Proof Integration — Does it embed credibility signals?',
            'Anchoring — Does it establish a reference point for value?'
        ],
        neuromarketing: [
            'Story Arc Activation — Does it activate narrative processing centers?',
            'Emotional Valence — Net emotional tone (positive/negative/mixed)?',
            'Specificity Bias — Does it use specific details that increase believability?'
        ],
        googleAlgorithm: [
            'PMAX Suitability — How well it works in Performance Max discovery/display placements',
            'Character Utilization — Does it use the 90-char limit effectively?',
            'Complement vs Compete — Does it add information beyond the short headlines?',
            'Display Context — How it renders in various ad formats (display, discovery, YouTube)'
        ],
        scoringCriteria: {
            narrativeStrength: 'Quality of the micro-story or expanded proposition',
            valueArticulation: 'How well the full value proposition is expressed',
            emotionalDepth: 'Depth of emotional engagement',
            scanability: 'Ease of quick comprehension despite longer format',
            contextAdaptability: 'How well it works across different placements',
            differentiationPower: 'Uniqueness vs other long headlines and competitors',
            conversionPotential: 'Direct contribution to conversion intent'
        }
    },

    // ═══════════════════════════════════════════
    //  DESCRIPTION ANALYSIS FRAMEWORK
    // ═══════════════════════════════════════════
    DESCRIPTION: {
        name: 'Description',
        psychologyPrinciples: [
            'Elaboration Likelihood Model — Does it provide persuasive arguments for engaged users?',
            'Social Proof — Does it include testimonials, numbers, or credibility markers?',
            'Cognitive Closure — Does it answer the "why should I care?" question?',
            'Information Gap Theory — Does it add enough info to reduce anxiety while maintaining curiosity?',
            'Mere Exposure Effect — Does it reinforce key messages from the headline?',
            'Authority Principle — Does it establish expertise or credibility?'
        ],
        behavioralEconomics: [
            'Risk Reduction — Does it lower perceived risk of clicking/converting?',
            'Choice Architecture — Does it simplify the decision to click?',
            'Default Bias — Does it make clicking feel like the natural/obvious choice?',
            'Mental Accounting — Does it frame the cost in favorable mental categories?',
            'Reciprocity — Does it offer something valuable before asking for the click?'
        ],
        neuromarketing: [
            'Prefrontal Cortex Engagement — Does it provide logical reasons to support emotional decision?',
            'Pain Point Activation — Does it touch on a specific frustration or need?',
            'Reward Anticipation — Does it build excitement about the post-click experience?',
            'Trust Circuit Activation — Does it trigger credibility/safety responses?'
        ],
        googleAlgorithm: [
            'Keyword Relevance — Does the headline match the user\'s search intent?',
            'Character Utilization — Does it use the 90-char limit effectively?',
            'Headline Complement — Does it add NEW information beyond headlines?',
            'CTA Integration — Does it include a clear call to action?',
            'RSA Pairing — How well it works with various headline combinations?',
            'Quality Score Impact — Does it improve expected CTR and ad relevance?'
        ],
        scoringCriteria: {
            persuasionDepth: 'Strength of the persuasive argument',
            benefitClarity: 'How clearly benefits are communicated',
            credibilitySignals: 'Trust and authority elements present',
            riskReduction: 'How well it reduces perceived risk of clicking',
            ctaEffectiveness: 'Strength and clarity of the call to action',
            uniqueValueAdd: 'Information added beyond what headlines provide',
            conversionSupport: 'How well it supports the conversion decision'
        }
    },

    // ═══════════════════════════════════════════
    //  IMAGE ANALYSIS FRAMEWORK
    // ═══════════════════════════════════════════
    IMAGE: {
        name: 'Image',
        psychologyPrinciples: [
            'Picture Superiority Effect — Images are recalled 6x better than text alone',
            'Gestalt Principles — Visual grouping, figure-ground, proximity, continuity',
            'Facial Recognition Bias — Human faces capture attention 2x faster',
            'Color Psychology — Emotional associations of dominant colors',
            'Visual Hierarchy — Where does the eye naturally travel first?',
            'Schema Congruity — Does the image match expectations for the product/category?',
            'Anthropomorphism — Are human elements used to create connection?'
        ],
        behavioralEconomics: [
            'Availability Heuristic — Does the image make the benefit feel tangible/real?',
            'Status Quo Bias — Does it show transformation from current to desired state?',
            'Endowment Effect — Does it help the viewer mentally "own" the product/outcome?',
            'Ambiguity Aversion — Does it reduce uncertainty about the product/offer?',
            'Peak-End Rule — Does it show the peak moment or end benefit?'
        ],
        neuromarketing: [
            'Visual Cortex Activation — Contrast, color saturation, complexity',
            'Emotional Valence — Net emotional tone of the imagery',
            'Brand Recognition Speed — How quickly is the brand identified?',
            'Mirror Neuron Activation — Does viewing the image create empathetic response?',
            'Attention Heat Map — Predicted fixation points',
            'Subliminal Trust Cues — Professional quality, lighting, composition'
        ],
        googleAlgorithm: [
            'Image Quality Score — Resolution, clarity, professional appearance',
            'Aspect Ratio Compliance — Does it meet PMAX/Display requirements?',
            'Text Overlay Rules — <20% text coverage, readable at small sizes',
            'Brand Visibility — Logo placement and prominence',
            'Relevance to Landing Page — Visual continuity with destination',
            'Competitive Differentiation — Stands out in ad auction visually',
            'Format Versatility — Works across display, discovery, Gmail, YouTube'
        ],
        scoringCriteria: {
            visualImpact: 'Initial wow factor and attention-grabbing power',
            brandClarity: 'How clearly the brand is communicated',
            emotionalEvocation: 'Strength of emotional response triggered',
            productShowcase: 'How well the product/service/offer is presented',
            professionalQuality: 'Technical quality (lighting, composition, resolution)',
            messageAlignment: 'How well the image supports the text message',
            conversionDesign: 'Design elements that drive toward conversion'
        }
    },

    // ═══════════════════════════════════════════
    //  VIDEO ANALYSIS FRAMEWORK
    // ═══════════════════════════════════════════
    VIDEO: {
        name: 'Video',
        psychologyPrinciples: [
            'Narrative Transportation — Does the video tell a compelling story?',
            'Temporal Attention — First 3 seconds determine 70% of engagement',
            'Serial Position Effect — Opening and closing frames are remembered most',
            'Modality Effect — Audio+visual combined doubles information retention',
            'Emotional Contagion — Does watching create a shared emotional experience?',
            'Parasocial Interaction — Does the viewer feel a personal connection?',
            'Zeigarnik Effect — Does it create an open loop that demands resolution?'
        ],
        behavioralEconomics: [
            'Present Bias — Does it emphasize immediate gratification?',
            'Social Proof — Are other people/results/testimonials shown?',
            'Loss Aversion — Is there a cost of inaction communicated?',
            'Anchoring — Are prices, numbers, or comparisons used?',
            'Bandwagon Effect — Does it show popularity or trending status?'
        ],
        neuromarketing: [
            'Auditory Processing — Music, voice tone, sound design quality',
            'Visual Motion Tracking — Eye-catching movement and pacing',
            'Mirror Neuron Response — Does the viewer empathize with subjects?',
            'Dopamine Release Timing — Are reward moments strategically placed?',
            'Cognitive Load Management — Is information delivered at digestible pace?',
            'Brand Imprint — How deeply is brand memory encoded?'
        ],
        googleAlgorithm: [
            'Thumbnail Quality — First frame / thumbnail click-through potential',
            'Duration Optimization — Is length appropriate for placement (6s/15s/30s)?',
            'Audio-Off Comprehension — Does the message work without sound?',
            'Caption/Subtitle Usage — Accessibility and engagement impact',
            'YouTube Ad Specs — Skippable vs non-skippable formatting',
            'View-Through Rate — Predicted completion rate based on structure',
            'Cross-Platform Rendering — Works on mobile, desktop, TV'
        ],
        scoringCriteria: {
            hookStrength: 'First 3 seconds attention capture power',
            narrativeQuality: 'Story structure and engagement flow',
            productDemonstration: 'How effectively the product/offer is shown',
            emotionalArc: 'Emotional journey from open to close',
            brandIntegration: 'How naturally the brand is woven into content',
            ctaPower: 'Strength and timing of the call to action',
            technicalExecution: 'Production quality (audio, video, editing)'
        }
    }
};

// ═══════════════════════════════════════════════════════════════
//  BUILD ASSET ANALYSIS PROMPT
// ═══════════════════════════════════════════════════════════════
function buildAssetAnalysisPrompt(asset, parentAd, siblingAssets, assetType) {
    const framework = ASSET_FRAMEWORKS[assetType] || ASSET_FRAMEWORKS.HEADLINE;

    // Calculate sibling comparisons
    const siblings = siblingAssets || [];
    const siblingStats = siblings.map(s => ({
        content: s.content || s.videoTitle || s.assetName || 'N/A',
        impressions: s.impressions || 0,
        clicks: s.clicks || 0,
        ctr: s.ctr || 0,
        spend: s.spend || 0,
        performanceLabel: s.performanceLabel || 'UNSPECIFIED',
        videoId: s.videoId || null,
        videoTitle: s.videoTitle || null
    }));

    // Sort siblings by CTR to find rank
    const sortedByCtr = [...siblingStats].sort((a, b) => b.ctr - a.ctr);
    const assetCtr = asset.ctr || 0;
    const rank = sortedByCtr.findIndex(s =>
        (s.content === (asset.content || asset.assetName)) && s.ctr === assetCtr
    ) + 1;
    const totalSiblings = siblings.length;

    // Sibling averages
    const avgImp = siblings.length > 0 ? siblings.reduce((s, a) => s + (a.impressions || 0), 0) / siblings.length : 0;
    const avgClicks = siblings.length > 0 ? siblings.reduce((s, a) => s + (a.clicks || 0), 0) / siblings.length : 0;
    const avgCtr = siblings.length > 0 ? siblings.reduce((s, a) => s + (a.ctr || 0), 0) / siblings.length : 0;
    const avgSpend = siblings.length > 0 ? siblings.reduce((s, a) => s + (a.spend || 0), 0) / siblings.length : 0;

    // Top and bottom performers
    const topPerformer = sortedByCtr[0];
    const bottomPerformer = sortedByCtr[sortedByCtr.length - 1];

    const prompt = `You are Analyzer, an elite AI Creative Intelligence Analyst specializing in per-asset analysis. You analyze individual creative elements (Headlines, Descriptions, Images, Videos) within Google Ads using advanced frameworks from Consumer Psychology, Behavioral Economics, Neuromarketing, and Google's Ad Algorithm.

## ASSET BEING ANALYZED
- Asset Type: ${framework.name}
- Content: "${asset.content || asset.assetName || 'N/A'}"
- Asset ID: ${asset.assetId || 'N/A'}
- Field Type: ${asset.fieldType || assetType}
- Performance Label (Google): ${asset.performanceLabel || 'UNSPECIFIED'}
${asset.imageUrl ? `- Image URL: ${asset.imageUrl}` : ''}
${asset.imageWidth ? `- Dimensions: ${asset.imageWidth}×${asset.imageHeight}` : ''}
${asset.videoId ? `- Video ID: ${asset.videoId}` : ''}
${asset.videoTitle ? `- Video Title: "${asset.videoTitle}"` : ''}
${asset.videoId ? `- YouTube Thumbnail: https://img.youtube.com/vi/${asset.videoId}/hqdefault.jpg` : ''}
${asset.videoUrl ? `- Video URL: ${asset.videoUrl}` : ''}

${assetType === 'VIDEO' ? `## IMPORTANT: VIDEO ANALYSIS INSTRUCTIONS
You are analyzing a VIDEO ad asset. ${asset.videoId ? 'The thumbnail image has been provided above — analyze it as the first visual touchpoint.' : ''}
Even though you cannot watch the full video, you CAN and SHOULD analyze:
1. **Thumbnail/First Frame**: Visual hook, colors, text overlay, faces, branding, composition
2. **Video Title**: What the title communicates about content, hooks, and value proposition
3. **Performance Data**: CTR, impressions, clicks tell you HOW WELL the video works
4. **Campaign Context**: "${parentAd.campaignName || ''}" — what the campaign is about
5. **Competitive Position**: How this video performs vs sibling videos in the same group
6. **Thumbnail Psychology**: Whether the thumbnail creates curiosity, urgency, or emotional pull
7. **YouTube Ad Best Practices**: Duration hints, format compliance, skip-prevention techniques

Base your analysis on ALL available signals. Do NOT say "unable to determine" — instead analyze what IS available and make informed assessments from the data.` : ''}
${assetType === 'IMAGE' ? `## IMPORTANT: IMAGE ANALYSIS INSTRUCTIONS
You are analyzing an IMAGE ad asset. ${asset.imageUrl ? 'The actual image has been provided above — analyze it in full visual detail.' : ''}
Analyze: composition, color palette, typography, branding, CTA visibility, emotional triggers, visual hierarchy, text-to-image ratio, professional quality, and how well it supports the campaign message "${parentAd.adName || ''}".` : ''}

## ASSET METRICS
- Impressions: ${asset.impressions || 0}
- Clicks: ${asset.clicks || 0}
- CTR: ${asset.ctr || 0}%
- Spend: $${asset.spend || 0}
- CPC: $${asset.cpc || 0}
- CPM: $${asset.cpm || 0}
- Conversions: ${asset.conversions || 0}
- ROAS: ${asset.roas || 0}x

## COMPETITIVE CONTEXT (vs ${totalSiblings} sibling ${framework.name}s in this Asset Group)
- This asset's CTR rank: #${rank || '?'} of ${totalSiblings}
- Sibling Average CTR: ${avgCtr.toFixed(2)}%
- Sibling Average Impressions: ${Math.round(avgImp).toLocaleString()}
- Sibling Average Spend: $${avgSpend.toFixed(2)}
- Top Performer: "${topPerformer?.content || 'N/A'}" (CTR: ${topPerformer?.ctr || 0}%)
- Bottom Performer: "${bottomPerformer?.content || 'N/A'}" (CTR: ${bottomPerformer?.ctr || 0}%)

## ALL SIBLINGS FOR COMPARISON
${siblingStats.map((s, i) => `${i + 1}. "${s.content}" — ${s.impressions} imp, ${s.clicks} clicks, ${s.ctr}% CTR, $${s.spend} spend [${s.performanceLabel}]`).join('\n')}

## PARENT AD GROUP CONTEXT
- Ad Name: ${parentAd.adName || 'N/A'}
- Ad Type: ${parentAd.adType || 'N/A'}
- Campaign: ${parentAd.campaignName || 'N/A'}
- Group CTR: ${parentAd.ctr || 0}%
- Group Spend: $${parentAd.spend || 0}
- Group ROAS: ${parentAd.roas || 0}x
- Group Conversions: ${parentAd.conversions || 0}

## ANALYSIS FRAMEWORKS TO APPLY

### I. Consumer Psychology & Behavioral Science
${framework.psychologyPrinciples.map(p => `- ${p}`).join('\n')}

### II. Behavioral Economics
${framework.behavioralEconomics.map(p => `- ${p}`).join('\n')}

### III. Neuromarketing
${framework.neuromarketing.map(p => `- ${p}`).join('\n')}

### IV. Google Ad Algorithm Factors
${framework.googleAlgorithm.map(p => `- ${p}`).join('\n')}

## SCORING CRITERIA
${Object.entries(framework.scoringCriteria).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## YOUR TASK
Analyze this INDIVIDUAL ${framework.name} asset against ALL frameworks above. Compare it to its siblings. Provide your analysis in STRICT JSON format. No markdown, no code blocks, JUST the raw JSON object.

CRITICAL: Provide DETAILED multi-sentence analysis for every text field. Do NOT use placeholder text. Each analysis field should be a thorough, specific paragraph referencing THIS exact asset's content, metrics, and creative elements.

{
  "assetId": "${asset.assetId || ''}",
  "assetType": "${assetType}",
  "assetName": "${(asset.content || asset.videoTitle || asset.assetName || '').replace(/"/g, '\\"')}",
  "adType": "${parentAd.adType || 'PERFORMANCE_MAX'}",
  "campaignName": "${(parentAd.campaignName || '').replace(/"/g, '\\"')}",

  "spend": "${asset.spend || 0}",
  "impressions": ${asset.impressions || 0},
  "clicks": ${asset.clicks || 0},
  "ctr": "${asset.ctr || 0}",
  "cpc": "${asset.cpc || 0}",
  "cpm": "${asset.cpm || 0}",
  "roas": "${asset.roas || 0}",
  "aov": "0",

  "rankAmongSiblings": ${rank || 0},
  "totalSiblings": ${totalSiblings},

  "analysisMode": "${(assetType === 'IMAGE' || assetType === 'VIDEO') ? 'VISUAL_AND_METRICS' : 'TEXT_AND_METRICS'}",

  "ctrAnalysis": "Detailed analysis of this asset's CTR relative to siblings and benchmarks, explaining WHY it performs as it does based on the creative elements",
  "cpcAnalysis": "Detailed CPC analysis indicating relevance, competition, and quality signals",
  "frequencyAnalysis": "Comment on impression volume and frequency patterns",
  "primaryBottleneck": "Identify the main friction point holding this asset back",

  "creativeType": "${assetType === 'IMAGE' ? 'static image' : assetType === 'VIDEO' ? 'video' : 'text copy'}",
  "dominantColors": "Describe color palette and psychological effect (for text: N/A or infer from brand)",
  "primaryMessage": "Main value proposition communicated by this asset",
  "secondaryMessage": "Supporting message or subtext",
  "ctaText": "Call to Action used (explicit or implied)",

  "trustElements": "List all trust signals found",
  "urgencyElements": "List all urgency triggers found",
  "numbersShown": "Specific numbers used in the creative",
  "brandingElements": "How brand is presented in this asset",
  "keyVisualElements": "Key visual or textual components that define this asset",

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

  "visualDesignJustification": "1-2 sentence justification for visual design score",
  "typographyJustification": "1-2 sentence justification",
  "colorUsageJustification": "1-2 sentence justification",
  "compositionJustification": "1-2 sentence justification",
  "ctaJustification": "1-2 sentence justification",
  "emotionalAppealJustification": "1-2 sentence justification",
  "trustSignalsJustification": "1-2 sentence justification",
  "urgencyJustification": "1-2 sentence justification",

  "lossAversionPresent": false,
  "lossAversionStrength": "ABSENT/WEAK/MODERATE/STRONG",
  "lossAversionEvidence": "Specific evidence from this asset",
  "scarcityPresent": false,
  "scarcityStrength": "ABSENT/WEAK/MODERATE/STRONG",
  "scarcityEvidence": "Specific evidence",
  "socialProofPresent": false,
  "socialProofStrength": "ABSENT/WEAK/MODERATE/STRONG",
  "socialProofEvidence": "Specific evidence",
  "anchoringPresent": false,
  "anchoringStrength": "ABSENT/WEAK/MODERATE/STRONG",
  "anchoringEvidence": "Specific evidence",

  "aidaAttentionScore": 0,
  "aidaAttentionAnalysis": "Detailed analysis of attention-capture ability",
  "aidaInterestScore": 0,
  "aidaInterestAnalysis": "Detailed analysis of interest generation",
  "aidaDesireScore": 0,
  "aidaDesireAnalysis": "Detailed analysis of desire creation",
  "aidaActionScore": 0,
  "aidaActionAnalysis": "Detailed analysis of action-driving ability",

  "performanceLabel": "TOP_PERFORMER / SOLID_PERFORMER / UNDERPERFORMER",
  "designQuality": "PROFESSIONAL / AVERAGE / POOR",
  "psychologyStrength": "STRONG / MODERATE / WEAK",
  "whatWorks": "List 3 specific effective elements with explanations",
  "whatDoesntWork": "List specific weak elements with explanations",
  "keyInsight": "WHAT: [metric insight]. WHY: [creative reason]. SO WHAT: [strategic implication]",

  "recommendation1": "Specific actionable recommendation with detail",
  "recommendation1Impact": "Expected quantified result",
  "recommendation1Effort": "LOW/MEDIUM/HIGH",
  "recommendation2": "Second recommendation",
  "recommendation2Impact": "Expected result",
  "recommendation2Effort": "LOW/MEDIUM/HIGH",
  "recommendation3": "Third recommendation",
  "recommendation3Impact": "Expected result",
  "recommendation3Effort": "LOW/MEDIUM/HIGH",

  "keepElements": "Elements to Keep (be specific to this asset)",
  "changeElements": "Elements to Change",
  "addElements": "Elements to Add",
  "hookOptions": "3 alternative hook/headline variations for this asset",
  "ctaOptions": "3 alternative CTA variations",

  "actionScale": false,
  "actionPause": false,
  "actionOptimize": false,
  "actionTest": false,
  "actionRationale": "Why take this action? Reference specific metrics.",

  "verdictDecision": "SCALE / OPTIMIZE / PAUSE",
  "verdictRating": "A+ / A / B+ / B / C+ / C / D / F",
  "verdictConfidence": "HIGH/MEDIUM/LOW",
  "verdictSummary": "Final executive summary paragraph with specific metrics and strategic recommendation",
  "embeddingText": "Concise summary for vector embedding search",

  "vsTopPerformer": {
    "topPerformerContent": "${(topPerformer?.content || '').replace(/"/g, '\\"')}",
    "topPerformerCtr": ${topPerformer?.ctr || 0},
    "gapAnalysis": "Why is the top performer winning? What does it do differently?",
    "learnings": "What can this asset learn from the top performer?"
  },

  "tags": ["tag1", "tag2"],
  "searchableContent": "concise description of asset content and performance"
}`;

    return prompt;
}


// ═══════════════════════════════════════════════════════════════
//  ANALYZE SINGLE ASSET via Claude API
// ═══════════════════════════════════════════════════════════════
export async function analyzeAsset(asset, parentAd, siblingAssets, assetType) {
    const prompt = buildAssetAnalysisPrompt(asset, parentAd, siblingAssets, assetType);

    // Build message content — for images and videos, include visual content
    let messageContent;
    const imageUrl = asset.imageUrl || null;
    const videoThumbUrl = asset.videoId ? `https://img.youtube.com/vi/${asset.videoId}/hqdefault.jpg` : null;
    const visualUrl = imageUrl || videoThumbUrl;

    if (visualUrl && (assetType === 'IMAGE' || assetType === 'VIDEO')) {
        // Try to fetch the image and send as base64 for vision analysis
        try {
            const imgResponse = await fetch(visualUrl);
            if (imgResponse.ok) {
                const buffer = await imgResponse.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
                const mediaType = contentType.includes('png') ? 'image/png' :
                    contentType.includes('webp') ? 'image/webp' :
                        contentType.includes('gif') ? 'image/gif' : 'image/jpeg';

                messageContent = [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: base64
                        }
                    },
                    {
                        type: 'text',
                        text: assetType === 'VIDEO'
                            ? `The image above is the YouTube THUMBNAIL of this video ad. Analyze the thumbnail's visual effectiveness as the entry point for the video.\n\n${prompt}`
                            : `The image above is the actual ad creative being analyzed. Analyze its visual elements in detail.\n\n${prompt}`
                    }
                ];
                console.log(`[Analyzer] Sending ${assetType} with visual (${Math.round(base64.length / 1024)}KB)`);
            } else {
                console.log(`[Analyzer] Could not fetch visual for ${assetType}: ${imgResponse.status}`);
                messageContent = prompt;
            }
        } catch (imgErr) {
            console.log(`[Analyzer] Visual fetch failed for ${assetType}: ${imgErr.message}`);
            messageContent = prompt;
        }
    } else {
        messageContent = prompt;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            temperature: 0.3,
            messages: [{
                role: 'user',
                content: messageContent
            }]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse JSON from response
    try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleaned);
    } catch (parseErr) {
        console.error('[Analyzer] Asset analysis JSON parse failed:', parseErr.message);
        return { raw: text, parseError: true };
    }
}


// ═══════════════════════════════════════════════════════════════
//  BATCH ANALYZE ALL ASSETS IN AN AD GROUP
// ═══════════════════════════════════════════════════════════════
export async function analyzeAllAssets(adData) {
    const assets = adData.individualAssets || [];
    if (assets.length === 0) return { error: 'No individual assets to analyze' };

    // Group by type
    const headlines = assets.filter(a => a.fieldType === 'HEADLINE');
    const longHeadlines = assets.filter(a => a.fieldType === 'LONG_HEADLINE');
    const descriptions = assets.filter(a => a.fieldType === 'DESCRIPTION');
    const images = assets.filter(a => a.imageUrl);
    const videos = assets.filter(a => a.videoId);

    const results = {
        adId: adData.adId,
        adName: adData.adName,
        analyzedAt: new Date().toISOString(),
        headlines: [],
        longHeadlines: [],
        descriptions: [],
        images: [],
        videos: [],
        summary: null
    };

    // Analyze each type with sibling context
    const analyzeGroup = async (group, type) => {
        const analyses = [];
        for (const asset of group) {
            try {
                const analysis = await analyzeAsset(asset, adData, group, type);
                analyses.push(analysis);
            } catch (err) {
                console.error(`[Analyzer] Failed to analyze ${type} asset ${asset.assetId}:`, err.message);
                analyses.push({ assetId: asset.assetId, error: err.message });
            }
        }
        return analyses;
    };

    // Run analyses sequentially or in small batches to respect rate limits
    if (headlines.length > 0) {
        console.log(`[Analyzer] Analyzing ${headlines.length} headlines...`);
        results.headlines = await analyzeGroup(headlines, 'HEADLINE');
    }
    if (longHeadlines.length > 0) {
        console.log(`[Analyzer] Analyzing ${longHeadlines.length} long headlines...`);
        results.longHeadlines = await analyzeGroup(longHeadlines, 'LONG_HEADLINE');
    }
    if (descriptions.length > 0) {
        console.log(`[Analyzer] Analyzing ${descriptions.length} descriptions...`);
        results.descriptions = await analyzeGroup(descriptions, 'DESCRIPTION');
    }
    if (images.length > 0) {
        console.log(`[Analyzer] Analyzing ${images.length} images...`);
        results.images = await analyzeGroup(images, 'IMAGE');
    }
    if (videos.length > 0) {
        console.log(`[Analyzer] Analyzing ${videos.length} videos...`);
        results.videos = await analyzeGroup(videos, 'VIDEO');
    }

    return results;
}


// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════
// Exports handled via named exports above
