/**
 * Creative Generation Prompt
 * Takes winning patterns from top creatives and generates
 * an IMPROVED Version 2 of those creatives, guided by the analysis metrics.
 */

export function buildGenerationPrompt(patterns: any, options: any = {}) {
  const {
    adType = 'TRADING_CHALLENGE',
    prompt: rawPrompt = '',
    targetAudience: rawAudience = '',
    offer = '',
    tone = '',
    additionalInstructions = '',
  } = options;

  // Merge prompt + targetAudience — user types in 'prompt' field (Target Audience textarea)
  const targetAudience = rawPrompt || rawAudience || 'Aspiring traders & affiliates looking for a fair, transparent prop firm with high profit splits';

  const sourceCreativesList = (patterns.sourceCreatives || [])
    .map((c: any) => `  - [${c.verdictRating}] ${c.adName} (Score: ${c.compositeRating}, Type: ${c.adType})`)
    .join('\n');

  const thumbnailUrls = (patterns.sourceCreatives || [])
    .filter((c: any) => c.thumbnailUrl)
    .map((c: any) => c.thumbnailUrl);

  const content: any[] = [];

  // Include source creative images (Anthropic vision)
  for (const url of thumbnailUrls.slice(0, 5)) {
    content.push({
      type: 'image',
      source: { 
        type: 'url', 
        url: url 
      }
    });
  }

  // Build the main prompt text
  const mainText = `You are a world-class direct-response creative strategist who has generated $500M+ in revenue through paid social ads for fintech and prop trading firms.

## OBJECTIVE
Generate a high-converting ad creative for Hola Prime's funded trading challenges that maximizes CTR, conversion rate, and ROAS across Meta, TikTok, and Google Display.

## BRAND CONTEXT — HOLA PRIME
- Brand: Hola Prime (#WeAreTraders)
- Product: Funded trading challenges ($2K to $25K+)
- Key USPs: 1-step process, 5% profit target, no time limits, fast withdrawals (10 min), high payouts, no activation fees
- Disclaimer: SIME provides demo accounts with fictitious funds. Clients may earn monetary rewards based on performance.
- Target: Aspiring traders & affiliates, 18–65, male-dominant, USA. Bold, confident, trader-focused, meme-literate tone.

## CRITICAL — THIS IS AN IMPROVEMENT TASK
You are creating a **Version 2** of the source creative(s) shown above. The output MUST:
1. Be visually derived from the source creative(s) — preserve their color palette, layout structure, and brand aesthetic.
2. Fix the specific weaknesses listed in the analysis below.
3. Keep and amplify proven winning elements.
4. "Hola Prime" MUST appear in the copy.
5. Focus strictly on prop trading — no generic crypto content.

## SOURCE CREATIVES BEING IMPROVED (${(patterns.sourceCreatives || []).length} source creatives)
${sourceCreativesList}

## ANALYSIS FROM SOURCE CREATIVES

### ✅ What WORKS — KEEP & AMPLIFY:
${(patterns.whatWorks || []).map((w: string) => `• ${w}`).join('\n') || '• (No specific elements noted)'}

### ❌ What Does NOT Work — FIX in Version 2:
${(patterns.whatDoesntWork || []).map((w: string) => `• ${w}`).join('\n') || '• (No specific weaknesses noted)'}

### 📊 Score Analysis (current → target):
- Visual Design: ${patterns.scores?.averages?.scoreVisualDesign || 0}/10 → Target 9+
- Typography: ${patterns.scores?.averages?.scoreTypography || 0}/10 → Target 9+
- Color Usage: ${patterns.scores?.averages?.scoreColorUsage || 0}/10
- Composition: ${patterns.scores?.averages?.scoreComposition || 0}/10
- CTA Effectiveness: ${patterns.scores?.averages?.scoreCTA || 0}/10 → Target 9+
- Emotional Appeal: ${patterns.scores?.averages?.scoreEmotionalAppeal || 0}/10
- Trust Signals: ${patterns.scores?.averages?.scoreTrustSignals || 0}/10
- Urgency/Scarcity: ${patterns.scores?.averages?.scoreUrgency || 0}/10

### 🧠 Psychology Triggers (from source):
- Loss Aversion: ${patterns.psychology?.lossAversion?.used || 0}/${patterns.psychology?.lossAversion?.total || 0} creatives
- Scarcity: ${patterns.psychology?.scarcity?.used || 0}/${patterns.psychology?.scarcity?.total || 0} creatives
- Social Proof: ${patterns.psychology?.socialProof?.used || 0}/${patterns.psychology?.socialProof?.total || 0} creatives
- Anchoring: ${patterns.psychology?.anchoring?.used || 0}/${patterns.psychology?.anchoring?.total || 0} creatives

### 🎯 Specific Improvements:
- KEEP: ${(patterns.optimizationSynthesis?.keepElements || []).join(' | ') || 'Core visual style and brand identity'}
- CHANGE/FIX: ${(patterns.optimizationSynthesis?.changeElements || []).join(' | ') || 'Strengthen CTA clarity'}
- ADD to V2: ${(patterns.optimizationSynthesis?.addElements || []).join(' | ') || 'Social proof and urgency elements'}
- Best Hook: ${(patterns.optimizationSynthesis?.hookOptions || [])[0] || 'Power hook from best performing source'}
- Best CTA: ${(patterns.optimizationSynthesis?.ctaOptions || [])[0] || 'Strong direct-response CTA'}

### 💡 Best Performer Insight:
${patterns.bestCreative?.keyInsight || 'N/A'}
${patterns.bestCreative?.verdictSummary || 'N/A'}

### 🎨 Visual DNA from Source:
- Creative Types: ${JSON.stringify(patterns.visual?.creativeTypes || {})}
- Dominant Colors: ${(patterns.visual?.dominantColors || []).join(' | ')}
- CTA Texts Used: ${(patterns.visual?.ctaTexts || []).join(' | ')}
- Primary Messages: ${(patterns.visual?.primaryMessages || []).join(' | ')}

### 📈 Performance Baseline:
- Avg CTR: ${patterns.performance?.avgCtr || 0}% → Beat this
- Avg ROAS: ${patterns.performance?.avgRoas || 0}x

## GENERATION PARAMETERS
- Ad Type: ${adType}
- Target Audience: ${targetAudience}
${offer ? `- Specific Offer: ${offer}` : ''}
${tone ? `- Tone/Style Override: ${tone}` : ''}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ''}

---

## 10 PROVEN CONVERSION RULES — APPLY ALL OF THESE TO VERSION 2

**RULE 1 — URGENCY & SCARCITY (MANDATORY):**
Every creative MUST include at least ONE urgency element. Use: countdown timers ("Ends in 03:25:17"), "Only 47 Spots Left!", "Ends [date]", "Limited Time Deal". This is the #1 conversion driver.

**RULE 2 — PRICE ANCHORING:**
Show the challenge size ($2K, $25K) as a LARGE, BOLD, prominent hero visual element — ideally 3D or oversized typography. The dollar amount IS the hero. Make it impossible to scroll past.

**RULE 3 — DISCOUNT PSYCHOLOGY:**
Include a specific discount badge ("40% OFF", "TAKEOFF40", slashed prices). Always include a specific percentage or promo code. Creates immediate perceived value.

**RULE 4 — LOW BARRIER MESSAGING:**
Use friction-reducing phrases: "Lowest Barrier Ever", "Your Easiest Path to Funded Trading", "Start trading today, risk-free!", "No Activation Fee", "No Time Limits". Overcome the risk objection.

**RULE 5 — BULLET-POINT BENEFIT BLOCK:**
Include a clean rounded container with 3–4 concise bullet points: "• 1-Step Process", "• 5% Profit Target", "• No Time Limits", "• Fast Payouts". Each bullet under 5 words. This outperforms paragraphs.

**RULE 6 — CTA DESIGN:**
Full-width, high-contrast CTA button with commanding verb: "CLAIM YOUR $2K CHALLENGE NOW", "CLAIM 40% OFF NOW", "UNLOCK FUNDED ACCOUNT". Use: Claim, Start, Unlock, Get, Join.

**RULE 7 — COLOR PSYCHOLOGY:**
Dark navy/black background. White bold text. Electric blue, neon green, or gold accents. Dark theme = trading professionalism and sophistication.

**RULE 8 — VISUAL MOTIFS:**
Use: rockets (growth/momentum), 3D text effects on dollar amounts, gradient glows, subtle chart/grid patterns in background to reinforce trading context. These are thumb-stop visual hooks.

**RULE 9 — SOCIAL PROOF:**
Include: "Trusted by X+ traders", "#WeAreTraders" community hashtag, trader count badge, trust seals. Credibility signals are high-converting.

**RULE 10 — MOBILE-FIRST:**
Design for vertical 9:16 or square 1:1. Text readable at small sizes. Top 30% of creative MUST hook attention — lead with offer, discount badge, or countdown. Pass the 0.5-second thumb-stop test.

---

## YOUR TASK

Generate a **Version 2 Improved Creative Brief** that is a direct, data-driven upgrade of the source creative(s). Apply ALL 10 rules above. Every decision must be tied to the analysis data.

### STRICT OUTPUT RULES:
1. No markdown fences — return ONLY a raw JSON object
2. \`imageGenerationPrompt.detailed\` MUST describe a visually improved version of the source creative — reference its specific visual elements, colors, layout
3. Apply ALL 10 conversion rules to the image prompt
4. The output must pass the "0.5-second thumb-stop test"

{
  "creativeConcept": {
    "title": "Short concept name (e.g. 'V2: Scarcity + Price Anchor + Trust')",
    "rationale": "Specific explanation citing which of the 10 rules were applied, which weaknesses were fixed, and which strengths amplified",
    "targetScore": "Expected composite rating (aim for 9.0+)",
    "performanceTier": "Expected tier (ELITE, PREMIUM, or STANDARD)",
    "adType": "${adType}",
    "improvementSummary": "3-4 bullet points listing specific improvements made vs. source"
  },

  "visualDesign": {
    "layout": "Detailed layout description — how it builds on the source creative's layout while applying mobile-first Rule 10: top 30% hooks attention with discount/offer/countdown",
    "dimensions": "1080x1080 or 1080x1920",
    "colorPalette": {
      "primary": "#hex — dark navy/black (Rule 7)",
      "secondary": "#hex — electric blue or neon green accent",
      "accent": "#hex — gold for premium or red for urgency",
      "background": "#hex — dark trading-professional feel",
      "text": "#fff"
    },
    "typography": {
      "headlineFont": "Bold, heavy weight — Rule 2: dollar amount must be hero size",
      "bodyFont": "Clean, readable at small mobile sizes",
      "ctaFont": "Bold, full-width button font",
      "hierarchy": "Hero: challenge amount in 3D/oversized → Sub: urgency element → Body: benefit bullets → CTA"
    },
    "keyVisualElements": [
      "Hero dollar amount display (Rule 2: price anchoring)",
      "Urgency countdown or spots-left badge (Rule 1)",
      "Discount/promo code badge (Rule 3)",
      "3-4 bullet point benefit block (Rule 5)",
      "Full-width CTA button (Rule 6)",
      "Social proof badge / #WeAreTraders (Rule 9)",
      "Trading visual motif — rocket/chart/grid (Rule 8)",
      "Legal disclaimer in small text at bottom"
    ],
    "brandingPlacement": "Hola Prime logo top-left, #WeAreTraders top-right — matching source layout"
  },

  "copywriting": {
    "headline": {
      "primary": "Main headline applying Rule 4 (low barrier) + Rule 2 (price anchor)",
      "variations": ["FOMO variant (Rule 1)", "Value variant (Rule 3)"]
    },
    "body": {
      "primary": "Supporting copy — bullet points (Rule 5) + trust element (Rule 9)",
      "variations": ["Scarcity-heavy variant", "Aspiration-heavy variant"]
    },
    "cta": {
      "primary": "CLAIM YOUR $[X]K CHALLENGE NOW (Rule 6 — commanding verb)",
      "variations": ["UNLOCK FUNDED ACCOUNT NOW", "START TRADING RISK-FREE"]
    },
    "hookText": "Scroll-stopping first line — USE THE HOOK FROM HOOK OPTIONS ABOVE. Must pass 0.5s thumb-stop test",
    "urgencyText": "Specific urgency mechanic: countdown timer OR spots left OR end date (Rule 1 — MANDATORY)",
    "trustText": "Social proof element: 'Trusted by X+ traders' or '#WeAreTraders' (Rule 9)",
    "discountText": "Discount badge: '40% OFF' or promo code 'TAKEOFF40' (Rule 3)",
    "benefitBullets": ["• 1-Step Process", "• 5% Profit Target", "• No Time Limits", "• Fast Withdrawals"],
    "disclaimerText": "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON PERFORMANCE THROUGH HOLA PRIME ACCOUNTS."
  },

  "psychologyBlueprint": {
    "primaryTrigger": "Main behavioral trigger (scarcity / loss aversion / anchoring / social proof)",
    "secondaryTrigger": "Supporting trigger for dual-punch conversion",
    "aidaFlow": {
      "attention": "How top 30% of creative hooks in 0.5s (Rule 10 + Rule 2)",
      "interest": "How benefit bullets sustain interest (Rule 5)",
      "desire": "How price anchor + discount creates desire (Rules 2+3)",
      "action": "How full-width CTA drives the click (Rule 6)"
    },
    "emotionalJourney": "Fear of missing out → Excitement at low barrier → Confidence from social proof → Urgency to act NOW"
  },

  "imageGenerationPrompt": {
    "detailed": "COMPREHENSIVE image generation prompt (600+ words). Start by describing the source creative's visual style, then explain how V2 improves it. MANDATORY elements to include in the image: (1) LARGE BOLD dollar amount '$2K' or '$25K' as hero — 3D text effect, impossible to miss (Rule 2). (2) Countdown timer or 'Only X Spots Left!' urgency badge (Rule 1). (3) Dark navy/black background with electric blue accents and subtle grid/chart pattern (Rules 7+8). (4) Rounded white container with 3 bullet checkmarks: '1-Step Process', '5% Profit Target', 'No Time Limits' (Rule 5). (5) Large gradient CTA button with 'CLAIM YOUR $2K CHALLENGE NOW' text (Rule 6). (6) Hola Prime logo top-left, '#WeAreTraders' top-right (Rule 9). (7) Discount badge '40% OFF' or promo code (Rule 3). (8) 'Start trading today, risk-free!' trust line (Rule 4). (9) Rocket or upward chart motif as background element (Rule 8). (10) Small legal disclaimer text at bottom. VISUAL STYLE: Reference the source creative's exact color palette, layout, and composition — this is an IMPROVED VERSION not a replacement. Professional trading brand aesthetic, premium dark theme, high contrast, thumb-stop worthy.",
    "negative": "generic stock photos, unrelated subjects, inconsistent style with source, multiple styles, low quality, blurry, cluttered without clear hierarchy, bright white background",
    "styleReference": "Dark navy trading professional creative matching source visual identity, with bold typography hierarchy and high-contrast CTA",
    "technicalSpecs": {
      "aspectRatio": "1:1 or 9:16",
      "resolution": "1080x1080 or 1080x1920",
      "format": "PNG",
      "textOverlay": "YES"
    }
  }
}`;

  content.push({
    type: 'text',
    text: mainText
  });

  return [{ role: 'user', content }];
}
