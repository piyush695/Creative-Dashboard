const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ═══════════════════════════════════════════════════════════════
//  Hola Prime — 5-Lens × 5-Funnel Creative Analyzer (v3)
//
//  Two analysis modes:
//   • Mode A — VISUAL ONLY: heuristic critique + predicted stages
//   • Mode B — VISUAL × METRICS: per-stage diagnosis tying weak
//             metrics to the specific lens lever that broke
//
//  The framework:
//   • 5 LENSES scan the creative for which persuasion levers fire:
//       1. Consumer Psychology
//       2. Behavioral Economics
//       3. Advertising Principles (Cialdini)
//       4. Neuromarketing
//       5. Behavioral Psychology
//   • 5 FUNNEL STAGES tie levers to outcome metrics:
//       Stage 1 — Hook (3-sec views, thumb-stop)
//       Stage 2 — Hold (avg watch time, retention)
//       Stage 3 — CTR (link/outbound clicks)
//       Stage 4 — CVR (purchases, ROAS, CPA)
//       Stage 5 — Fatigue (freq vs CTR decay, CPM creep)
//
//  When metrics are present at a stage, the analyzer can DIAGNOSE
//  exactly which lever broke. When metrics are missing, the stage
//  is marked "cannot_assess" so the user knows what to add.
//
//  Legacy fields are still cross-populated so existing UI tabs
//  (Brief / Performance / Variants) continue to render unchanged
//  until Phase 3 of this rebuild lands.
// ═══════════════════════════════════════════════════════════════

function hasMetrics(ad) {
    const num = (v) => {
        const n = typeof v === 'number' ? v : parseFloat(v);
        return Number.isFinite(n) ? n : 0;
    };
    return (
        num(ad?.spend) > 0 ||
        num(ad?.impressions) > 0 ||
        num(ad?.clicks) > 0 ||
        num(ad?.ctr) > 0
    );
}

function inferPlatformContext(ad) {
    const p = (ad?.platform || '').toLowerCase();
    if (p === 'adroll') {
        return 'AdRoll RETARGETING placement. Audience has already seen the brand at least once — psychology centers on overcoming friction, re-engagement, and sunk-cost reactivation, NOT cold acquisition.';
    }
    if (p === 'google' || p === 'youtube') {
        return 'Google / YouTube placement. User has explicit search intent or sits in a discovery context — relevance to query/audience and fast decision-making dominate.';
    }
    return 'Meta (Facebook / Instagram feed, story, or reel). Competing with organic social content for ~0.7 seconds of scroll-attention. Thumb-stop power and first-frame clarity dominate.';
}

/**
 * Returns a per-stage map of which KPIs are present on this ad doc,
 * so the analyzer prompt knows whether each stage can be DIAGNOSED
 * (metric present) or only PREDICTED / cannot_assess (metric missing).
 *
 * This is the metric inventory used to drive Mode B's stage logic.
 */
function metricsAvailability(ad) {
    const has = (v) => v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && v === 0);
    const num = (v) => {
        const n = typeof v === 'number' ? v : parseFloat(v);
        return Number.isFinite(n) ? n : 0;
    };

    // Derived/known fields from the existing Meta sync
    const knownPresent = {
        spend: has(ad?.spend),
        impressions: has(ad?.impressions) && num(ad.impressions) > 0,
        clicks: has(ad?.clicks) && num(ad.clicks) > 0,
        ctr: has(ad?.ctr) && num(ad.ctr) > 0,
        cpc: has(ad?.cpc) && num(ad.cpc) > 0,
        cpm: has(ad?.cpm) && num(ad.cpm) > 0,
        roas: has(ad?.roas) && num(ad.roas) > 0,
        frequency: has(ad?.frequency) && num(ad.frequency) > 0,
        reach: has(ad?.reach) && num(ad.reach) > 0,
        conversions: has(ad?.conversions) && num(ad.conversions) > 0,
    };

    // Stage-specific KPIs we'd LIKE to have but are NOT in current sync.
    // The analyzer treats these as 'cannot_assess' with a note to add them.
    const missing = {
        stage1: ['hook_rate', 'thumb_stop_ratio', 'video_3sec_views'],
        stage2: ['hold_rate', 'avg_watch_time', 'p25_retention', 'p50_retention', 'p75_retention', 'p100_retention'],
        stage3: ['outbound_clicks', 'inline_link_clicks', 'link_ctr'],
        stage4: ['cvr', 'cpa', 'purchase_actions', 'conversion_value', 'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'],
        stage5: ['ctr_time_series', 'cpm_time_series', 'frequency_time_series'],
    };

    return { knownPresent, missing };
}

function buildPrompt(ad) {
    const metricsPresent = hasMetrics(ad);
    const platformContext = inferPlatformContext(ad);
    const availability = metricsAvailability(ad);

    const pctDiff = (val, avg) => {
        if (!avg || avg === 0) return 'n/a';
        const diff = ((val - avg) / avg * 100).toFixed(1);
        return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const modeBlock = metricsPresent ? `
═══════════════════════════════════════════════════════════════
## MODE B — VISUAL × METRICS (diagnose, don't just describe)

This ad has performance data. Your job is to map each weak metric to the SPECIFIC LEVER in the 5-lens scan that caused it — and each strong metric to the lever that's driving it.

Examples of the kind of insight we want:
- "Stage 1 hook rate appears strong (CTR proxy 4.34% — 2x category) because pattern_interrupt fires hard (cyan rocket trail against navy is uncommon) and visualSaliency winner ($23 anchor) matches the offer intent."
- "Stage 4 CVR is weak (ROAS 47x but only 3 conversions on $605 spend) because authority is absent — there are no testimonials, no payout proof, no real trader photos. The persuasion lever broke at the trust handoff."
` : `
═══════════════════════════════════════════════════════════════
## MODE A — VISUAL ONLY (predict performance)

This ad has NO performance data. Your job is to PREDICT how it will perform at each funnel stage based on which levers fire in the 5-lens scan.

For each stage: predict low / average / high with reasoning grounded in the levers.
`;

    return `You are a SENIOR CREATIVE STRATEGIST analyzing a Hola Prime advertisement using the 5-LENS × 5-FUNNEL framework. Hola Prime is a prop trading firm — traders pay a fee for a funded-account challenge, profitable traders earn 90/10 splits on real capital.

⚠️ HARD RULES — VIOLATING THESE INVALIDATES YOUR ANALYSIS ⚠️

1. **EVIDENCE OR SILENCE.** Every claim must quote/cite a specific element you can SEE in this ad. Generic statements like "could improve hierarchy" are FORBIDDEN.
2. **NO CHECKLIST OUTPUTS.** Skip the lazy prop-firm playbook ("add trust badge / countdown / testimonial / bullets"). Only recommend what THIS specific ad genuinely lacks.
3. **VARIABLE COUNTS.** Score what's present; mark absent levers honestly (don't invent presence).
4. **CONCEPT-FIRST.** Name the central creative idea before any lever scoring.
5. **LEVER → STAGE DISCIPLINE.** When mapping levers to funnel stages, use the table below. Don't claim "social proof drives the hook" — social proof drives Stage 3 / 4.
6. **HONEST ABSENCE.** If a stage's primary KPI isn't in the data, mark it 'cannot_assess' — do NOT make up a status from CTR alone.

═══════════════════════════════════════════════════════════════
## PROP-FIRM INDUSTRY CONTEXT

The category is saturated: FTMO, Funded Next, MyForexFunds, The 5%ers, Topstep, Apex. Ads look ~95% identical (green/red trading screens, "funded trader" claims, "% OFF" deals).

TIER 1 PROOF (rare, highest impact): named trader + dollar payout + timestamp; wire/bank screenshots; sub-24-hr payout claims; real P&L screenshots.
TIER 2 TRANSPARENCY (medium): profit split %, drawdown rules, day requirements, instrument list, fee transparency.
TIER 3 COMMODITIZED (table stakes): % OFF discounts, codes, generic countdowns.
RED FLAGS: generic rocket/explosion imagery, "take your trading to the next level" copy, stock-photo traders, AI-generated faces.

═══════════════════════════════════════════════════════════════
## THE 5 LENSES (score each lever 0-10 with quoted evidence)

### LENS 1 — CONSUMER PSYCHOLOGY (what's in the viewer's head)
- attentionFocalPoint:  ONE unmistakable focal point, or attention split across competing elements?
- selfRelevance:        Does the target instantly see "this is for me" (persona/problem/context)?
- emotionalVsRational:  Selling a feeling (status/relief/belonging) or a spec sheet?
- motivationAlignment:  Speaks to gain (aspiration) or pain (problem/fear)?
- cognitiveLoad:        How many distinct things must the eye process? >3 = comprehension drops.

### LENS 2 — BEHAVIORAL ECONOMICS (decision biases leveraged)
- anchoring:        Reference price/value shown so the offer looks favorable?
- lossAversion:     Loss-framed ("don't miss / before it's gone") vs gain-framed?
- scarcityUrgency:  Limited stock/time. CREDIBLE scarcity vs obviously fake (which erodes trust)?
- socialProof:      Counts, ratings, UGC. SPECIFIC numbers beat vague claims.
- decoyFraming:     Structured to make one choice obviously "best"?
- defaultFriction:  CTA makes next step feel effortless? (high score = low friction)
- endowmentFraming: "Your plan / your results" language?

### LENS 3 — ADVERTISING PRINCIPLES (Cialdini + craft)
- reciprocity:           Something given first (free guide, value upfront)?
- authority:             Experts, credentials, logos, "as seen in", data sources?
- commitmentConsistency: Small yes before the big ask (quiz, micro-question)?
- liking:                Attractive/relatable faces, humor, shared identity?
- unityInGroup:          "People like us" / in-group signaling?
- messageHierarchy:      Does the single most important idea dominate, or buried? ONE ad = ONE message.
- benefitOverFeature:    Outcome shown, not just product attribute?

### LENS 4 — NEUROMARKETING (pre-conscious perceptual layer)
- facesGaze:           Faces present? Gaze direction toward CTA/product, or just camera?
- visualSaliency:      Brightest/highest-contrast element wins first fixation. Does that element MATCH the intended hero?
- patternInterrupt:    Breaks feed visual rhythm (unexpected color/motion/framing)?
- visualHierarchy:     Trace the scan path. Does it END on the CTA?
- colorContrast:       Mobile-readable at thumb size? White-feed legibility?
- processingFluency:   Easy fonts, clean layout, familiar imagery → trusted. Hard-to-read = distrusted.
- motionFirstSecond:   (video only) Does early movement trigger orienting attention?

### LENS 5 — BEHAVIORAL PSYCHOLOGY (structure → response)
- stimulusResponse:    Obvious cue → desired action mapping? Clear CTA verb?
- rewardSignaling:     Visual telegraphs the payoff of clicking (after-state, result, feeling)?
- vonRestorff:         One element deliberately "odd one out" → memorable?
- frictionEffortCues:  Anything implying work (dense text, complex offer, multi-step)? (high score = low friction)
- zeigarnikOpenLoops:  (video/carousel) Unresolved question pulls forward for closure?
- closureAtCta:        CTA feels like the natural resolution of the tension the creative built?

═══════════════════════════════════════════════════════════════
## THE 5-STAGE FUNNEL (lever → stage routing)

| Stage | Primary KPIs | Levers that drive this stage |
|---|---|---|
| **Stage 1 — Hook** | hook_rate, thumb_stop_ratio, 3sec_views | visualSaliency, patternInterrupt, facesGaze, attentionFocalPoint, selfRelevance, motionFirstSecond |
| **Stage 2 — Hold** | hold_rate, avg watch time, p25/p50/p75 retention | processingFluency, cognitiveLoad, zeigarnikOpenLoops |
| **Stage 3 — CTR** | link_ctr, outbound_ctr | benefitOverFeature, messageHierarchy, anchoring, lossAversion, scarcityUrgency, socialProof, rewardSignaling, stimulusResponse, closureAtCta |
| **Stage 4 — CVR** | cvr, roas, cpa | authority, reciprocity, credibleScarcity (scarcity + credibility), commitmentConsistency, defaultFriction |
| **Stage 5 — Fatigue** | freq vs ctr_decay, cpm_creep | vonRestorff, patternInterrupt strength, repetition_consistency, novelty |

${modeBlock}

═══════════════════════════════════════════════════════════════
## THIS AD

${platformContext}

- Platform: ${ad?.platform || 'meta'}
- Ad ID: ${ad?.adId || ad?.id}
- Ad Name: ${ad?.adName || ad?.name || 'unnamed'}
- Ad Type: ${ad?.adType || ad?.type || 'image'}

## PERFORMANCE DATA

Core metrics (always present):
- spend: $${ad?.spend || 0}
- impressions: ${ad?.impressions || 0}
- clicks: ${ad?.clicks || 0}
- ctr: ${ad?.ctr || 0}% ${ad?.adGroupAvg?.ctr ? `(vs benchmark: ${pctDiff(ad.ctr, ad.adGroupAvg.ctr)})` : ''}
- cpc: $${ad?.cpc || 0}
- cpm: $${ad?.cpm || 0}
- roas: ${ad?.roas || 0}x
- frequency: ${ad?.frequency || 0}
- reach: ${ad?.reach || 0}
- conversions: ${ad?.conversions || 0}

${(() => {
        // Phase-2 enriched metrics from Meta Insights API
        // (populated by enrichAndSaveForAd; absent if the user hasn't clicked
        // "Enrich Metrics" or the ad has no video data)
        const lines = [];
        const present = (v) => v !== undefined && v !== null;

        const stage1 = [];
        if (present(ad?.thumb_stop_ratio))
            stage1.push(`  - thumb_stop_ratio: ${(Number(ad.thumb_stop_ratio) * 100).toFixed(2)}% (Stage 1 KPI — video_3sec / impressions)`);
        if (present(ad?.video_3sec_views))
            stage1.push(`  - video_3sec_views: ${ad.video_3sec_views}`);

        const stage2 = [];
        if (present(ad?.video_avg_time_watched_ms))
            stage2.push(`  - video_avg_time_watched_ms: ${ad.video_avg_time_watched_ms}`);
        if (present(ad?.p25_retention))
            stage2.push(`  - p25_retention: ${(Number(ad.p25_retention) * 100).toFixed(1)}%`);
        if (present(ad?.p50_retention))
            stage2.push(`  - p50_retention: ${(Number(ad.p50_retention) * 100).toFixed(1)}%`);
        if (present(ad?.p75_retention))
            stage2.push(`  - p75_retention: ${(Number(ad.p75_retention) * 100).toFixed(1)}%`);
        if (present(ad?.p100_retention))
            stage2.push(`  - p100_retention: ${(Number(ad.p100_retention) * 100).toFixed(1)}%`);

        const stage3 = [];
        if (present(ad?.outbound_clicks))
            stage3.push(`  - outbound_clicks: ${ad.outbound_clicks}`);
        if (present(ad?.outbound_clicks_ctr))
            stage3.push(`  - outbound_clicks_ctr: ${Number(ad.outbound_clicks_ctr).toFixed(2)}% (TRUE link CTR — Stage 3 KPI)`);
        if (present(ad?.inline_link_clicks))
            stage3.push(`  - inline_link_clicks: ${ad.inline_link_clicks}`);
        if (present(ad?.inline_link_click_ctr))
            stage3.push(`  - inline_link_click_ctr: ${Number(ad.inline_link_click_ctr).toFixed(2)}%`);

        const stage4 = [];
        if (present(ad?.purchase_count))
            stage4.push(`  - purchase_count: ${ad.purchase_count}`);
        if (present(ad?.cost_per_purchase))
            stage4.push(`  - cost_per_purchase (CPA): $${Number(ad.cost_per_purchase).toFixed(2)}`);
        if (present(ad?.purchase_value))
            stage4.push(`  - purchase_value (revenue): $${Number(ad.purchase_value).toFixed(2)}`);
        if (present(ad?.cvr_purchase))
            stage4.push(`  - cvr_purchase: ${(Number(ad.cvr_purchase) * 100).toFixed(2)}% (purchases / link_clicks)`);
        if (present(ad?.lead_count))
            stage4.push(`  - lead_count: ${ad.lead_count}`);
        if (present(ad?.cost_per_lead))
            stage4.push(`  - cost_per_lead: $${Number(ad.cost_per_lead).toFixed(2)}`);
        if (present(ad?.cvr_lead))
            stage4.push(`  - cvr_lead: ${(Number(ad.cvr_lead) * 100).toFixed(2)}%`);
        if (present(ad?.initiate_checkout_count))
            stage4.push(`  - initiate_checkout_count: ${ad.initiate_checkout_count}`);
        if (present(ad?.landing_page_view_count))
            stage4.push(`  - landing_page_view_count: ${ad.landing_page_view_count}`);

        const rankings = [];
        if (ad?.quality_ranking)
            rankings.push(`  - quality_ranking: ${ad.quality_ranking} (Meta's own Stage 1 + Stage 4 diagnostic)`);
        if (ad?.engagement_rate_ranking)
            rankings.push(`  - engagement_rate_ranking: ${ad.engagement_rate_ranking} (Meta's Stage 1 + Stage 2 diagnostic)`);
        if (ad?.conversion_rate_ranking)
            rankings.push(`  - conversion_rate_ranking: ${ad.conversion_rate_ranking} (Meta's Stage 4 diagnostic — direct match to our framework)`);

        if (stage1.length) lines.push('\nStage 1 enriched (Hook):\n' + stage1.join('\n'));
        if (stage2.length) lines.push('\nStage 2 enriched (Hold):\n' + stage2.join('\n'));
        if (stage3.length) lines.push('\nStage 3 enriched (Link CTR):\n' + stage3.join('\n'));
        if (stage4.length) lines.push('\nStage 4 enriched (CVR / CPA / ROAS):\n' + stage4.join('\n'));
        if (rankings.length) lines.push('\nMeta\'s built-in ranking diagnostics:\n' + rankings.join('\n'));

        const anyEnriched = stage1.length || stage2.length || stage3.length || stage4.length || rankings.length;
        if (anyEnriched) {
            return `Phase-2 enriched metrics from Meta Insights API (use these for stage diagnosis):${lines.join('')}

For stages WITH enriched metrics above → status='validates' / 'broken' / 'on_par' (real diagnosis).
For stages WITHOUT enriched metrics → status='cannot_assess' and note which specific metric to enrich.`;
        }
        return `Phase-2 enriched metrics: NOT YET FETCHED for this ad.

The user has not clicked "Enrich Metrics" yet, so Stages 1, 2, and 4 have to be marked 'cannot_assess'. In the funnel.stage*.actualMetrics field, tell the user to click "Enrich Metrics" in the sidebar to unlock real diagnosis for those stages.

Still diagnose Stage 3 (using total ctr as a weak proxy for link_ctr) and Stage 5 (using single freq value, noting that time-series would be better).`;
    })()}

═══════════════════════════════════════════════════════════════
## REASONING CHAIN (work through internally before writing JSON)

**Step 1 — OBSERVE.** List 6-10 specific visual/textual elements. Quote text verbatim.
**Step 2 — CONCEPT.** Name the ONE big creative idea. One sentence.
**Step 3 — LENS SCAN.** Score each lever in each of the 5 lenses (0-10) with quoted evidence.
**Step 4 — FUNNEL MAP.** For each of the 5 stages:
  - Check the stage's primary KPIs against the metrics inventory above.
  - If KPI is PRESENT and STRONG vs benchmark → status='validates', list levers that fire.
  - If KPI is PRESENT and WEAK → status='broken', identify the root-cause lever from the routing table.
  - If KPI is PRESENT and AVERAGE → status='on_par'.
  - If KPI is MISSING from the data → status='cannot_assess' + note which metric to add.
  - If NO metrics exist at all (Mode A) → status='predicted' + low/average/high.
**Step 5 — SYNTHESIZE.** Roll up to verdict (scale/optimize/pause/kill) + confidence.
**Step 6 — TESTS.** 1-3 tests, each tied to a specific lever-level fix at a specific stage.

═══════════════════════════════════════════════════════════════
## OUTPUT (STRICT JSON, NO MARKDOWN, NO CODE FENCES, NO PREAMBLE)

{
  "adId": "${ad?.adId || ad?.id || ''}",
  "adName": "${(ad?.adName || ad?.name || '').replace(/"/g, '\\"')}",
  "adType": "${ad?.adType || ad?.type || ''}",
  "spend": "${ad?.spend || 0}",
  "impressions": ${ad?.impressions || 0},
  "clicks": ${ad?.clicks || 0},
  "ctr": "${ad?.ctr || 0}",
  "cpc": "${ad?.cpc || 0}",
  "cpm": "${ad?.cpm || 0}",
  "roas": "${ad?.roas || 0}",

  "pattern": "${metricsPresent ? 'visual_metrics' : 'visual_only'}",
  "platform": "meta_feed | meta_story | meta_reel | tiktok | youtube | display | search (best guess)",
  "objective": "awareness | traffic | conversions (best inference)",
  "observation": "2-3 sentences quoting specific elements you observed in Step 1",
  "centralConcept": "ONE-sentence central creative idea (from Step 2)",
  "designerTradeOffs": "What was sacrificed to make the central concept work",

  "lenses": {
    "consumerPsychology": {
      "attentionFocalPoint":  { "score": 0, "evidence": "quoted element", "note": "1-sentence why" },
      "selfRelevance":        { "score": 0, "evidence": "...", "note": "..." },
      "emotionalVsRational":  { "framing": "emotional|rational|mixed", "evidence": "...", "note": "..." },
      "motivationAlignment":  { "type": "gain|pain|mixed", "evidence": "...", "note": "..." },
      "cognitiveLoad":        { "elementCount": 0, "healthy": true, "evidence": "...", "note": "..." }
    },
    "behavioralEconomics": {
      "anchoring":            { "present": false, "strength": "absent|weak|moderate|strong", "evidence": "...", "note": "..." },
      "lossAversion":         { "present": false, "strength": "absent|weak|moderate|strong", "evidence": "...", "note": "..." },
      "scarcityUrgency":      { "present": false, "credibility": "credible|fake|absent", "evidence": "...", "note": "..." },
      "socialProof":          { "present": false, "specificity": "specific|vague|absent", "evidence": "...", "note": "..." },
      "decoyFraming":         { "present": false, "evidence": "...", "note": "..." },
      "defaultFriction":      { "score": 0, "evidence": "...", "note": "..." },
      "endowmentFraming":     { "present": false, "evidence": "...", "note": "..." }
    },
    "advertisingPrinciples": {
      "reciprocity":           { "present": false, "evidence": "...", "note": "..." },
      "authority":             { "present": false, "evidence": "...", "note": "..." },
      "commitmentConsistency": { "present": false, "evidence": "...", "note": "..." },
      "liking":                { "facesPresent": false, "evidence": "...", "note": "..." },
      "unityInGroup":          { "present": false, "evidence": "...", "note": "..." },
      "messageHierarchy":      { "score": 0, "evidence": "...", "note": "..." },
      "benefitOverFeature":    { "score": 0, "evidence": "...", "note": "..." }
    },
    "neuromarketing": {
      "facesGaze":          { "facesPresent": false, "gazeDirection": "toward_cta|toward_camera|away|n/a", "evidence": "...", "note": "..." },
      "visualSaliency":     { "winnerElement": "what wins first fixation", "matchesIntent": false, "evidence": "...", "note": "..." },
      "patternInterrupt":   { "score": 0, "evidence": "...", "note": "..." },
      "visualHierarchy":    { "score": 0, "eyePathEndsCta": false, "evidence": "...", "note": "..." },
      "colorContrast":      { "score": 0, "mobileReadable": false, "evidence": "...", "note": "..." },
      "processingFluency":  { "score": 0, "evidence": "...", "note": "..." },
      "motionFirstSecond":  { "applicable": false, "score": 0, "note": "video only — skip if static" }
    },
    "behavioralPsychology": {
      "stimulusResponse":   { "score": 0, "evidence": "...", "note": "..." },
      "rewardSignaling":    { "score": 0, "evidence": "...", "note": "..." },
      "vonRestorff":        { "present": false, "evidence": "...", "note": "..." },
      "frictionEffortCues": { "score": 0, "evidence": "...", "note": "..." },
      "zeigarnikOpenLoops": { "applicable": false, "present": false, "evidence": "...", "note": "video/carousel only" },
      "closureAtCta":       { "score": 0, "evidence": "...", "note": "..." }
    }
  },

  "funnel": {
    "stage1_hook": {
      "label": "Hook",
      "primaryKpis": ["hook_rate", "thumb_stop_ratio", "video_3sec_views"],
      "actualMetrics": "Either quote the actual KPI values from data OR say 'KPI not in sync — add video_3_sec_watched_actions to Meta API call'",
      "status": "validates | on_par | broken | cannot_assess | predicted",
      "predictedLevel": "low | average | high | n/a",
      "leversFiring": ["names of levers from lens scan with score>=7 that drive THIS stage"],
      "leversWeak": ["names of levers from lens scan with score<=5 that drive THIS stage"],
      "rootCauseLever": "ONE lever if status=broken, else null",
      "insight": "One-sentence diagnosis or prediction. Cite specific element + KPI."
    },
    "stage2_hold": {
      "label": "Hold",
      "primaryKpis": ["hold_rate", "avg_watch_time", "p25_retention", "p50_retention", "p75_retention"],
      "actualMetrics": "same format",
      "status": "...",
      "predictedLevel": "...",
      "leversFiring": [],
      "leversWeak": [],
      "rootCauseLever": null,
      "insight": "..."
    },
    "stage3_ctr": {
      "label": "CTR",
      "primaryKpis": ["link_ctr", "outbound_ctr"],
      "actualMetrics": "Current sync has total CTR — note that link_ctr and outbound_ctr are MORE accurate but missing",
      "status": "...",
      "predictedLevel": "...",
      "leversFiring": [],
      "leversWeak": [],
      "rootCauseLever": null,
      "insight": "..."
    },
    "stage4_cvr": {
      "label": "CVR",
      "primaryKpis": ["cvr", "roas", "cpa", "purchase_actions"],
      "actualMetrics": "...",
      "status": "...",
      "predictedLevel": "...",
      "leversFiring": [],
      "leversWeak": [],
      "rootCauseLever": null,
      "insight": "..."
    },
    "stage5_fatigue": {
      "label": "Fatigue",
      "primaryKpis": ["frequency_vs_ctr_decay", "cpm_creep"],
      "actualMetrics": "Current sync has single frequency value but no time-series — note that proper Stage 5 diagnosis needs ctr/cpm/freq over time",
      "status": "...",
      "predictedLevel": "...",
      "leversFiring": [],
      "leversWeak": [],
      "rootCauseLever": null,
      "insight": "..."
    }
  },

  "diagnosis": {
    "primaryDriver": "What lever or stage is making this work — cite specific element",
    "primaryBlocker": "ONE blocker (lever + evidence), OR null if at ceiling",
    "verdict": "scale | optimize | pause | kill",
    "confidence": "high | medium | low"
  },

  "strengths": [
    "2-4 specific strengths. Each must cite a quoted element + which lens lever it represents. Format: 'ELEMENT IN CAPS: lens.lever — why it works for prop-firm conversion specifically.'"
  ],
  "risks": [
    "0-4 specific risks. Each must cite a missing/weak lever with quoted evidence. Empty array if no significant risks — DO NOT pad."
  ],

  "testsToRun": [
    {
      "hypothesis": "If we change X, then Y will improve because Z. Specific.",
      "lever": "which lens.lever this test targets (e.g., 'advertisingPrinciples.authority')",
      "stage": "which funnel stage it affects (stage1_hook | ... | stage5_fatigue)",
      "variant": "concrete change a designer could execute",
      "expectedDelta": "directional + magnitude — e.g., 'CTR +15-25%, neutral CPC'"
    }
  ],

  ──────────────────────────────────────────────────────────────
  ## LEGACY FIELDS (auto-populated for back-compat with current UI tabs — pull from the new structure above, don't add new insights here)

  "metricsStory": {
    "headline": "1-sentence narrative summary of the funnel diagnosis",
    "winners": ["metrics that validate, with values and which lever drives them"],
    "warnings": ["metrics that are broken or weak, with values"],
    "missing": ["array of KPIs flagged as 'cannot_assess' in the funnel — be specific about which Meta API fields to add"]
  },
  "creativeMetricLinks": [
    {
      "element": "quoted element",
      "metric": "the KPI it influences",
      "direction": "drives_up | drives_down | mixed | unclear",
      "reasoning": "tie element → lens.lever → stage → metric",
      "confidence": "high | medium | low"
    }
  ],
  "heuristics": {
    "hierarchy":          { "score": 0, "note": "pull from neuromarketing.visualHierarchy" },
    "focalPoint":         { "score": 0, "note": "pull from consumerPsychology.attentionFocalPoint" },
    "hookStrength":       { "score": 0, "note": "pull from neuromarketing.patternInterrupt + visualSaliency" },
    "messageClarity":     { "score": 0, "note": "pull from advertisingPrinciples.messageHierarchy" },
    "ctaProminence":      { "score": 0, "note": "pull from behavioralPsychology.stimulusResponse + closureAtCta" },
    "brandPresence":      { "score": 0, "note": "..." },
    "contrastLegibility": { "score": 0, "note": "pull from neuromarketing.colorContrast" },
    "emotionalPull":      { "score": 0, "note": "pull from consumerPsychology.emotionalVsRational" },
    "frictionPoints":     { "score": 0, "note": "pull from behavioralPsychology.frictionEffortCues" }
  },
  "predictedPerformance": {
    "ctr": "low | average | high",
    "cvr": "low | average | high",
    "reasoning": "synthesis tied to the funnel predictions"
  },

  "ctrAnalysis": "Pull from funnel.stage3_ctr",
  "cpcAnalysis": "comment tied to relevance/quality from levers",
  "frequencyAnalysis": "Pull from funnel.stage5_fatigue",
  "primaryBottleneck": "Same as diagnosis.primaryBlocker",

  "creativeType": "Literal format — e.g. 'split-screen mockup', 'flat receipt-style', 'product photography'",
  "dominantColors": "Name 2-3 specific colors + effect",
  "primaryMessage": "Quote/paraphrase the headline as it lands",
  "secondaryMessage": "Supporting copy",
  "ctaText": "Quote exact CTA + 1-line analysis",
  "trustElements": "ONLY trust signals present. If none: 'None present in this creative.'",
  "urgencyElements": "ONLY urgency triggers present.",
  "numbersShown": "Every specific number visible — quote each",
  "brandingElements": "How Hola Prime brand identity shows up",
  "keyVisualElements": "3-5 visual elements doing the most work",

  "performanceLabel": "TOP_PERFORMER | SOLID_PERFORMER | UNDERPERFORMER",
  "designQuality": "PROFESSIONAL | AVERAGE | POOR",
  "psychologyStrength": "STRONG | MODERATE | WEAK",
  "keyStrengths": "Same as strengths array but as \\\\n-separated string",
  "keyWeaknesses": "Same as risks array but as \\\\n-separated string",
  "whatWorks": "1-paragraph synthesis of strengths",
  "whatDoesntWork": "1-paragraph synthesis of risks (or 'Operating near ceiling.')",
  "keyInsight": "WHAT: [metric observation]. WHY: [lever-level reason]. SO WHAT: [strategic implication for next ad].",

  "recommendation1": "Map from testsToRun[0].hypothesis. Empty string if no tests.",
  "recommendation1Impact": "Map from testsToRun[0].expectedDelta",
  "recommendation1Effort": "LOW | MEDIUM | HIGH or empty",
  "recommendation2": "From testsToRun[1] or empty string",
  "recommendation2Impact": "",
  "recommendation2Effort": "",
  "recommendation3": "From testsToRun[2] or empty string",
  "recommendation3Impact": "",
  "recommendation3Effort": "",

  "keepElements": "Quote elements to preserve",
  "changeElements": "Quote elements to modify",
  "addElements": "Quote missing elements that would genuinely move performance",
  "hookOptions": "3 alternative headlines, ONE PER LINE separated by \\\\n. 8-15 words each. Anchored in numbers or concrete promise.",
  "ctaOptions": "3 alternative CTAs, ONE PER LINE separated by \\\\n. 2-5 words, action-verb led.",

  "verdictDecision": "SCALE | OPTIMIZE | PAUSE | KILL (from diagnosis.verdict)",
  "verdictConfidence": "HIGH | MEDIUM | LOW",
  "verdictSummary": "3-4 sentences. Lead with central concept. State verdict. Close with the ONE thing that would unlock the next tier (or 'Operating at ceiling').",

  "embeddingText": "One-paragraph summary capturing concept + verdict for vector search",
  "tags": ["3-6 specific tags from THIS ad's actual elements"],
  "searchableContent": "Concise plain-English description of what this ad actually is"
}`;
}

// ─── Model fallback chain ───
const ANALYZER_MODELS = [
    process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-haiku-4-5-20251001',
].filter((v, i, a) => a.indexOf(v) === i);

const ANALYZER_SYSTEM = `You are a senior creative strategist with 10+ years of experience in direct-response advertising, deeply specialized in the prop trading / funded-account category.

You analyze creatives through a 5-LENS × 5-FUNNEL framework:
- 5 LENSES identify which persuasion levers fire (consumer psych, behavioral econ, ad principles, neuromarketing, behavioral psych)
- 5 FUNNEL STAGES tie levers to outcome metrics (hook, hold, CTR, CVR, fatigue)

When performance data is present, you DIAGNOSE which lever broke at which stage. When metrics are missing, you predict the stage.

Non-negotiable principles:
1. EVIDENCE OR SILENCE — never make a claim without pointing to a specific element.
2. NO CHECKLIST OUTPUTS — never default to generic prop-firm playbook recommendations.
3. CONCEPT-FIRST — always name the central creative idea before judging.
4. LEVER → STAGE DISCIPLINE — use the routing table; don't claim levers drive the wrong stage.
5. HONEST ABSENCE — when a KPI isn't in the data, mark the stage 'cannot_assess'. Do not invent diagnoses from CTR alone.
6. VARIABLE-COUNT INSIGHTS — return only as many recommendations / risks as the ad genuinely warrants.

Respond with ONLY a raw JSON object matching the requested schema. No markdown, no code fences, no preamble. Every string value must be properly escaped. Do not truncate.`;

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

    let response = null;
    let lastError = null;
    for (const modelId of ANALYZER_MODELS) {
        try {
            console.log(`[Analyzer] Trying model: ${modelId} (pattern: ${hasMetrics(adData) ? 'visual_metrics' : 'visual_only'}, framework: 5-lens × 5-funnel)`);
            response = await client.messages.create({
                model: modelId,
                // Output can be 4-6k tokens with full 5-lens × 5-funnel schema, so bump
                // the cap to 16384 to avoid silent truncation that breaks JSON parsing.
                max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 16384,
                system: ANALYZER_SYSTEM,
                messages: [{ role: 'user', content }]
            });
            if (response.stop_reason === 'max_tokens') {
                console.warn(`[Analyzer] WARNING: ${modelId} response truncated at max_tokens — JSON may be invalid`);
            }
            console.log(`[Analyzer] ✓ Success with ${modelId} (${response.usage?.output_tokens || '?'} output tokens)`);
            break;
        } catch (err) {
            console.warn(`[Analyzer] Model ${modelId} failed:`, err.status, err.message);
            lastError = err;
            if (err.status === 401 || err.status === 403) throw err;
        }
    }

    if (!response) {
        throw lastError || new Error('All Anthropic models failed for analysis.');
    }

    const text = response.content[0].text;

    let jsonStr = text.trim();
    if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    try {
        const data = JSON.parse(jsonStr);

        // ─── Sanitize numeric fields ───
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

        // Normalize lens lever scores into numbers
        if (data.lenses && typeof data.lenses === 'object') {
            for (const lensName of Object.keys(data.lenses)) {
                const lens = data.lenses[lensName];
                if (lens && typeof lens === 'object') {
                    for (const leverName of Object.keys(lens)) {
                        const lever = lens[leverName];
                        if (lever && typeof lever === 'object' && 'score' in lever) {
                            lever.score = safeNum(lever.score);
                        }
                    }
                }
            }
        }

        // Normalize heuristics scores (legacy)
        if (data.heuristics && typeof data.heuristics === 'object') {
            for (const key of Object.keys(data.heuristics)) {
                if (data.heuristics[key] && typeof data.heuristics[key] === 'object') {
                    data.heuristics[key].score = safeNum(data.heuristics[key].score);
                }
            }
        }

        // ─── Ensure string fields exist ───
        const stringFields = [
            'adId', 'adName', 'adType', 'spend', 'ctr', 'cpc', 'cpm', 'roas',
            'pattern', 'platform', 'objective',
            'observation', 'centralConcept', 'designerTradeOffs',
            'ctrAnalysis', 'cpcAnalysis', 'frequencyAnalysis', 'primaryBottleneck',
            'creativeType', 'dominantColors', 'primaryMessage', 'secondaryMessage', 'ctaText',
            'trustElements', 'urgencyElements', 'numbersShown', 'brandingElements', 'keyVisualElements',
            'performanceLabel', 'designQuality', 'psychologyStrength',
            'whatWorks', 'whatDoesntWork', 'keyInsight', 'keyStrengths', 'keyWeaknesses',
            'recommendation1', 'recommendation1Impact', 'recommendation1Effort',
            'recommendation2', 'recommendation2Impact', 'recommendation2Effort',
            'recommendation3', 'recommendation3Impact', 'recommendation3Effort',
            'keepElements', 'changeElements', 'addElements', 'hookOptions', 'ctaOptions',
            'verdictDecision', 'verdictConfidence', 'verdictSummary',
            'embeddingText', 'searchableContent'
        ];
        stringFields.forEach(field => {
            if (data[field] === null || data[field] === undefined) {
                data[field] = '';
            } else if (Array.isArray(data[field])) {
                data[field] = data[field].join('\n');
            } else if (typeof data[field] !== 'string') {
                data[field] = String(data[field]);
            }
        });

        // Cross-populate legacy aliases for back-compat with existing UI
        if (!data.keyStrengths && data.whatWorks) data.keyStrengths = data.whatWorks;
        if (!data.whatWorks && data.keyStrengths) data.whatWorks = data.keyStrengths;
        if (!data.keyWeaknesses && data.whatDoesntWork) data.keyWeaknesses = data.whatDoesntWork;
        if (!data.whatDoesntWork && data.keyWeaknesses) data.whatDoesntWork = data.keyWeaknesses;

        if (Array.isArray(data.strengths) && data.strengths.length > 0 && !data.keyStrengths) {
            data.keyStrengths = data.strengths.join('\n');
            data.whatWorks = data.keyStrengths;
        }
        if (Array.isArray(data.risks) && data.risks.length > 0 && !data.keyWeaknesses) {
            data.keyWeaknesses = data.risks.join('\n');
            data.whatDoesntWork = data.keyWeaknesses;
        }

        return data;
    } catch (e) {
        console.error('[Analyzer] Failed to parse Claude JSON response:', e.message);
        console.error('[Analyzer] First 500 chars of response:', text?.substring(0, 500));
        return {
            error: 'JSON parse failed',
            rawResponse: text,
            adId: adData.adId
        };
    }
}
