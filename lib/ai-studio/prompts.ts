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
    _memoryContext = '',
    _competitorContext = '',
    _preferenceContext = '',
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
4. Focus strictly on prop trading — no generic crypto content.
5. NEVER ask the image generator to draw the "Hola Prime" logo or wordmark. The real logo is added as a PNG overlay later.

---

## USER INSTRUCTIONS / REQUIREMENTS
User Prompt: "${targetAudience}"
${additionalInstructions ? `Additional Instructions: "${additionalInstructions}"` : ''}
${tone ? `Tone: "${tone}"` : ''}
You MUST strictly incorporate these requirements into your V2 generation. If the user asks for a specific text, layout, color, or modification, prioritize it above all else.

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

## DISCIPLINE PRINCIPLE — MOST IMPORTANT RULE
DO NOT add elements that are not present in the source creative or explicitly requested by the user. If the source creative has a split-screen comparison layout, the V2 should have a split-screen comparison layout. If the source has 3 bullet points, V2 should have exactly 3 bullet points — not 6. If the source doesn't have a countdown timer, don't add one unless the analysis specifically says "add urgency element."

Your job is to UPGRADE the existing creative, not to stuff it with every possible conversion element. A focused, clean creative with 4-5 strong elements will always outperform a cluttered one with 10 mediocre elements competing for attention.

## PROP FIRM CREATIVE AUTHENTICITY
Hola Prime operates in the funded trading / prop firm space. The creative MUST feel native to this world:
- Language: Use terms traders actually use — "funded account", "challenge", "profit target", "drawdown", "payout", "profit split", "prop firm". Never generic marketing language like "unlock your potential" or "join now."
- Imagery: Trading terminals with green/red candles, multiple monitor setups, MT4/MT5 charts, real trading environments. Never generic business stock photos, random people in suits, or unrelated lifestyle imagery.
- Competitor awareness: Traders compare prop firms on: evaluation rules, profit splits, payout speed, drawdown limits, challenge fees. The creative should speak to these specific concerns.
- Tone: Confident but not scammy. Traders are skeptical — they've seen dozens of prop firm ads. Credibility > hype.
- Numbers must be ACCURATE: If the source creative shows "$38 Challenge" or "$25K", use those exact numbers. Don't invent new price points.

## CONVERSION TOOLKIT — SELECT WHAT FITS (DO NOT USE ALL)
These are available techniques. Use ONLY the ones that are already present in the source creative OR that fix a specific weakness identified in the analysis. Using all of them creates clutter.

1. **URGENCY** — Countdown timer or "Only X Spots Left". Use only if source has urgency or analysis says "add urgency."
2. **PRICE ANCHORING** — Hero dollar amount as large focal point. Use if source features a price prominently.
3. **DISCOUNT** — "40% OFF" or promo code. Use only if source already has a discount element.
4. **LOW BARRIER** — "No Activation Fee", "Risk-Free". Use if overcoming risk objection is the source's strategy.
5. **BULLET BENEFITS** — Benefits can be presented in ANY clean format (bullets, badges, icons, inline text, data rows). Keep the EXACT same content — do not duplicate or add extra ones.
6. **CTA** — Must be clearly visible but can be ANY shape, size, or position that works with the composition. Does NOT have to be a full-width button.
7. **DARK THEME** — Dark background, white text, blue accents. Match the source's color scheme.
8. **SOCIAL PROOF** — Trust badge or trader count. Use only if source has social proof.
9. **MOBILE-FIRST** — Top 30% hooks instantly. Always apply.

## LAYOUT FREEDOM — CRITICAL
The layout should serve the CREATIVE CONCEPT. Do NOT force every creative into the same template.
- An editorial layout will look NOTHING like a data-native layout.
- A cinematic layout will look NOTHING like a minimal layout.
- There is NO mandatory "3-zone structure" — innovative layouts are ENCOURAGED.
- The only non-negotiable elements are: (1) correct text content, (2) correct spelling, (3) brand color palette, (4) premium quality feel.
- AVOID producing the same dark-background + big-centered-number + bullets-below + CTA-button formula every time.

---

## GRAPHIC DESIGN MASTERY — MANDATORY RULES
These rules enforce world-class design quality. Every creative must comply.

### Typography System
- Type Scale: Use a modular scale (1.25 ratio). Hero text 48-72pt equivalent, subhead 24-36pt, body 14-18pt, caption 10-12pt.
- Font Pairing: Maximum 2 font families. One display/headline font (bold, heavy weight), one body font (clean, readable).
- Line Height: Headlines 1.1-1.2, body text 1.4-1.6. Never allow text to feel cramped.
- Letter Spacing: Headlines use tight tracking (-0.02em). Body text uses normal or slightly expanded tracking.
- Weight Contrast: Hero text must be at least 3x the visual weight of body text through size, weight, or both.

### Grid System
- 8px Grid: All spacing values must be multiples of 8 (8, 16, 24, 32, 48, 64, 96).
- Margins: Minimum 32px (4 grid units) on all edges. Nothing touches the frame boundary.
- Columns: Use a 4-column or 6-column invisible grid for element alignment.
- Gutters: 16px minimum between adjacent elements.
- Alignment: Every element must snap to the grid. No randomly floating or misaligned pieces.

### Color Theory Enforcement
- Maximum 3-4 colors total (primary, secondary, accent, neutral).
- Color Relationships: Choose ONE: complementary (opposite on wheel), analogous (adjacent), triadic (120° apart), or split-complementary.
- Contrast Ratio: Text on background must maintain WCAG AA ratio (4.5:1 for body, 3:1 for large text).
- 60-30-10 Rule: 60% dominant color, 30% secondary, 10% accent. Never equal distribution.
- Color Psychology: Red/Orange = urgency. Blue/Teal = trust. Gold = premium. Green = success. Use intentionally.

### Visual Hierarchy & Balance
- ONE focal point commanding 30-40% of visual attention. Everything else supports it.
- Reading Flow: Z-pattern, F-pattern, L-shaped, diagonal, or any deliberate scan path that fits the concept. Choose the pattern that serves the creative paradigm.
- Symmetry: Choose formal (centered), informal (rule of thirds), asymmetric, or deliberately broken balance. Different concepts demand different balance approaches.
- Whitespace: At least 20% of the canvas should be breathing room — but this can be concentrated (editorial) or distributed (grid). Whitespace = premium.

### Imagery & Form
- Use vector-style graphics, clean illustrations, or high-quality photographic elements.
- Shapes: Use consistent shape language (all rounded OR all sharp, not mixed).
- Texture: Subtle gradients or noise for depth. Never flat + busy simultaneously.

---

## BEHAVIORAL SCIENCE FRAMEWORK — APPLY TO EVERY CREATIVE DECISION
Your creative brief must be grounded in these psychological principles. For each element in the brief, identify WHICH principle it exploits and HOW it maps to visual design.

### Consumer Psychology
- **Processing Fluency**: Simpler layouts feel more trustworthy. Reduce cognitive load — fewer elements, clearer hierarchy, more whitespace. If a viewer has to "work" to understand the ad, they'll scroll past it.
- **Von Restorff Effect (Isolation)**: One element that is dramatically DIFFERENT from everything else will be remembered. Make the hero element (price, visual) visually isolated — different size, color, or treatment than everything around it.
- **Serial Position Effect**: People remember the FIRST and LAST things they see. Put your strongest hook in the top 20% and your CTA in the bottom 20%. Everything in the middle supports but doesn't compete.

### Behavioral Economics (Kahneman, Tversky, Thaler)
- **Loss Aversion**: Losses are felt ~2x more intensely than equivalent gains. "Don't miss this" > "Get this." Frame the offer around what the viewer LOSES by not acting.
- **Anchoring Bias**: The first number shown sets the reference point. Show a HIGH anchor (original price) before the actual price. The actual price then feels like a steal regardless of its absolute value.
- **Scarcity Heuristic**: Limited availability = higher perceived value. "Only 23 spots left" triggers urgency that rational argument cannot.
- **Endowment Effect**: People value what they feel they already own. Use "YOUR challenge" not "A challenge." Possessive language creates psychological ownership before purchase.
- **Default Effect**: Make the desired action feel like the obvious, easy default. The CTA should feel like the natural next step, not a decision.

### Neuro-Marketing (Visual Neuroscience)
- **Eye-Tracking Patterns**: F-pattern (text-heavy), Z-pattern (visual-heavy), Gutenberg diagram (balanced). Choose based on content type and design the hierarchy to match how eyes naturally scan.
- **Color-Emotion Mapping**: Red/Orange → urgency, danger, excitement (amygdala). Blue/Teal → trust, calm, stability (prefrontal cortex). Gold → premium, reward, achievement (nucleus accumbens). Green → success, growth, safety. Use color INTENTIONALLY to trigger specific neural responses.
- **Contrast-Driven Attention**: The visual cortex responds to CONTRAST, not beauty. High contrast between elements = instant attention. Low contrast = elements blend and get ignored.
- **Facial Processing**: The fusiform face area processes faces 170ms faster than any other visual element. If using faces, the emotional expression DIRECTLY transfers to the viewer (mirror neurons). Confident face = viewer feels confident. Stressed face = viewer feels the pain point.

### Psychological Principles in Advertising (Cialdini, Festinger)
- **Social Proof**: "100K+ traders" is more persuasive than any feature list. Numbers, community signals, and crowd indicators bypass rational evaluation.
- **Authority**: Trust badges, brand marks, and institutional aesthetics signal credibility. Premium design quality = subconscious authority signal.
- **Cognitive Dissonance**: When premium aesthetics meet low prices, the brain resolves the conflict as "incredible deal." Design luxury → price accessibility = conversion.
- **Reciprocity**: Giving value upfront ("No Activation Fee", "Risk-Free") creates psychological obligation to reciprocate (by signing up).
- **Commitment & Consistency**: Small initial commitment ("just $38") aligns with the trader's self-image → leads to larger commitments later.

### In Your imageGenerationPrompt
When writing the image prompt, EXPLICITLY describe how these psychological principles map to visual elements:
- Which element exploits loss aversion and how?
- What creates the anchor and where is it placed?
- How does the color palette trigger the intended emotional sequence?
- What eye-tracking pattern does the layout follow?
- Where is the Von Restorff isolation element?

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
- RECOMMENDATIONS TO APPLY: ${(patterns.optimizationSynthesis?.recommendations || []).map((r: string) => `• ${r}`).join('\n  ') || '• (Apply general best practices)'}
- Best Hook: ${(patterns.optimizationSynthesis?.hookOptions || [])[0] || 'Power hook from best performing source'}
- Best CTA: ${(patterns.optimizationSynthesis?.ctaOptions || [])[0] || 'Strong direct-response CTA'}

### 📈 Performance Baseline to Beat:
- Avg CTR: ${patterns.performance?.avgCtr || 0}% | Avg ROAS: ${patterns.performance?.avgRoas || 0}x
${_memoryContext}${_competitorContext}${_preferenceContext}
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

## MANDATORY QUALITY STANDARD — NON-NEGOTIABLE
This creative MUST achieve a 9+ score across ALL quality dimensions when evaluated by a professional design auditor:
- TEXT ACCURACY 9+: Every word spelled correctly, zero duplicates, all text fully visible
- LAYOUT QUALITY 9+: Premium spacing, clear visual hierarchy, nothing cramped or cut off
- TYPOGRAPHY 9+: Strong size contrast between hero and body text (minimum 3:1 ratio), max 2 font styles
- COLOR HARMONY 9+: Cohesive palette, professional dark fintech aesthetic, 60-30-10 color distribution
- BRAND COMPLIANCE 9+: Unmistakably Hola Prime — dark background, white text, accent glow, premium feel
- PSYCHOLOGY 9+: Clear emotional trigger that makes a trader feel urgency, aspiration, or trust
- INNOVATION 8+: Composition that doesn't look like every other prop firm ad — some distinguishing visual choice

Failing any of these dimensions is NOT acceptable. The image generation prompt you produce must be specific enough that a diffusion model will produce a 9+ result.

---

## OUTPUT FORMAT
Return ONLY a raw JSON object. No markdown, no preamble, no explanation outside the JSON.

{
  "creativeConcept": {
    "title": "V2: [Core concept name e.g. 'Scarcity + Price Anchor + Trust']",
    "rationale": "Cite specific rules applied, weaknesses fixed, strengths amplified",
    "targetScore": "9.5+",
    "performanceTier": "ELITE",
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
      "headlineFont": "Font choice that serves the creative concept",
      "bodyFont": "Clean, readable at mobile sizes",
      "ctaFont": "CTA styling that fits the composition — can be button, text link, badge, or integrated element",
      "hierarchy": "Describe the specific typographic hierarchy for THIS concept"
    },
    "keyVisualElements": [
      "List ONLY elements that serve THIS specific creative concept",
      "Each element should have a clear role in the composition",
      "Do NOT include elements just because they're 'standard' — include only what makes this concept powerful",
      "Legal disclaimer at bottom"
    ],
    "brandingPlacement": "#WeAreTraders pill top-right only. Do NOT include Hola Prime, HolaPrime, or any logo in the image generation prompt. The real logo PNG is composited programmatically on top of the image later. Instruct the image generator to leave the top-left corner absolutely blank/dark so the logo can be placed there.",
    "conceptParadigm": "Name the visual paradigm this concept follows (e.g., Editorial, Cinematic, Data-Native, Poster, Comparison, Storytelling, Minimal, Collage)"
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
    "attentionGrabber": "Scroll-stopping first line — must pass 0.5s thumb-stop test",
    "urgencyText": "Countdown timer OR spots left OR end date",
    "trustText": "Trusted by X+ traders or #WeAreTraders",
    "discountText": "40% OFF or promo code TAKEOFF40",
    "benefitBullets": ["• 1-Step Process", "• 5% Profit Target", "• No Time Limits", "• Fast Withdrawals"],
    "disclaimerText": "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON PERFORMANCE THROUGH HOLA PRIME ACCOUNTS."
  },
  "psychologyBlueprint": {
    "primaryTrigger": {
      "principle": "Name the specific principle (e.g., Loss Aversion, Anchoring Bias, Social Proof)",
      "implementation": "How it's applied in THIS creative — cite the specific element",
      "visualMapping": "How this principle maps to a visual design decision (color, size, position, contrast)"
    },
    "secondaryTrigger": {
      "principle": "Supporting principle for dual-punch conversion",
      "implementation": "How it reinforces the primary trigger",
      "visualMapping": "Visual implementation"
    },
    "neuroDesign": {
      "eyeTrackingPattern": "F-pattern | Z-pattern | Gutenberg — explain why this pattern fits this layout",
      "colorPsychology": "Map each color used to its neurological effect (e.g., 'Red urgency badge → amygdala activation → cortisol → impulse to act')",
      "contrastStrategy": "Where is the highest visual contrast and what does it draw attention to?",
      "vonRestorffElement": "Which single element is visually isolated/different from everything else? Why?"
    },
    "aidaFlow": {
      "attention": "What triggers attention in the first 0.5 seconds? Which brain region does it activate?",
      "interest": "How does the creative sustain interest past the initial hook?",
      "desire": "What creates want? Map to specific behavioral economics principle.",
      "action": "How does the CTA leverage the psychological momentum built above?"
    },
    "emotionalJourney": "Map the SEQUENCE of emotions from first glance to click — e.g., 'Curiosity (hook) → Fear of loss (scarcity) → Relief (solution) → Confidence (social proof) → Urgency (CTA)'"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word prompt describing the EXACT visual output. CRITICAL RULES: (1) Do NOT add translucent circles, iridescent spheres, orbs, bubbles, or glowing circular background decorations UNLESS the user explicitly requested 'brand DNA'. (2) Do NOT default to the same layout every time. (3) TEXT STRICTNESS: Never duplicate prices or numbers. If a price is $38, it MUST appear exactly once as the primary focal point. Do not generate conflicting partial numbers (like $8 and $38) in the same image. (4) EXACT TEXT CONTENT: List every text string that appears, spelled correctly. 'Withdrawals' 'Challenge' 'Limits' 'Performance'.",
    "negative": "generic stock photos, cluttered layouts, duplicate text, garbled text, misspelled words, random lifestyle imagery, too many competing elements, translucent circles or iridescent spheres unless brand DNA was explicitly requested, ANY drawn logo, Hola Prime text, prime logo, hola wordmark in top-left, top-left logo",
    "styleReference": "Match source creative's visual identity. Prop firm professional aesthetic.",
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
