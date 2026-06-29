/**
 * Brand Knowledge Base — user-uploaded brand info + logo, stored in MongoDB.
 *
 * This is the single source of truth for "what is this brand", uploaded by the
 * team from Settings → Brand Kit. It powers two features:
 *
 *   1. PROMPT ENHANCEMENT — buildBrandKnowledgeContext() returns a text block
 *      that gets injected into the prompt-enhancer + brief generators so a
 *      simple user prompt is expanded with real brand voice, offers, colours,
 *      and do's/don'ts.
 *
 *   2. LOGO OVERLAY — getBrandLogo() returns the uploaded logo (SVG or PNG) so
 *      the image pipeline can composite the REAL brand logo instead of the
 *      hardcoded public/holaprime-logo.png.
 *
 * Storage: a single document in the `brand_knowledge` collection keyed by
 * brandId (default 'default' — this app is single-brand). The logo is stored
 * inline as a data URI so generation never has to hit an external host.
 */

import clientPromise from '@/server/mongodb-client';

const COLLECTION = 'brand_knowledge';
const DEFAULT_BRAND_ID = 'default';

// Each uploaded document is parsed to text on upload and the text is stored
// here so generation can read it without re-parsing the binary every time.
export interface BrandDocument {
  name: string;
  type: string;          // mime type or extension
  text: string;          // extracted plain text
  charCount: number;
  addedAt: string;
}

export interface BrandLogo {
  dataUri: string;       // data:image/svg+xml;base64,... or data:image/png;base64,...
  format: 'svg' | 'png' | 'jpeg' | 'webp';
  fileName: string;
  addedAt: string;
}

export interface BrandKnowledge {
  brandId: string;
  brandName: string;
  pastedText: string;        // free-text brand info typed/pasted in Settings
  documents: BrandDocument[]; // parsed uploaded docs (.txt/.md/.pdf/.docx)
  logo: BrandLogo | null;
  updatedAt: string;
  createdAt: string;
}

const EMPTY: BrandKnowledge = {
  brandId: DEFAULT_BRAND_ID,
  brandName: '',
  pastedText: '',
  documents: [],
  logo: null,
  updatedAt: '',
  createdAt: '',
};

async function coll() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || 'reddit_data');
  return db.collection(COLLECTION);
}

/**
 * Read the current brand knowledge base. Never throws — returns an empty
 * profile when nothing has been uploaded yet (or Mongo is unavailable), so
 * callers can treat "no brand kit" as a no-op.
 */
export async function getBrandKnowledge(brandId: string = DEFAULT_BRAND_ID): Promise<BrandKnowledge> {
  try {
    const c = await coll();
    const doc = await c.findOne({ brandId });
    if (!doc) return { ...EMPTY };
    return {
      brandId: doc.brandId || brandId,
      brandName: doc.brandName || '',
      pastedText: doc.pastedText || '',
      documents: Array.isArray(doc.documents) ? doc.documents : [],
      logo: doc.logo || null,
      updatedAt: doc.updatedAt || '',
      createdAt: doc.createdAt || '',
    };
  } catch (err: any) {
    console.warn('[BrandKnowledge] read failed (returning empty):', err.message);
    return { ...EMPTY };
  }
}

/**
 * Upsert the brand knowledge base. Pass only the fields you want to change —
 * unspecified fields are left untouched (logo, documents, etc.).
 */
export async function saveBrandKnowledge(
  patch: Partial<Pick<BrandKnowledge, 'brandName' | 'pastedText' | 'documents' | 'logo'>>,
  brandId: string = DEFAULT_BRAND_ID,
): Promise<BrandKnowledge> {
  const c = await coll();
  const now = new Date().toISOString();

  const set: Record<string, any> = { brandId, updatedAt: now };
  if (patch.brandName !== undefined) set.brandName = patch.brandName;
  if (patch.pastedText !== undefined) set.pastedText = patch.pastedText;
  if (patch.documents !== undefined) set.documents = patch.documents;
  if (patch.logo !== undefined) set.logo = patch.logo;

  await c.updateOne(
    { brandId },
    { $set: set, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  return getBrandKnowledge(brandId);
}

/**
 * Return just the logo (or null). Used by the image pipeline when the
 * "Add brand logo" toggle is on.
 */
export async function getBrandLogo(brandId: string = DEFAULT_BRAND_ID): Promise<BrandLogo | null> {
  const kb = await getBrandKnowledge(brandId);
  return kb.logo;
}

/**
 * Build a prompt-injectable context block from the brand knowledge base.
 *
 * Returns '' when nothing useful has been uploaded — so callers can safely
 * concatenate it unconditionally. The combined text is capped so a huge
 * uploaded PDF can't blow the model's context window.
 */
export async function buildBrandKnowledgeContext(
  opts: { maxChars?: number; brandId?: string } = {},
): Promise<string> {
  const maxChars = opts.maxChars ?? 6000;
  const kb = await getBrandKnowledge(opts.brandId ?? DEFAULT_BRAND_ID);

  const parts: string[] = [];
  if (kb.brandName) parts.push(`Brand name: ${kb.brandName}`);
  if (kb.pastedText && kb.pastedText.trim()) parts.push(kb.pastedText.trim());

  for (const d of kb.documents || []) {
    if (d.text && d.text.trim()) {
      parts.push(`--- From "${d.name}" ---\n${d.text.trim()}`);
    }
  }

  let body = parts.join('\n\n').trim();
  if (!body) return '';

  if (body.length > maxChars) {
    body = body.slice(0, maxChars) + '\n[...brand knowledge truncated for length...]';
  }

  return `\n\n=== BRAND KNOWLEDGE BASE (uploaded by the team — treat as ground truth) ===\n${body}\n\nUse this as the authoritative source for brand voice, offers, pricing, colours, claims, and do's/don'ts. When it conflicts with generic assumptions, the brand knowledge base wins.\n=== END BRAND KNOWLEDGE BASE ===\n`;
}

/**
 * Lightweight check used by the UI / pipeline: does the team have a logo on file?
 */
export async function hasBrandLogo(brandId: string = DEFAULT_BRAND_ID): Promise<boolean> {
  const logo = await getBrandLogo(brandId);
  return !!(logo && logo.dataUri);
}
