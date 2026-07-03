# Studio Generation Quality — Phase 0 Audit (findings + change plan)

**Scope:** `server/ai-studio/*` + `app/api/studio/route.ts`. No code changed in this phase.
**Goal:** verify the 4 root-cause hypotheses against the real code, then propose a plan.

---

## 0. The single most important finding

There are **two custom generation paths**, and **the UI defaults to the weaker one**:

| | `directMode` fast path (**DEFAULT**) | non-directMode / pattern-based path |
|---|---|---|
| Trigger | `creative-studio-view.tsx:162` → `directMode = true` by default; `route.ts:991` | `directMode` off, or "Top Ads" tab |
| Brief | `prompt-enhancer.ts` best-of-3 tournament | `prompts.ts` brief → `director.ts` |
| Layout variety | **22 format "directions" only — NO layout archetypes** | **8 rich layout paradigms** (`brand.ts`) via Creative Director |
| Design directive | SYSTEM_PROMPT rules only | + `PREMIUM_CRAFT_DIRECTIVE` + paradigm `imageDirective` |
| Variants | **1** image | 3 images |
| Scoring | **none** | `scoreVariants` (but see §Scorer) |
| Memory | **none** | `buildMemoryContext` injected |
| Self-correct | none | none (only the opt-in `type:'agentic'`) |

**So all the sophisticated machinery the repo already contains (8 layout paradigms, the Creative
Director, the scorer, memory) is bypassed for the path real users hit.** This single fact explains
most of problems 1, 2, 5, 6.

The full path for `he passed the challenge` (default): `route.ts:991` → `enhanceImagePrompt()`
(best-of-3, GPT-4.1) → judge → `genPrompt = enhanced.imagePrompt` (`route.ts:1083`) →
`generateImageOpenAI({prompt, '1024x1536','high','png'})` (sent **verbatim**, `imagegen-openai.ts:104`)
→ `applyLogoOverlay()` → Cloudinary. No director, no score, no memory.

---

## 1. The exact image-prompt strings sent to gpt-image-1

- **Default integrated path:** the prompt is **`enhanced.imagePrompt` verbatim** — a 350–700-word
  brief written by GPT-4.1. There is **no hardcoded scaffold string** appended in this path
  (`generateImageOpenAI` sends `params.prompt` unchanged; gpt-image-1 takes **no seed/temperature**).
  The structure is *soft* — imposed by the enhancer's `SYSTEM_PROMPT` (HARD RULE 7, which I recently
  edited to "reserve top ~10–12% brand strip, headline below") + the per-message `logoLine`. So layout
  isn't a fixed pixel template, but the brief-writer is steered toward one recurring skeleton
  (brand strip top → hero → CTA → disclaimer bottom).
- **Clean-text path (`cleanText:true`):** `genPrompt = DARK_PLATE + VISUAL_ONLY_DIRECTIVE + visualPrompt`.
  `VISUAL_ONLY_DIRECTIVE` (`route.ts:79`) **hardcodes a fixed scaffold**: *"Top 10% clear (logo) ·
  Middle ~45–65% hero · Bottom 30% (headline/body/CTA/disclaimer)"*. Every clean-text creative is
  forced into this one structure.
- **Pattern-based / non-directMode variants:** `brandVisualDirective + VISUAL_ONLY_DIRECTIVE +
  userRequirementsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE` (`route.ts:828`). Here the
  `conceptPrompt` comes from a paradigm, so layout varies — but the same fixed top/mid/bottom scaffold
  is still prepended.
- **`text-overlay.ts` (clean-text compositor):** text is placed at **fixed coordinates** computed from
  image height fractions (`yPos = height*0.16` headline, `height*0.42` price, `height*0.58` bullets,
  `height*0.80` CTA, etc.) — **completely independent of the generated image content.** Confirmed:
  placement is not content-aware.

**Verdict on hypothesis (a) "templated visual scaffold":** ✅ **true for clean-text + pattern paths**
(hardcoded top/mid/bottom + fixed overlay coords); ⚠️ **soft, not hardcoded, for the default integrated
path** (but still one recurring skeleton because the brief-writer has no layout-archetype menu).

---

## 2. Diversity mechanism — the reality

- **`STUDIO_BEST_OF` = 3** (`prompt-enhancer.ts:39`). Three briefs generated **in parallel**, then a judge.
- **Sampling IS randomized per run:** `pickDirectionsDistinct(3)` and `pickAngles(3)` use a
  `Math.random()` shuffle (`prompt-enhancer.ts:88–104`) over **22 directions × 5 angles**. So it is
  *not* "the same few always selected" deterministically — there is real per-run randomness.
- **But effective diversity is throttled by four things:**
  1. Only **3 of 22** directions are sampled per run and the **judge picks 1** → the user sees 1 of 3.
  2. The **judge is biased**: it's told to reward "most scroll-stopping / emotional / original"
     (`prompt-enhancer.ts:397`) — this systematically favors a few archetypes (emotional human, vault,
     receipt), collapsing variety even though sampling is random.
  3. **No anti-repeat / no memory of recent runs** in the default path → consecutive generations can
     resample the same direction/angle and the same hooks.
  4. The 22 directions are **formats/subjects** (receipt, terminal, vault…), **not layout archetypes**
     (centered hero, asymmetric split, editorial, minimal…). The 8 real layout archetypes in `brand.ts`
     are **never used** by the default path.
- **Temperatures:** ideation/brief = **0.9** (`ENHANCER_TEMPERATURE`, `prompt-enhancer.ts:35`); judge = **0.2**
  (`prompt-enhancer.ts:405`). Reasonable split, but no random *seed token* is injected into the ideation
  prompt, and the image model itself is seedless.

**Verdict on "shallow/low-entropy diversity":** ⚠️ **partly true** — randomness exists, but it's
diluted by judge bias, no anti-repeat, and (critically) no layout-archetype dimension on the default path.

---

## 3. Does `memory.ts` clone templates or inspire?

- **Framed as inspiration:** `buildMemoryContext` explicitly says *"Use these patterns as inspiration
  but do NOT copy them — create something new"* (`memory.ts:195`). So the "memory = template clone"
  hypothesis is **mostly false**.
- **But it doesn't matter for the default path:** memory is only injected on **pattern-based**
  (`route.ts:420`). The default `directMode` path never calls it.
- **Latent issues:** (a) since the scorer floors every score to ≥8 (see §below), "top performers" is
  effectively "recent generations" — the ranking signal is dead. (b) Env-var bug: `memory.ts:11` reads
  `MONGODB_DB_NAME` while the rest of the app uses `MONGODB_DB` → memory can read/write a different DB.

---

## 4. Text placement

- **Integrated mode:** placement is **unconstrained** beyond the soft "reserve top strip, headline
  below" rule in the enhancer SYSTEM_PROMPT. The model decides where text lands; nothing ties it to
  the focal point or negative space.
- **Clean-text mode:** overlay coordinates are **fixed** (`text-overlay.ts`, height-fraction `yPos`)
  **regardless of image content** — so text can land on top of the hero subject if the image's busy
  region happens to be where the template drops text.

**Verdict on hypothesis (problem 3):** ✅ **true.** No content-aware placement anywhere.

---

## 5. Ad-copy generation & repetition

- Copy (headline/bullets/CTA/overlay) is written by the brief LLM per candidate at temp 0.9.
- **No no-repeat constraint and no recent-copy memory** in the default path. `validateBrief`
  (`prompt-enhancer.ts:254`) only checks length / brand CTA / disclaimer / number-preservation — it
  does **not** check novelty against past copy.

**Verdict on hypothesis (d) "deterministic copy":** ⚠️ technically stochastic, but **feels
deterministic** because there's no diversity constraint and the LLM mode-seeks the same hooks for a
given prompt. Real problem, real fix needed.

---

## 6. Short / emotional prompt handling

- `enhanceImagePrompt` treats `"she doubted him. then he withdrew $8,400"` like any prompt — it goes
  straight into `buildUserMessage` as the user request. The SYSTEM_PROMPT *does* say "expand a short,
  vague request" and "headline is a hook," so there **is implicit interpretation** by the brief LLM.
- **But there is NO explicit narrative→scene step**: nothing extracts emotion / character / conflict /
  the single visual moment / stakes before ideation. The terse line is interpreted ad-hoc, which is why
  short emotional prompts produce generic or literal results.

**Verdict on hypothesis (c):** ✅ **true.** No structured interpretation step exists.

---

## 7. The scorer is cosmetic (bonus finding, blocks Phase 2)

`scorer.ts` has 12 dimensions, **but**:
- `finalOverall = Math.max(finalOverall, 8.0)` (`scorer.ts:228`) — **every** creative is forced to ≥ 8.0.
- Every individual dimension is floored to ≥ 7.5 (`scorer.ts:236–239`).
- It uses `Math.max(claudeOverall, computed)` (benefit of the doubt, `:223`).

→ The scorer **cannot penalize a weak composition**, so it can't drive selection or self-correction.
It also has **no "text-placement" or "clutter/element-count" dimension**, and it's **never called on
the default path**. Phase 2 must un-neuter this and add the missing dimensions, or scoring is theatre.

---

## Hypothesis scorecard

| Your hypothesis | Verdict |
|---|---|
| (a) templated scaffold + low-entropy diversity | **Partly.** Hardcoded scaffold real in clean-text/pattern paths + fixed overlay coords; default path has a *soft* recurring skeleton + no layout-archetype menu. Diversity is randomized but throttled by judge bias, no anti-repeat, and missing layout dimension. |
| (b) no design-principle guidance | **Partly.** Guidance exists in SYSTEM_PROMPT + (for director paths) `PREMIUM_CRAFT_DIRECTIVE`, but it's **not enforced/scored** on the default path, and the scorer that would enforce it is neutered. |
| (c) no narrative→scene step | **Confirmed true.** |
| (d) deterministic copy | **Confirmed in effect** — no novelty constraint / no recent-copy memory. |

Plus two findings you didn't list: **the default path bypasses all advanced machinery**, and **the
scorer is floored to ≥8 (cosmetic)**.

---

## Proposed change plan (all inside `server/ai-studio/` + `route.ts`)

### Phase 1 — Diversity & novelty (problems 1, 2, 5)
- **Layout-archetype dimension on the default path:** reuse/extend the 8 `brand.ts` paradigms (or a
  trimmed library) and have `prompt-enhancer` assign a **distinct layout archetype per candidate**, then
  carry the winner's archetype into `imagePrompt`. This is the biggest single lever.
- **Anti-repeat rotation:** persist the last N (angle, direction, archetype) tuples (in-memory ring +
  optional `creative_generations` lookback) and exclude them from the next sampling, so consecutive runs
  don't reuse combos.
- **Per-run entropy:** inject a random creative-seed token into the ideation user message (varies wording
  even at fixed direction); keep ideation temp 0.9 (maybe 0.95), judge strict at 0.2.
- **Memory → inspiration only** (it already is) and **fix the `MONGODB_DB` env-var bug**; gate memory
  injection so it never narrows novelty.

### Phase 2 — Design discipline (problems 3, 4, 6)
- Add a compact **design-principles block** to the ideation SYSTEM_PROMPT *and* the default image prompt
  (hierarchy / one focal point / deliberate negative space / 1–2 type families / squint test / restraint).
- **Un-neuter `scorer.ts`** (remove the ≥8 / ≥7.5 floors), add **`textPlacement`** and **`clutter`**
  dimensions, and **run scoring on the default path** with a cheap best-of-2 keep-best (or a single
  self-correct retry when composition score is low).
- **Content-aware overlay** in `text-overlay.ts`: pick the calmest/largest negative-space region
  (Sharp region stats) instead of fixed coordinates; respect safe margins; never cover the focal subject.

### Phase 3 — Narrative→scene interpretation (problem 7)
- Add an **interpretation pass** in `prompt-enhancer` (before the tournament) for short/emotional prompts:
  extract `{emotion, characters, conflict/turn, the single visual moment, stakes, cinematic scene}` and
  feed that scene concept into each candidate brief. Skip it for prompts that are already explicit offers.

### Phase 4 — Copy uniqueness (problem 8)
- When the user supplies no copy, add a **novelty constraint**: vary hook angle/structure/wording and
  **avoid phrasing used in recent `creative_generations`** (lightweight similarity check); make copy match
  the chosen creative's angle/emotion.

### Guardrails honored throughout
Integrated logo composite stays (model draws no logo; real PNG after); clean-text stays zero-typo;
provider/Cloudinary/brand-kit graceful degradation preserved; `(6)` + zip untouched. After each phase:
3–4 test creatives incl. the single-liner, before/after.

---

**Phase 0 complete — no code changed. Awaiting approval before Phase 1.**
