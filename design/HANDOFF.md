# HolaPrime Studio — Responsive Wireframes · Developer Handoff (v2)

A clean, responsive AI creative-studio chat interface: Desktop, Tablet, and Mobile, with all
primary states and flows. Rebuilt around a single coherent structure — one sidebar, one reading
column, one accent — for clear hierarchy and developer-ready consistency.

## Files in this folder

| File | What it is |
|---|---|
| `wireframes.html` | Self-contained **clickable prototype** + **all-frames gallery**. Opens in any browser, no build, works offline. |
| `HolaPrime-Studio-Wireframes.pdf` | PDF export of every frame (A4 landscape), generated from the gallery view. |
| `HANDOFF.md` | This document — tokens, components, layout, responsive rules. |

### Using the prototype
- **Device switch:** top bar → Desktop / Tablet / Mobile.
- **Jump to state:** Home, New chat, Conversation, Loading, Error, History/search, Drawer, Collapsed.
- **Click around:** New chat, search, the hamburger/drawer, the collapse chevron, composer send / suggestions, and Retry are all live.
- **Annotations:** toggle to show per-breakpoint responsive notes.
- **All frames / Print:** static cards of every frame → browser **Print → Save as PDF**, or import `wireframes.html` into Figma with **html.to.design** for editable layers.

> **On `.fig`:** Figma's `.fig` is a closed binary only Figma can author; a genuine editable `.fig` can't be produced outside the app. The supported route is importing this HTML via **html.to.design**, which reconstructs frames, Auto Layout, and styles.

---

## What changed from v1 (the redesign)

| v1 problem | v2 fix |
|---|---|
| Two left zones (icon rail **and** a generation panel) competing | **One sidebar** — nav · New chat · searchable history |
| Generation controls in a separate always-on form panel (form-vs-chat split) | Controls **live in the composer** (attach reference, aspect, style, mode) — prompting *is* the input |
| Crowded canvas header (5+ controls at one weight) | **Calm top bar** — title · source selector · share · more |
| Two accent colors (indigo + clay) used inconsistently | **One accent** (clay) for generative actions + active state; neutral everywhere else |
| Thread and controls on different axes | Thread + composer share **one centered 720px column** |

---

## Design tokens

### Spacing — 8px grid
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (`--s1`…`--s8`). All padding, gaps, and rhythm are multiples of 4/8.

### Radius
| Token | Value | Use |
|---|---|---|
| `--r` | 8px | controls, list items, inputs |
| `--r-lg` | 12px | cards, tiles, result grid |
| `--r-xl` | 16px | composer, message bubbles |
| `--r-pill` | 999px | tool pills, segmented control |

### Color — neutral base, single accent
| Token | Hex | Role |
|---|---|---|
| `--bg` / `--surface` | `#FFFFFF` | canvas, panels |
| `--sidebar` | `#F7F7F4` | sidebar surface |
| `--surface-2` | `#F3F3EF` | hovers, inputs, user bubble, tiles |
| `--border` | `#ECECE6` | hairlines |
| `--border-2` | `#DFDFD8` | inputs, emphasis dividers |
| `--text` | `#1A1A18` | primary |
| `--text-2` | `#6B6B65` | secondary |
| `--text-3` | `#9C9C94` | hints, placeholders, meta |
| `--accent` | `#C9603A` | **the one accent** — generative actions + active nav (clay) |
| `--accent-hover` | `#B5512F` | accent hover |
| `--accent-weak` | `#F8EDE7` | active-item tint, avatars |
| `--accent-text` | `#8A3E22` | text on accent tint |
| `--danger` / `--danger-weak` | `#C0341B` / `#FBEDE9` | error |

**Accent rule:** clay is the *only* chromatic color. It marks generative actions (New chat, Send,
Retry) and the active history item / rail icon. Everything else is the neutral gray scale. This is
what keeps the UI consistent and calm.

### Typography — Inter, weights 400 / 500 / 600
| Size | Weight | Use |
|---|---|---|
| 24px | 600 | empty-state headline |
| 18px | 600 | gallery / section headings |
| 14px | 600 | titles, buttons, message text |
| 13px | 400/500/600 | body, list items, field labels |
| 12px | 400/600 | meta, tool pills, actions |
| 11px | 600 | group labels (UPPERCASE, +0.04em) |

Sentence case throughout; the only uppercase is the small date-group labels.

---

## Component library

| Component | Class | Spec |
|---|---|---|
| Primary button | `.btn.btn-primary` | clay bg, white, 10/14 padding, `--r`, weight 600; hover `--accent-hover` |
| Ghost button | `.btn.btn-ghost` | white, `--border-2`, primary text |
| New chat | `.sb-new` (primary, full-width) | top of sidebar; rail shows it as an icon |
| Search field | `.sb-search` | white, `--border-2`; focus → accent ring (`.is-search`) |
| History item | `.sb-item` | 8/10 padding, icon + label; `.on` = `--accent-weak` + `--accent-text` |
| Group label | `.sb-group` | 11px uppercase, `--text-3` |
| Sidebar footer | `.sb-foot` | avatar + name/plan + settings |
| Icon rail | `.sb-rail` + `.rail-i` | 72px; brand · new chat · search · history · saved · settings · avatar |
| Top bar | `.appbar` | 56px; hamburger (≤tablet) · title · source selector · share · more |
| Source selector | `.source-sel` | outline pill with chevron (Custom / Top ads / Ad library) |
| Icon button | `.ab-ic` | 36×36, hover `--surface-2` |
| User message | `.msg-user` | `--surface-2`, right-aligned, 16/16/4/16 radius, max 80% |
| AI block | `.msg-ai` | 30px avatar + name + meta + result grid + actions |
| Result grid | `.var-grid` | 4-up desktop/tablet, 2-up mobile; `.var` tiles `--r-lg` |
| Result actions | `.actions .act` | Save · Download · Variations · Use as source (icon + label) |
| Loading | `.gen-loading` + `.sk` + `.spinner` | shimmer tiles + spinner via `.is-loading` |
| Error | `.error-card` | `--danger-weak`, title + cause + Retry; via `.is-error` |
| Composer | `.composer-box` | rounded container: prompt row + tool row |
| Composer tools | `.cb-tools .tool` | pills: Reference · 4:5 · Styles · Direct (icon-only on mobile) |
| Send | `.cb-send` | 34px clay square, `ti-arrow-up` |
| Suggestion card | `.sug` | icon + title + subtitle; empty-state starters |
| Drawer scrim | `.scrim` | `rgba(20,20,18,.35)`, single overlay elevation |

State is driven by classes on `.app`: `dev-{desktop|tablet|mobile}`, `view-{home|conversation}`,
`is-loading`, `is-error`, `is-search`, `collapsed`, `drawer-open`. This maps 1:1 to component props
when porting to React/Vue.

---

## Layout & responsive behavior

### Desktop — ≥1280px · 12-col grid
- **264px sidebar** (brand · New chat · search · date-grouped history · profile footer) + fluid canvas.
- Thread and composer share **one centered 720px column** — a single alignment axis.
- Sidebar **collapses to a 72px icon rail**; clicking search/history expands it.
- Searching (`is-search`) focuses the field, filters to matches, shows a result count — all in the sidebar.

### Tablet — 768–1024px · 8-col grid
- Sidebar persists as the **72px icon rail**; the hamburger expands it to a **284px drawer** over a scrim.
- Canvas full-width; composer stays in its centered column.

### Mobile — 360–430px · 4-col grid
- Sidebar becomes a **full drawer** (84% width) behind the hamburger. App bar = menu · title · source.
- Composer **pins to the bottom**; tool pills go **icon-only**. Result grid drops to **2-up**.

### Cross-breakpoint consistency
- Same 8px spacing, type ramp, radii, and the single accent at every size.
- Tap targets ≥36px. Hairline 1px borders. One overlay elevation (drawer).

---

## Flows / states covered (no placeholders)

Home / Empty · New chat · Conversation · Loading · Error · History / search ·
Sidebar expanded / collapsed (desktop) · Navigation drawer (tablet + mobile).

Wired interactions: New chat → home · Send / suggestion → loading → result · search → filtered
history · hamburger → drawer · collapse → icon rail · rail search/history → expand · Retry → re-run ·
scrim / × → dismiss.

---

## Developer notes
- Semantic markup (`aside` / `main` / `header` / `nav`), class-driven — portable to React/Vue/Svelte.
- No runtime deps; Tabler icon webfont + Inter (both swappable).
- One `.app` element; all device/state variants are CSS class permutations — no duplicated markup.
- To regenerate the PDF: open `wireframes.html?gallery` → Print → Save as PDF (A4 landscape, background graphics on).
