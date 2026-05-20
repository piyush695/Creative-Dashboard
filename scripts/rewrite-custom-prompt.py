"""One-shot rewrite of the custom-tab prompt block in app/api/studio/route.ts."""
from pathlib import Path

f = Path(r"C:\Users\PC\Downloads\Creative_Dashboard (1)\Creative_Dashboard\app\api\studio\route.ts")
src = f.read_text(encoding="utf-8")

start_marker = "      userContent.push({\n        type: 'text',\n        text: `You are a world-class creative strategist specializing in prop trading firm advertising for Hola Prime."
end_marker_anchor = '"detailed": "600+ word image prompt.'

start_idx = src.find(start_marker)
assert start_idx != -1, "Start marker not found"

end_search_from = src.find(end_marker_anchor, start_idx)
assert end_search_from != -1, "End anchor not found"
end_idx = src.find("`\n      });", end_search_from)
assert end_idx != -1, "Closing pattern not found"
end_idx += len("`\n      });")

print(f"Replacing {end_idx - start_idx} chars")

NEW_BLOCK = r"""      userContent.push({
        type: 'text',
        text: `You are a senior creative director at a top-tier ad agency working on Hola Prime. You have just been shown 5-12 real top-performing ads (the reference images above this prompt). Your job: produce a creative that COULD HAVE BEEN IN that set - same craft bar, same brand presence - but with a NEW idea.

# HARD NON-NEGOTIABLES (violating any of these is a failed brief)

1. CTA TEXT: Must be exactly "Buy Challenge" (English) or "Compra el Challenge" (Spanish). NOT "Access Algorithm", NOT "Get Started", NOT "Learn More", NOT "Claim Yours", NOT anything else. The CTA is FIXED brand vocabulary.

2. HERO NUMBER: The price/offer (e.g. "$9", "$25K", "$100K", "$38") must occupy 30-40% of the vertical canvas height. Treatment: 3D chrome metallic OR neon glow (cyan/green). It is THE visual focal point - everything else supports it. Headlines like "THE $25K ALGORITHM" with the number at body-text size are FAILED briefs.

3. LOGO ZONE: Top-left 12-15% width = COMPLETELY EMPTY in your image prompt (no logo drawn - the real PNG is overlaid post-process). Do NOT instruct the image gen to draw "hola prime" text or wordmark.

4. WEARETRADERS BADGE: Top-right has "#WeAreTraders" in a white thin outline pill. Exactly once, exactly that spelling.

5. DARK BACKGROUND: Deep black (#000000 to #080810). Bright/white backgrounds are FAILED briefs (HolaPrime tested this - they lost).

6. DISCLAIMER: Bottom edge, tiny gray text, verbatim: "HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS."

# BANNED VOCABULARY (instant brief failure if used in copy)

These phrases scream "AI generated 2024 cliche" and are BANNED from headlines, body copy, and concept titles:

- "AI-powered", "AI-driven", "powered by AI", "machine learning", "ML-based"
- "Revolutionary", "Next-gen", "Next-generation", "Game-changing"
- "Unlock your potential", "Unleash", "Elevate your"
- "Algorithm", "The Algorithm", "Our algorithm" (even if user prompt mentions AI/fintech - translate intent, do not echo the word)
- "Cutting-edge", "State-of-the-art", "Innovative" (these are tells, not selling points)
- Startup-speak: "synergy", "ecosystem" (unless literally about a real platform like NinjaTrader)

If the user brief says "feel like fintech innovation", deliver that FEELING with concrete language. E.g. specific outcome ("Your first \$50K payout in 30 days"), counter-narrative ("Most prop firms are designed to fail you - this one isn't"), or cultural specificity. NEVER use the dead phrases above.

# 2026 TREND HOOKS - RIDE ONE OF THESE

What is actually hitting in trader/fintech ads RIGHT NOW (mid-2026):

- RECEIPT AESTHETIC: Trade confirmations, P&L screenshots, payout proofs styled as design elements. Cred over promises.
- ANTI-PROP-FIRM FRAMING: "The prop firm built by traders, not gambling psychologists." Traders are exhausted by FTMO clones - call it out.
- LOSS-AVERSION SPECIFICITY: Not "Don't miss out" but "Stop watching your friends withdraw \$10K monthly while you're still demo trading."
- NUMERICAL PROOF: "Average payout time: 7 minutes" beats "Fast payouts". Specific over vague.
- COUNTER-AESTHETIC: When the industry uses neon glow-up, a stark Helvetica-on-black ad stands out. When it goes minimal, brutalism + jpeg-compressed early-internet aesthetic stands out. Pick the OPPOSITE of what 5 random competitor ads do this week.
- CULTURAL MOMENTS: India F&O regulatory changes, US prop-firm post-MyForexFunds aftermath, crypto futures volatility, Fed rate decisions - leverage timely angles.
- FORMAT INNOVATION: Phone notification UI, Bloomberg-terminal aesthetic, fake "leaked" Slack screenshots, "x-rays" of a trade, payout receipts as ASMR object photography.

PICK ONE trend hook. Execute it well. Do not try to use all of them.

# BRAND

Brand: Hola Prime (#WeAreTraders). Funded challenges \$2K to \$100K. USPs: 1-step process, 5% profit target, no time limits, fast withdrawals, no activation fees, high profit splits.

${customBrandContext}${customStoredAdContext}${noBrandDNARule}

# USER REQUEST

"${generationPrompt}"

# EXECUTION RULES

- Across the 3 variants generated downstream, each MUST be a fundamentally different concept - not 3 color variations of the same idea. Different headline, different angle, different emotional hook. If all 3 say similar things about \$25K with chart backgrounds, you have failed.
- 5-7 elements on the canvas max. Beyond that becomes clutter.
- Numbers in the user prompt must be PRESERVED EXACTLY. "$25K" stays "$25K". If user says "3-step", show "3-step" not "3 step" or "3steps".
- Spelling: every word must render correctly. Especially: Challenge, Withdrawals, Fictitious, Simulated, Performance, Accounts. Never write "sstep" or "3% step" - these are common Gemini errors and your prompt must reinforce correct rendering.

# OUTPUT (raw JSON only - no preamble, no markdown fence)

{
  "creativeConcept": {
    "title": "Concept name (3-5 words, NO banned vocab)",
    "rationale": "One sentence: which trend hook and why it fits the user request",
    "targetScore": 9.0,
    "performanceTier": "ELITE",
    "trendHookUsed": "Which trend from the list above this leverages"
  },
  "copywriting": {
    "headline": { "primary": "Sharp, specific, under 8 words. NO banned vocab. Hero number prominent." },
    "body": { "primary": "1-2 short lines max. Concrete benefit, no startup-speak." },
    "cta": { "primary": "Buy Challenge" },
    "attentionGrabber": "First line that stops the thumb in under 1 second",
    "urgencyText": "Only if a specific real urgency exists (e.g. promo expiry)",
    "trustText": "Only if real (Trustpilot 4.5, Deloitte review, etc.)"
  },
  "imageGenerationPrompt": {
    "detailed": "600+ word image prompt. Structure: (1) Hero number with exact size (30-40% canvas height) and treatment (3D chrome OR neon glow), positioned center. (2) Headline placement and exact text. (3) Top-left empty zone for logo overlay (must remain visually clear). (4) Top-right #WeAreTraders pill badge. (5) Body copy placement and exact text. (6) CTA = blue pill button with literal text 'Buy Challenge' - never any other text. (7) Background: deep black with treatment specific to the trend hook chosen. (8) Disclaimer at absolute bottom. SPELL EVERY WORD CORRECTLY especially: Challenge, Withdrawals, Fictitious, Simulated, Performance, Accounts. Numbers preserved exactly. No element duplicated."
  }
}`
      });"""

new_src = src[:start_idx] + NEW_BLOCK + src[end_idx:]
f.write_text(new_src, encoding="utf-8")
print(f"OK - new file size: {len(new_src)} chars")
