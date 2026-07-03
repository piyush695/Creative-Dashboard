/**
 * Document text extraction for Studio attachments.
 *
 * The image models (gpt-image-1) can only "see" images — they cannot read a PDF
 * or Word file. To let users attach a document and have it actually drive the
 * generation (the way ChatGPT/Gemini read an uploaded doc), we extract the
 * document's text here on the server and inject it into the image prompt as
 * context.
 *
 * Supported:
 *   - .txt / .md / .csv / .json / .log → decoded directly (UTF-8)
 *   - .html / .htm                     → tags stripped to plain text
 *   - .pdf                             → unpdf (serverless-friendly, no native deps)
 *   - .docx                            → mammoth (raw text)
 * Not supported (returns ''):
 *   - .doc (legacy binary Word), images, video, unknown binaries
 */

// Per-document character cap — keeps a huge PDF from blowing the image prompt
// budget. 6k chars ≈ the useful "brief" portion of most marketing docs.
const PER_DOC_CHAR_CAP = 6000;

export interface StudioDocFile {
  name: string;
  /** Base64 data URI ("data:<mime>;base64,…") or a bare base64 string. */
  dataUrl: string;
}

export interface ExtractedDoc {
  name: string;
  text: string;
  chars: number;
  /** Set when the file type isn't extractable, so callers can inform the user. */
  unsupported?: boolean;
}

function base64FromDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 && dataUrl.slice(0, idx).includes('base64')
    ? dataUrl.slice(idx + 1)
    : dataUrl;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(text: string): string {
  const normalized = (text || '').replace(/\r\n/g, '\n').trim();
  return normalized.length > PER_DOC_CHAR_CAP
    ? `${normalized.slice(0, PER_DOC_CHAR_CAP)}\n…[truncated]`
    : normalized;
}

/** Extract plain text from a single document. Never throws — returns '' on failure. */
export async function extractDocText(name: string, dataUrl: string): Promise<ExtractedDoc> {
  const lower = (name || '').toLowerCase();
  try {
    const buffer = Buffer.from(base64FromDataUrl(dataUrl), 'base64');

    if (/\.(txt|md|csv|json|log)$/.test(lower)) {
      const text = clamp(buffer.toString('utf8'));
      return { name, text, chars: text.length };
    }
    if (/\.(html?|htm)$/.test(lower)) {
      const text = clamp(stripHtml(buffer.toString('utf8')));
      return { name, text, chars: text.length };
    }
    if (/\.pdf$/.test(lower)) {
      const { getDocumentProxy, extractText } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const merged = clamp(Array.isArray(text) ? text.join('\n') : text);
      return { name, text: merged, chars: merged.length };
    }
    if (/\.docx$/.test(lower)) {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer });
      const text = clamp(value);
      return { name, text, chars: text.length };
    }

    console.warn(`[DocExtract] Unsupported document type: ${name}`);
    return { name, text: '', chars: 0, unsupported: true };
  } catch (err: any) {
    console.warn(`[DocExtract] Failed to extract "${name}":`, err?.message);
    return { name, text: '', chars: 0 };
  }
}

/**
 * Extract text from a batch of docs and format them into a single prompt-ready
 * context block. Returns '' when nothing usable was extracted.
 */
export async function buildDocContext(docs: StudioDocFile[]): Promise<string> {
  if (!Array.isArray(docs) || docs.length === 0) return '';

  const extracted = await Promise.all(
    docs.slice(0, 5).map((d) => extractDocText(d.name, d.dataUrl)),
  );
  const withText = extracted.filter((d) => d.text && d.text.length > 0);
  if (withText.length === 0) return '';

  const sections = withText
    .map((d) => `--- Document: ${d.name} ---\n${d.text}`)
    .join('\n\n');

  return `\n\n=== ATTACHED DOCUMENT CONTEXT (use this content when creating the creative) ===\n${sections}\n=== END DOCUMENT CONTEXT ===\n`;
}
