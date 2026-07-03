# Hola Prime Creative Design System

Reverse-engineered from the team's **human-designed** reference creatives (BAU June, 22 ads).
This is the spec the template engine (`brand-system.ts` + `template-studio.ts`) renders to.

## Format
- **1:1 square, 1080×1080** (Meta/IG feed). NOT 9:16. The whole reference set is square.

## Fixed brand furniture (identical on every ad — rendered deterministically)
| Element | Position | Notes |
|---|---|---|
| **hola prime** logo | top-left | real PNG composited (`public/holaprime-logo.png`) |
| **#WeAreTraders** pill | top-right | outlined rounded pill |
| **Trustpilot ★ 4.6** | bottom-left | green star boxes + "Trustpilot" + 4.6 |
| **Independently Reviewed By Deloitte.** | bottom-right | "Deloitte." bold |
| Disclaimer | bottom-center | 2–3 lines, tiny gray, verbatim legal |
| **ZERO PAYOUT DENIAL** stamp | bottom-right (above Deloitte) | optional circular seal |

## Palette
- Base: near-black `#05060A`. Type: white. **ONE accent per creative** (varies by campaign):
  cyan `#29B6E8` · green `#00E676` · purple `#7B4DFF` · red `#E0201B` · blue `#2F6BFF` · magenta `#C42AC4`.
- Trustpilot stars always green `#00B67A`.

## Typography
- Huge bold sans (Arial/Helvetica-grade, weight 900) for headlines and the hero number.
- **Two-tier headline**: small regular setup line over a large heavy/accent hero line.
- **Hero number treatment**: either the accent color OR a **chrome/metallic gradient** (signature — p08 "45% OFF", p09 "$100K", p11 "$429", p14 "$359"). ~2–3× the surrounding text.
- **Red strikethrough** on the anchor price for discounts (p11 $780→$429, p15 $259→$179).
- Benefit **pills** (rounded outline, white text) are a signature element.

## Layout archetypes (count / AI-imagery dependence / matchability)
| Archetype | Count | Needs AI imagery? | Our match |
|---|---|---|---|
| **giant-number-hero** | 6 | 5× none, 1× subject | ✅ procedural — strong |
| **testimonial-screenshot** | 4 | none | ✅ procedural — strong |
| **benefit-stack-pills** / gradient-orb | 3 | none | ✅ procedural — strong |
| **conceptual-object-metaphor** | 4 | subject/heavy | ⚠️ imagery-gated |
| **photographic-lifestyle-subject** | 5 | subject/heavy | ⚠️ template matches, imagery is the ceiling |

## Background modes
- `black` — near-black + faint corner orb glows (code radial gradients).
- `orb` — the iridescent sphere rising from the bottom (code radial gradient — no AI).
- `solid` — themed solid/gradient color (e.g. green for the traffic-light concept).
- `photo` — gpt-image-1 plate; only for conceptual-object / photographic archetypes.

## Verified key insight
**12 of 22 (55%) need NO AI imagery** (`none`); 8 need a single subject; only **2** are heavy photographic
scenes. The majority win on **typography + layout + pills/badges on a code-rendered background** — so the
engine renders those deterministically and calls gpt-image-1 only for the genuinely photographic archetypes.

## Engine mapping
- `brand-system.ts` — canvas, palette, disclaimer, the fixed-furniture SVG renderer (`brandFurniture`), logo box.
- `template-studio.ts` — procedural backgrounds, the archetype layouts (`giant-number`, `testimonial`,
  `benefit-stack`, `photographic`), and `renderCreative(spec)` which composes background + type + furniture + logo.
