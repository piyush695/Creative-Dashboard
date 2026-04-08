/**
 * Brand Visual Paradigms — Concept Diversity Engine
 *
 * Defines fundamentally different visual approaches for creative generation.
 * Each paradigm produces a COMPLETELY DIFFERENT composition — not just color variations.
 * The variant system picks 3 different paradigms per generation for maximum diversity.
 *
 * QUALITY STANDARD: Every paradigm targets Cannes Lions / D&AD Pencil award quality.
 * Image generators should output creatives that look like $500K+ agency productions.
 */

export interface ConceptParadigm {
  id: string;
  name: string;
  description: string;
  /** Detailed composition and visual approach — injected into the image prompt */
  imageDirective: string;
  /** What this paradigm should NEVER do */
  antiPatterns: string;
  /** Reference aesthetic (for human understanding) */
  references: string[];
}

export const CONCEPT_PARADIGMS: ConceptParadigm[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Magazine/editorial layout — typography-driven, asymmetric, maximum negative space',
    imageDirective: `VISUAL PARADIGM: EDITORIAL / LUXURY MAGAZINE

Composition inspired by Vogue, Bloomberg Businessweek, WSJ Magazine double-page spreads. Typographic sophistication is the hero.

LAYOUT STRUCTURE:
- Asymmetric composition — dominant left-heavy or right-heavy weight distribution
- ONE oversized typographic hero element occupies 40-55% of canvas: a massive price like "$38" or a single bold word like "FUNDED" rendered at extreme scale with ultra-fine stroke and perfect tracking
- 45-50% of canvas is EMPTY black negative space — this emptiness creates luxury and focus
- Thin horizontal or vertical separator line (1px white at 30% opacity) creates an editorial divider
- Small cap supporting text in tight tracking, placed with precision — not scattered

HERO VISUAL:
- The PRICE OR NUMBER is the visual. Render it as an editorial typographic hero: ultra-bold, perfectly tracked, slight kerning adjustment for visual refinement
- Optional: a single abstract geometric shape (angular chrome prism, thin glowing line, or minimal data sparkline) as a secondary supporting element
- NO complex scenes, NO multiple images — the beauty is restraint

TYPOGRAPHY:
- Primary: One massive word/number — minimum 180pt equivalent, occupying 50%+ of horizontal width
- Secondary: Ultra-small elegant captions (10-12pt equivalent) in wide tracking (0.3em letter-spacing)
- Typeface character: Modern geometric sans-serif (Futura-like), clean, precise
- The size contrast between primary and secondary creates dramatic hierarchy

LIGHTING/ATMOSPHERE:
- Background: Pure deep black to very dark navy (#000000 to #050510)
- The large typography casts subtle shadow on the background — creates depth without complexity
- Optional: ultra-subtle blue or purple gradient wash visible only in corners

FEEL: Sophisticated, restrained, institutional — like a Cartier or Bottega Veneta ad meets Bloomberg data.`,
    antiPatterns: 'NO centered symmetric layouts, NO full-width CTA buttons, NO bullet point lists, NO rounded containers, NO 3D effects, NO multiple competing focal points, NO busy backgrounds, NO multiple images, NO meme characters, NO clipart, NO cartoon elements, NO generic stock photography, NO warm or colorful backgrounds',
    references: ['Apple product ads', 'Stripe brand campaigns', 'Goldman Sachs institutional ads', 'Hermès print advertising', 'Acne Studios fashion ads'],
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Movie poster / cinematic atmosphere — dramatic lighting, depth, story-driven',
    imageDirective: `VISUAL PARADIGM: CINEMATIC / MOVIE POSTER

Full cinematic treatment. Dramatic atmosphere. This creative tells a story through light and shadow. Every element feels like a film still.

COMPOSITION:
- Full-bleed atmospheric scene as the background — fills the entire canvas edge-to-edge
- THREE depth layers: dark blurred foreground element → sharp midground hero → atmospheric hazy background
- Typography overlaid using contrast masking — placed in naturally dark areas of the scene, or using glow/shadow treatment for legibility

HERO VISUAL (choose the most compelling for this brief):
Option A — TRADING COMMAND CENTER: Multiple ultra-wide monitors arranged in a semi-circle, glowing green candlestick charts on dark screens, viewed from behind in silhouette. Deep blue ambient fill. Single overhead spotlight creates a god-ray effect cutting diagonally across the frame.
Option B — FINANCIAL ARCHITECTURE: Ground-level shot looking up at glass skyscrapers at blue hour (dusk). The buildings reflect neon trading tickers and financial data. Perfect vertical symmetry with slight fisheye compression creating drama.
Option C — PRODUCT HERO: A single sleek trading terminal or laptop sits on a reflective black lacquer surface. Shot with extreme shallow depth of field (f/1.2 equivalent). Single point source light from upper-left creates dramatic rim lighting. Product is sharp, background is smooth bokeh.

LIGHTING:
- Primary light source: single dramatic directional light (side-lit or top-down spotlight)
- Color grade: professional film color grade — either teal-orange (cinematic standard) or deep blue-gold (luxury standard)
- Shadows: deep, intentional — at least 40% of the image is very dark
- Atmosphere: subtle haze, light particles, or volumetric light rays

TEXT TREATMENT:
- Title card style — wide tracking, elegant weight, letterpress-quality rendering
- Text sits in dark areas of the scene or uses contrasting glow

FEEL: Epic, aspirational, transformative. Like the opening sequence of a film about becoming wealthy.`,
    antiPatterns: 'NO flat graphic design, NO cartoon or illustration styles, NO meme elements, NO clipart, NO symmetric centered layouts, NO multiple competing text blocks, NO bright backgrounds, NO amateur photo filters, NO stock photography watermarks',
    references: ['Netflix key art', 'Nike "Just Do It" campaigns', 'Dior Sauvage ads', 'Rolex advertising', 'Blade Runner 2049 key art'],
  },
  {
    id: 'data_native',
    name: 'Data-Native',
    description: 'Trading terminal / Bloomberg aesthetic — dashboard feel, data as beauty',
    imageDirective: `VISUAL PARADIGM: DATA-NATIVE / PREMIUM TRADING TERMINAL

The ad looks and feels like a premium Bloomberg Terminal or TradingView Pro interface. Data visualization IS the design. Technical, credible, insider.

COMPOSITION:
- Dark background (#060610) with very subtle grid lines (1px lines at 8% opacity, spaced 40px) — like a high-definition monitor
- Layout structured like a trading dashboard: organized data panels with clear zone boundaries
- CRT scan line overlay (2% opacity horizontal lines at 2px intervals) for authentic terminal feel

HERO ELEMENTS:
- LARGE PRICE/NUMBER rendered as a live market ticker — the font feels monospaced, with a subtle green pulse glow as if updating in real-time
- Candlestick chart pattern (5-7 candles) rendered as the main visual background element: green candles (up) are bright neon green (#00FF88), red candles (down) are deep coral
- Mini sparkline chart as ambient background — a subtle ascending trend line in 15% opacity green
- Data rows showing "1-Step Process | 5% Profit Target | No Time Limits | Fast Withdrawals" formatted as dashboard card metrics

TYPOGRAPHY:
- Primary: Tabular/monospaced font for all numbers and metrics — like a Bloomberg terminal
- Secondary: Clean geometric sans-serif for labels
- Color coding: Green = positive/profit, White = neutral labels, Dimmed gray = secondary info

GLOWING ACCENTS:
- Thin neon cyan or green accent line divides the hero from supporting info
- The price/number has a subtle inner glow and outer halo (like a phosphor screen)
- Small pulsing dot indicating "LIVE" next to the price

FEEL: Technical authority. The viewer feels like they're looking at real trading infrastructure. Trust is built through data.`,
    antiPatterns: 'NO editorial minimalism, NO cinematic atmosphere, NO cartoon elements, NO meme characters, NO lifestyle imagery, NO large empty spaces without purpose, NO serif fonts, NO warm colors, NO soft gradients, NO clipart',
    references: ['Bloomberg Terminal interface', 'TradingView Pro UI', 'Robinhood marketing materials', 'Binance trading platform ads', 'eToro premium campaigns'],
  },
  {
    id: 'poster',
    name: 'Impact Poster',
    description: 'ONE powerful 3D or graphic hero element, minimal text, maximum visual impact',
    imageDirective: `VISUAL PARADIGM: BOLD IMPACT POSTER

ONE extraordinary visual element. Maximum visual impact before any text is read. This is the creative that stops scrolling in 0.1 seconds.

HERO VISUAL (choose ONE, render it as a premium 3D or photorealistic illustration):
Option A — MONEY SCULPTURE: An oversized "$38" or price number rendered as a PHOTOREALISTIC 3D object. Material: polished brushed chrome or liquid mercury. Floating 3 inches above a reflective black surface, casting a precise shadow. Studio lighting: three-point setup with key light from upper-left, fill from right, rim light creating edge separation. Deep subtle ambient occlusion.
Option B — TRADING DEVICE HERO: A sleek trading device (premium laptop or triple-monitor setup) photographed from a dramatic 15° below angle (hero angle). The screens glow with green candlestick charts. Dramatic single overhead spotlight creates a pool of light on the subject, fading to pure black at edges. Photorealistic material rendering.
Option C — ABSTRACT WEALTH SYMBOL: A massive gold or platinum coin (custom designed, not generic), rendered with micro-detail texture on its face, floating at a dramatic angle. Cinematic macro lens with extreme shallow depth of field — only the center of the coin is razor-sharp. Background: pure deep black with distant blue bokeh circles.

COMPOSITION:
- Hero visual occupies 65-75% of the canvas height — it DOMINATES everything
- Full bleed to edges on left and right — the visual bleeds beyond frame
- Text is minimal: ONE headline (max 5 words), ONE price, ONE CTA
- Text placement: placed in dark areas around the hero visual, ultra-legible contrast

SCALE CONTRAST:
- Hero element: MASSIVE
- Everything else: comparatively tiny
- This extreme scale contrast creates stopping power

FEEL: Bold, iconic, arresting. You remember the IMAGE. The viewer cannot look away.`,
    antiPatterns: 'NO long copy, NO bullet point lists, NO data grids, NO multiple images, NO even distribution of elements, NO flat illustration style, NO cartoon or meme elements, NO clipart, NO generic stock photos, NO balanced centered layouts without drama',
    references: ['Absolut Vodka campaigns', 'Apple Mac Pro product launches', 'PlayStation product hero shots', 'Spotify Wrapped key visuals', 'Supreme seasonal drops'],
  },
  {
    id: 'comparison',
    name: 'Premium Contrast',
    description: 'Side-by-side abstract comparison — data and light contrasts tell the story without memes',
    imageDirective: `VISUAL PARADIGM: PREMIUM CONTRAST / DATA SPLIT

Two contrasting visual zones that tell the story through ABSTRACT DATA VISUALIZATION and LIGHTING CONTRAST — not cartoon characters or literal illustrations. Sophisticated, graphic, sharp.

COMPOSITION:
- Canvas divided into TWO distinct vertical zones with a thin bright separator line (2px white or neon, positioned at 45-55% from left)
- LEFT ZONE: "WITHOUT HOLA PRIME" — desaturated dark charcoal, red/flat trading chart data going downward (descending candlesticks in muted red), dim flat lighting, cramped compressed spacing
- RIGHT ZONE: "WITH HOLA PRIME" — rich deep black, ascending green candlestick chart data glowing with neon energy, volumetric light emanating from behind the price number, generous breathing room

VISUAL LANGUAGE FOR EACH ZONE:
Left (negative): 
  - Color palette: deep muted charcoal (#1A1A1A), desaturated dark reds
  - Data visualization: downward-trending chart lines, red declining candles
  - Lighting: flat, dim, no accent light — feels compressed and constrained
  - Label: small "BEFORE" or competitor firm name in dim gray text

Right (positive/Hola Prime):
  - Color palette: rich black (#000000), vibrant neon green (#00FF88), deep blue CTA
  - Data visualization: ascending trend line, 3-4 bright green glowing candlesticks pointing upward
  - Lighting: a radial glow SOURCE behind the price number as if it's emanating its own light
  - The price "$38" or offer number is positioned here, large, glowing, dominant

SEPARATOR:
- Sharp clean vertical dividing line — not organic, not blurred — precise and graphic
- Color: bright white or electric blue — cuts through both zones like a blade

TEXT:
- Top: "hola prime" logo (white, top-left), "#WeAreTraders" (white, top-right)
- Left label: "Other Firms" or "Before" — very small, muted
- Right label: "Hola Prime" or "Start Today" — slightly larger, white
- Hero price in the RIGHT zone only — large, neon, glowing
- CTA button in the right zone — blue pill, bottom-right

FEEL: Graphic, sharp, sophisticated data storytelling. No cartoons, no memes. Pure visual contrast through light and data.`,
    antiPatterns: 'NO meme characters, NO cartoon frogs or animals, NO Pepe or internet memes, NO clipart illustrations, NO emoji, NO literal before/after photos of people, NO cheesy stock photography, NO amateur Photoshop composites, NO symmetric identical layouts',
    references: ['Apple Mac vs PC (abstract visual version)', 'Slack growth comparison charts', 'LinkedIn premium upgrade comparisons', 'Bloomberg market data visualizations'],
  },
  {
    id: 'storytelling',
    name: 'Journey Arc',
    description: 'Visual narrative — transformation arc with ascending energy across the canvas',
    imageDirective: `VISUAL PARADIGM: JOURNEY ARC / TRANSFORMATION NARRATIVE

The ad tells a visual story of transformation. The eye follows a clear ascending path from constraint to freedom. The composition itself IS the narrative.

LAYOUT STRUCTURE:
- Clear diagonal or vertical reading path: BOTTOM-LEFT (dark, constrained) → TOP-RIGHT (bright, expansive)
- OR top-to-bottom: COMPRESSED STARTING POINT (top) → EXPLOSION OF SPACE AND LIGHT (bottom) → CTA at the end of the journey
- Visual elements grow in SIZE and LUMINOSITY as the story progresses

VISUAL NARRATIVE ELEMENTS:
- BEGINNING: Small, dim graphic element representing constraint — a small dim number, a compressed trading chart with tight declining data, a narrow frame
- PROGRESSION: Ascending arrow or timeline made of glowing trading data points — each point slightly brighter and larger than the last
- ARRIVAL: The PRICE ($38 or offer number) rendered large and brilliant — the destination. Neon green glow, maximum size, the reward at end of journey.
- Subtle particle trail or light stream connecting beginning to end — like data flowing through an ascending channel

LIGHTING NARRATIVE:
- Background gradient follows the story: very dark at the beginning of the journey, slightly brighter (radial glow) around the price/offer
- Feels like walking from darkness into illumination

TYPOGRAPHY:
- Headline at the BEGINNING of the journey (small-medium size): sets the problem or stakes
- Price/CTA at the END of the journey (maximum size, maximum glow): the reward and solution

SPECIFIC VISUAL SUGGESTION:
A series of 5-7 ascending trading candles, each progressively larger and more luminous, from dark muted red at bottom-left to brilliant neon green at top-right. The "$38" price floats above the peak candle, illuminated like a prize. The CTA button sits comfortably below.

FEEL: Progressive, motivational, aspirational. The viewer FEELS the upward trajectory.`,
    antiPatterns: 'NO flat static compositions, NO symmetric centered designs, NO cartoon or meme elements, NO clipart, NO cookie-cutter template layouts, NO literal photo stories, NO same-size elements throughout, NO cluttered multi-column grids',
    references: ['Peloton journey campaigns', 'Nike training transformation ads', 'Coinbase onboarding screens', 'Duolingo streak visualizations', 'Trading212 growth marketing'],
  },
  {
    id: 'minimal',
    name: 'Ultra-Minimal',
    description: 'Radical restraint — one perfect element on vast dark space, maximum premium feel',
    imageDirective: `VISUAL PARADIGM: ULTRA-MINIMAL / LUXURY RESTRAINT

RADICAL RESTRAINT. The less you show, the more powerful the impact. This is the most premium, most confident approach. It says: "We don't need to shout."

COMPOSITION (strict rules):
- 70-80% of the canvas is PURE EMPTY BLACK — this emptiness is the design, not a failure
- ONE single perfect element occupies the remaining 20-30% of canvas
- That element is positioned with absolute intentionality — typically off-center (golden ratio, not mathematical center)
- Supporting text is whisper-small (8-10pt equivalent) placed at an edge or corner with wide tracking
- CTA is text-only or micro pill — NO large bordered button

THE ONE ELEMENT (choose the most powerful for this brief):
Option A — TYPOGRAPHIC HERO: The price "$38" rendered flawlessly in a premium geometric typeface. No glow, no chrome, no effects. The perfection of the letterform IS the luxury. Positioned at exactly 1/3 from the left, 38% from the top. Everything else is secondary.
Option B — MINIMAL MARK: A razor-thin green horizontal line (2px) centered at 50% height, representing the target profit level. The price "$38" appears as a tiny label at the end of the line. This is the trade you're about to make.
Option C — FLOATING OBJECT: A single small premium metallic object (a custom branded pin, a coin, a geometric trading symbol) rendered photorealistically, floating against infinite black. Lit from one precise direction. Everything else — text, CTA — is typeset below it in ultra-small weight.

TYPOGRAPHY:
- If text: ONE word or number maximum as the hero. Placed with room to breathe.
- Supporting info: Ultra-light weight, ultra-small, ultra-spaced. Less than 15 words total.
- Letter-spacing: 0.15-0.3em on secondary text — elegant and intentional

FEEL: Premium, confident, powerful through restraint. Cartier. Tesla. Apple. The brand that has nothing to prove.`,
    antiPatterns: 'NO multiple elements, NO bullet point lists, NO containers or cards, NO busy backgrounds, NO gradients, NO 3D effects, NO multiple colors, NO large CTA buttons, NO competing text blocks, NO meme or cartoon elements, NO clipart, NO decorative flourishes',
    references: ['Apple "Shot on iPhone" billboards', 'Cartier print ads', 'Tesla reservation pages', 'Braun product design ethos', 'Rolex subdial ads'],
  },
  {
    id: 'collage',
    name: 'Premium Collage',
    description: 'Sophisticated layered composition — multiple premium elements composited with intentional depth',
    imageDirective: `VISUAL PARADIGM: PREMIUM COLLAGE / EDITORIAL COMPOSITE

A sophisticated multi-layer composition where 3-5 premium visual elements are intentionally layered to create depth, dynamism, and visual richness. NOT messy — every element has purpose.

COMPOSITION APPROACH:
- 3-4 distinct visual elements overlapping at deliberate angles (5-10° alternating tilts)
- Elements at different Z-depth levels: some in front, some behind, creating parallax depth
- Subtle depth-of-field: foremost elements are sharpest, background elements have subtle blur
- Each element casts a soft shadow on the layer below

ELEMENT TYPES (combine 3-4 of these):
1. TRADING SCREEN CARD: A phone or tablet screen showing a live trading chart — positioned at a slight angle (8° right tilt), crisp corner-to-corner. Screen glows with an internal light source.
2. TYPOGRAPHIC BLOCK: A floating text card (dark matte background, white text) showing the headline or price — positioned at opposite tilt (-6° left tilt) to create dynamic tension.
3. DATA VISUALIZATION: A horizontal sparkline or mini candlestick chart strip — positioned diagonally, like a torn newspaper clipping from the financial press.
4. GEOMETRIC ACCENT: A thin neon green rectangle or L-bracket frame element — positioned to visually anchor the composition.
5. PRICE BADGE: The "$38" or offer price rendered large and confident — the most prominent layer, positioned at compositional center-of-gravity.

LIGHTING AND COHESION:
- Unified lighting: all elements are lit from the same direction (upper-left key light)
- Each element has correct shadow direction for the light source
- Color cohesion: all elements use the same 4-color palette (black, white, neon green, blue)
- Subtle vignette darkens corners to focus attention on center

FEEL: Dynamic, sophisticated, curated — like the cover of Monocle magazine meets a Bloomberg data report.`,
    antiPatterns: 'NO chaotic random arrangements, NO cartoon or meme elements, NO emoji, NO clipart, NO inconsistent lighting directions, NO clashing color palettes, NO more than 5 elements, NO amateur Photoshop compositing, NO symmetric boring grids',
    references: ['Wired magazine covers', 'Forbes Tech covers', 'Coinbase marketing layered graphics', 'Apple MacBook Pro launch visuals', 'Adobe Creative Cloud marketing'],
  },
];

/**
 * Pick N random paradigms from the pool, ensuring diversity.
 * Never picks the same paradigm twice.
 */
export function pickDiverseParadigms(count: number = 3, exclude: string[] = []): ConceptParadigm[] {
  const available = CONCEPT_PARADIGMS.filter(p => !exclude.includes(p.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a specific paradigm by ID.
 */
export function getParadigm(id: string): ConceptParadigm | undefined {
  return CONCEPT_PARADIGMS.find(p => p.id === id);
}
