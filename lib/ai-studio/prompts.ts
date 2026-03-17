/**
 * Creative Generation Prompt
 * Takes winning patterns from top creatives and generates
 * a new creative brief + ad copy + image generation prompt
 */

export function buildGenerationPrompt(patterns: any, options: any = {}) {
  const {
    adType = 'TRADING_CHALLENGE',
    targetAudience = 'Failed traders looking for a fair, transparent prop firm',
    offer = '',
    tone = '',
    additionalInstructions = '',
  } = options;

  const sourceCreativesList = (patterns.sourceCreatives || [])
    .map((c: any) => `  - [${c.verdictRating}] ${c.adName} (Score: ${c.compositeRating}, Type: ${c.adType})`)
    .join('\n');

  const thumbnailUrls = (patterns.sourceCreatives || [])
    .filter((c: any) => c.thumbnailUrl)
    .map((c: any) => c.thumbnailUrl);

  const content: any[] = [];

  // Include source creative images
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
  const mainText = `You are an elite Creative Strategist for Hola Prime, a prop trading firm. You have been given the WINNING CREATIVES (images above) and their extracted performance patterns. Your job is to synthesize these into a NEW creative that combines the best elements.

## BRAND CONTEXT — HOLA PRIME
- Prop trading firm: $25K-$200K challenge accounts, $50-$500 fees
- Up to 90% profit split, no time limits
- Affiliate program: up to 50% commission
- Target: Aspiring traders & affiliates, 18-65, male-dominant, USA
- Brand personality: Bold, confident, trader-focused, meme-literate

## SOURCE CREATIVES ANALYZED (${(patterns.sourceCreatives || []).length} winners)
${sourceCreativesList}

## WINNING PATTERNS EXTRACTED

### What Works (proven elements):
${(patterns.whatWorks || []).join('\n')}

### What Doesn't Work (avoid these):
${(patterns.whatDoesntWork || []).join('\n')}

### Score Averages (out of 10):
- Visual Design: ${patterns.scores?.averages?.scoreVisualDesign || 0}
- Typography: ${patterns.scores?.averages?.scoreTypography || 0}
- Color Usage: ${patterns.scores?.averages?.scoreColorUsage || 0}
- Composition: ${patterns.scores?.averages?.scoreComposition || 0}
- CTA Effectiveness: ${patterns.scores?.averages?.scoreCTA || 0}
- Emotional Appeal: ${patterns.scores?.averages?.scoreEmotionalAppeal || 0}
- Trust Signals: ${patterns.scores?.averages?.scoreTrustSignals || 0}
- Urgency/Scarcity: ${patterns.scores?.averages?.scoreUrgency || 0}

### Psychology Triggers Used:
- Loss Aversion: ${patterns.psychology?.lossAversion?.used || 0}/${patterns.psychology?.lossAversion?.total || 0} creatives
- Scarcity: ${patterns.psychology?.scarcity?.used || 0}/${patterns.psychology?.scarcity?.total || 0} creatives
- Social Proof: ${patterns.psychology?.socialProof?.used || 0}/${patterns.psychology?.socialProof?.total || 0} creatives
- Anchoring: ${patterns.psychology?.anchoring?.used || 0}/${patterns.psychology?.anchoring?.total || 0} creatives

### AIDA Averages:
- Attention: ${patterns.aida?.attention || 0}
- Interest: ${patterns.aida?.interest || 0}
- Desire: ${patterns.aida?.desire || 0}
- Action: ${patterns.aida?.action || 0}

### Visual Patterns:
- Creative Types Used: ${JSON.stringify(patterns.visual?.creativeTypes || {})}
- Dominant Colors: ${(patterns.visual?.dominantColors || []).join(' | ')}
- CTA Texts Used: ${(patterns.visual?.ctaTexts || []).join(' | ')}
- Primary Messages: ${(patterns.visual?.primaryMessages || []).join(' | ')}
- Branding Elements: ${(patterns.visual?.brandingElements || []).join(' | ')}

### Performance Benchmarks:
- Avg CTR: ${patterns.performance?.avgCtr || 0}%
- Avg CPC: $${patterns.performance?.avgCpc || 0}
- Avg ROAS: ${patterns.performance?.avgRoas || 0}x
- Avg CPP: $${patterns.performance?.avgCpp || 0}
- Total Purchases: ${patterns.performance?.totalPurchases || 0}
- Total Revenue: $${patterns.performance?.totalRevenue || 0}

### Optimization Synthesis:
- KEEP: ${(patterns.optimizationSynthesis?.keepElements || []).join(' | ')}
- CHANGE: ${(patterns.optimizationSynthesis?.changeElements || []).join(' | ')}
- ADD: ${(patterns.optimizationSynthesis?.addElements || []).join(' | ')}
- Hook Options: ${(patterns.optimizationSynthesis?.hookOptions || []).join(' | ')}
- CTA Options: ${(patterns.optimizationSynthesis?.ctaOptions || []).join(' | ')}

### Best Performer Insight:
${patterns.bestCreative?.keyInsight || 'N/A'}
${patterns.bestCreative?.verdictSummary || 'N/A'}

## GENERATION PARAMETERS
- Ad Type: ${adType}
- Target Audience: ${targetAudience}
${offer ? `- Specific Offer: ${offer}` : ''}
${tone ? `- Tone/Style Override: ${tone}` : ''}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ''}

---

## YOUR TASK

Based on the winning patterns above AND the source creative images provided, synthesize a COMPLETE new creative concept that is GUARANTEED to outperform the current average. 

### CONSTRAINTS:
1. **Biological DNA Cloning** — You must specifically identify and CLONE the highest-performing elements (color, tone, hook style) from the source images.
2. **Neural Pattern Matching** — Address the target audience's psychological state (as defined in the parameters) by leveraging the most successful triggers identified.
3. **Synthesis vs copying** — Do not just copy one ad. Merge the "Hooks" of the best, the "Visuals" of the top design, and the "Social Proof" of the most trusted.
4. **Output Format** — You MUST return ONLY a raw JSON object. No markdown blocks, no conversational text.

{
  "creativeConcept": {
    "title": "Short creative concept name",
    "rationale": "Why this specific combination of patterns will outperform - cite specific source data",
    "targetScore": "Expected composite rating (aim for 9.0+)",
    "adType": "${adType}"
  },

  "visualDesign": {
    "layout": "Detailed layout description - exact positioning of every element including logo and text overlays",
    "dimensions": "1080x1080 or 1080x1920",
    "colorPalette": {
      "primary": "#hex - usage",
      "secondary": "#hex - usage", 
      "accent": "#hex - usage",
      "background": "#hex or description",
      "text": "#hex"
    },
    "typography": {
      "headlineFont": "Font name, weight, size range",
      "bodyFont": "Font name, weight, size range",
      "ctaFont": "Font name, weight, size range",
      "hierarchy": "Describe the exact text size hierarchy"
    },
    "keyVisualElements": ["List every visual element with exact positioning"],
    "brandingPlacement": "Where logo, brand name, brand colors appear"
  },

  "copywriting": {
    "headline": {
      "primary": "Main headline text",
      "variations": ["2 alternative headlines for A/B testing"]
    },
    "body": {
      "primary": "Supporting body copy",
      "variations": ["2 alternative body copies"]
    },
    "cta": {
      "primary": "CTA button text",
      "variations": ["2 alternative CTAs"]
    },
    "hookText": "Scroll-stopping first line for feed",
    "urgencyText": "Urgency/scarcity element text",
    "trustText": "Trust/social proof element text",
    "disclaimerText": "Required legal disclaimer (positive framing)"
  },

  "psychologyBlueprint": {
    "primaryTrigger": "Main behavioral economics trigger and how it's implemented",
    "secondaryTrigger": "Supporting trigger",
    "aidaFlow": {
      "attention": "How the creative grabs attention in first 0.5s",
      "interest": "How it maintains interest for 1-3 seconds",
      "desire": "How it creates desire/aspiration",
      "action": "How it drives the click"
    },
    "emotionalJourney": "The emotional arc from first impression to click"
  },

  "imageGenerationPrompt": {
    "detailed": "COMPREHENSIVE image generation prompt (500+ words) describing every visual element, style, color, texture, positioning, mood, lighting. This should be directly usable with DALL-E, Midjourney, Ideogram, or any image AI. Include style references, aspect ratio, and technical details.",
    "negative": "What to NOT include in the image (common AI art mistakes to avoid)",
    "styleReference": "Describe the visual style by referencing the source creatives",
    "technicalSpecs": {
      "aspectRatio": "1:1 or 9:16",
      "resolution": "1080x1080 or 1080x1920",
      "format": "PNG with transparency if needed, or JPG",
      "textOverlay": "YES/NO - whether text should be added post-generation"
    }
  }
}`;

  content.push({
    type: 'text',
    text: mainText
  });

  return [{ role: 'user', content }];
}
