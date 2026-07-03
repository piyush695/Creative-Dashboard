/**
 * Real brand-asset compositing. Uses the team's actual PNGs (Trustpilot lockup,
 * Deloitte line, distressed ZERO-PAYOUT-DENIAL stamp) instead of SVG recreations.
 *
 * Drop the assets into  public/brand/  with these names (see public/brand/README):
 *   trustpilot-light.png / trustpilot-dark.png   (light = white, for DARK backgrounds)
 *   deloitte-light.png   / deloitte-dark.png
 *   stamp.png            (the distressed rubber-stamp; single variant)
 *
 * "Based on the background": on a dark canvas we use the -light (white) asset; on a
 * light canvas the -dark asset. Missing files degrade gracefully to the SVG furniture.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { CANVAS } from './brand-system';

const BRAND_DIR = path.join(process.cwd(), 'public', 'brand');

type AssetBase = 'trustpilot' | 'deloitte' | 'stamp' | 'logo';
export function assetPath(base: AssetBase, dark: boolean): string | null {
  const file = base === 'stamp' ? 'stamp.png' : `${base}-${dark ? 'light' : 'dark'}.png`;
  const p = path.join(BRAND_DIR, file);
  return fs.existsSync(p) ? p : null;
}
export function hasAsset(base: AssetBase, dark: boolean): boolean {
  return !!assetPath(base, dark);
}

/** Composite the real Trustpilot / Deloitte / stamp PNGs onto the finished creative. */
export async function compositeFurniture(baseBuffer: Buffer, o: { dark: boolean; badge: boolean }): Promise<Buffer> {
  const { W, H } = CANVAS;
  const pad = Math.round(W * 0.045);
  const items: sharp.OverlayOptions[] = [];

  const add = async (base: AssetBase, targetW: number, anchor: 'left' | 'right' | 'center' | 'topleft', ax: number, ay: number) => {
    const p = assetPath(base, o.dark);
    if (!p) return;
    try {
      const img = await sharp(p).resize({ width: targetW, withoutEnlargement: false }).png().toBuffer();
      const m = await sharp(img).metadata();
      const w = m.width || targetW, h = m.height || targetW;
      const left = anchor === 'left' || anchor === 'topleft' ? ax : anchor === 'right' ? ax - w : Math.round(ax - w / 2);
      const top = anchor === 'topleft' ? ay : Math.round(ay - h / 2);
      items.push({ input: img, left: Math.max(0, left), top: Math.max(0, top) });
    } catch { /* skip */ }
  };

  await add('logo', Math.round(W * 0.175), 'topleft', pad, Math.round(H * 0.045));
  await add('trustpilot', Math.round(W * 0.22), 'left', pad, Math.round(H * 0.9));
  await add('deloitte', Math.round(W * 0.28), 'right', W - pad, Math.round(H * 0.9));
  if (o.badge) await add('stamp', Math.round(W * 0.17), 'center', W - Math.round(W * 0.16), Math.round(H * 0.72));

  if (!items.length) return baseBuffer;
  return sharp(baseBuffer).composite(items).png().toBuffer();
}
