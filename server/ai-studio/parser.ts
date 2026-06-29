/**
 * AI Response Parser
 * Parses Claude's JSON response with repair for truncated outputs
 */

export function extractAndRepairJson(text: string) {
  if (!text || typeof text !== 'string') return { parsed: null, wasRepaired: false };

  // Remove markdown code blocks
  let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Find the first {
  const startIdx = cleaned.indexOf('{');
  if (startIdx === -1) return { parsed: null, wasRepaired: false };
  cleaned = cleaned.substring(startIdx);

  // Count braces and brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === '\\') { escapeNext = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  let wasRepaired = false;

  if (openBraces > 0 || openBrackets > 0 || inString) {
    wasRepaired = true;
    if (inString) cleaned += '"';

    cleaned = cleaned.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
    cleaned = cleaned.replace(/,\s*"[^"]*":\s*$/, '');
    cleaned = cleaned.replace(/,\s*"[^"]*$/, '');
    cleaned = cleaned.replace(/,\s*$/, '');

    openBraces = (cleaned.match(/{/g) || []).length - (cleaned.match(/}/g) || []).length;
    openBrackets = (cleaned.match(/\[/g) || []).length - (cleaned.match(/]/g) || []).length;

    for (let i = 0; i < openBrackets; i++) cleaned += ']';
    for (let i = 0; i < openBraces; i++) cleaned += '}';
  }

  // Fix common JSON issues
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  cleaned = cleaned.replace(/:\s*,/g, ': "",');
  cleaned = cleaned.replace(/:\s*}/g, ': ""}');

  // Sanitize control characters inside JSON strings (e.g. raw newlines, tabs)
  // Walk char-by-char: inside quoted strings, replace control chars with their escape sequences
  let sanitized = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { sanitized += ch; esc = false; continue; }
    if (ch === '\\') { sanitized += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; sanitized += ch; continue; }
    if (inStr) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        // Replace control characters with safe escapes
        if (ch === '\n') sanitized += '\\n';
        else if (ch === '\r') sanitized += '\\r';
        else if (ch === '\t') sanitized += '\\t';
        else sanitized += ' ';
        continue;
      }
    }
    sanitized += ch;
  }
  cleaned = sanitized;

  try {
    return { parsed: JSON.parse(cleaned), wasRepaired };
  } catch (err) {
    console.error('JSON Parse Error:', err);
    return { parsed: null, wasRepaired };
  }
}
