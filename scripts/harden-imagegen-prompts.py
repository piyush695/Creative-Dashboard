"""Add TEXT FIDELITY + PREMIUM CRAFT directives to the image-gen prompt
assembly in app/api/studio/route.ts (both pattern-based and custom paths).

The hardening targets two specific Gemini failure modes:
  1. Text rendering errors ("3% sstep verification", garbled prices, mis-spelled
     words). Mitigated by per-string letter-by-letter spelling + repetition.
  2. Mediocre visual craft (sparse compositions, generic stock-photo feel).
     Mitigated by premium agency-grade directives + concrete craft references.

Two helpers are inserted near the top of POST() and then both manifests
(pattern-based + custom) get the new blocks appended.
"""
from pathlib import Path

f = Path(r"C:\Users\PC\Downloads\Creative_Dashboard (1)\Creative_Dashboard\app\api\studio\route.ts")
raw = f.read_bytes()
# Normalize CRLF -> LF for matching; remember original to restore later if needed
had_crlf = b"\r\n" in raw
src = raw.decode("utf-8").replace("\r\n", "\n")

# ─── Helper functions to inject as a module-level const ────────────────────
HELPER_BLOCK = """
// ─── Text fidelity helpers — used to combat Gemini text-rendering errors ───
// Gemini's image model frequently introduces character doubling ("sstep"),
// truncation, or substitution in rendered text. These helpers build a brutally
// explicit per-string spelling directive that we append to every image prompt.

function spellCharByChar(s: string): string {
  // "$25K" -> "[$]-[2]-[5]-[K]"
  return s
    .split('')
    .map((ch) => (ch === ' ' ? '[space]' : `[${ch}]`))
    .join('-');
}

function buildTextFidelityBlock(texts: Array<{ label: string; value: string }>): string {
  const populated = texts.filter((t) => t.value && t.value.trim().length > 0);
  if (populated.length === 0) return '';

  const lines = populated.map((t) => {
    const v = t.value.trim();
    return `  - ${t.label}: "${v}"\\n    Letter by letter: ${spellCharByChar(v)}\\n    Render EXACTLY these ${v.length} characters in this exact order. No doubled letters. No missing letters. No substitutions.`;
  });

  return `\\n=== TEXT FIDELITY GUARANTEE (CRITICAL — read 3 times before rendering) ===\\nEvery text element below MUST appear in the image EXACTLY as spelled, character for character. Gemini frequently doubles letters ("step" -> "sstep") or drops them — DO NOT do this. Verify each rendered word matches the source string letter for letter.\\n\\n${lines.join('\\n\\n')}\\n\\nFORBIDDEN RENDERING PATTERNS (these are common errors — never produce them):\\n  - Doubled letters at start of words ("sstep", "Cchallenge", "wWithdrawals")\\n  - Missing letters ("Challnge", "Withdrawls", "Fictious")\\n  - Substituted similar characters ("0" for "O", "1" for "I", "%" for "$")\\n  - Concatenated words ("3-step" -> "3step")\\n  - Made-up similar-looking text ("Profit" -> "Pofit")\\n\\nAfter rendering, mentally re-read every word. If any word is misspelled, the brief has FAILED.\\n=== END TEXT FIDELITY GUARANTEE ===\\n\\n`;
}

// ─── Premium craft directive — appended to every variant prompt ───
// This is the quality ceiling reminder. Gemini defaults to "fine" — this pushes
// it toward "agency-grade" by anchoring on specific real-world references.

const PREMIUM_CRAFT_DIRECTIVE = `\\n=== PREMIUM CRAFT BAR ===\\nThis ad must look like work from a top-tier agency (Wieden+Kennedy, Apple in-house, Linear / Stripe brand team). Not "AI-generated 2024". Concretely:\\n\\n- Typography: Sharp Inter/Helvetica-grade sans-serif. Hero number at 30-40% canvas height. Body text at 14-18pt equivalent. NEVER cramped, NEVER overlapping.\\n- Composition: Strong center axis OR deliberate asymmetry — never "just placed it somewhere". 15-20% breathing room on all sides.\\n- Single dominant focal point. Everything else SUPPORTS, not competes.\\n- Materials: When using 3D — chrome should look like real chrome (high contrast, accurate reflections). When using glow — should be subtle volumetric light, not flat gradient.\\n- Color: Restrained 3-4 color palette. Black background + ONE accent color (cyan, neon green, blue, or amber). Avoid rainbow gradients.\\n- Detail: Subtle texture/grain on dark backgrounds for premium depth. Crisp edges on text. No fuzzy mid-tones.\\n- What this is NOT: a stock-photo collage, a generic corporate template, a "modern" SaaS landing page screenshot, a Canva-tier composition.\\n\\nReference quality: A real ad you'd see in Times Square, in Bloomberg's print edition, or in a top fintech brand campaign. If a Times Square pedestrian would barely glance at the rendered output, the brief has FAILED.\\n=== END PREMIUM CRAFT BAR ===\\n\\n`;

"""

# Insert the helpers just after the imports block (right after the ad-library-db import)
import_anchor = 'import { getStoredAdContext } from \'@/lib/ai-studio/ad-library-db\';'
imp_idx = src.find(import_anchor)
assert imp_idx != -1, "Import anchor not found"
imp_end = src.find('\n', imp_idx) + 1
src = src[:imp_end] + HELPER_BLOCK + src[imp_end:]

# ─── Augment the pattern-based textManifest construction ────────────────────
# Find the existing textManifest assignment and append the new blocks AFTER it.
pattern_textmanifest_anchor = '=== END TEXT MANIFEST ===\n\n`;'
idx1 = src.find(pattern_textmanifest_anchor)
assert idx1 != -1, "Pattern textManifest anchor not found"
idx1_end = idx1 + len(pattern_textmanifest_anchor)

PATTERN_AUGMENT = """

      // Build the per-string text-fidelity block from every populated copy field
      const patternTextFidelity = buildTextFidelityBlock([
        { label: 'HEADLINE', value: mHeadline },
        { label: 'HOOK TEXT', value: mHook },
        { label: 'BODY COPY', value: mBody },
        { label: 'URGENCY ELEMENT', value: mUrgency },
        { label: 'DISCOUNT BADGE', value: mDiscount },
        { label: 'CTA BUTTON', value: mCta },
        { label: 'TRUST LINE', value: mTrust },
        ...mBullets.map((b: any, i: number) => ({ label: `BULLET ${i + 1}`, value: String(b) })),
      ]);
"""

src = src[:idx1_end] + PATTERN_AUGMENT + src[idx1_end:]

# Now wire pattern-based variantPrompt to include the fidelity + craft blocks
# Find the line where variantPrompt is composed
old_pattern_assembly = """            const variantPrompt = useDirectorPrompt
              ? brandVisualDirective + textManifest + userRequirementsBlock + conceptPrompt
              : brandVisualDirective + textManifest + userRequirementsBlock + variant.promptPrefix + basePrompt;"""

new_pattern_assembly = """            const variantPrompt = useDirectorPrompt
              ? brandVisualDirective + textManifest + patternTextFidelity + userRequirementsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
              : brandVisualDirective + textManifest + patternTextFidelity + userRequirementsBlock + variant.promptPrefix + basePrompt + PREMIUM_CRAFT_DIRECTIVE;"""

assert old_pattern_assembly in src, "Pattern variantPrompt assembly not found"
src = src.replace(old_pattern_assembly, new_pattern_assembly, 1)

# ─── Augment the custom-path textManifest construction ──────────────────────
# Custom path is weaker — needs to mirror the pattern-based hardening.
custom_textmanifest_anchor = '=== END MANIFEST ===\\n\\n`;'
idx2 = src.find(custom_textmanifest_anchor)
assert idx2 != -1, "Custom customTextManifest anchor not found"
idx2_end = idx2 + len(custom_textmanifest_anchor)

CUSTOM_AUGMENT = """

      // Build per-string fidelity block for the custom path
      const customTextFidelity = buildTextFidelityBlock([
        { label: 'HEADLINE', value: cmHeadline },
        { label: 'HOOK TEXT', value: cmHook },
        { label: 'BODY COPY', value: cmBody },
        { label: 'URGENCY ELEMENT', value: cmUrgency },
        { label: 'DISCOUNT BADGE', value: cmDiscount },
        { label: 'CTA BUTTON', value: cmCta },
      ]);
"""

src = src[:idx2_end] + CUSTOM_AUGMENT + src[idx2_end:]

# Custom variantPrompt assembly
old_custom_assembly = """            const variantPrompt = useDirectorPrompt
              ? customBrandPrefix + customTextManifest + customUserReqsBlock + conceptPrompt
              : customBrandPrefix + customTextManifest + customUserReqsBlock + variant.prefix + baseImagePrompt;"""

new_custom_assembly = """            const variantPrompt = useDirectorPrompt
              ? customBrandPrefix + customTextManifest + customTextFidelity + customUserReqsBlock + conceptPrompt + PREMIUM_CRAFT_DIRECTIVE
              : customBrandPrefix + customTextManifest + customTextFidelity + customUserReqsBlock + variant.prefix + baseImagePrompt + PREMIUM_CRAFT_DIRECTIVE;"""

assert old_custom_assembly in src, "Custom variantPrompt assembly not found"
src = src.replace(old_custom_assembly, new_custom_assembly, 1)

if had_crlf:
    src = src.replace("\n", "\r\n")
f.write_text(src, encoding="utf-8", newline="")
print(f"OK final file size: {len(src)} chars (crlf={had_crlf})")
