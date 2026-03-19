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
Generate a high-converting Version 2 ad creative for Hola Prime's funded trading challenges — a direct, data-driven upgrade of the source creative(s) provided. Maximize CTR, CVR, and ROAS across Meta, TikTok, and Google Display.

## BRAND CONTEXT — HOLA PRIME
- Brand: Hola Prime (#WeAreTraders)
- Product: Funded trading challenges ($2K to $25K+)
- Key USPs: 1-step process, 5% profit target, no time limits, fast withdrawals (10 min), high payouts, no activation fees
- Disclaimer: HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON PERFORMANCE.
- Target: Aspiring traders & affiliates, 18–65, male-dominant, USA. Bold, confident, trader-focused, meme-literate tone.

## CRITICAL MISSION — THIS IS AN IMPROVEMENT TASK
You are creating a Version 2 of the source creative(s) shown above. The output MUST:
1. Be visually derived from the source creative(s) — preserve their color palette, layout structure, and brand aesthetic.
2. Fix every specific weakness listed in the analysis below.
3. Keep and amplify every proven winning element.
4. "Hola Prime" MUST appear in the copy.
5. Focus strictly on prop trading — no generic crypto content.

---

## CREATIVE ANALYSIS FRAMEWORK — YOUR STRATEGIC FOUNDATION
Every design, copy, and layout decision must be anchored to these 10 Core Creative Fundamentals. You must implicitly evaluate the source creative against these fundamentals before generating the Version 2 improvements.

**1. Strategic Clarity (Weight: High)**
Every creative must be rooted in a clear objective. What is the goal? Who is the audience? Can a viewer understand what to do or feel within 2 seconds?

**2. Information Hierarchy (Weight: High)**
The creative must have a clear visual "reading order" (Hook → Supporting Visual → Value Prop → CTA). The CTA must not visually compete with the headline.

**3. Single-Message Discipline (Weight: High)**
Communicate one core idea — not two, not three. Reduce the message to a single sentence. Multiple competing headlines dilute the message.

**4. Visual Contrast & Focal Point (Weight: Medium–High)**
Use contrast (color, size, weight, whitespace) to establish a clear focal point. The primary element must stand out instantly.

**5. Brand Consistency (Weight: Medium)**
Fonts, colors, tone, and imagery must align with the Hola Prime brand system. Bold redesigns must still feel native to the brand.

**6. Context & Platform Awareness (Weight: Medium–High)**
Design for where the ad will actually live (mobile-first). Dimensions, text-to-image ratios, and platform-specific rules must be respected.

**7. Copy–Visual Synergy (Weight: Medium)**
Copy and visual must complement, not repeat. The copy should add a layer of meaning the visual alone cannot convey.

**8. Whitespace & Breathing Room (Weight: Medium)**
Use adequate spacing around elements to feel premium, confident, and easy to process. Avoid overcrowding and "filler".

**9. Testability & Iteration Potential (Weight: Low–Medium)**
Diagnose specific weaknesses. Identify which variable is underperforming (hook, CTA, visual). Fix the weakest link first.

**10. Emotional Resonance (Weight: High)**
People remember how a creative made them feel. Trigger an emotional reaction — curiosity, desire, urgency, aspiration. Avoid feature-dumping without emotional stakes.

---

## 10 MANDATORY CONVERSION RULES — APPLY ALL TO VERSION 2

**RULE 1 — URGENCY & SCARCITY (NON-NEGOTIABLE):**
Every creative MUST include at least one urgency element. Use countdown timers ("Ends in 03:25:17"), "Only 47 Spots Left!", or "Ends [date]". This is the #1 conversion driver.

**RULE 2 — PRICE ANCHORING:**
Show the challenge size ($2K, $25K) as a LARGE, BOLD, prominent hero element — ideally 3D or oversized typography. The dollar amount IS the hero. Make it impossible to scroll past.

**RULE 3 — DISCOUNT PSYCHOLOGY:**
Always include a specific discount badge ("40% OFF", "TAKEOFF40", slashed prices). Creates immediate perceived value and a reason to act now.

**RULE 4 — LOW BARRIER MESSAGING:**
Use friction-reducing phrases: "Lowest Barrier Ever", "Your Easiest Path to Funded Trading", "No Activation Fee", "No Time Limits". Directly overcome the risk objection.

**RULE 5 — BULLET-POINT BENEFIT BLOCK:**
Include a clean rounded container with 3–4 concise bullets: "• 1-Step Process", "• 5% Profit Target", "• No Time Limits", "• Fast Payouts". Each bullet under 5 words. This outperforms paragraphs every time.

**RULE 6 — CTA DESIGN:**
Full-width, high-contrast CTA button with a commanding verb: "CLAIM YOUR $2K CHALLENGE NOW", "UNLOCK FUNDED ACCOUNT". Use: Claim, Start, Unlock, Get, Join — never passive language.

**RULE 7 — COLOR PSYCHOLOGY:**
Dark navy/black background. White bold text. Electric blue, neon green, or gold accents. Dark theme = trading professionalism and authority.

**RULE 8 — VISUAL MOTIFS:**
Use rockets (growth/momentum), 3D text effects on dollar amounts, gradient glows, subtle chart/grid patterns in background. These are thumb-stop visual hooks that signal trading context instantly.

**RULE 9 — SOCIAL PROOF:**
Include "Trusted by X+ traders", "#WeAreTraders" community hashtag, trader count badge, or trust seals. Credibility signals convert cold audiences.

**RULE 10 — MOBILE-FIRST:**
Design for vertical 9:16 or square 1:1. Text readable at small sizes. Top 30% of the creative MUST hook attention — lead with offer, discount badge, or countdown. Every creative must pass the 0.5-second thumb-stop test.

---

## SOURCE CREATIVE ANALYSIS (provided dynamically)

### ✅ What WORKS — KEEP & AMPLIFY:
${(patterns.whatWorks || []).map((w: string) => `• ${w}`).join('\n') || '• (No specific elements noted)'}

### ❌ What Does NOT Work — FIX in Version 2:
${(patterns.whatDoesntWork || []).map((w: string) => `• ${w}`).join('\n') || '• (No specific weaknesses noted)'}

### 📊 Score Targets (current → target 9+):
- Visual Design: ${patterns.scores?.averages?.scoreVisualDesign || 0}/10
- Typography: ${patterns.scores?.averages?.scoreTypography || 0}/10
- Color Usage: ${patterns.scores?.averages?.scoreColorUsage || 0}/10
- Composition: ${patterns.scores?.averages?.scoreComposition || 0}/10
- CTA Effectiveness: ${patterns.scores?.averages?.scoreCTA || 0}/10
- Emotional Appeal: ${patterns.scores?.averages?.scoreEmotionalAppeal || 0}/10
- Trust Signals: ${patterns.scores?.averages?.scoreTrustSignals || 0}/10
- Urgency/Scarcity: ${patterns.scores?.averages?.scoreUrgency || 0}/10

### 🧠 Psychology Triggers Active:
- Loss Aversion: ${patterns.psychology?.lossAversion?.used || 0}/${patterns.psychology?.lossAversion?.total || 0} creatives
- Scarcity: ${patterns.psychology?.scarcity?.used || 0}/${patterns.psychology?.scarcity?.total || 0} creatives
- Social Proof: ${patterns.psychology?.socialProof?.used || 0}/${patterns.psychology?.socialProof?.total || 0} creatives
- Anchoring: ${patterns.psychology?.anchoring?.used || 0}/${patterns.psychology?.anchoring?.total || 0} creatives

### 🎯 Optimization Directives:
- KEEP: ${(patterns.optimizationSynthesis?.keepElements || []).join(' | ') || 'Core visual style and brand identity'}
- FIX: ${(patterns.optimizationSynthesis?.changeElements || []).join(' | ') || 'Strengthen CTA clarity'}
- ADD: ${(patterns.optimizationSynthesis?.addElements || []).join(' | ') || 'Social proof and urgency elements'}
- Best Hook: ${(patterns.optimizationSynthesis?.hookOptions || [])[0] || 'Power hook from best performing source'}
- Best CTA: ${(patterns.optimizationSynthesis?.ctaOptions || [])[0] || 'Strong direct-response CTA'}

### 📈 Performance Baseline to Beat:
- Avg CTR: ${patterns.performance?.avgCtr || 0}% | Avg ROAS: ${patterns.performance?.avgRoas || 0}x

---

## USER OVERRIDES — HIGHEST PRIORITY 🔥
These MUST override all defaults and heavily influence the final output:
- Ad Type: ${adType}
- Target Audience: ${targetAudience}
${offer ? `- Specific Offer: ${offer}` : ''}
${tone ? `- Tone/Style Override: ${tone} — Apply this precisely to copy, rationale, and visual style.` : ''}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ''}
- Design Standard: Ultra-premium, professional design language. No cheap, spammy aesthetics. Sleek, sophisticated layouts that elevate perceived brand value.

---

## OUTPUT FORMAT
Return ONLY a raw JSON object. No markdown, no preamble, no explanation outside the JSON.

{
  "creativeConcept": {
    "title": "V2: [Core concept name e.g. 'Scarcity + Price Anchor + Trust']",
    "rationale": "Cite specific rules applied, weaknesses fixed, strengths amplified",
    "targetScore": "9.0+",
    "performanceTier": "ELITE | PREMIUM | STANDARD",
    "adType": "",
    "improvementSummary": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4"]
  },
  "visualDesign": {
    "layout": "Detailed layout — top 30% hooks attention per Rule 10",
    "dimensions": "1080x1080 or 1080x1920",
    "colorPalette": {
      "primary": "#hex — dark navy/black",
      "secondary": "#hex — electric blue or neon green",
      "accent": "#hex — gold or urgency red",
      "background": "#hex — dark trading feel",
      "text": "#fff"
    },
    "typography": {
      "headlineFont": "Bold heavy weight — dollar amount as hero (Rule 2)",
      "bodyFont": "Clean, readable at mobile sizes",
      "ctaFont": "Bold, full-width button",
      "hierarchy": "Hero dollar amount → Urgency element → Benefit bullets → CTA"
    },
    "keyVisualElements": [
      "Hero dollar amount in 3D/oversized (Rule 2)",
      "Countdown timer or spots-left badge (Rule 1)",
      "Discount/promo badge (Rule 3)",
      "3–4 bullet benefit block in rounded container (Rule 5)",
      "Full-width CTA button (Rule 6)",
      "Social proof badge / #WeAreTraders (Rule 9)",
      "Rocket or chart motif (Rule 8)",
      "Legal disclaimer at bottom"
    ],
    "brandingPlacement": "Hola Prime logo top-left, #WeAreTraders top-right — match source layout"
  },
  "copywriting": {
    "headline": {
      "primary": "Low barrier + price anchor (Rules 4+2)",
      "variations": ["FOMO variant (Rule 1)", "Value variant (Rule 3)"]
    },
    "body": {
      "primary": "Bullet points + trust element (Rules 5+9)",
      "variations": ["Scarcity-heavy", "Aspiration-heavy"]
    },
    "cta": {
      "primary": "CLAIM YOUR $[X]K CHALLENGE NOW",
      "variations": ["UNLOCK FUNDED ACCOUNT NOW", "START TRADING RISK-FREE"]
    },
    "hookText": "Scroll-stopping first line — must pass 0.5s thumb-stop test",
    "urgencyText": "Countdown timer OR spots left OR end date (Rule 1 — MANDATORY)",
    "trustText": "Trusted by X+ traders or #WeAreTraders (Rule 9)",
    "discountText": "40% OFF or promo code TAKEOFF40 (Rule 3)",
    "benefitBullets": ["• 1-Step Process", "• 5% Profit Target", "• No Time Limits", "• Fast Withdrawals"],
    "disclaimerText": "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON PERFORMANCE THROUGH HOLA PRIME ACCOUNTS."
  },
  "psychologyBlueprint": {
    "primaryTrigger": "Main behavioral trigger + implementation method",
    "secondaryTrigger": "Supporting trigger for dual-punch conversion",
    "aidaFlow": {
      "attention": "How top 30% hooks in 0.5s (Rules 10+2)",
      "interest": "How benefit bullets sustain interest (Rule 5)",
      "desire": "How price anchor + discount creates desire (Rules 2+3)",
      "action": "How full-width CTA drives the click (Rule 6)"
    },
    "emotionalJourney": "FOMO → Excitement at low barrier → Confidence from social proof → Urgency to act NOW"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word comprehensive prompt. Open by describing the source creative's visual DNA (colors, layout, style), then describe exactly how V2 improves it. Embed ALL 10 rules as mandatory visual elements: hero dollar amount in 3D, countdown timer, dark navy with electric blue accents, bullet block, CTA button, Hola Prime branding, discount badge, trust line, rocket/chart motif, legal disclaimer. Ultra-premium, professional aesthetic. No cheap or spammy elements. Must pass 0.5-second thumb-stop test.",
    "negative": "generic stock photos, white backgrounds, inconsistent style with source, cluttered without hierarchy, blurry, low quality, unrelated subjects",
    "styleReference": "Dark navy trading-professional creative matching source visual identity, bold typography hierarchy, high-contrast CTA",
    "technicalSpecs": {
      "aspectRatio": "1:1 or 9:16",
      "resolution": "1080x1080 or 1080x1920",
      "format": "PNG",
      "textOverlay": "YES"
    }
  },
  "metaAdSetup": {
    "campaignObjective": "CONVERSIONS | TRAFFIC | ENGAGEMENT",
    "adFormat": "Single Image | Carousel | Collection",
    "primaryText": "Feed copy — max 125 chars",
    "primaryTextVariations": ["Variation 2", "Variation 3"],
    "headline": "Link headline — max 40 chars",
    "headlineVariations": ["Variation 2", "Variation 3"],
    "description": "Link description — max 30 chars",
    "ctaButton": "LEARN_MORE | SIGN_UP | GET_OFFER | SHOP_NOW",
    "displayLink": "holaprime.com",
    "targetingNotes": "Audience targeting recommendations from winning patterns"
  },
  "testingPlan": {
    "variableToTest": "Single most impactful A/B variable",
    "controlVersion": "What A looks like",
    "testVersion": "What B changes",
    "hypothesis": "If we [change], then [metric] will improve because [reason]",
    "successMetric": "Primary KPI",
    "minimumBudget": "$X",
    "minimumDuration": "X days"
  },
  "expectedPerformance": {
    "estimatedCtr": "X–X% range",
    "estimatedCpc": "$X–$X range",
    "estimatedRoas": "Xx–Xx range",
    "confidenceLevel": "HIGH | MEDIUM | LOW",
    "rationale": "Tied to source creative benchmarks"
  },
  "patternsUsed": {
    "fromWhatWorks": ["Winning elements incorporated"],
    "weaknessesFixed": ["What doesn't work — addressed"],
    "psychologyAmplified": ["Triggers strengthened vs source"],
    "newElements": ["Net-new additions beyond source patterns"]
  }
}`;

  content.push({
    type: 'text',
    text: mainText
  });

  return [{ role: 'user', content }];
}
