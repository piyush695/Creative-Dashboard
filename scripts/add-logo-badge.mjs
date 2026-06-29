// Composite the real white "hola prime" logo (white wordmark + iridescent globe)
// into the bottom-right corner of header images — matching the reference.
import sharp from 'sharp';
import path from 'path';

const DL = 'C:/Users/Algomill/Downloads';
const LOGO = 'C:/Users/Algomill/Downloads/Creative_Dashboard/public/holaprime-logo.png';
const targets = [
  { name: '5-best-remote-prop-trading-firms-and-what-sets-them-apart.webp' },
  { name: '5-best-day-trading-prop-firms-compared-by-fees-rules-profit-split.webp' },
].map(t => ({ ...t, src: `${DL}/${t.name}` }));

// Render the white "hola prime" wordmark as a crisp VECTOR (SVG) — no JPEG
// blur. Supersampled 4x then downscaled for clean anti-aliased edges.
async function makeWhiteLogo(targetWidth) {
  const baseW = 160, baseH = 88;
  const SS = 4;                                  // supersample factor
  const scale = (targetWidth / baseW) * SS;
  const svgW = Math.round(baseW * scale);
  const svgH = Math.round(baseH * scale);

  const svg = `<svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="globe" cx="38%" cy="32%" r="70%">
        <stop offset="0%"  stop-color="#ffffff"/>
        <stop offset="18%" stop-color="#e9c2f2"/>
        <stop offset="42%" stop-color="#ff7eb3"/>
        <stop offset="62%" stop-color="#7ec8e3"/>
        <stop offset="82%" stop-color="#19c6f0"/>
        <stop offset="100%" stop-color="#141430"/>
      </radialGradient>
    </defs>
    <g transform="scale(${scale})">
      <g fill="#FFFFFF" font-family="Arial,'Segoe UI',Helvetica,sans-serif" font-weight="700" font-size="46" letter-spacing="-1.5">
        <text x="0" y="35">h</text>
        <circle cx="47" cy="20" r="16" fill="url(#globe)"/>
        <circle cx="42" cy="13" r="4.2" fill="#ffffff" opacity="0.85"/>
        <text x="68" y="35">la</text>
        <text x="112" y="14" font-size="12" font-weight="700" letter-spacing="0">®</text>
        <text x="0" y="78">prime</text>
      </g>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg), { density: 384 })
    .resize({ width: targetWidth })              // downscale 4x -> crisp
    .png()
    .toBuffer();
}

for (const { src, name } of targets) {
  const meta = await sharp(src).metadata();
  const W = meta.width, H = meta.height;

  const logoW = Math.round(W * 0.075);         // logo ~7.5% of image width (matches reference)
  const logo = await makeWhiteLogo(logoW);
  const lMeta = await sharp(logo).metadata();
  const margin = Math.round(W * 0.03);
  const left = W - lMeta.width - margin;
  const top = H - lMeta.height - margin;

  const out = path.join(DL, name.replace(/\.webp$/, '-holaprime.webp'));
  await sharp(src)
    .composite([{ input: logo, top, left, blend: 'over' }])
    .webp({ quality: 92 })
    .toFile(out);
  console.log(`✓ ${path.basename(out)}  (logo ${lMeta.width}x${lMeta.height} @ ${left},${top})`);
}
