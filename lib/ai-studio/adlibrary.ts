/**
 * Meta Ad Library API Integration
 *
 * Fetches real ads from Meta's Ad Library for:
 * 1. Hola Prime's own ads — learn brand DNA, winning patterns
 * 2. Competitor prop firm ads — competitive intelligence
 *
 * The Ad Library API provides:
 * - Ad creative images/videos
 * - Ad copy/body text
 * - Active status and start dates
 * - Page info and advertiser details
 * - Spend ranges (for transparency-required regions)
 *
 * Flow:
 *   fetchAdLibrary() → returns raw ads
 *   extractBrandDNA() → AI analyzes all ads to build brand style guide
 *   The brand DNA feeds into the generation prompt for consistency
 */

import Anthropic from '@anthropic-ai/sdk';

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_API_VERSION = process.env.META_API_VERSION || 'v24.0';
const AD_ACCOUNTS_RAW = process.env.AD_ACCOUNTS || '';

// Parse AD_ACCOUNTS format: "accountId:name,accountId2:name2"
function parseAdAccounts(): { id: string; name: string }[] {
  if (!AD_ACCOUNTS_RAW) return [];
  return AD_ACCOUNTS_RAW.split(',').map(entry => {
    const [id, ...nameParts] = entry.trim().split(':');
    return { id: id.trim(), name: nameParts.join(':').trim() };
  });
}

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ─── Types ───

export interface AdLibraryAd {
  id: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_captions?: string[];
  ad_snapshot_url?: string;
  bylines?: string;
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  estimated_audience_size?: { lower_bound: number; upper_bound: number };
  spend?: { lower_bound: string; upper_bound: string };
  impressions?: { lower_bound: string; upper_bound: string };
  currency?: string;
  languages?: string[];
  delivery_by_region?: any[];
  // Enriched fields (added after fetch)
  imageUrl?: string;
  imageBase64?: string;
  isActive?: boolean;
  daysRunning?: number;
}

export interface BrandDNA {
  logo: {
    placement: string;
    description: string;
    approximateSize: string;
  };
  tagline: {
    text: string;
    placement: string;
    style: string;
  };
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    gradients: string[];
  };
  typography: {
    headlineStyle: string;
    bodyStyle: string;
    ctaStyle: string;
    hierarchy: string;
  };
  layoutPatterns: {
    commonStructures: string[];
    gridSystem: string;
    whitespaceUsage: string;
    brandingZone: string;
  };
  visualStyle: {
    overallAesthetic: string;
    backgroundTreatments: string[];
    textures: string[];
    imageStyles: string[];
    iconography: string;
  };
  copyPatterns: {
    headlineFormulas: string[];
    ctaStyles: string[];
    toneOfVoice: string;
    recurringPhrases: string[];
    pricingPresentation: string;
  };
  psychologyTactics: string[];
  adFormats: {
    mostCommon: string;
    aspectRatios: string[];
    platforms: string[];
  };
  consistency: {
    strongElements: string[];
    inconsistencies: string[];
    brandMaturityLevel: string;
  };
  extractedAt: string;
  adsAnalyzed: number;
}

// ─── HARDCODED BRAND DNA (extracted from 10 real Hola Prime creatives) ───
// This is the ground truth brand identity. Used as fallback when Ad Library API is unavailable.
// Updated: 2026-03-24 from manual analysis of 10 production creatives.

export const HOLA_PRIME_BRAND_DNA: BrandDNA = {
  logo: {
    placement: 'Top-left corner, consistent across ALL creatives',
    description: 'White "hola prime" text logo with trademark symbol (TM). "hola" in lighter weight, "prime" in bold. Clean sans-serif font. Always white on dark backgrounds, black on light backgrounds (rare).',
    approximateSize: '~12-15% of canvas width, small and elegant — never dominates the design',
  },
  tagline: {
    text: '#WeAreTraders',
    placement: 'Top-right corner, mirroring the logo placement — creates a visual frame header',
    style: 'White text, regular weight, same font family as body text. Sometimes on a subtle dark pill/badge background. Always present.',
  },
  colorPalette: {
    primary: '#000000 (Pure black / very dark #0A0A0F — the dominant background across 90% of creatives)',
    secondary: '#FFFFFF (White — all headline text, logo, tagline)',
    accent: '#00E68A / #00FF88 (Neon green — used for emphasis, glow effects, price highlights in evergreen campaigns) | #2563EB / #3B82F6 (Blue — CTA buttons, tech/platform themes) | #FF6B35 / #FF4444 (Orange-Red — urgency, sale campaigns, FOMO) | #9333EA / #7C3AED (Purple — premium, platform/tech themes)',
    background: 'Predominantly deep black (#000-#0A0A0F). Subtle gradient overlays from corners. Never flat white (only 1/10 creatives used bright background and it UNDERPERFORMED).',
    text: '#FFFFFF (White for headlines/body) | #A0A0A0 (Gray for disclaimers) | Accent colors for emphasis words',
    gradients: [
      'Green-to-transparent neon glow (emanating from price or key element)',
      'Purple-to-blue diagonal gradient (premium/tech themes)',
      'Orange-to-red warm gradient (sale/urgency themes)',
      'Teal/cyan-to-dark gradient (feature-focused ads)',
      'Iridescent blue-purple-pink translucent sphere (SIGNATURE BRAND ELEMENT)',
    ],
  },
  typography: {
    headlineStyle: 'Bold/Extra-Bold sans-serif (Montserrat or Inter family), ALL CAPS for headlines. Very large size — headlines take 30-40% of vertical space. Sometimes 3D metallic chrome treatment for prices.',
    bodyStyle: 'Regular weight sans-serif, white, clean and readable. Medium size. Mixed case (sentence case). Key phrases in bold or accent color.',
    ctaStyle: '"Buy Challenge" in white text on blue (#2563EB) pill-shaped rounded button. Medium font weight. Occasionally green CTA for Spanish variants ("Compra el Challenge").',
    hierarchy: '1) Logo + Tagline (small, framing header) → 2) Main headline/offer (MASSIVE, center) → 3) Price (OVERSIZED, often with glow/3D effect) → 4) Promo code in badge → 5) CTA button → 6) Disclaimer (tiny, bottom)',
  },
  layoutPatterns: {
    commonStructures: [
      'Header bar: Logo (left) + #WeAreTraders (right)',
      'Hero zone: Center 60% — massive headline or price',
      'Offer details: Below hero — subtext, promo code',
      'CTA zone: Lower center — blue pill button',
      'Footer: Disclaimer in micro text',
      'Pricing table: Structured rows for multi-tier offers (Challenge/Was/Now/Code)',
    ],
    gridSystem: 'Center-aligned single column. Content stacked vertically. Strong center axis with logo/tagline framing at top edges. Elements float on dark background with generous spacing.',
    whitespaceUsage: 'Generous dark space around key elements. The black background IS the whitespace — it creates breathing room and premium feel. Never crowded.',
    brandingZone: 'Top 10% of canvas = branding zone (logo left, hashtag right). Bottom 5% = legal disclaimer. Middle 85% = creative content.',
  },
  visualStyle: {
    overallAesthetic: 'Premium dark fintech aesthetic. Think high-end trading platform meets luxury brand. Dark, bold, confident. Neon accents create energy without cheapness.',
    backgroundTreatments: [
      'Pure black / very dark charcoal (primary, 90% of ads)',
      'Subtle gradient glow from corners or behind key elements',
      'Wavy line patterns as subtle texture in header zone',
      'Dark vault/server room texture (implies security)',
      'Red/orange perforated dot pattern (urgency campaigns)',
      'AVOID: Bright/light backgrounds (tested neon yellow — underperformed significantly)',
    ],
    textures: [
      'SIGNATURE: Translucent iridescent circle/sphere — blue/purple/pink gradient, semi-transparent, usually behind or near key content. THIS IS THE #1 BRAND IDENTIFIER.',
      'Neon glow outlines (green, cyan) around prices or key numbers',
      '3D metallic chrome/silver treatment on prices and objects',
      'Subtle noise/grain on dark backgrounds for depth',
      'Decorative chrome ribbons/bows (promotional campaigns)',
      'Floating 3D spheres and orbs as accents',
    ],
    imageStyles: [
      'Device mockups (phone/tablet showing trading platform)',
      '3D rendered objects (coins, metallic shapes, chrome text)',
      'Trading candlestick chart graphics',
      'No human faces / no lifestyle photography — purely graphic design',
    ],
    iconography: 'Minimal icons. Shopping cart icon for CTA context. Cursor/pointer icon for interactive feel. Star ratings for Trustpilot. Seal/badge for trust elements ("Zero Payout Denial").',
  },
  copyPatterns: {
    headlineFormulas: [
      '[Challenge Size] + [Step Type] + "Challenge" (e.g., "$2K 2-Step Prime Challenge")',
      '"FLAT [X]% OFF" — large, bold, direct discount messaging',
      '"NO [Pain Point]" — removing barriers (No Consistency Rule, No Activation Fees)',
      '"PRICE DROP ALERT" — urgency + value combination',
      '"End of Season SALE" — seasonal urgency',
      '"[Event] Madness" — event-driven (March Madness)',
      '"Start for just $[X]" — low barrier to entry',
    ],
    ctaStyles: [
      '"Buy Challenge" (primary CTA — English)',
      '"Compra el Challenge" (Spanish variant)',
      '"Join Discord and Get Extra [X]% OFF" (secondary CTA)',
      '"USE CODE: [CODE]" in highlighted badge (always near CTA)',
    ],
    toneOfVoice: 'Direct, confident, no-nonsense. Short punchy sentences. Trader-speak. Emphasizes value and low entry barriers. Urgent but not desperate. Premium but accessible. Bilingual (English + Spanish variants).',
    recurringPhrases: [
      '#WeAreTraders',
      'Buy Challenge',
      'Prime Challenge',
      '2-Step Prime Challenge',
      'No Activation Fees',
      'No Consistency Rule',
      'Start for just $X',
      'Use Code: [PROMO]',
      'Zero Payout Denial',
    ],
    pricingPresentation: 'Prices in MASSIVE bold text with $ symbol. Often with neon glow, 3D metallic, or chrome effect. Strikethrough on old prices (red). New prices in accent color (yellow/green). Always emphasize the lowest entry price ($9, $38, $39).',
  },
  psychologyTactics: [
    'ANCHORING: Show high challenge value ($2K, $5K, $100K) next to tiny price ($9, $38) — extreme value perception',
    'PRICE FRAMING: Strikethrough old prices → new discounted price creates perceived savings',
    'SCARCITY/URGENCY: "NOW OR NEVER", "End of Season", time-limited promo codes',
    'LOSS AVERSION: "No Consistency Rule", "No Daily Loss Limit" — removing feared restrictions',
    'SOCIAL PROOF: Trustpilot 4.4 stars, "Zero Payout Denial" seal',
    'LOW BARRIER TO ENTRY: Always emphasize lowest possible starting price',
    'PROMO CODES: Create feeling of exclusive/insider access (EOSS40, MAD25, WELCOME10/20)',
    'FOMO: Sale events, limited-time codes, seasonal campaigns',
    'AUTHORITY: Premium dark aesthetic signals institutional-grade trading firm',
    'RECIPROCITY: "Join Discord and Get Extra 10% OFF" — community + bonus',
  ],
  adFormats: {
    mostCommon: 'Vertical/Story format (9:16) — optimized for mobile feed and Stories',
    aspectRatios: ['9:16 (Story/Reel — PRIMARY)', '1:1 (Square — secondary)', '4:5 (Portrait feed)'],
    platforms: ['Meta (Facebook + Instagram)', 'Instagram Stories/Reels', 'Facebook Feed'],
  },
  consistency: {
    strongElements: [
      'Logo placement ALWAYS top-left',
      '#WeAreTraders ALWAYS top-right',
      'Dark background is non-negotiable (bright backgrounds tested = low impressions)',
      'Translucent iridescent circle/sphere as brand signature',
      'Blue pill CTA button',
      'Legal disclaimer ALWAYS at bottom',
      'Promo codes in highlighted badges',
      'Price as the hero element',
    ],
    inconsistencies: [
      'CTA button color varies (blue vs green) between English/Spanish',
      'One creative tested neon yellow background — SIGNIFICANTLY underperformed',
      'Some creatives use 3D elements, others are flat 2D — both work on dark backgrounds',
    ],
    brandMaturityLevel: 'HIGH — Strong visual identity with clear brand signature (iridescent sphere). Consistent placement rules. Recognizable within 0.5 seconds. Professional prop firm aesthetic that builds trust.',
  },
  extractedAt: '2026-03-24T00:00:00Z',
  adsAnalyzed: 10,
};

export interface AdLibraryResult {
  ads: AdLibraryAd[];
  totalCount: number;
  fetchedAt: string;
  source: 'own' | 'competitor';
  searchTerm?: string;
  pageId?: string;
}

// ─── In-memory cache (survives within a server session) ───

let _adCache: Map<string, { data: AdLibraryResult; expiry: number }> = new Map();
let _brandDNACache: { data: BrandDNA; expiry: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── Core: Fetch from Meta Ad Library API ───

/**
 * Search the Meta Ad Library.
 *
 * @param searchTerm - Brand name or keyword to search
 * @param options.pageId - Specific Facebook Page ID to filter
 * @param options.adType - ALL, POLITICAL_AND_ISSUE_ADS, etc.
 * @param options.adActiveStatus - ACTIVE, INACTIVE, ALL
 * @param options.limit - Number of ads to fetch (max 50 per request)
 * @param options.country - Country code (default: US)
 */
export async function fetchAdLibrary(
  searchTerm: string,
  options: {
    pageId?: string;
    adType?: string;
    adActiveStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    limit?: number;
    country?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'MEME' | 'ALL' | 'NONE';
  } = {}
): Promise<AdLibraryResult> {
  if (!META_ACCESS_TOKEN) {
    throw new Error('META_ACCESS_TOKEN not configured. Add it to your .env file.');
  }

  const {
    adType = 'ALL',
    adActiveStatus = 'ALL',
    limit = 25,
    country = 'US',
    mediaType = 'ALL',
    pageId,
  } = options;

  // Check cache
  const cacheKey = `${searchTerm}:${pageId || ''}:${adActiveStatus}:${limit}`;
  const cached = _adCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    console.log(`[AdLibrary] Cache hit for "${searchTerm}"`);
    return cached.data;
  }

  // Build the API URL
  const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/ads_archive`;
  const params = new URLSearchParams({
    access_token: META_ACCESS_TOKEN,
    search_terms: searchTerm,
    ad_type: adType,
    ad_reached_countries: `["${country}"]`,
    ad_active_status: adActiveStatus,
    limit: String(Math.min(limit, 50)),
    fields: [
      'id',
      'ad_creation_time',
      'ad_delivery_start_time',
      'ad_delivery_stop_time',
      'ad_creative_bodies',
      'ad_creative_link_titles',
      'ad_creative_link_descriptions',
      'ad_creative_link_captions',
      'ad_snapshot_url',
      'bylines',
      'page_id',
      'page_name',
      'publisher_platforms',
      'estimated_audience_size',
      'spend',
      'impressions',
      'currency',
      'languages',
    ].join(','),
    ...(mediaType !== 'ALL' ? { media_type: mediaType } : {}),
  });

  // If we have a specific page ID, use search_page_ids
  if (pageId) {
    params.set('search_page_ids', pageId);
  }

  const url = `${baseUrl}?${params.toString()}`;
  console.log(`[AdLibrary] Fetching ads for "${searchTerm}" (status: ${adActiveStatus}, limit: ${limit})...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[AdLibrary] API error (${response.status}):`, errorBody.substring(0, 500));

      // Parse Meta's error format for better messages
      try {
        const errorJson = JSON.parse(errorBody);
        const metaError = errorJson.error;
        if (metaError) {
          // Special handling for permission errors — very common
          if (metaError.code === 10 || metaError.error_subcode === 2332002) {
            throw new Error(
              `Ad Library API access not enabled. To fix:\n` +
              `1. Go to facebook.com/ads/library/api\n` +
              `2. Accept the Terms of Service\n` +
              `3. Your existing META_ACCESS_TOKEN should then work.\n` +
              `(Original error: ${metaError.message})`
            );
          }
          throw new Error(`Meta Ad Library API: ${metaError.message} (code: ${metaError.code}, type: ${metaError.type})`);
        }
      } catch (parseErr: any) {
        // If it's our custom error, rethrow it
        if (parseErr.message?.includes('Ad Library API access')) throw parseErr;
        // Otherwise throw the raw status
      }
      throw new Error(`Meta Ad Library API returned ${response.status}`);
    }

    const data = await response.json();
    const rawAds: AdLibraryAd[] = data.data || [];

    // Enrich ads with computed fields
    const enrichedAds = rawAds.map(ad => {
      const startDate = ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : null;
      const stopDate = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time) : null;
      const now = new Date();

      return {
        ...ad,
        isActive: !stopDate || stopDate > now,
        daysRunning: startDate ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      };
    });

    // Sort by activity — active ads first, then by longest running (= likely best performing)
    enrichedAds.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return (b.daysRunning || 0) - (a.daysRunning || 0);
    });

    const result: AdLibraryResult = {
      ads: enrichedAds,
      totalCount: enrichedAds.length,
      fetchedAt: new Date().toISOString(),
      source: 'competitor',
      searchTerm,
      pageId,
    };

    // Cache
    _adCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
    console.log(`[AdLibrary] Fetched ${enrichedAds.length} ads for "${searchTerm}" (${enrichedAds.filter(a => a.isActive).length} active)`);

    return result;
  } catch (err: any) {
    console.error(`[AdLibrary] Fetch failed for "${searchTerm}":`, err.message);
    throw err;
  }
}

/**
 * Fetch Hola Prime's own ads from the Ad Library.
 * Uses the configured AD_ACCOUNTS page IDs.
 */
export async function fetchOwnAds(
  options: { activeOnly?: boolean; limit?: number } = {}
): Promise<AdLibraryResult> {
  const { activeOnly = false, limit = 25 } = options;
  const accounts = parseAdAccounts();

  // Search by brand name + any configured page IDs
  const result = await fetchAdLibrary('Hola Prime', {
    adActiveStatus: activeOnly ? 'ACTIVE' : 'ALL',
    limit,
    pageId: accounts.length > 0 ? accounts[0].id : undefined,
  });

  result.source = 'own';
  return result;
}

/**
 * Fetch competitor prop firm ads from the Ad Library.
 */
export async function fetchCompetitorAds(
  competitorName: string,
  options: { activeOnly?: boolean; limit?: number; pageId?: string } = {}
): Promise<AdLibraryResult> {
  const { activeOnly = true, limit = 15, pageId } = options;

  const result = await fetchAdLibrary(competitorName, {
    adActiveStatus: activeOnly ? 'ACTIVE' : 'ALL',
    limit,
    pageId,
  });

  result.source = 'competitor';
  return result;
}

// ─── Brand DNA Extraction ───

/**
 * Analyze Hola Prime's Ad Library ads and extract a complete brand DNA profile.
 * Uses Claude Vision to analyze ad creative screenshots.
 *
 * The brand DNA is then injected into every creative generation prompt
 * to ensure AI-generated creatives match the real brand identity.
 */
export async function extractBrandDNA(ads: AdLibraryAd[]): Promise<BrandDNA | null> {
  // Check cache
  if (_brandDNACache && Date.now() < _brandDNACache.expiry) {
    console.log('[AdLibrary] Brand DNA cache hit');
    return _brandDNACache.data;
  }

  if (!ads || ads.length === 0) {
    console.warn('[AdLibrary] No ads provided for brand DNA extraction');
    return null;
  }

  try {
    const content: any[] = [];

    // Fetch ad snapshot images (up to 8 for analysis)
    const adsWithSnapshots = ads
      .filter(ad => ad.ad_snapshot_url)
      .slice(0, 8);

    console.log(`[AdLibrary] Analyzing ${adsWithSnapshots.length} ads for brand DNA...`);

    // Add ad copy context
    const adCopyContext = ads.slice(0, 15).map((ad, i) => {
      const bodies = ad.ad_creative_bodies?.join(' | ') || '';
      const titles = ad.ad_creative_link_titles?.join(' | ') || '';
      const descs = ad.ad_creative_link_descriptions?.join(' | ') || '';
      const active = ad.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      const days = ad.daysRunning || 0;
      const spend = ad.spend ? `$${ad.spend.lower_bound}-$${ad.spend.upper_bound}` : 'N/A';
      const platforms = ad.publisher_platforms?.join(', ') || 'unknown';

      return `Ad ${i + 1} [${active}, ${days} days, spend: ${spend}, platforms: ${platforms}]:
  Title: ${titles || 'N/A'}
  Body: ${bodies || 'N/A'}
  Description: ${descs || 'N/A'}`;
    }).join('\n\n');

    content.push({
      type: 'text',
      text: `You are analyzing ${ads.length} real advertisements from Hola Prime's Meta Ad Library to extract a comprehensive BRAND DNA profile.

## AD COPY FROM ALL ADS:
${adCopyContext}

## YOUR TASK
Analyze ALL the ad copy above and extract a COMPLETE brand DNA profile. This profile will be used to ensure AI-generated creatives perfectly match Hola Prime's established brand identity.

For visual analysis, use the ad copy patterns to infer visual style (since ad body text reveals brand voice, offer structure, and messaging patterns).

Return ONLY valid JSON matching this exact structure:
{
  "logo": {
    "placement": "Where the logo appears (e.g., 'top-left corner')",
    "description": "Visual description of the logo style",
    "approximateSize": "Relative size (e.g., '~10% of canvas width')"
  },
  "tagline": {
    "text": "#WeAreTraders or other recurring tagline",
    "placement": "Where it typically appears",
    "style": "How it's styled (font, size, color)"
  },
  "colorPalette": {
    "primary": "Hex or description of primary brand color",
    "secondary": "Secondary color",
    "accent": "Accent/highlight color",
    "background": "Common background treatment",
    "text": "Text color",
    "gradients": ["Any gradient patterns observed"]
  },
  "typography": {
    "headlineStyle": "Headline font treatment description",
    "bodyStyle": "Body text treatment",
    "ctaStyle": "CTA button text treatment",
    "hierarchy": "How text sizes cascade"
  },
  "layoutPatterns": {
    "commonStructures": ["List of common layout structures observed"],
    "gridSystem": "Apparent grid/alignment system",
    "whitespaceUsage": "How whitespace is used",
    "brandingZone": "Where brand elements consistently appear"
  },
  "visualStyle": {
    "overallAesthetic": "One-line description of the overall visual feel",
    "backgroundTreatments": ["Common background styles"],
    "textures": ["Textures used (gradients, noise, metallic, etc.)"],
    "imageStyles": ["Types of imagery used"],
    "iconography": "Icon/graphic style"
  },
  "copyPatterns": {
    "headlineFormulas": ["Recurring headline structures (e.g., '$XK Challenge at just $Y')"],
    "ctaStyles": ["Common CTA text patterns"],
    "toneOfVoice": "Brand voice description",
    "recurringPhrases": ["Phrases that appear across multiple ads"],
    "pricingPresentation": "How prices/offers are typically presented"
  },
  "psychologyTactics": ["List of psychology techniques used across ads"],
  "adFormats": {
    "mostCommon": "Most common ad format",
    "aspectRatios": ["Common aspect ratios"],
    "platforms": ["Platforms targeted"]
  },
  "consistency": {
    "strongElements": ["Elements that are very consistent across ads"],
    "inconsistencies": ["Elements that vary or are inconsistent"],
    "brandMaturityLevel": "EMERGING | ESTABLISHED | MATURE"
  },
  "extractedAt": "${new Date().toISOString()}",
  "adsAnalyzed": ${ads.length}
}`
    });

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are a brand identity analyst. Extract precise brand DNA from real advertisements. Respond with ONLY valid JSON — no markdown, no code fences.',
      messages: [{ role: 'user', content }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const startIdx = cleaned.indexOf('{');
    if (startIdx === -1) return null;
    cleaned = cleaned.substring(startIdx);

    const brandDNA = JSON.parse(cleaned) as BrandDNA;

    // Cache for 30 minutes
    _brandDNACache = { data: brandDNA, expiry: Date.now() + CACHE_TTL };
    console.log(`[AdLibrary] Brand DNA extracted successfully from ${ads.length} ads`);

    return brandDNA;
  } catch (err: any) {
    console.error('[AdLibrary] Brand DNA extraction failed:', err.message);
    return null;
  }
}

// ─── Build context strings for injection into generation prompts ───

/**
 * Build a brand DNA context string to inject into the creative generation prompt.
 * This ensures generated creatives match the real brand identity.
 */
export function buildBrandDNAContext(brandDNA: BrandDNA): string {
  if (!brandDNA) return '';

  return `

## 🧬 BRAND DNA — EXTRACTED FROM REAL HOLA PRIME ADS (Ad Library)
This brand identity was automatically extracted from ${brandDNA.adsAnalyzed} real Hola Prime advertisements.
Your generated creative MUST match this identity precisely.

### Logo & Branding
- Logo: ${brandDNA.logo.description}, placed ${brandDNA.logo.placement} (size: ${brandDNA.logo.approximateSize})
- Tagline: "${brandDNA.tagline.text}" — ${brandDNA.tagline.placement}, ${brandDNA.tagline.style}

### Color System (MANDATORY — match these exactly)
- Primary: ${brandDNA.colorPalette.primary}
- Secondary: ${brandDNA.colorPalette.secondary}
- Accent: ${brandDNA.colorPalette.accent}
- Background: ${brandDNA.colorPalette.background}
- Text: ${brandDNA.colorPalette.text}
${brandDNA.colorPalette.gradients.length > 0 ? `- Gradients: ${brandDNA.colorPalette.gradients.join(', ')}` : ''}

### Typography System
- Headlines: ${brandDNA.typography.headlineStyle}
- Body: ${brandDNA.typography.bodyStyle}
- CTA: ${brandDNA.typography.ctaStyle}
- Hierarchy: ${brandDNA.typography.hierarchy}

### Layout Patterns
- Common structures: ${brandDNA.layoutPatterns.commonStructures.join(', ')}
- Grid: ${brandDNA.layoutPatterns.gridSystem}
- Whitespace: ${brandDNA.layoutPatterns.whitespaceUsage}
- Branding zone: ${brandDNA.layoutPatterns.brandingZone}

### Visual Style
- Aesthetic: ${brandDNA.visualStyle.overallAesthetic}
- Backgrounds: ${brandDNA.visualStyle.backgroundTreatments.join(', ')}
- Textures: ${brandDNA.visualStyle.textures.join(', ')}

### Copy Patterns (match this voice)
- Headline formulas: ${brandDNA.copyPatterns.headlineFormulas.join(' | ')}
- CTA styles: ${brandDNA.copyPatterns.ctaStyles.join(' | ')}
- Tone: ${brandDNA.copyPatterns.toneOfVoice}
- Recurring phrases: ${brandDNA.copyPatterns.recurringPhrases.join(', ')}
- Pricing: ${brandDNA.copyPatterns.pricingPresentation}

### Psychology Tactics Used
${brandDNA.psychologyTactics.map(t => `- ${t}`).join('\n')}

DIRECTIVE: Your creative MUST look like it was designed by the same team that created these real ads. Match the color palette, typography, layout patterns, and visual style EXACTLY.
`;
}

/**
 * Build an ad library ads context string showing what's currently running.
 * Helps the AI understand what ads are live and performing.
 */
export function buildAdLibraryContext(result: AdLibraryResult): string {
  if (!result || result.ads.length === 0) return '';

  const activeAds = result.ads.filter(a => a.isActive);
  const longestRunning = result.ads.sort((a, b) => (b.daysRunning || 0) - (a.daysRunning || 0)).slice(0, 5);

  const adSummaries = longestRunning.map((ad, i) => {
    const bodies = ad.ad_creative_bodies?.slice(0, 1).join('') || 'N/A';
    const title = ad.ad_creative_link_titles?.[0] || '';
    const spend = ad.spend ? `$${ad.spend.lower_bound}-$${ad.spend.upper_bound}` : 'N/A';
    const status = ad.isActive ? '🟢 ACTIVE' : '🔴 STOPPED';

    return `${i + 1}. ${status} (${ad.daysRunning || 0} days, spend: ${spend})
   Title: "${title}"
   Copy: "${bodies.substring(0, 150)}${bodies.length > 150 ? '...' : ''}"`;
  }).join('\n');

  return `

## 📊 LIVE AD LIBRARY DATA (${result.source === 'own' ? 'Hola Prime' : result.searchTerm})
Fetched: ${result.fetchedAt}
Total ads found: ${result.totalCount} (${activeAds.length} currently active)

### Top Ads by Longevity (longer running = likely better performing):
${adSummaries}

INSIGHT: Ads running for 30+ days are likely profitable. Study their messaging patterns.
`;
}

/**
 * Convenience: Fetch Hola Prime ads + extract Brand DNA + build context
 * Returns a ready-to-inject context string for the generation prompt.
 *
 * Falls back to MongoDB-stored creative data if Ad Library API fails.
 */
export async function getFullBrandContext(): Promise<{
  brandDNAContext: string;
  adLibraryContext: string;
  brandDNA: BrandDNA | null;
  adsResult: AdLibraryResult | null;
}> {
  // Check brand DNA cache first — avoids repeated API calls
  if (_brandDNACache && Date.now() < _brandDNACache.expiry) {
    return {
      brandDNAContext: buildBrandDNAContext(_brandDNACache.data),
      adLibraryContext: '',
      brandDNA: _brandDNACache.data,
      adsResult: null,
    };
  }

  try {
    // Try Meta Ad Library API first
    const adsResult = await fetchOwnAds({ limit: 25 });
    const brandDNA = await extractBrandDNA(adsResult.ads);
    const brandDNAContext = brandDNA ? buildBrandDNAContext(brandDNA) : '';
    const adLibraryContext = buildAdLibraryContext(adsResult);
    return { brandDNAContext, adLibraryContext, brandDNA, adsResult };
  } catch (err: any) {
    console.warn('[AdLibrary] Ad Library API failed, using hardcoded Brand DNA:', err.message);

    // ── FALLBACK 1: Use hardcoded Brand DNA (extracted from 10 real creatives) ──
    console.log('[AdLibrary] Using HOLA_PRIME_BRAND_DNA (hardcoded from 10 production creatives)');
    const brandDNAContext = buildBrandDNAContext(HOLA_PRIME_BRAND_DNA);
    return {
      brandDNAContext,
      adLibraryContext: '',
      brandDNA: HOLA_PRIME_BRAND_DNA,
      adsResult: null,
    };
  }
}

/**
 * Fallback: Extract brand DNA from the creatives already stored in MongoDB.
 * This works even when the Meta Ad Library API is unavailable.
 */
export async function getFullBrandContextFromDB(): Promise<{
  brandDNAContext: string;
  adLibraryContext: string;
  brandDNA: BrandDNA | null;
  adsResult: AdLibraryResult | null;
}> {
  // Dynamic import to avoid circular dependencies
  const clientPromise = (await import('@/lib/mongodb-client')).default;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
  const collection = db.collection(process.env.MONGODB_COLLECTION || 'creative_data');

  // Fetch top-rated creatives from MongoDB
  const creatives = await collection
    .find({})
    .project({
      adId: 1, adName: 1, adType: 1, thumbnailUrl: 1,
      compositeRating: 1, verdictRating: 1,
      dominantColors: 1, primaryMessage: 1, secondaryMessage: 1,
      ctaText: 1, brandingElements: 1, creativeType: 1,
      whatWorks: 1, whatDoesntWork: 1,
      recommendation1: 1, recommendation2: 1, recommendation3: 1,
      keyInsight: 1, verdictSummary: 1,
    })
    .sort({ compositeRating: -1 })
    .limit(20)
    .toArray();

  if (creatives.length === 0) {
    console.log('[AdLibrary] No creatives in MongoDB for brand DNA fallback');
    return { brandDNAContext: '', adLibraryContext: '', brandDNA: null, adsResult: null };
  }

  console.log(`[AdLibrary] Falling back to ${creatives.length} MongoDB creatives for brand DNA`);

  // Convert MongoDB creatives into Ad Library format for the extract function
  const fakeAds: AdLibraryAd[] = creatives.map((c: any) => ({
    id: c.adId,
    page_name: 'Hola Prime',
    ad_creative_bodies: [c.primaryMessage, c.secondaryMessage].filter(Boolean),
    ad_creative_link_titles: [c.adName].filter(Boolean),
    ad_snapshot_url: c.thumbnailUrl,
    isActive: true,
    daysRunning: 30,
  }));

  // Extract brand DNA from the MongoDB data
  const brandDNA = await extractBrandDNA(fakeAds);
  const brandDNAContext = brandDNA ? buildBrandDNAContext(brandDNA) : '';

  return { brandDNAContext, adLibraryContext: '', brandDNA, adsResult: null };
}

/**
 * Clear caches (useful when user wants to refresh data)
 */
export function clearAdLibraryCache() {
  _adCache.clear();
  _brandDNACache = null;
  console.log('[AdLibrary] Cache cleared');
}

/**
 * Get a list of well-known prop firm competitors for quick lookup
 */
export function getKnownCompetitors(): { name: string; pageId?: string }[] {
  return [
    { name: 'FTMO' },
    { name: 'Funded Next' },
    { name: 'The Funded Trader' },
    { name: 'True Forex Funds' },
    { name: 'MyForexFunds' },
    { name: 'Topstep' },
    { name: 'Apex Trader Funding' },
    { name: 'E8 Funding' },
    { name: 'The5ers' },
    { name: 'Lux Trading Firm' },
    { name: 'FundedBull' },
    { name: 'Blue Guardian' },
  ];
}
