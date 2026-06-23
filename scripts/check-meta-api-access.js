/**
 * scripts/check-meta-api-access.js
 *
 * Probes the META_ACCESS_TOKEN in .env to see which Meta API surfaces it
 * has access to. We need to know which is true BEFORE building the
 * enrichment script, because Marketing API + Ad Library API use different
 * permission scopes and the existing token might only have one.
 *
 * The script makes 4 progressive checks:
 *   1.  /me                         — token is valid at all?
 *   2.  /me/adaccounts              — Marketing-API "ads_read" scope?
 *   3.  /me/permissions             — what scopes are actually granted?
 *   4.  /v24.0/{ad_id}/insights     — actual Insights endpoint working?
 *
 * Run:   node scripts/check-meta-api-access.js
 * Run:   node scripts/check-meta-api-access.js <test_ad_id>
 *
 * The token value is never printed — only the prefix and length, for
 * sanity-check that .env is being read at all.
 */

const fs = require('fs');
const path = require('path');

// ─── Minimal .env loader (no extra deps needed) ───
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('[check-meta] No .env found at', envPath);
    return {};
  }
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

const env = loadEnv();
const TOKEN = env.META_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const API_VERSION = env.META_API_VERSION || process.env.META_API_VERSION || 'v24.0';
const AD_ACCOUNTS_RAW = env.AD_ACCOUNTS || process.env.AD_ACCOUNTS || '';
const TEST_AD_ID = process.argv[2] || null;

// Helpers
const masked = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-4)} (length ${t.length})` : '(empty)');
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => console.log(`  ✗ ${msg}`);
const info = (msg) => console.log(`  · ${msg}`);

async function callApi(pathname, extra = {}) {
  const url = new URL(`https://graph.facebook.com/${pathname.startsWith('v') ? '' : API_VERSION + '/'}${pathname}`);
  url.searchParams.set('access_token', TOKEN);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    const json = await res.json();
    return { ok: res.ok, status: res.status, body: json };
  } catch (err) {
    return { ok: false, status: 0, body: { error: { message: err.message } } };
  }
}

async function check1_tokenValid() {
  console.log('\n── CHECK 1 / Token valid (GET /me) ──');
  const r = await callApi('me', { fields: 'id,name' });
  if (r.ok) {
    ok(`Token is valid. Identity: id=${r.body.id} name="${r.body.name || '(no name)'}"`);
    return true;
  } else {
    bad(`Token call failed (${r.status}): ${r.body?.error?.message || JSON.stringify(r.body).slice(0, 200)}`);
    return false;
  }
}

async function check2_adAccounts() {
  console.log('\n── CHECK 2 / Marketing API: list ad accounts (GET /me/adaccounts) ──');
  const r = await callApi('me/adaccounts', { fields: 'name,account_id,account_status', limit: '25' });
  if (r.ok && Array.isArray(r.body.data)) {
    ok(`Marketing API works. Token can see ${r.body.data.length} ad account(s).`);
    for (const acc of r.body.data) {
      info(`account_id=${acc.account_id} | name="${acc.name}" | status=${acc.account_status}`);
    }
    return r.body.data;
  } else {
    bad(`/me/adaccounts failed (${r.status}): ${r.body?.error?.message || 'unknown'}`);
    if (r.body?.error?.code) {
      info(`error code: ${r.body.error.code} subcode: ${r.body.error.error_subcode || '?'}`);
    }
    info('This means the token is MISSING the "ads_read" permission OR the user has no ad accounts.');
    return null;
  }
}

async function check3_permissions() {
  console.log('\n── CHECK 3 / Granted permissions (GET /me/permissions) ──');
  const r = await callApi('me/permissions');
  if (r.ok && Array.isArray(r.body.data)) {
    const granted = r.body.data.filter((p) => p.status === 'granted').map((p) => p.permission);
    ok(`Token has ${granted.length} granted permission(s):`);
    for (const p of granted) info(p);
    const need = ['ads_read', 'ads_management', 'business_management'];
    for (const n of need) {
      if (granted.includes(n)) ok(`required scope present: ${n}`);
      else bad(`required scope MISSING: ${n}`);
    }
    return granted;
  } else {
    bad(`/me/permissions failed: ${r.body?.error?.message}`);
    return null;
  }
}

async function check4_insights(adId) {
  if (!adId) {
    console.log('\n── CHECK 4 / Insights endpoint — SKIPPED (no test ad_id passed) ──');
    info('To test: node scripts/check-meta-api-access.js <facebook_ad_id>');
    return null;
  }
  console.log(`\n── CHECK 4 / Insights endpoint (GET /${adId}/insights) ──`);
  // Meta API v24.0 valid field list — see https://developers.facebook.com/docs/marketing-api/reference/ads-insights/
  // Note: 3-second video views are NOT a top-level field. They come through the
  // `actions` array as { action_type: "video_view", value: "N" }. (Meta's
  // definition of "video_view" is the 3-second standard.)
  const fields = [
    'impressions',
    'spend',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'reach',
    'frequency',
    'outbound_clicks',
    'outbound_clicks_ctr',
    'inline_link_clicks',
    'inline_link_click_ctr',
    'actions',
    'cost_per_action_type',
    'action_values',
    'video_play_actions',
    'video_avg_time_watched_actions',
    'video_p25_watched_actions',
    'video_p50_watched_actions',
    'video_p75_watched_actions',
    'video_p100_watched_actions',
    'quality_ranking',
    'engagement_rate_ranking',
    'conversion_rate_ranking',
  ].join(',');
  const r = await callApi(adId + '/insights', { fields, date_preset: 'maximum' });
  if (r.ok && Array.isArray(r.body.data)) {
    ok(`Insights call succeeded. Returned ${r.body.data.length} row(s).`);
    const row = r.body.data[0] || {};
    const presentKeys = Object.keys(row).sort();
    info(`Fields actually populated: ${presentKeys.join(', ') || '(none)'}`);

    // Decode the actions array to surface the per-action counts we care about
    if (Array.isArray(row.actions)) {
      console.log('\n  Actions breakdown (this is where Stage-1 video_view and Stage-3/4 conversions live):');
      for (const a of row.actions) {
        info(`action_type=${a.action_type} → ${a.value}`);
      }
    }
    if (Array.isArray(row.cost_per_action_type)) {
      console.log('\n  Cost per action breakdown:');
      for (const a of row.cost_per_action_type) {
        info(`action_type=${a.action_type} → $${a.value}`);
      }
    }

    // Highlight Phase-2 field availability
    const phase2Fields = [
      'outbound_clicks',
      'outbound_clicks_ctr',
      'inline_link_clicks',
      'inline_link_click_ctr',
      'actions',
      'cost_per_action_type',
      'action_values',
      'video_play_actions',
      'video_avg_time_watched_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions',
      'quality_ranking',
      'engagement_rate_ranking',
      'conversion_rate_ranking',
    ];
    console.log('\n  Phase-2 field availability:');
    for (const f of phase2Fields) {
      if (f in row) ok(`${f} — present`);
      else bad(`${f} — missing (either not applicable to this ad type, or no data yet)`);
    }
    return row;
  } else {
    bad(`Insights call failed (${r.status}): ${r.body?.error?.message || 'unknown'}`);
    if (r.body?.error?.code) {
      info(`error code: ${r.body.error.code} subcode: ${r.body.error.error_subcode || '?'}`);
    }
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  META ACCESS TOKEN — Capability Probe');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Token:        ${masked(TOKEN)}`);
  console.log(`  API version:  ${API_VERSION}`);
  console.log(`  AD_ACCOUNTS:  ${AD_ACCOUNTS_RAW ? AD_ACCOUNTS_RAW.split(',').length + ' configured' : '(not set)'}`);
  console.log(`  Test ad ID:   ${TEST_AD_ID || '(not provided — Check 4 will be skipped)'}`);

  if (!TOKEN) {
    console.error('\n✗ META_ACCESS_TOKEN is empty. Add it to .env first.');
    process.exit(1);
  }

  const valid = await check1_tokenValid();
  if (!valid) {
    console.log('\nStopping further checks — token is invalid.');
    process.exit(2);
  }
  await check2_adAccounts();
  await check3_permissions();
  await check4_insights(TEST_AD_ID);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Done. Share this output with the agent to decide next steps.');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(99);
});
