// Composite the real white "hola prime" logo (white wordmark + iridescent globe)
// into the bottom-right corner of header images — matching the reference.
import sharp from 'sharp';
import path from 'path';

const DL = 'C:/Users/Algomill/Downloads';
const LOGO = 'C:/Users/Algomill/Downloads/Creative_Dashboard/public/holaprime-logo.png';
const BIN = 'C:/$Recycle.Bin/S-1-5-21-3646647239-4074075719-3192803279-1001';
// Pristine originals recovered from the Recycle Bin -> name to write in Downloads.
const targets = [
  { src: `${BIN}/$R227RK9.webp`, name: '5-best-remote-prop-trading-firms-and-what-sets-them-apart.webp' },
  { src: `${BIN}/$RI5NOC4.webp`, name: '5-best-day-trading-prop-firms-compared-by-fees-rules-profit-split.webp' },
];

// Load logo, key out the black background -> transparent, trim, return PNG buffer.
async function makeWhiteLogo(targetWidth) {
  const { data, info } = await sharp(LOGO)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const TH = 40; // near-black threshold
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < TH && g < TH && b < TH) data[i + 3] = 0; // make transparent
  }

  // Re-wrap, trim transparent border, resize to target width.
  return sharp(data, { raw: { width, height, channels } })
    .png()
    .trim()                       // crop away the empty black/transparent margin
    .resize({ width: targetWidth, withoutEnlargement: true })
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
