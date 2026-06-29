// 33 blog featured-image definitions.
// Each: { slug, title, scene } — `scene` is the topic-specific part of the
// background prompt; a shared cinematic style is prepended in generate step.
// Backgrounds carry NO text (text is overlaid programmatically for crisp output).

export const STYLE =
  'Cinematic professional photograph for a finance blog header, premium dark moody ' +
  'aesthetic, deep charcoal and navy tones with a subtle teal-cyan accent glow, ' +
  'glowing trading screens and candlestick charts in the background, shallow depth of ' +
  'field, soft bokeh, volumetric light, ultra sharp, high detail, 8k editorial quality, ' +
  'clean uncluttered center area, darker toward the middle for text overlay space. ' +
  'No text, no words, no letters, no numbers, no captions, no watermark, no logos, no UI labels.';

export const blogs = [
  { slug: 'gold-futures-contracts-comparison',
    title: 'Different Gold Futures Contracts: Detailed Comparison',
    scene: 'gleaming stacked gold bullion bars on a dark desk beside a monitor showing a rising gold price chart, warm golden rim lighting against deep charcoal' },

  { slug: 'nas100-for-prop-traders',
    title: 'Why NAS100 is a Go-To Instrument for Prop Trading Firms',
    scene: 'a sleek multi-monitor trading station glowing electric blue with the Nasdaq tech-index candlestick chart, futuristic dark trading floor' },

  { slug: 'introduction-to-prop-trading-guide',
    title: 'Introduction to Prop Trading: A Comprehensive Guide',
    scene: 'an organised professional six-monitor proprietary trading desk overview, glowing charts, modern dark office at night' },

  { slug: 'prop-firm-payout-rules-explained',
    title: 'Prop Firm Payout Rules: Complete Guide',
    scene: 'neat stacks of US hundred dollar bills and gold coins on a dark desk beside a glowing profit chart, premium payout theme' },

  { slug: 'become-successful-prop-trader',
    title: 'How to Become a Successful Prop Trader in 2025',
    scene: 'a confident silhouette of a trader before a wall of green rising charts, glowing night city skyline through the window, aspirational success mood' },

  { slug: 'best-futures-prop-firm',
    title: 'Why Hola Prime is the Best Futures Prop Trading Firm',
    scene: 'a premium high-end futures trading desk with a softly glowing golden award trophy, polished dark surfaces, elite professional atmosphere' },

  { slug: 'commodities-trading-with-prop-firms',
    title: 'Commodities Trading with Prop Trading Firms: All You Need to Know',
    scene: 'a montage of commodities — gold bars, crude oil barrels, copper and wheat — arranged on a dark surface with glowing commodity price charts behind' },

  { slug: 'comparing-best-prop-firms',
    title: 'Top Prop Trading Firms of 2025: Comparing Best Prop Firms',
    scene: 'several glowing monitors side by side showing comparison bar charts and leaderboard-style rankings, dark modern fintech command center' },

  { slug: 'futures-prop-firm',
    title: 'What Is a Futures Prop Firm? How to Evaluate Futures Prop Firms in 2025',
    scene: 'a futures trading workstation with glowing index futures charts and a faint evaluation checklist hologram, dark cyan-lit office' },

  { slug: 'futures-prop-trading-and-how-to-get-started',
    title: "What is Futures Prop Trading? A Complete Beginner's Guide",
    scene: 'a clean welcoming beginner futures trading desk with a single glowing upward chart on a large monitor, soft teal light, approachable dark studio' },

  { slug: 'futures-vs-options-prop-trading',
    title: 'Futures vs Options: Which One Is Better for Prop Trading?',
    scene: 'a split-screen dark composition, left side futures candlestick chart in teal, right side options payoff curve in amber, balanced versus theme' },

  { slug: 'guide-to-forex-prop-trading',
    title: "Forex Prop Trading: Complete Beginner's Guide",
    scene: 'glowing world currency symbols (dollar, euro, pound, yen) floating above a dark desk with forex candlestick charts and a faint world map, cyan glow' },

  { slug: 'guide-to-forex-trading',
    title: 'How Forex Trading Works: All You Need to Know',
    scene: 'an elegant dark globe with glowing currency-exchange connection lines arcing between financial cities, forex charts in the background' },

  { slug: 'how-to-choose-futures-prop-firm',
    title: 'How to Choose a Futures Prop Firm',
    scene: 'a hand reaching toward one of several glowing futures-firm option panels floating in a dark space, decision and selection mood' },

  { slug: 'how-to-choose-the-right-prop-trading-firm',
    title: 'How to Choose the Right Prop Trading Firm',
    scene: 'a premium dark desk with a glowing magnifying glass over comparison cards and rising charts, careful selection theme, elite atmosphere' },

  { slug: 'how-to-choose-right-prop-firm',
    title: 'How to Choose the Right Prop Trading Firm for You',
    scene: 'a personal trading setup with a glowing checkmark on the chosen firm panel among options, warm-cool balanced dark scene' },

  { slug: 'pass-futures-prop-challenge',
    title: 'How to Pass Futures Prop Firm Challenge',
    scene: 'a glowing green target with a chart arrow hitting the bullseye, rising futures chart and a subtle finish-line glow, achievement mood, dark' },

  { slug: 'profit-split',
    title: 'What is Prop Trading Profit Split?',
    scene: 'a glowing 3D pie chart splitting a stack of golden coins into shares above a dark reflective desk, clean profit-division concept' },

  { slug: 'scaling-in-prop-trading',
    title: 'What is Scaling in Prop Trading?',
    scene: 'a dramatic ascending staircase of glowing green bar charts climbing upward into the dark, growth and scaling theme, cyan rim light' },

  { slug: 'what-is-a-prop-trading-firm',
    title: 'What Is a Prop Trading Firm?',
    scene: 'a sleek modern dark financial office interior with a glowing trading wall and a subtle corporate building silhouette, firm headquarters mood' },

  { slug: 'what-is-a-prop-firm-challenge',
    title: 'What is a Prop Firm Challenge? How to Pass Like a Pro',
    scene: 'a glowing trading challenge dashboard with a progress gauge near its target and a rising chart, focused professional dark setup' },

  { slug: 'benefits-of-trading-mentor',
    title: 'Benefits of a Trading Mentor and How to Choose One',
    scene: 'two silhouetted figures at a glowing chart screen, an experienced mentor guiding a trader, warm mentorship glow in a dark office' },

  { slug: 'prop-trading-is-budget-friendly-investment',
    title: 'Why Prop Trading is a Budget-Friendly Investment Alternative',
    scene: 'a glowing piggy bank beside a small stack of coins growing into a rising chart on a dark desk, affordable accessible investment mood, teal accent' },

  { slug: 'futures-prop-trading-rules',
    title: 'Futures Prop Trading Rules Explained',
    scene: 'a glowing open rulebook with futures chart pages and a faint compliance checklist, structured professional dark scene, cyan light' },

  { slug: 'instant-funding-vs-challenge-futures-prop-firm',
    title: 'Instant Funding vs Challenge Models',
    scene: 'a dark split composition, left a glowing instant lightning-bolt funded account, right a staged challenge ladder, versus comparison theme' },

  { slug: 'risk-management-rules-trading-e-mini-nasdaq-100',
    title: 'Risk Management Rules for Trading E-mini Nasdaq 100',
    scene: 'a glowing protective shield over a Nasdaq E-mini candlestick chart, risk-control theme, deep blue and teal lighting on a dark desk' },

  { slug: 'smart-position-sizing-micro-e-mini-sp500',
    title: 'Smart Position Sizing in Micro E-mini S&P 500',
    scene: 'glowing graduated stacks of trading chips of increasing size beside an S&P 500 micro futures chart, calculated sizing concept, dark teal scene' },

  { slug: 'traders-risks-in-prop-trading',
    title: 'Key Risks for Traders in Proprietary Trading',
    scene: 'a glowing red warning triangle over a volatile falling candlestick chart, caution and risk theme, dramatic dark scene with red-orange accents' },

  { slug: 'types-of-trading-orders',
    title: 'Type of Orders Every Trader Must Know',
    scene: 'a glowing order-book ladder and limit/market order panels floating above a dark trading desk, clean fintech UI glow in teal' },

  { slug: 'avoid-emotional-trading',
    title: '7 Emotional Trading Mistakes and How to Avoid Them',
    scene: 'a glowing human head silhouette with a chart line as brainwaves, split calm-blue and stressed-red halves, trading psychology theme, dark' },

  { slug: 'why-forex-strategy-fails-prop-firm-challenge',
    title: 'Why Your Forex Technical Strategy Fails Prop Firm Challenges',
    scene: 'a forex candlestick chart with a glowing cracked or broken trendline and a faint warning glow, failed strategy theme, moody dark amber-red' },

  { slug: 'why-traders-fail-futures-prop-challenge',
    title: 'Why Most Traders Fail Futures Prop Firm Challenges',
    scene: 'a steeply falling red futures candlestick chart with a glowing downward arrow breaking a support line, failure and caution mood, dark' },

  { slug: 'mastering-portfolio-diversification',
    title: 'Mastering Portfolio Diversification in Trading',
    scene: 'a glowing balanced portfolio donut chart with diverse asset icons — stocks, gold, forex, crypto — orbiting on a dark reflective desk, teal-gold glow' },
];
