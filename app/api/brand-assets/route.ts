/**
 * Brand Assets API — manage the recurring creative furniture (logo variants,
 * Trustpilot, Deloitte, ZERO PAYOUT DENIAL stamp) that the generator composites
 * onto every creative.
 *
 *   GET  /api/brand-assets   → the asset slots + a /brand/<file> preview URL + whether each exists
 *   POST /api/brand-assets   → { slot, dataUri } writes the (PNG-normalised) asset into public/brand/
 *
 * The template engine (server/ai-studio/brand-assets.ts) reads public/brand/,
 * so a replacement here is picked up on the next generation with no code change.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { BRAND_ASSET_SLOTS, BRAND_ASSET_FILE } from "@/lib/brand-asset-slots";
import { requireSession } from "@/server/api-auth";

const DIR = path.join(process.cwd(), "public", "brand");
const MAX_BYTES = 6 * 1024 * 1024;

export async function GET() {
  const slots = BRAND_ASSET_SLOTS.map((s) => ({
    ...s,
    url: `/brand/${s.file}`,
    exists: fs.existsSync(path.join(DIR, s.file)),
  }));
  return NextResponse.json({ slots });
}

export async function POST(request: Request) {
  // Writes the brand furniture used on every creative — verified session required.
  const unauth = await requireSession();
  if (unauth) return unauth;
  try {
    const { slot, dataUri } = await request.json();
    const file = BRAND_ASSET_FILE[slot];
    if (!file) return NextResponse.json({ error: "Unknown asset slot" }, { status: 400 });
    if (typeof dataUri !== "string" || !dataUri.startsWith("data:image/")) {
      return NextResponse.json({ error: "Expected an image data URI" }, { status: 400 });
    }
    const buf = Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64");
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 6 MB)" }, { status: 400 });

    // Normalise any uploaded format (png/jpeg/webp/svg) to a transparent PNG so the
    // engine — which reads <file>.png — always gets a valid PNG.
    const png = await sharp(buf, { density: 300 }).png().toBuffer();
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, file), png);

    return NextResponse.json({ ok: true, url: `/brand/${file}`, bytes: png.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Save failed" }, { status: 500 });
  }
}
