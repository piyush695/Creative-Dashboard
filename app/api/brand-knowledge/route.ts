/**
 * Brand Knowledge Base API
 *
 *   GET    /api/brand-knowledge            → current brand kit (logo preview + doc list)
 *   POST   /api/brand-knowledge            → save brand info, add/remove docs, set/clear logo
 *
 * The Settings → Brand Kit panel uses this. Uploaded docs are parsed to text
 * server-side (txt/md/pdf/docx) and stored; the logo is stored inline as a data
 * URI so the image pipeline can composite it without an external fetch.
 */

import { NextResponse } from 'next/server';
import {
  getBrandKnowledge,
  saveBrandKnowledge,
  type BrandDocument,
  type BrandLogo,
} from '@/lib/ai-studio/brand-knowledge';
import { parseDocumentToText } from '@/lib/ai-studio/doc-parser';

const MAX_LOGO_BYTES = 3 * 1024 * 1024;   // 3 MB
const MAX_DOC_BYTES = 25 * 1024 * 1024;   // 25 MB
const MAX_DOCS = 12;

function logoFormatFromMime(mime: string, name: string): BrandLogo['format'] | null {
  const m = (mime || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (m.includes('svg') || n.endsWith('.svg')) return 'svg';
  if (m.includes('png') || n.endsWith('.png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg') || n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'jpeg';
  if (m.includes('webp') || n.endsWith('.webp')) return 'webp';
  return null;
}

function approxBytesOfBase64(b64: string): number {
  const data = b64.startsWith('data:') ? b64.slice(b64.indexOf(',') + 1) : b64;
  return Math.floor((data.length * 3) / 4);
}

function toDataUri(base64: string, mime: string): string {
  if (base64.startsWith('data:')) return base64;
  return `data:${mime};base64,${base64}`;
}

// Trim the heavy fields out of the doc list before sending to the client.
function publicView(kb: Awaited<ReturnType<typeof getBrandKnowledge>>) {
  return {
    brandName: kb.brandName,
    pastedText: kb.pastedText,
    documents: (kb.documents || []).map((d) => ({
      name: d.name,
      type: d.type,
      charCount: d.charCount,
      addedAt: d.addedAt,
    })),
    logo: kb.logo ? { dataUri: kb.logo.dataUri, format: kb.logo.format, fileName: kb.logo.fileName } : null,
    updatedAt: kb.updatedAt,
  };
}

export async function GET() {
  try {
    const kb = await getBrandKnowledge();
    return NextResponse.json({ brand: publicView(kb) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load brand kit' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const current = await getBrandKnowledge();
    const warnings: string[] = [];

    const patch: Partial<{
      brandName: string;
      pastedText: string;
      documents: BrandDocument[];
      logo: BrandLogo | null;
    }> = {};

    if (typeof body.brandName === 'string') patch.brandName = body.brandName.slice(0, 200);
    if (typeof body.pastedText === 'string') patch.pastedText = body.pastedText.slice(0, 60000);

    // ── Documents: start from current, apply removals, then additions ──
    let docs = [...(current.documents || [])];

    if (Array.isArray(body.removeDocumentNames) && body.removeDocumentNames.length) {
      const remove = new Set(body.removeDocumentNames);
      docs = docs.filter((d) => !remove.has(d.name));
    }

    if (Array.isArray(body.addDocuments) && body.addDocuments.length) {
      for (const file of body.addDocuments) {
        if (!file?.name || !file?.base64) {
          warnings.push('Skipped a document with no name or content.');
          continue;
        }
        if (approxBytesOfBase64(file.base64) > MAX_DOC_BYTES) {
          warnings.push(`"${file.name}" is larger than 25 MB and was skipped.`);
          continue;
        }
        try {
          const text = await parseDocumentToText({
            name: file.name,
            mimeType: file.mimeType,
            base64: file.base64,
          });
          // Replace any existing doc with the same name
          docs = docs.filter((d) => d.name !== file.name);
          docs.push({
            name: file.name,
            type: file.mimeType || file.name.split('.').pop() || 'unknown',
            text,
            charCount: text.length,
            addedAt: new Date().toISOString(),
          });
        } catch (perDocErr: any) {
          warnings.push(perDocErr.message || `Could not parse "${file.name}".`);
        }
      }
    }

    if (docs.length > MAX_DOCS) {
      docs = docs.slice(-MAX_DOCS);
      warnings.push(`Only the most recent ${MAX_DOCS} documents are kept.`);
    }

    if (Array.isArray(body.removeDocumentNames) || Array.isArray(body.addDocuments)) {
      patch.documents = docs;
    }

    // ── Logo: set or clear ──
    if (body.logo === null) {
      patch.logo = null;
    } else if (body.logo && body.logo.base64) {
      const format = logoFormatFromMime(body.logo.mimeType || '', body.logo.name || '');
      if (!format) {
        return NextResponse.json(
          { error: 'Logo must be an SVG, PNG, JPEG, or WebP image.' },
          { status: 400 },
        );
      }
      if (approxBytesOfBase64(body.logo.base64) > MAX_LOGO_BYTES) {
        return NextResponse.json({ error: 'Logo file is larger than 3 MB.' }, { status: 400 });
      }
      const mime =
        format === 'svg' ? 'image/svg+xml'
          : format === 'png' ? 'image/png'
            : format === 'webp' ? 'image/webp'
              : 'image/jpeg';
      patch.logo = {
        dataUri: toDataUri(body.logo.base64, mime),
        format,
        fileName: body.logo.name || `logo.${format}`,
        addedAt: new Date().toISOString(),
      };
    }

    const updated = await saveBrandKnowledge(patch);
    return NextResponse.json({ brand: publicView(updated), warnings });
  } catch (err: any) {
    console.error('[BrandKnowledge API] POST failed:', err);
    return NextResponse.json({ error: err.message || 'Failed to save brand kit' }, { status: 500 });
  }
}
