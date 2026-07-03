/**
 * Active Offers API — manage the time-limited offers (prices, promo codes,
 * discount %s) the COMPLIANCE GATE accepts in generated ad copy.
 *
 *   GET  /api/active-offers   → { offers: [{ text, expires, note, live }] }
 *   POST /api/active-offers   → { offers: [{ text, expires?, note? }] } replaces the list
 *
 * Backed by config/active-offers.json, which server/ai-studio/claim-gate.ts
 * reads (mtime-cached) — an edit here takes effect on the NEXT generation with
 * no restart. Expired entries stop validating immediately: an expired code in
 * generated copy gets stripped like any invented claim.
 *
 * CAVEAT (same as Brand Assets): the file write persists in local/self-hosted
 * deployments; a serverless read-only deploy would need this moved to MongoDB.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireSession } from '@/server/api-auth';

const FILE = path.join(process.cwd(), 'config', 'active-offers.json');
const README =
  'ACTIVE OFFERS — time-limited prices, promo codes and discount %s the compliance gate accepts in generated ad copy. The team edits this per campaign (Settings → Active Offers). \'expires\' is an ISO date (inclusive, end of day) or null for open-ended; EXPIRED ENTRIES STOP VALIDATING IMMEDIATELY, so an expired code in copy gets stripped automatically. Evergreen brand facts do NOT belong here — they live in server/ai-studio/claim-gate.ts (APPROVED_BRAND_FACTS).';

function isLive(expires: string | null | undefined): boolean {
  if (!expires) return true;
  const iso = String(expires);
  const end = new Date(iso.length === 10 ? `${iso}T23:59:59` : iso).getTime();
  return Number.isFinite(end) && end >= Date.now();
}

export async function GET() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const offers = (Array.isArray(raw?.offers) ? raw.offers : [])
      .filter((o: any) => o && typeof o.text === 'string')
      .map((o: any) => ({ text: o.text, expires: o.expires ?? null, note: o.note ?? '', live: isLive(o.expires) }));
    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ offers: [] });
  }
}

export async function POST(request: Request) {
  // Edits the compliance gate's allowed offers — verified session required.
  const unauth = await requireSession();
  if (unauth) return unauth;
  try {
    const body = await request.json();
    if (!Array.isArray(body?.offers)) {
      return NextResponse.json({ error: 'Expected { offers: [...] }' }, { status: 400 });
    }
    if (body.offers.length > 100) {
      return NextResponse.json({ error: 'Too many offers (max 100)' }, { status: 400 });
    }
    const offers = [];
    for (const o of body.offers) {
      const text = typeof o?.text === 'string' ? o.text.trim() : '';
      if (!text) continue; // skip blank rows silently (unfilled "add" rows)
      if (text.length > 60) return NextResponse.json({ error: `Offer "${text.slice(0, 30)}…" is too long (max 60 chars)` }, { status: 400 });
      let expires: string | null = null;
      if (o.expires) {
        const iso = String(o.expires).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(new Date(`${iso}T00:00:00`).getTime())) {
          return NextResponse.json({ error: `Invalid expiry date for "${text}" — use YYYY-MM-DD` }, { status: 400 });
        }
        expires = iso;
      }
      offers.push({ text, expires, note: typeof o.note === 'string' ? o.note.slice(0, 120) : '' });
    }
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ _readme: README, offers }, null, 2) + '\n');
    return NextResponse.json({ ok: true, count: offers.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Save failed' }, { status: 500 });
  }
}
