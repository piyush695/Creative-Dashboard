/**
 * Document parser — turns an uploaded brand doc into plain text for the
 * brand knowledge base.
 *
 * Supported:
 *   - .txt / .md / .csv / .json / .html  → decoded directly (no dependency)
 *   - .docx                              → mammoth (pure-JS, extractRawText)
 *   - .pdf                               → Claude's native PDF document support
 *                                          (no pdf-parse dependency needed)
 *
 * Everything returns plain text. On failure we throw a friendly error the API
 * route surfaces to the user — we never silently store an empty doc.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export interface ParseInput {
  name: string;        // original filename (used to infer extension)
  mimeType?: string;   // browser-reported mime type
  base64: string;      // raw base64 (no data: prefix) OR a full data URI
}

const PLAIN_TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'html', 'htm', 'rtf', 'log'];

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function stripDataUri(b64: string): { data: string; mime?: string } {
  if (b64.startsWith('data:')) {
    const comma = b64.indexOf(',');
    const meta = b64.slice(0, comma);
    const mime = meta.split(':')[1]?.split(';')[0];
    return { data: b64.slice(comma + 1), mime };
  }
  return { data: b64 };
}

/** Collapse excessive whitespace so stored brand text stays compact. */
function tidy(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse a single uploaded document to plain text.
 * @param maxChars hard cap on returned text (default 40k) to keep the KB sane.
 */
export async function parseDocumentToText(input: ParseInput, maxChars = 40000): Promise<string> {
  const { data, mime } = stripDataUri(input.base64);
  const ext = extOf(input.name);
  const mimeType = input.mimeType || mime || '';
  const buffer = Buffer.from(data, 'base64');

  let text = '';

  // ── Plain-text family ──
  if (PLAIN_TEXT_EXT.includes(ext) || mimeType.startsWith('text/') || mimeType === 'application/json') {
    text = buffer.toString('utf8');
    // For HTML, strip tags to keep just the readable content
    if (ext === 'html' || ext === 'htm' || mimeType.includes('html')) {
      text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
                 .replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<[^>]+>/g, ' ');
    }
  }
  // ── DOCX ──
  else if (ext === 'docx' || mimeType.includes('officedocument.wordprocessingml')) {
    try {
      const mammoth = (await import('mammoth')).default || (await import('mammoth'));
      const result = await (mammoth as any).extractRawText({ buffer });
      text = result?.value || '';
    } catch (err: any) {
      throw new Error(`Could not read the Word document "${input.name}": ${err.message}`);
    }
  }
  // ── Legacy .doc (binary) — not supported without extra deps ──
  else if (ext === 'doc') {
    throw new Error(`Old-format .doc files aren't supported. Please re-save "${input.name}" as .docx, .pdf, or .txt.`);
  }
  // ── PDF — use Claude's native document understanding ──
  else if (ext === 'pdf' || mimeType === 'application/pdf') {
    text = await extractPdfWithClaude(data, input.name);
  }
  // ── Unknown: best-effort UTF-8 decode ──
  else {
    const decoded = buffer.toString('utf8');
    // If it looks like text (mostly printable), keep it; else reject.
    const printable = decoded.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '').length;
    if (decoded.length > 0 && printable / decoded.length > 0.85) {
      text = decoded;
    } else {
      throw new Error(`Unsupported file type for "${input.name}". Use .txt, .md, .pdf, or .docx.`);
    }
  }

  text = tidy(text);
  if (!text) {
    throw new Error(`No readable text found in "${input.name}".`);
  }
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '\n[...document truncated...]';
  }
  return text;
}

/**
 * Extract text from a PDF by handing it to Claude as a document content block.
 * Avoids a native pdf-parse dependency and handles scanned/complex layouts well.
 */
async function extractPdfWithClaude(base64Pdf: string, fileName: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(`Can't read PDF "${fileName}" — ANTHROPIC_API_KEY is not configured.`);
  }

  const models = ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await getClient().messages.create({
        model,
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
              } as any,
              {
                type: 'text',
                text: 'Extract ALL text content from this brand document verbatim, preserving headings and structure as plain text. Include every brand guideline, offer, tagline, colour, and rule. Do not summarise, do not add commentary — output only the document text.',
              },
            ],
          },
        ],
      });
      const out = res.content?.[0]?.type === 'text' ? res.content[0].text : '';
      if (out && out.trim()) return out;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[DocParser] PDF extract via ${model} failed:`, err.message);
      if (err.status === 401 || err.status === 403) break;
    }
  }
  throw new Error(`Could not read PDF "${fileName}": ${lastErr?.message || 'unknown error'}`);
}
