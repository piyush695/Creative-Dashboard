/**
 * scripts/sync-meta-ads.js
 *
 * Full Meta sync: pulls every ad + creative + all-time insights from every ad
 * account the META_ACCESS_TOKEN can see, and upserts each into the
 * `creative_data` MongoDB collection so the analyzer + UI can work on them.
 *
 * Uses Meta Graph API v24.0 field expansion to fetch ad + creative + insights
 * in a single call per page (~25 ads per page). Cursor-paginates through all
 * ads in each account, then moves to the next account.
 *
 * Designed for one-time backfill. Re-running is idempotent (upserts by adId
 * via updateMany so it handles the duplicate-doc situation from the n8n sync).
 *
 * USAGE
 *   node scripts/sync-meta-ads.js                       # all 19 accounts
 *   node scripts/sync-meta-ads.js --accounts=123,456    # only those accounts
 *   node scripts/sync-meta-ads.js --statuses=ACTIVE     # only currently-running
 *   node scripts/sync-meta-ads.js --limit=10            # 10 ads per account (test)
 *   node scripts/sync-meta-ads.js --dry-run             # don't write to Mongo
 *
 * Expected total: 19 accounts × ~100-500 ads each = potentially 2000-10000 ads.
 * Runtime: ~10-30 minutes depending on Meta API rate limits.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

// ─── Minimal .env loader (matches scripts/check-meta-api-access.js) ───
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('[sync] No .env found at', envPath);
    process.exit(1);
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
const MONGO_URI = env.MONGODB_URI || process.env.MONGODB_URI || '';
const MONGO_DB = env.MONGODB_DB || process.env.MONGODB_DB || 'reddit_data';

// Cloudinary config — mirrors lib/ai-studio/storage.ts approach. When present,
// the sync uploads Meta's permalink_url images to Cloudinary so we get
// permanent, HD CDN URLs (Meta's permalink_url can rotate/expire).
const CLOUDINARY_CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_FOLDER = 'meta_ads';
const cloudinaryConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (!TOKEN) { console.error('[sync] META_ACCESS_TOKEN missing in .env'); process.exit(1); }
if (!MONGO_URI) { console.error('[sync] MONGODB_URI missing in .env'); process.exit(1); }

// ─── CLI args ───
function parseArgs() {
  const out = { accounts: null, statuses: ['ACTIVE', 'PAUSED', 'ARCHIVED'], limit: 25, maxAdsPerAccount: null, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--accounts=')) out.accounts = arg.slice('--accounts='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--statuses=')) out.statuses = arg.slice('--statuses='.length).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (arg.startsWith('--limit=')) out.limit = parseInt(arg.slice('--limit='.length), 10) || 25;
    else if (arg.startsWith('--max-per-account=')) out.maxAdsPerAccount = parseInt(arg.slice('--max-per-account='.length), 10);
    else if (arg === '--dry-run') out.dryRun = true;
  }
  return out;
}

// ─── Meta API helpers ───
function buildAdsUrl(accountId, statuses, limit, after) {
  // Field expansion: get ad + creative + all-time insights in one call.
  // Insights uses date_preset=maximum (all time).
  // Note: `image_hash` is requested so we can resolve high-res permalink URLs
  //       via /act_{id}/adimages — Meta's `thumbnail_url` is only ~64×64 and
  //       looks blurry when rendered at card size.
  const fields = [
    'id',
    'name',
    'status',
    'effective_status',
    'account_id',
    'adset_id',
    'campaign_id',
    'created_time',
    'updated_time',
    'creative{id,image_url,thumbnail_url,image_hash,body,title,link_url,object_type,call_to_action_type,video_id,object_story_spec,effective_object_story_id}',
    [
      'insights.date_preset(maximum){',
      'impressions,spend,clicks,ctr,cpc,cpm,reach,frequency,',
      'outbound_clicks,outbound_clicks_ctr,inline_link_clicks,inline_link_click_ctr,',
      'actions,cost_per_action_type,action_values,',
      'video_play_actions,video_avg_time_watched_actions,',
      'video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,',
      'quality_ranking,engagement_rate_ranking,conversion_rate_ranking',
      '}',
    ].join(''),
  ].join(',');

  const url = new URL(`https://graph.facebook.com/${API_VERSION}/act_${accountId}/ads`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('effective_status', JSON.stringify(statuses));
  if (after) url.searchParams.set('after', after);
  url.searchParams.set('access_token', TOKEN);
  return url.toString();
}

async function fetchWithRetry(url, attempt = 1) {
  const MAX_ATTEMPTS = 4;
  let res;
  try { res = await fetch(url); }
  catch (err) {
    if (attempt >= MAX_ATTEMPTS) throw err;
    const wait = 2000 * attempt;
    console.warn(`  ! Network error: ${err.message}. Retry ${attempt}/${MAX_ATTEMPTS} after ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchWithRetry(url, attempt + 1);
  }
  const json = await res.json().catch(() => ({}));
  if (res.ok) return json;

  // Rate limited (code 4, 17, 32) or transient — back off
  const code = json?.error?.code;
  const subcode = json?.error?.error_subcode;
  const isRateLimit = [4, 17, 32, 613].includes(code);
  if ((isRateLimit || res.status >= 500) && attempt < MAX_ATTEMPTS) {
    const wait = isRateLimit ? 60_000 : 3000 * attempt;
    console.warn(`  ! API ${res.status} (code ${code}/${subcode || '?'}): ${json?.error?.message || 'unknown'}. Sleeping ${Math.round(wait / 1000)}s before retry ${attempt}/${MAX_ATTEMPTS}`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchWithRetry(url, attempt + 1);
  }
  const e = new Error(json?.error?.message || `HTTP ${res.status}`);
  e.metaError = json?.error;
  throw e;
}

async function fetchAdAccounts() {
  const url = `https://graph.facebook.com/${API_VERSION}/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=${TOKEN}`;
  const json = await fetchWithRetry(url);
  return Array.isArray(json?.data) ? json.data : [];
}

// Resolve image_hash → high-res permalink_url. Meta returns only a small
// thumbnail_url by default; /adimages gives us the actual CDN URL of the
// uploaded asset, which is what we want to render in the dashboard.
// Batched per page (max ~50 hashes per call to stay under Meta's URL size limit).
async function resolveImageHashes(accountId, hashes) {
  const map = {};
  if (!Array.isArray(hashes) || hashes.length === 0) return map;
  const unique = [...new Set(hashes.filter(Boolean))];

  // Chunk to ~40 per call to keep the URL short
  const CHUNK = 40;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const url = new URL(`https://graph.facebook.com/${API_VERSION}/act_${accountId}/adimages`);
    url.searchParams.set('hashes', JSON.stringify(chunk));
    url.searchParams.set('fields', 'hash,url,permalink_url,original_height,original_width');
    url.searchParams.set('access_token', TOKEN);
    try {
      const json = await fetchWithRetry(url.toString());
      if (Array.isArray(json?.data)) {
        for (const img of json.data) {
          if (img.hash) {
            map[img.hash] = img.permalink_url || img.url || '';
          }
        }
      }
    } catch (err) {
      console.warn(`  ! adimages lookup failed for ${chunk.length} hashes: ${err.message}`);
    }
  }
  return map;
}

// Extract the image_hash from an ad's creative (top-level or nested in story spec)
function extractImageHash(ad) {
  const c = ad?.creative || {};
  const story = c.object_story_spec || {};
  const link = story.link_data || story.video_data || {};
  return c.image_hash || link.image_hash || null;
}

// ─── Cloudinary: process-wide cache of image_hash → secure_url ───
// Means we never upload the same hash twice within a single sync run,
// even if it appears in many ads across many accounts.
const cloudinaryHashCache = new Map();
let cloudinaryStats = { reusedFromMemory: 0, reusedFromDb: 0, uploaded: 0, failed: 0 };

// Upload a remote URL to Cloudinary using SHA-1 signed REST upload.
// Cloudinary fetches the source URL itself — we don't need to download/re-upload.
// Returns the secure_url on success, null on failure.
async function uploadFromUrlToCloudinary(sourceUrl, publicId) {
  if (!cloudinaryConfigured) return null;
  if (!sourceUrl) return null;

  const timestamp = Math.floor(Date.now() / 1000);

  // Signed-upload params must be sorted alphabetically by key, joined with &, then API_SECRET appended
  const paramsToSign = [
    `folder=${CLOUDINARY_FOLDER}`,
    `overwrite=false`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].sort().join('&') + CLOUDINARY_API_SECRET;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('file', sourceUrl); // Cloudinary fetches this URL on its end
  form.append('api_key', CLOUDINARY_API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', CLOUDINARY_FOLDER);
  form.append('public_id', publicId);
  form.append('overwrite', 'false');

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (res.ok && json?.secure_url) return json.secure_url;

    // Cloudinary returns an error when the public_id already exists and overwrite=false.
    // In that case we can construct the canonical secure_url from the public_id.
    if (json?.error?.message && /already exists/i.test(json.error.message)) {
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${CLOUDINARY_FOLDER}/${publicId}`;
    }
    console.warn(`  ! Cloudinary upload failed for ${publicId}: ${json?.error?.message || res.statusText}`);
    return null;
  } catch (err) {
    console.warn(`  ! Cloudinary upload error for ${publicId}: ${err.message}`);
    return null;
  }
}

// Get a Cloudinary URL for a hash. Checks (1) in-memory cache, (2) MongoDB
// for existing thumbnailUrl from a prior sync run, (3) finally uploads.
async function getCloudinaryUrlForHash(coll, hash, permalinkUrl) {
  if (!hash || !cloudinaryConfigured) return null;

  // 1. In-memory cache (this run)
  if (cloudinaryHashCache.has(hash)) {
    cloudinaryStats.reusedFromMemory++;
    return cloudinaryHashCache.get(hash);
  }

  // 2. MongoDB lookup (previous runs)
  try {
    const existing = await coll.findOne(
      { image_hash: hash, thumbnailUrl: { $regex: 'res\\.cloudinary\\.com' } },
      { projection: { thumbnailUrl: 1 } }
    );
    if (existing?.thumbnailUrl) {
      cloudinaryHashCache.set(hash, existing.thumbnailUrl);
      cloudinaryStats.reusedFromDb++;
      return existing.thumbnailUrl;
    }
  } catch { /* lookup failed — fall through to upload */ }

  // 3. Upload to Cloudinary (using Meta's permalink as the source)
  if (!permalinkUrl) return null;
  const url = await uploadFromUrlToCloudinary(permalinkUrl, hash);
  if (url) {
    cloudinaryHashCache.set(hash, url);
    cloudinaryStats.uploaded++;
    return url;
  }
  cloudinaryStats.failed++;
  return null;
}

// Resolve a batch of hashes → Cloudinary URLs (in parallel where possible)
async function getCloudinaryUrlsForHashes(coll, hashUrlMap) {
  if (!cloudinaryConfigured) return {};
  const entries = Object.entries(hashUrlMap);
  const out = {};
  // Run in chunks of 4 to avoid hammering Cloudinary (its free tier rate-limits)
  const CHUNK = 4;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async ([hash, permalink]) => [hash, await getCloudinaryUrlForHash(coll, hash, permalink)])
    );
    for (const [hash, url] of results) {
      if (url) out[hash] = url;
    }
  }
  return out;
}

// ─── Insights row parsing (mirrors lib/realtime-services/metaInsightsEnrich.ts) ───
function findActionValue(arr, type) {
  if (!Array.isArray(arr)) return null;
  const found = arr.find((a) => a?.action_type === type);
  if (!found || found.value === undefined || found.value === null) return null;
  const n = Number(found.value);
  return Number.isFinite(n) ? n : null;
}
function safeNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function safeDiv(num, den) {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

function parseInsights(insightsRow) {
  if (!insightsRow) return {};
  const actions = insightsRow.actions || [];
  const costs = insightsRow.cost_per_action_type || [];
  const values = insightsRow.action_values || [];

  const impressions = safeNum(insightsRow.impressions);
  const video_3sec_views = findActionValue(actions, 'video_view');
  const purchase_count = findActionValue(actions, 'purchase');
  const lead_count = findActionValue(actions, 'lead');
  const inline_link_clicks = safeNum(insightsRow.inline_link_clicks);
  const vp25 = findActionValue(insightsRow.video_p25_watched_actions, 'video_view');
  const vp50 = findActionValue(insightsRow.video_p50_watched_actions, 'video_view');
  const vp75 = findActionValue(insightsRow.video_p75_watched_actions, 'video_view');
  const vp100 = findActionValue(insightsRow.video_p100_watched_actions, 'video_view');

  return {
    // Core
    impressions: safeNum(insightsRow.impressions),
    spend: safeNum(insightsRow.spend),
    clicks: safeNum(insightsRow.clicks),
    ctr: safeNum(insightsRow.ctr),
    cpc: safeNum(insightsRow.cpc),
    cpm: safeNum(insightsRow.cpm),
    reach: safeNum(insightsRow.reach),
    frequency: safeNum(insightsRow.frequency),
    // Stage 3
    outbound_clicks: safeNum(insightsRow.outbound_clicks),
    outbound_clicks_ctr: safeNum(insightsRow.outbound_clicks_ctr),
    inline_link_clicks,
    inline_link_click_ctr: safeNum(insightsRow.inline_link_click_ctr),
    // Meta rankings
    quality_ranking: insightsRow.quality_ranking || null,
    engagement_rate_ranking: insightsRow.engagement_rate_ranking || null,
    conversion_rate_ranking: insightsRow.conversion_rate_ranking || null,
    // Stage 1
    video_3sec_views,
    thumb_stop_ratio: safeDiv(video_3sec_views, impressions),
    // Stage 2
    video_avg_time_watched_ms: findActionValue(insightsRow.video_avg_time_watched_actions, 'video_view'),
    p25_retention: safeDiv(vp25, video_3sec_views),
    p50_retention: safeDiv(vp50, video_3sec_views),
    p75_retention: safeDiv(vp75, video_3sec_views),
    p100_retention: safeDiv(vp100, video_3sec_views),
    // Stage 4
    purchase_count,
    lead_count,
    initiate_checkout_count: findActionValue(actions, 'initiate_checkout'),
    landing_page_view_count: findActionValue(actions, 'landing_page_view'),
    page_engagement_count: findActionValue(actions, 'page_engagement'),
    link_click_count_action: findActionValue(actions, 'link_click'),
    purchase_value: findActionValue(values, 'purchase'),
    cost_per_purchase: findActionValue(costs, 'purchase'),
    cost_per_lead: findActionValue(costs, 'lead'),
    cvr_purchase: safeDiv(purchase_count, inline_link_clicks),
    cvr_lead: safeDiv(lead_count, inline_link_clicks),
  };
}

// ─── Map a Meta ad node to a creative_data doc ───
// `hashUrlMap` is the per-page hash → Meta permalink_url map.
// `cloudinaryMap` is the per-page hash → Cloudinary secure_url map (preferred).
function adToDoc(ad, accountName, hashUrlMap = {}, cloudinaryMap = {}) {
  const creative = ad.creative || {};
  const story = creative.object_story_spec || {};
  const link = story.link_data || story.video_data || {};
  const imageHash = creative.image_hash || link.image_hash || null;

  // Preference order for the thumbnail URL — earlier = more stable + higher res:
  //   1. Cloudinary secure_url (permanent CDN, HD — preferred)
  //   2. creative.image_url (direct image — rare in modern ads)
  //   3. permalink_url resolved from image_hash via /adimages (Meta CDN, can expire)
  //   4. link_data.picture (medium-res, can be blurry)
  //   5. creative.thumbnail_url (Meta's ~64×64 — last resort)
  const thumbnailUrl =
    (imageHash && cloudinaryMap[imageHash]) ||
    creative.image_url ||
    (imageHash && hashUrlMap[imageHash]) ||
    link.picture ||
    creative.thumbnail_url ||
    '';

  const insightsRow = Array.isArray(ad.insights?.data) ? ad.insights.data[0] : null;
  const parsedInsights = parseInsights(insightsRow);

  return {
    adId: String(ad.id),
    adName: String(ad.name || ''),
    adAccountId: String(ad.account_id || ''),
    accountName: accountName || '',
    platform: 'meta',
    status: ad.status || '',
    effective_status: ad.effective_status || '',
    adsetId: String(ad.adset_id || ''),
    campaignId: String(ad.campaign_id || ''),
    createdTime: ad.created_time || '',
    updatedTime: ad.updated_time || '',

    // Creative
    creativeId: String(creative.id || ''),
    thumbnailUrl,
    imageUrl: creative.image_url || '',
    // Stable hash for dedup across syncs (Cloudinary public_id is built from this)
    image_hash: imageHash || '',
    // Raw Meta CDN URL in case we ever need it (Cloudinary URL is the canonical one)
    metaPermalinkUrl: (imageHash && hashUrlMap[imageHash]) || '',
    ad_copy: creative.body || link.message || '',
    headline: creative.title || link.name || '',
    finalUrl: creative.link_url || link.link || '',
    ctaText: creative.call_to_action_type || link.call_to_action?.type || '',
    videoId: creative.video_id || link.video_id || '',
    adType: creative.video_id || link.video_id ? 'video' : 'image',

    // Insights flattened at root
    ...parsedInsights,

    // Meta
    lastSyncedAt: new Date().toISOString(),
    syncSource: 'sync-meta-ads.js@' + API_VERSION,
  };
}

// ─── Sync one account: page through ads, upsert each ───
async function syncAccount(coll, account, opts) {
  const accountId = account.account_id;
  const accountName = account.name;
  console.log(`\n── Account ${accountId} — "${accountName}" (status=${account.account_status}) ──`);

  let after = null;
  let totalSeen = 0;
  let totalWritten = 0;
  let totalErrors = 0;
  let pageNum = 0;

  while (true) {
    pageNum++;
    const url = buildAdsUrl(accountId, opts.statuses, opts.limit, after);
    let json;
    try {
      json = await fetchWithRetry(url);
    } catch (err) {
      console.error(`  ✗ Page ${pageNum} fetch failed: ${err.message}`);
      totalErrors++;
      break;
    }

    const ads = Array.isArray(json?.data) ? json.data : [];
    if (ads.length === 0 && pageNum === 1) {
      console.log('  · No ads in this account.');
      break;
    }
    console.log(`  · Page ${pageNum}: ${ads.length} ads received`);
    totalSeen += ads.length;

    // Resolve image hashes → high-res permalink URLs (one batched API call per page).
    // This swaps Meta's tiny thumbnail_url for the actual CDN URL of the uploaded asset.
    const hashes = ads.map(extractImageHash).filter(Boolean);
    const hashUrlMap = await resolveImageHashes(accountId, hashes);
    const resolved = Object.keys(hashUrlMap).length;
    if (hashes.length > 0) {
      console.log(`  · Resolved ${resolved}/${hashes.length} image hashes → high-res URLs`);
    }

    // Upload hash → Cloudinary (permanent CDN). In-memory + MongoDB-cached so we
    // don't re-upload images we've already processed. Cloudinary fetches the
    // Meta permalink_url itself — no need for us to download the image bytes.
    let cloudinaryMap = {};
    if (cloudinaryConfigured && Object.keys(hashUrlMap).length > 0 && !opts.dryRun) {
      cloudinaryMap = await getCloudinaryUrlsForHashes(coll, hashUrlMap);
      const cloudCount = Object.keys(cloudinaryMap).length;
      console.log(`  · Cloudinary: ${cloudCount}/${Object.keys(hashUrlMap).length} HD URLs ready`);
    }

    // Upsert each ad
    for (const ad of ads) {
      try {
        const doc = adToDoc(ad, accountName, hashUrlMap, cloudinaryMap);
        if (!opts.dryRun) {
          await coll.updateMany(
            { adId: doc.adId },
            { $set: doc },
            { upsert: true }
          );
        }
        totalWritten++;
      } catch (err) {
        console.warn(`  ! Failed to upsert ad ${ad?.id}: ${err.message}`);
        totalErrors++;
      }
    }

    // Stop conditions
    if (opts.maxAdsPerAccount && totalSeen >= opts.maxAdsPerAccount) {
      console.log(`  · Hit --max-per-account=${opts.maxAdsPerAccount}, moving on.`);
      break;
    }

    after = json?.paging?.cursors?.after;
    if (!after || !json?.paging?.next) break;

    // Polite pause between pages to avoid hammering the API
    await new Promise((r) => setTimeout(r, 750));
  }

  console.log(`  ✓ Account done: ${totalWritten}/${totalSeen} written, ${totalErrors} errors`);
  return { totalSeen, totalWritten, totalErrors };
}

// ─── Main ───
async function main() {
  const opts = parseArgs();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  META SYNC — full backfill into creative_data');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  API version:  ${API_VERSION}`);
  console.log(`  MongoDB:      ${MONGO_DB} / creative_data`);
  console.log(`  Statuses:     ${opts.statuses.join(', ')}`);
  console.log(`  Page size:    ${opts.limit}`);
  console.log(`  Account list: ${opts.accounts ? opts.accounts.join(', ') : 'ALL accessible to token'}`);
  console.log(`  Max per acc:  ${opts.maxAdsPerAccount || 'unlimited'}`);
  console.log(`  Dry-run:      ${opts.dryRun ? 'YES (no writes)' : 'no'}`);
  console.log(`  Cloudinary:   ${cloudinaryConfigured ? `enabled → folder="${CLOUDINARY_FOLDER}"` : 'NOT configured (will fall back to Meta CDN URLs)'}`);

  // 1. Fetch ad accounts
  console.log('\nFetching ad accounts list…');
  let accounts;
  try {
    accounts = await fetchAdAccounts();
  } catch (err) {
    console.error(`✗ Could not list ad accounts: ${err.message}`);
    process.exit(2);
  }
  console.log(`Found ${accounts.length} ad account(s) visible to this token.`);

  if (opts.accounts) {
    const wanted = new Set(opts.accounts.map(String));
    accounts = accounts.filter((a) => wanted.has(String(a.account_id)));
    console.log(`Filtered to ${accounts.length} account(s) per --accounts flag.`);
  }
  if (accounts.length === 0) {
    console.error('No accounts to sync. Exiting.');
    process.exit(3);
  }

  // 2. Connect to Mongo
  let mongo, coll;
  if (!opts.dryRun) {
    console.log('\nConnecting to MongoDB…');
    mongo = new MongoClient(MONGO_URI);
    await mongo.connect();
    coll = mongo.db(MONGO_DB).collection('creative_data');
    console.log(`Connected. Will upsert into ${MONGO_DB}.creative_data.`);
  } else {
    console.log('\n(dry-run: skipping MongoDB connection)');
  }

  // 3. Sync each account
  const grandTotals = { seen: 0, written: 0, errors: 0 };
  const startTs = Date.now();
  for (const acc of accounts) {
    try {
      const r = await syncAccount(coll, acc, opts);
      grandTotals.seen += r.totalSeen;
      grandTotals.written += r.totalWritten;
      grandTotals.errors += r.totalErrors;
    } catch (err) {
      console.error(`✗ Account ${acc.account_id} sync threw: ${err.message}`);
      grandTotals.errors++;
    }
  }

  // 4. Wrap
  const elapsed = Math.round((Date.now() - startTs) / 1000);
  if (mongo) await mongo.close();
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Done in ${elapsed}s.`);
  console.log(`  Accounts synced: ${accounts.length}`);
  console.log(`  Ads seen:        ${grandTotals.seen}`);
  console.log(`  Ads written:     ${grandTotals.written}${opts.dryRun ? ' (dry-run: not actually written)' : ''}`);
  console.log(`  Errors:          ${grandTotals.errors}`);
  if (cloudinaryConfigured) {
    console.log(`  Cloudinary:      uploaded ${cloudinaryStats.uploaded}, reused-from-DB ${cloudinaryStats.reusedFromDb}, reused-in-memory ${cloudinaryStats.reusedFromMemory}, failed ${cloudinaryStats.failed}`);
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(99);
});
