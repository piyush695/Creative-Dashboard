/**
 * Text Overlay Engine — Sharp + SVG
 *
 * Composites perfectly-spelled text onto AI-generated visual-only images.
 * Solves the #1 quality problem: AI misspells text, duplicates words, renders garbled chars.
 *
 * Pipeline: Gemini generates VISUAL ONLY (no text) → Sharp composites all text via SVG
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ─── Types ───

export interface TextOverlayConfig {
  headline?: string;
  subheadline?: string;
  price?: string;
  bullets?: string[];
  cta?: string;
  disclaimer?: string;
  attentionGrabber?: string;
  promoCode?: string;
  urgencyText?: string;
  layout: 'editorial' | 'cinematic' | 'data_native' | 'poster' | 'comparison' | 'storytelling' | 'minimal' | 'collage' | 'standard';
  darkBackground?: boolean;
  logoText?: string;
  tagline?: string;
  /** When false, the compositor draws NO logo (caller composites its own). Default true. */
  drawLogo?: boolean;
}

// ─── Helpers ───

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine.trim()) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines;
}

// ─── Main Export ───

export async function applyTextOverlay(
  imageDataUri: string,
  config: TextOverlayConfig
): Promise<string> {
  try {
    console.log('[TextOverlay] Called with config:', JSON.stringify({
      headline: config.headline?.substring(0, 40),
      price: config.price,
      bulletsCount: Array.isArray(config.bullets) ? config.bullets.length : 0,
      bulletsRaw: Array.isArray(config.bullets) ? config.bullets.slice(0, 2) : 'NOT_ARRAY',
      cta: config.cta,
      layout: config.layout,
    }));

    // Decode data URI
    const commaIdx = imageDataUri.indexOf(',');
    if (commaIdx === -1) {
      console.warn('[TextOverlay] Invalid data URI (no comma)');
      return imageDataUri;
    }
    const base64 = imageDataUri.substring(commaIdx + 1);
    const imageBuffer = Buffer.from(base64, 'base64');

    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;
    console.log(`[TextOverlay] Image dimensions: ${width}x${height}`);

    // Calculate font sizes relative to image
    const headlineSize = Math.round(height * 0.04);
    const priceSize = Math.round(height * 0.08);
    const subheadSize = Math.round(height * 0.022);
    const bulletSize = Math.round(height * 0.022);
    const ctaSize = Math.round(height * 0.025);
    const disclaimerSize = Math.round(height * 0.01);
    const logoSize = Math.round(height * 0.018);
    const padding = Math.round(width * 0.06);
    const centerX = Math.round(width / 2);

    const svgParts: string[] = [];

    // Helper: create text with black stroke outline for readability (no filters — librsvg doesn't support feDropShadow)
    const txt = (x: number | string, y: number, text: string, size: number, opts: {
      weight?: string; fill?: string; anchor?: string; spacing?: number; opacity?: number; stroke?: boolean;
    } = {}) => {
      const { weight = '700', fill = '#FFFFFF', anchor = 'middle', spacing = 0, opacity = 1, stroke = true } = opts;
      const common = `x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}"`;
      let result = '';
      // Black outline for readability on any background
      if (stroke) {
        result += `<text ${common} fill="none" stroke="black" stroke-width="${Math.max(3, Math.round(size * 0.08))}" stroke-linejoin="round">${escapeXml(text)}</text>\n`;
      }
      result += `<text ${common} fill="${fill}">${escapeXml(text)}</text>`;
      return result;
    };

    // ── Calculate Area Brightness for Logo Contrast ──
    let isBrightBackground = false;
    try {
      const extractW = Math.min(width, Math.round(width * 0.3));
      const extractH = Math.min(height, Math.round(height * 0.15));
      const stats = await sharp(imageBuffer).extract({ left: 0, top: 0, width: extractW, height: extractH }).stats();
      const mean = stats.channels.slice(0, 3).reduce((acc, c) => acc + c.mean, 0) / 3;
      isBrightBackground = mean > 150; // Threshold for bright backgrounds
      console.log(`[TextOverlay] Logo area brightness: ${mean.toFixed(2)}, isBright: ${isBrightBackground}`);
    } catch(e) {
      console.warn('[TextOverlay] Failed to calculate brightness for logo');
    }

    // ── Brand band (logo top-left + tagline top-right share ONE line) ──
    // The logo is fit into a compact corner band so it never bleeds into the
    // headline, and the tagline is vertically centered on that same band so the
    // two read as one aligned branding row.
    const drawLogo = config.drawLogo !== false;
    const brandTop = Math.round(height * 0.035);
    const brandLogoH = Math.round(height * 0.05);
    const brandCenterY = brandTop + Math.round(brandLogoH / 2);
    const logoPath = path.join(process.cwd(), 'public', 'holaprime-logo.png');
    let hasLogoImage = false;
    let logoImageBuffer: Buffer | null = null;
    let logoImgW = 0, logoImgH = 0;
    try {
      if (drawLogo && fs.existsSync(logoPath)) {
        hasLogoImage = true;
        // Fit inside a compact corner box (band-tall, ≤28% wide), preserving aspect.
        logoImageBuffer = await sharp(logoPath)
          .resize({ width: Math.round(width * 0.28), height: brandLogoH, fit: 'inside', withoutEnlargement: true })
          .png()  // Explicitly output PNG to preserve transparency (alpha channel)
          .toBuffer();
        const lm = await sharp(logoImageBuffer).metadata();
        logoImgW = lm.width || brandLogoH;
        logoImgH = lm.height || brandLogoH;
        console.log(`[TextOverlay] Logo loaded: ${logoImgW}x${logoImgH}px (corner band)`);
      }
    } catch(e) {
      console.warn('[TextOverlay] Failed to load logo image:', e);
      hasLogoImage = false;
    }

    if (hasLogoImage) {
      // White pill behind the logo on bright backgrounds — sized to the actual logo.
      if (isBrightBackground) {
         const m = Math.round(height * 0.012);
         svgParts.push(`<rect x="${padding - m}" y="${brandTop - m}" width="${logoImgW + 2 * m}" height="${logoImgH + 2 * m}" rx="12" fill="#FFFFFF" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))"/>`);
      }
    } else if (drawLogo) {
      // Draw exact vector recreation of Hola Prime logo, scaled to the brand band
      const scale = brandLogoH / 95; // vector logo base height ≈ 95 units
      const fgColor = isBrightBackground ? '#000000' : '#FFFFFF';
      
      let bgRect = '';
      if (isBrightBackground) {
        // Draw white background pill when the creative is bright
        bgRect = `<rect x="-15" y="-15" width="165" height="95" rx="8" fill="#FFFFFF" />`;
      }

      const svgLogo = `
        <g transform="translate(${padding}, ${brandTop}) scale(${scale})">
          ${bgRect}
          <defs>
            <radialGradient id="globeGra" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="30%" stop-color="#ff7eb3"/>
              <stop offset="60%" stop-color="#00f2fe"/>
              <stop offset="100%" stop-color="#000000"/>
            </radialGradient>
          </defs>
          <g font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" fill="${fgColor}" letter-spacing="-2">
            <!-- text shadow for dark background -->
            ${!isBrightBackground ? `
            <g fill="rgba(0,0,0,0.5)">
              <text x="2" y="34">h</text>
              <text x="68" y="34">la</text>
              <text x="2" y="72">prime</text>
            </g>
            ` : ''}
            
            <text x="0" y="32">h</text>
            
            <!-- Iridescent globe replacing 'o' -->
            <circle cx="45" cy="18" r="15" fill="url(#globeGra)"/>
            <circle cx="41" cy="12" r="3" fill="#ffffff" opacity="0.9"/>
            
            <text x="66" y="32">la</text>
            <text x="105" y="14" font-size="14" font-weight="700" letter-spacing="0">®</text>
            
            <text x="0" y="70">prime</text>
          </g>
        </g>
      `;
      svgParts.push(svgLogo);
    }

    // ── Tagline (top-right) ──
    const tagline = config.tagline !== undefined ? config.tagline : '#WeAreTraders';
    if (tagline) {
      const tagSize = Math.round(height * 0.02);
      const tagBaselineY = brandCenterY + Math.round(tagSize * 0.36); // center on the logo band
      svgParts.push(txt(width - padding, tagBaselineY, tagline, tagSize, { weight: '400', anchor: 'end' }));
    }

    // ── Attention Grabber ── (start below the logo/tagline branding zone)
    let yPos = Math.round(height * 0.16);
    if (config.attentionGrabber) {
      svgParts.push(txt(centerX, yPos, config.attentionGrabber, subheadSize, { weight: '400', fill: '#C8CDD5' }));
      yPos += Math.round(subheadSize * 2);
    }

    // ── Headline (large, bold) ──
    if (config.headline) {
      const maxCharsPerLine = Math.floor((width - padding * 2) / (headlineSize * 0.55));
      const lines = wrapText(config.headline.toUpperCase(), maxCharsPerLine);
      for (const line of lines) {
        svgParts.push(txt(centerX, yPos, line, headlineSize, { weight: '900', spacing: 1 }));
        yPos += Math.round(headlineSize * 1.2);
      }
      yPos += Math.round(headlineSize * 0.4);
    }

    // ── Subheadline ──
    if (config.subheadline && config.subheadline.length < 80) {
      svgParts.push(txt(centerX, yPos, config.subheadline, subheadSize, { weight: '500', fill: '#E0E4EA' }));
      yPos += Math.round(subheadSize * 2);
    }

    // ── Price (HERO — oversized, centered, AUTO-FIT so it never overflows) ──
    if (config.price) {
      const maxPriceW = width * 0.88;
      // Bold sans char ≈ 0.6 × font size wide; shrink the hero to fit the canvas.
      const fitSize = Math.min(priceSize, Math.floor(maxPriceW / Math.max(1, config.price.length * 0.6)));
      const priceY = Math.max(yPos + fitSize, Math.round(height * 0.42));
      svgParts.push(txt(centerX, priceY, config.price, fitSize, { weight: '900' }));
      yPos = priceY + Math.round(fitSize * 0.7);
    }

    // ── Urgency / Discount text ──
    if (config.urgencyText) {
      yPos += Math.round(subheadSize * 0.5);
      const urgW = Math.round(config.urgencyText.length * subheadSize * 0.55 + 40);
      const urgH = Math.round(subheadSize * 1.8);
      svgParts.push(`<rect x="${centerX - urgW / 2}" y="${yPos - urgH * 0.65}" width="${urgW}" height="${urgH}" rx="${urgH / 2}" fill="#1a1a2e" stroke="#444" stroke-width="1"/>`);
      svgParts.push(txt(centerX, yPos, config.urgencyText, subheadSize, { weight: '600', stroke: false }));
      yPos += Math.round(urgH + subheadSize * 0.5);
    }

    // ── Promo Code ──
    if (config.promoCode) {
      const promoW = Math.round(config.promoCode.length * subheadSize * 0.55 + 40);
      const promoH = Math.round(subheadSize * 1.8);
      svgParts.push(`<rect x="${centerX - promoW / 2}" y="${yPos - promoH * 0.65}" width="${promoW}" height="${promoH}" rx="${promoH / 2}" fill="#1a2744" stroke="#2563EB" stroke-width="1"/>`);
      svgParts.push(txt(centerX, yPos, config.promoCode, Math.round(subheadSize * 0.9), { weight: '600', stroke: false }));
      yPos += Math.round(promoH + subheadSize * 0.5);
    }

    // ── Bullets ──
    const bullets = Array.isArray(config.bullets) ? config.bullets : [];
    if (bullets.length > 0) {
      yPos = Math.max(yPos, Math.round(height * 0.58));
      for (const bullet of bullets.slice(0, 5)) {
        const cleanBullet = bullet.replace(/^[•\-]\s*/, '');
        svgParts.push(txt(padding + 10, yPos, `•  ${cleanBullet}`, bulletSize, { weight: '400', fill: '#E0E4EA', anchor: 'start' }));
        yPos += Math.round(bulletSize * 1.7);
      }
    }

    // ── CTA Button ──
    if (config.cta) {
      const ctaY = Math.max(yPos + 20, Math.round(height * 0.80));
      const ctaWidth = Math.min(Math.round(width * 0.6), config.cta.length * ctaSize * 0.6 + 80);
      const ctaHeight = Math.round(ctaSize * 2.5);
      const ctaX = Math.round((width - ctaWidth) / 2);
      svgParts.push(`<rect x="${ctaX}" y="${ctaY}" width="${ctaWidth}" height="${ctaHeight}" rx="${ctaHeight / 2}" fill="#2563EB"/>`);
      svgParts.push(txt(centerX, ctaY + ctaHeight / 2 + ctaSize * 0.35, config.cta, ctaSize, { weight: '700', stroke: false }));
    }

    // ── Disclaimer (pinned to bottom) ──
    if (config.disclaimer) {
      const maxDiscChars = Math.floor((width - padding * 2) / (disclaimerSize * 0.52));
      const discLines = wrapText(config.disclaimer.toUpperCase(), maxDiscChars);
      let discY = height - padding - (discLines.length * disclaimerSize * 1.3);
      for (const line of discLines.slice(0, 4)) {
        svgParts.push(txt(centerX, discY, line, disclaimerSize, { weight: '300', fill: '#6B7280', stroke: false }));
        discY += Math.round(disclaimerSize * 1.3);
      }
    }

    // ── Build final SVG — NO FILTERS (librsvg doesn't support feDropShadow) ──
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
${svgParts.join('\n')}
</svg>`;

    console.log(`[TextOverlay] SVG elements: ${svgParts.length}, SVG length: ${svg.length}`);

    // ── Composite SVG onto image ──
    const composites: sharp.OverlayOptions[] = [];

    // Base text SVG elements first
    composites.push({
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    });

    // Then layer the actual Logo Image ON TOP if present so SVG background shapes don't obscure it
    if (hasLogoImage && logoImageBuffer) {
      composites.push({
        input: logoImageBuffer,
        top: brandTop,
        left: padding,
        blend: 'over',  // Proper alpha compositing
      });
    }

    const result = await sharp(imageBuffer)
      .composite(composites)
      .png()
      .toBuffer();

    const outputDataUri = `data:image/png;base64,${result.toString('base64')}`;
    console.log('[TextOverlay] ✓ Overlay applied successfully');
    return outputDataUri;

  } catch (err: any) {
    console.error('[TextOverlay] ✗ FAILED:', err.message, err.stack?.substring(0, 300));
    return imageDataUri; // Return original on failure
  }
}

/**
 * Extract text elements from a brief for overlay.
 */
export function extractOverlayConfig(brief: any, paradigmId: string): TextOverlayConfig {
  const copywriting = brief?.copywriting || {};
  const headline = copywriting.headline?.primary || '';
  const hookOrGrabber = copywriting.attentionGrabber || copywriting.hookText || '';

  // Extract price from various places
  const price = hookOrGrabber.match(/\$[\d,]+[KkMm]?/)?.[0]
    || headline.match(/\$[\d,]+[KkMm]?/)?.[0]
    || '';

  // Extract promo code
  const discountText = copywriting.discountText || '';
  const promoCode = discountText.match(/(?:USE CODE[:\s]*|CODE[:\s]*)(\S+)/i)?.[0]
    || discountText.match(/[A-Z]{3,}\d+/)?.[0]
    || '';

  return {
    headline,
    subheadline: copywriting.body?.primary || '',
    price,
    bullets: (copywriting.benefitBullets || []).map((b: string) => b.replace(/^[•\-]\s*/, '')),
    cta: copywriting.cta?.primary || 'Buy Challenge',
    disclaimer: copywriting.disclaimerText || 'HOLA PRIME PROVIDES DEMO ACCOUNTS WITH FICTITIOUS FUNDS FOR SIMULATED TRADING PURPOSES ONLY. CLIENTS MAY EARN MONETARY REWARDS BASED ON THEIR PERFORMANCE THROUGH SUCH DEMO HOLA PRIME ACCOUNTS.',
    attentionGrabber: hookOrGrabber.replace(/\$[\d,]+[KkMm]?/, '').trim() || '',
    promoCode,
    urgencyText: copywriting.urgencyText || '',
    layout: paradigmId.includes('editorial') ? 'editorial'
      : paradigmId.includes('cinematic') ? 'cinematic'
      : paradigmId.includes('data') ? 'data_native'
      : 'standard',
    darkBackground: true,
    logoText: 'hola prime',
    tagline: '#WeAreTraders',
  };
}
