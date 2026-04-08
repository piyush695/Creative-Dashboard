/**
 * Generate the Hola Prime logo PNG from SVG using Sharp.
 * 
 * This creates a high-quality PNG with transparent background at public/holaprime-logo.png.
 * Run once: node scripts/generate-logo.mjs
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'holaprime-logo.png');

// Render at 2x resolution for crisp display (will be downscaled by logo-overlay.ts)
const WIDTH = 480;
const HEIGHT = 264;
const SCALE = WIDTH / 160;

const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="iridescent" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="15%" stop-color="#e8c1f0"/>
      <stop offset="35%" stop-color="#ff7eb3"/>
      <stop offset="55%" stop-color="#7ec8e3"/>
      <stop offset="75%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#1a1a2e" stop-opacity="0.8"/>
    </radialGradient>
    <radialGradient id="specular" cx="40%" cy="25%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g transform="scale(${SCALE})">
    <!-- Drop shadow layer -->
    <g fill="rgba(0,0,0,0.4)" font-family="'Arial Black','Segoe UI Black',Arial,Helvetica,sans-serif" font-weight="900" font-size="46" letter-spacing="-1.5">
      <text x="2" y="37">h</text>
      <text x="70" y="37">la</text>
      <text x="2" y="80">prime</text>
    </g>
    <!-- Main white text -->
    <g fill="#FFFFFF" font-family="'Arial Black','Segoe UI Black',Arial,Helvetica,sans-serif" font-weight="900" font-size="46" letter-spacing="-1.5">
      <text x="0" y="35">h</text>
      <!-- Iridescent globe replacing "o" -->
      <circle cx="47" cy="20" r="16" fill="url(#iridescent)"/>
      <!-- Specular highlights -->
      <ellipse cx="42" cy="14" rx="5" ry="4" fill="url(#specular)"/>
      <circle cx="53" cy="26" r="2.5" fill="#ffffff" opacity="0.25"/>
      <text x="68" y="35">la</text>
      <!-- ® symbol -->
      <text x="113" y="15" font-size="13" font-weight="700" letter-spacing="0" fill="#FFFFFF">®</text>
      <text x="0" y="78">prime</text>
    </g>
  </g>
</svg>`;

async function main() {
  try {
    await sharp(Buffer.from(svg))
      .png({ compressionLevel: 6 })
      .toFile(OUTPUT_PATH);
    
    const info = await sharp(OUTPUT_PATH).metadata();
    console.log(`✓ Logo generated: ${OUTPUT_PATH}`);
    console.log(`  Dimensions: ${info.width}x${info.height}, Format: ${info.format}, Size: ${info.size} bytes`);
    console.log(`  Has alpha: ${info.hasAlpha}`);
  } catch (err) {
    console.error('✗ Failed to generate logo:', err.message);
    process.exit(1);
  }
}

main();
