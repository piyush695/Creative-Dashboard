/**
 * Creative Verifier — the final agent in the generation pipeline (agent 5 of
 * the concept → design-decision → design → create → VERIFY chain).
 *
 * Looks at the FINISHED creative with vision and checks it against what the
 * upstream agents said it should be:
 *   1. SUBJECT   — if the concept promised a photographic subject (person +
 *                  action), is it visibly present and dominant?
 *   2. BAKED TEXT — any legible/semi-legible text rendered by the image model
 *                  (garbled receipts, fake UI text) that is NOT part of the
 *                  approved overlay copy?
 *   3. LEGIBILITY — are the intended copy strings readable (not clipped,
 *                  overlapped, or off-canvas)?
 *   4. FIGURES   — belt on top of the claim gate: any number/% visible that
 *                  is not in the allowed list?
 *
 * Used on the AI lane (where renders are stochastic). The Design Engine lane
 * is deterministic + structurally gated, so it skips visual verification.
 * Fail → the route retries ONCE with the verifier's feedback folded in.
 * Disable with STUDIO_VERIFY=off.
 */

import Anthropic from '@anthropic-ai/sdk';
import { extractAndRepairJson } from './parser';

let _client: Anthropic | null = null;
function client(): Anthropic { if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); return _client; }

const MODEL = process.env.STUDIO_VERIFIER_MODEL || 'claude-sonnet-4-6';

export interface VerifyExpectations {
  userPrompt: string;
  /** The photographic subject the concept promised (router's subjectLock), if any. */
  expectedSubject?: string;
  /** The copy strings the overlay composited — the ONLY text that should read cleanly. */
  expectedTexts: string[];
  /** Claim tokens allowed on the creative (from the brief + approved facts). */
  allowedFigures: string[];
}

export interface VerifyResult {
  pass: boolean;
  subjectOk: boolean;
  bakedTextOk: boolean;
  legibilityOk: boolean;
  figuresOk: boolean;
  issues: string[];
  /** One-line feedback usable as a regeneration directive. */
  retryHint?: string;
}

const PASS_DEFAULT: VerifyResult = {
  pass: true, subjectOk: true, bakedTextOk: true, legibilityOk: true, figuresOk: true, issues: [],
};

export function verifierEnabled(): boolean {
  return process.env.STUDIO_VERIFY !== 'off' && !!process.env.ANTHROPIC_API_KEY;
}

export async function verifyCreative(imageDataUri: string, exp: VerifyExpectations): Promise<VerifyResult> {
  if (!verifierEnabled()) return PASS_DEFAULT;
  const b64 = imageDataUri.startsWith('data:') ? imageDataUri.split(',')[1] : null;
  if (!b64) return PASS_DEFAULT; // remote URL — verification runs pre-upload only

  const mediaType = imageDataUri.slice(5, imageDataUri.indexOf(';')) || 'image/png';
  const checks = [
    exp.expectedSubject
      ? `1. SUBJECT: the concept promised this photographic subject as the dominant hero: "${exp.expectedSubject}". Is a matching human subject/action clearly visible and dominant? (subjectOk)`
      : `1. SUBJECT: no specific subject was promised — set subjectOk=true.`,
    `2. BAKED TEXT: does the IMAGE ITSELF (backgrounds, screens, receipts, documents, signs) contain legible or semi-legible text/digits that is NOT one of the approved copy strings below? Garbled pseudo-text counts as a FAILURE. (bakedTextOk = true only if the scene is clean)`,
    `3. LEGIBILITY: are the approved copy strings readable — not clipped at the canvas edge, not overlapping each other or the subject's face? (legibilityOk)`,
    `4. FIGURES: is every number/%/price visible on the creative present in the ALLOWED FIGURES list? (figuresOk)`,
  ].join('\n');

  const user = `You are the final QA agent for an ad-creative pipeline. Judge STRICTLY — a plausible-but-flawed creative must FAIL.

ORIGINAL BRIEF: """${exp.userPrompt.slice(0, 600)}"""
APPROVED COPY STRINGS (composited by us, in real fonts): ${JSON.stringify(exp.expectedTexts.filter(Boolean).slice(0, 12))}
ALLOWED FIGURES: ${JSON.stringify(exp.allowedFigures.slice(0, 20))}

CHECKS:
${checks}

Return RAW JSON only:
{"subjectOk":bool,"bakedTextOk":bool,"legibilityOk":bool,"figuresOk":bool,"issues":["<specific, visual, one line each>"],"retryHint":"<one directive for the next attempt, empty if all pass>"}`;

  try {
    const res = await client().messages.create({
      model: MODEL,
      max_tokens: 600,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as any, data: b64 } },
          { type: 'text', text: user },
        ],
      }],
    });
    const text = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
    const parsed = extractAndRepairJson(text)?.parsed;
    if (!parsed) return PASS_DEFAULT; // verifier must never block on its own failure
    const r: VerifyResult = {
      subjectOk: parsed.subjectOk !== false,
      bakedTextOk: parsed.bakedTextOk !== false,
      legibilityOk: parsed.legibilityOk !== false,
      figuresOk: parsed.figuresOk !== false,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 6) : [],
      retryHint: typeof parsed.retryHint === 'string' ? parsed.retryHint.slice(0, 300) : undefined,
      pass: false,
    };
    r.pass = r.subjectOk && r.bakedTextOk && r.legibilityOk && r.figuresOk;
    return r;
  } catch (e: any) {
    console.warn('[Verifier] failed (non-blocking, treating as pass):', e?.message);
    return PASS_DEFAULT;
  }
}
