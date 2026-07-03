/**
 * API-AUTH REGRESSION CHECK — asserts every protected API route rejects
 * unauthenticated requests with 401, and /api/auth stays public.
 *
 * Run against a RUNNING server (dev or deployed):
 *   node scripts/api-auth.check.mjs                     # localhost:3000
 *   BASE_URL=https://your-domain node scripts/api-auth.check.mjs
 *
 * Exits non-zero on any failure. Run after ANY change to middleware.ts,
 * server/api-auth.ts, or an API route's auth handling — and once against
 * the deployed domain after every deploy.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const CASES = [
  // [method, path, body, expected, label]
  ['POST', '/api/studio', { type: 'custom', prompt: 'x', directMode: true }, 401, 'studio generation'],
  ['POST', '/api/brand-assets', { slot: 'logo-dark', dataUri: 'data:image/png;base64,x' }, 401, 'brand asset upload'],
  ['POST', '/api/active-offers', { offers: [] }, 401, 'active offers write'],
  ['POST', '/api/brand-knowledge', {}, 401, 'brand knowledge write'],
  ['POST', '/api/realtime/meta', {}, 401, 'realtime analysis'],
  ['GET', '/api/adlibrary?action=sync-all', null, 401, 'ad library sync (mutating GET)'],
  ['GET', '/api/active-offers', null, 401, 'active offers read (middleware gate)'],
  ['GET', '/api/auth/csrf', null, 200, '/api/auth must stay PUBLIC (login flow)'],
];

let fail = 0;
for (const [method, path, body, expected, label] of CASES) {
  let status;
  try {
    const res = await fetch(BASE + path, {
      method,
      redirect: 'manual',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
  } catch (e) {
    console.log(`  ✗ ${method} ${path} — request failed: ${e.message}`);
    fail++;
    continue;
  }
  const ok = status === expected;
  if (!ok) fail++;
  console.log(`  ${ok ? '✓' : '✗ FAIL'} ${method} ${path} → ${status} (expect ${expected}) — ${label}`);
}

console.log(fail ? `\nRESULT: ${fail} FAILURE(S) — unauthenticated access is possible!` : '\nRESULT: all API-auth checks passed');
process.exit(fail ? 1 : 0);
