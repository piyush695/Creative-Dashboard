/**
 * Logo Overlay — Composites the authentic Hola Prime logo onto every generated creative.
 *
 * This module runs as the FINAL step of image generation to guarantee
 * the brand logo appears on every creative, regardless of generation path
 * (custom prompt, image/video upload, studio, top ads, refine, etc.).
 *
 * Priority:
 * 1. Load real PNG logo from public/holaprime-logo.png (highest quality)
 * 2. Fall back to SVG-rendered logo (programmatic, always available)
 *
 * The logo is placed in the TOP-LEFT corner with appropriate padding.
 * On bright backgrounds, a semi-transparent dark backdrop is added for contrast.
 *
 * LOGO DETECTION:
 * To prevent duplicate logos, the module analyzes the top-left region of the
 * generated image using TWO criteria:
 * 1. Mean brightness — is the area dark/clear?
 * 2. Pixel variance — does the area contain distinct content (like a drawn logo)?
 * Both must indicate "content present" to skip overlay.
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const LOGO_FILENAME = 'holaprime-logo.png';

/**
 * Get the resolved logo path from the public directory.
 */
function getLogoPath(): string {
  return path.join(process.cwd(), 'public', LOGO_FILENAME);
}

/**
 * Render the Hola Prime logo as SVG → PNG buffer with transparent background.
 * This is a faithful recreation of the brand logo with:
 * - "hola" text with iridescent sphere replacing the "o"
 * - "prime" text below
 * - ® symbol
 * - Transparent background for clean compositing
 */
async function renderLogoFromSvg(targetWidth: number): Promise<Buffer> {
  // Base dimensions of the SVG logo design
  const baseW = 160;
  const baseH = 88;
  const scale = targetWidth / baseW;
  const svgW = Math.round(baseW * scale);
  const svgH = Math.round(baseH * scale);

  const svg = `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="iridescent" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="15%" stop-color="#e8c1f0"/>
      <stop offset="35%" stop-color="#ff7eb3"/>
      <stop offset="55%" stop-color="#7ec8e3"/>
      <stop offset="75%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#1a1a2e" stop-opacity="0.8"/>
    </radialGradient>
  </defs>
  <g transform="scale(${scale})">
    <!-- Drop shadow for depth on dark backgrounds -->
    <g fill="rgba(0,0,0,0.45)" font-family="'Arial','Segoe UI',Helvetica,sans-serif" font-weight="600" font-size="46" letter-spacing="-1.5">
      <text x="2" y="37">h</text>
      <text x="70" y="37">la</text>
      <text x="2" y="80">prime</text>
    </g>
    <!-- Main white text -->
    <g fill="#FFFFFF" font-family="'Arial','Segoe UI',Helvetica,sans-serif" font-weight="600" font-size="46" letter-spacing="-1.5">
      <text x="0" y="35">h</text>
      <!-- Iridescent globe replacing "o" -->
      <circle cx="47" cy="20" r="16" fill="url(#iridescent)"/>
      <!-- Specular highlight on the globe -->
      <circle cx="42" cy="13" r="4" fill="#ffffff" opacity="0.85"/>
      <circle cx="53" cy="26" r="2" fill="#ffffff" opacity="0.3"/>
      <text x="68" y="35">la</text>
      <!-- ® symbol -->
      <text x="113" y="15" font-size="13" font-weight="700" letter-spacing="0" fill="#FFFFFF">®</text>
      <text x="0" y="78">prime</text>
    </g>
  </g>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Detect whether the top-left region of an image already contains a logo or
 * visible non-background content. Uses a combination of:
 * 1. Mean brightness — high brightness suggests visible content
 * 2. Standard deviation — high variance suggests structured content (logo/text)
 *
 * Returns true if a logo/content is likely present (should SKIP overlay).
 */
async function detectExistingLogo(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<{ hasLogo: boolean; reason: string }> {
  try {
    // Check a region: top 12% height, left 25% width — where the logo goes
    const checkW = Math.round(width * 0.25);
    const checkH = Math.round(height * 0.12);

    const region = await sharp(imageBuffer)
      .extract({
        left: 0,
        top: 0,
        width: Math.min(width, checkW),
        height: Math.min(height, checkH),
      })
      .stats();

    // Calculate mean brightness across RGB channels
    const channels = region.channels.slice(0, 3);
    const grayMean = channels.reduce((acc, c) => acc + c.mean, 0) / 3;
    
    // Calculate standard deviation (variance) — indicates structured content
    const grayStdDev = channels.reduce((acc, c) => acc + c.stdev, 0) / 3;

    // DECISION LOGIC:
    // A dark, clear area for logo placement has LOW mean AND LOW variance.
    // An area with an AI-drawn logo has HIGH mean OR HIGH variance.
    //
    // We need BOTH indicators to confidently say "logo exists":
    // - Mean >45 AND StdDev >25: Definite content (bright + structured)
    // - Mean >60: Almost certainly has visible content regardless of variance
    // - Mean <20 AND StdDev <15: Definitely dark and clear — add logo
    // - Middle ground: prefer adding the logo (better to occasionally replace
    //   than to miss placing it, since AI-drawn logos are lower quality)

    if (grayMean > 60) {
      return {
        hasLogo: true,
        reason: `High brightness (mean:${grayMean.toFixed(1)}) indicates existing logo/content`,
      };
    }

    if (grayMean > 40 && grayStdDev > 30) {
      return {
        hasLogo: true,
        reason: `Moderate brightness (mean:${grayMean.toFixed(1)}) + high structure (stddev:${grayStdDev.toFixed(1)}) indicates logo`,
      };
    }

    // Default: area is clear enough to add our logo
    return {
      hasLogo: false,
      reason: `Clear area (mean:${grayMean.toFixed(1)}, stddev:${grayStdDev.toFixed(1)})`,
    };
  } catch (e) {
    // If detection fails, default to ADDING the logo (better than missing it)
    console.warn('[LogoOverlay] Detection check failed (will add logo):', e);
    return { hasLogo: false, reason: 'Detection failed — defaulting to add' };
  }
}

/**
 * Composite the Hola Prime logo onto a generated creative image.
 *
 * This function is designed to be non-blocking: if anything fails,
 * it returns the original image unchanged so generation is never blocked.
 *
 * @param imageDataUri - The generated image as a data URI (data:image/...;base64,...)
 * @param skipDetection - If true, skip logo detection and ALWAYS add the logo.
 *                        Use this when you know for certain the image doesn't have a logo.
 * @returns Modified image data URI with logo composited, or original on failure
 */
export async function applyLogoOverlay(
  imageDataUri: string,
  skipDetection: boolean = false
): Promise<string> {
  if (!imageDataUri || !imageDataUri.startsWith('data:')) {
    return imageDataUri;
  }

  try {
    const commaIdx = imageDataUri.indexOf(',');
    if (commaIdx === -1) return imageDataUri;

    const base64 = imageDataUri.substring(commaIdx + 1);
    const imageBuffer = Buffer.from(base64, 'base64');

    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    // ── Compact top-left brand placement, aligned on the SAME horizontal line as
    //    the "#WeAreTraders" tagline (which the image model renders top-right inside
    //    the reserved top brand strip). The stacked wordmark is band-constrained so
    //    it never bleeds into the headline. ──
    const brandLineCenterY = Math.round(height * 0.06); // strip center ≈ 6% from top
    const logoMaxH = Math.round(height * 0.085);        // stacked 2-line wordmark
    const logoMaxW = Math.round(width * 0.30);
    const paddingLeft = Math.round(width * 0.055);

    // ── Load logo: prefer PNG file, fall back to SVG render ──
    let logoBuffer: Buffer;
    const logoPath = getLogoPath();

    if (fs.existsSync(logoPath)) {
      // Process the logo PNG:
      // 1. Make the solid black background transparent (near-black → alpha 0)
      // 2. TRIM the now-transparent padding so the wordmark hugs the corner
      // 3. Resize INTO the brand band (height-constrained, width-capped)
      const rawLogo = await sharp(logoPath)
        .ensureAlpha()  // Ensure RGBA channels exist
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = rawLogo;
      const { channels } = info;

      // Make near-black pixels transparent (threshold: RGB all < 40)
      const BLACK_THRESHOLD = 40;
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
          data[i + 3] = 0;  // Set alpha to 0 (fully transparent)
        }
      }

      logoBuffer = await sharp(data, { raw: { width: info.width, height: info.height, channels } })
        .trim()  // strip the transparent padding so the logo sits flush in the corner
        .resize({ width: logoMaxW, height: logoMaxH, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      console.log(`[LogoOverlay] Loaded PNG logo → black removed, trimmed, fit into ${logoMaxW}x${logoMaxH} band`);
    } else {
      logoBuffer = await renderLogoFromSvg(Math.min(logoMaxW, Math.round(logoMaxH * 1.8)));
      console.log(`[LogoOverlay] Rendered SVG logo → band ${logoMaxH}px tall`);
    }

    // ── FORCED OVERLAY ──
    // Visual detection occasionally triggers false positives on bright/textured
    // backgrounds. We now forcefully apply the overlay to every creative to 
    // guarantee identical brand consistency, overriding any AI-generated artifacts.
    console.log('[LogoOverlay] Enforcing brand logo overlay on creative...');

    const composites: sharp.OverlayOptions[] = [];

    // ── Natural Blending: Soft Shadow/Glow ──
    // Instead of a solid black rectangle, we use a soft radial gradient shadow.
    // This allows the logo to pop while blending naturally with the background.
    const logoMeta = await sharp(logoBuffer).metadata();
    const logoH = logoMeta.height || logoMaxH;
    // Vertically center the logo on the brand line so it aligns with #WeAreTraders.
    const paddingTop = Math.max(0, brandLineCenterY - Math.round(logoH / 2));
    const bgW = (logoMeta.width || logoMaxW) + 80;
    const bgH = logoH + 80;

    const shadowSvg = `<svg width="${bgW}" height="${bgH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="black" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="black" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${bgW}" height="${bgH}" fill="url(#shadow)"/>
    </svg>`;

    composites.push({
      input: Buffer.from(shadowSvg),
      top: Math.max(0, paddingTop - 40),
      left: Math.max(0, paddingLeft - 40),
      blend: 'over',
    });

    // ── Composite the logo at top-left ──
    composites.push({
      input: logoBuffer,
      top: paddingTop,
      left: paddingLeft,
      blend: 'over' as const,
    });

    const result = await sharp(imageBuffer)
      .composite(composites)
      .png()
      .toBuffer();

    const outputDataUri = `data:image/png;base64,${result.toString('base64')}`;
    console.log('[LogoOverlay] ✓ Hola Prime logo composited onto creative');
    return outputDataUri;

  } catch (err: any) {
    console.error('[LogoOverlay] ✗ FAILED to composite logo:', err.message);
    return imageDataUri; // Return original on failure — never block generation
  }
}

/**
 * Composite a USER-UPLOADED brand logo (from the Brand Knowledge Base) onto a
 * generated image. Unlike applyLogoOverlay (which uses the hardcoded Hola Prime
 * PNG), this takes the logo the team uploaded in Settings → Brand Kit. SVG logos
 * are rasterised by sharp at high density for crisp edges; PNG/JPEG/WebP logos
 * are used as-is (alpha preserved).
 *
 * Non-blocking: returns the original image on any failure.
 *
 * @param imageDataUri  The generated image (data URI).
 * @param logo          { dataUri } — the uploaded logo as a data URI or http(s) URL.
 * @param opts.position Corner to place the logo in (default 'top-left').
 * @param opts.widthPct Logo width as a fraction of image width (default 0.17).
 * @param opts.shadow   Add a soft radial shadow behind the logo (default true).
 */
export async function applyBrandLogoOverlay(
  imageDataUri: string,
  logo: { dataUri: string; format?: string },
  opts: {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    widthPct?: number;
    shadow?: boolean;
  } = {},
): Promise<string> {
  if (!imageDataUri || !imageDataUri.startsWith('data:')) return imageDataUri;
  if (!logo || !logo.dataUri) return imageDataUri;

  const position = opts.position || 'top-left';
  const widthPct = opts.widthPct ?? 0.17;
  const shadow = opts.shadow ?? true;

  try {
    // ── Decode the base image ──
    const imgComma = imageDataUri.indexOf(',');
    const imageBuffer = Buffer.from(imageDataUri.substring(imgComma + 1), 'base64');
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1080;
    const height = metadata.height || 1920;

    // ── Load the uploaded logo (data URI or remote URL) ──
    let rawLogoBuffer: Buffer;
    if (logo.dataUri.startsWith('data:')) {
      const lComma = logo.dataUri.indexOf(',');
      rawLogoBuffer = Buffer.from(logo.dataUri.substring(lComma + 1), 'base64');
    } else {
      const res = await fetch(logo.dataUri);
      if (!res.ok) throw new Error(`logo fetch failed: HTTP ${res.status}`);
      rawLogoBuffer = Buffer.from(await res.arrayBuffer());
    }

    // Fit the logo into a compact corner band (band-tall, ≤28% wide) so it sits
    // cleanly in the corner and never bleeds into the headline.
    const bandH = Math.round(height * 0.05);
    const maxLogoW = Math.round(width * 0.28);

    // High density makes SVG rasterisation crisp; ignored for raster formats.
    let logoBuffer = await sharp(rawLogoBuffer, { density: 384 })
      .resize({ width: maxLogoW, height: bandH, fit: 'inside', withoutEnlargement: false })
      .ensureAlpha()
      .png()
      .toBuffer();

    const logoMeta = await sharp(logoBuffer).metadata();
    const lw = logoMeta.width || maxLogoW;
    const lh = logoMeta.height || bandH;

    // ── Position: compact corner aligned with the top branding line ──
    const padX = Math.round(width * 0.06);
    const padY = Math.round(height * 0.035);
    const left = position.endsWith('right')
      ? Math.max(0, width - lw - padX)
      : padX;
    const top = position.startsWith('bottom')
      ? Math.max(0, height - lh - padY)
      : padY;

    // ── AUTO-CONTRAST: recolor the logo so it stays visible on the background ──
    // Sample the brightness behind the logo. On a dark background, recolor the
    // logo's DARK pixels to white; on a light background, recolor its LIGHT pixels
    // to near-black. Mid/coloured pixels (e.g. the iridescent globe) are left alone.
    try {
      const region = await sharp(imageBuffer)
        .extract({
          left,
          top,
          width: Math.max(1, Math.min(lw, width - left)),
          height: Math.max(1, Math.min(lh, height - top)),
        })
        .stats();
      const bgMean = region.channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
      const bgDark = bgMean < 115;

      const rawLogo = await sharp(logoBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const { data, info } = rawLogo;
      const ch = info.channels;
      let recoloured = 0;
      for (let i = 0; i < data.length; i += ch) {
        if (data[i + 3] < 12) continue; // transparent
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (bgDark && lum < 115) {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; recoloured++;
        } else if (!bgDark && lum > 150) {
          data[i] = 12; data[i + 1] = 12; data[i + 2] = 12; recoloured++;
        }
      }
      if (recoloured > 0) {
        logoBuffer = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } }).png().toBuffer();
        console.log(`[LogoOverlay] Auto-contrast: bg ${bgDark ? 'dark' : 'light'} (mean ${bgMean.toFixed(0)}) → recoloured ${recoloured} logo px to ${bgDark ? 'white' : 'dark'}`);
      }
    } catch (e: any) {
      console.warn('[LogoOverlay] Auto-contrast skipped:', e.message);
    }

    const composites: sharp.OverlayOptions[] = [];

    if (shadow) {
      const bgW = lw + 80;
      const bgH = lh + 80;
      const shadowSvg = `<svg width="${bgW}" height="${bgH}" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="s" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="black" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="black" stop-opacity="0"/>
        </radialGradient></defs>
        <rect width="${bgW}" height="${bgH}" fill="url(#s)"/>
      </svg>`;
      composites.push({
        input: Buffer.from(shadowSvg),
        top: Math.max(0, top - 40),
        left: Math.max(0, left - 40),
        blend: 'over',
      });
    }

    composites.push({ input: logoBuffer, top, left, blend: 'over' });

    const result = await sharp(imageBuffer).composite(composites).png().toBuffer();
    console.log(`[LogoOverlay] ✓ Brand-kit logo composited (${position}, ${lw}x${lh}px, ${logo.format || 'image'})`);
    return `data:image/png;base64,${result.toString('base64')}`;
  } catch (err: any) {
    console.error('[LogoOverlay] ✗ Brand-kit logo overlay failed (non-blocking):', err.message);
    return imageDataUri;
  }
}
