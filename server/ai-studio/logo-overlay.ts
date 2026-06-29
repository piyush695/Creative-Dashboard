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

    // Logo sizing: ~17% of image width (smaller for better integration)
    const logoTargetWidth = Math.round(width * 0.17);
    // Position: slightly higher (top padding smaller than left padding)
    const paddingLeft = Math.round(width * 0.03);
    const paddingTop = Math.round(height * 0.015);

    // ── Load logo: prefer PNG file, fall back to SVG render ──
    let logoBuffer: Buffer;
    const logoPath = getLogoPath();

    if (fs.existsSync(logoPath)) {
      // Load and process the logo PNG:
      // 1. Resize to target width
      // 2. Remove black background by making near-black pixels transparent
      const rawLogo = await sharp(logoPath)
        .resize({ width: logoTargetWidth, withoutEnlargement: true })
        .ensureAlpha()  // Ensure RGBA channels exist
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = rawLogo;
      const { width: lw, height: lh, channels } = info;

      // Make near-black pixels transparent (threshold: RGB all < 30)
      // This removes the solid black background from the AI-generated logo
      const BLACK_THRESHOLD = 30;
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD) {
          data[i + 3] = 0;  // Set alpha to 0 (fully transparent)
        }
      }

      logoBuffer = await sharp(data, { raw: { width: lw, height: lh, channels } })
        .png()
        .toBuffer();
      console.log(`[LogoOverlay] Loaded PNG logo → resized to ${logoTargetWidth}px (black bg removed)`);
    } else {
      logoBuffer = await renderLogoFromSvg(logoTargetWidth);
      console.log(`[LogoOverlay] Rendered SVG logo → ${logoTargetWidth}px`);
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
    const bgW = (logoMeta.width || logoTargetWidth) + 80;
    const bgH = (logoMeta.height || Math.round(logoTargetWidth * 0.55)) + 80;

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
