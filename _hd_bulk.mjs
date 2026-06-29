import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || 'reddit_data';
const TOKEN = process.env.META_ACCESS_TOKEN;
const V = process.env.META_API_VERSION || 'v24.0';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const client = new MongoClient(uri);
await client.connect();
const coll = client.db(dbName).collection('creative_data');

// Docs that still need HD: not already upgraded, and have at least one hash.
const docs = await coll.find(
  {
    hdWidth: { $exists: false },
    $or: [
      { image_hashes: { $exists: true, $not: { $size: 0 } } },
      { image_hash: { $nin: [null, ''] } },
    ],
  },
  { projection: { adAccountId: 1, image_hashes: 1, image_hash: 1 } }
).toArray();
console.log(`[hd] candidates: ${docs.length}`);

// Group required hashes by ad account.
const byAccount = new Map();
const docHashes = [];
for (const d of docs) {
  const hashes = (Array.isArray(d.image_hashes) && d.image_hashes.length) ? d.image_hashes : (d.image_hash ? [d.image_hash] : []);
  if (!hashes.length || !d.adAccountId) continue;
  docHashes.push({ _id: d._id, hashes });
  if (!byAccount.has(d.adAccountId)) byAccount.set(d.adAccountId, new Set());
  for (const h of hashes) byAccount.get(d.adAccountId).add(h);
}

// Resolve hashes -> {url,w,h} in batches per account.
const resolved = new Map();
let callCount = 0;
for (const [account, set] of byAccount) {
  const hashes = [...set];
  for (let i = 0; i < hashes.length; i += 50) {
    const chunk = hashes.slice(i, i + 50);
    const u = new URL(`https://graph.facebook.com/${V}/act_${account}/adimages`);
    u.searchParams.set('hashes', JSON.stringify(chunk));
    u.searchParams.set('fields', 'hash,permalink_url,url,original_width,original_height');
    u.searchParams.set('access_token', TOKEN);
    let r;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        r = await (await fetch(u.toString())).json();
      } catch (e) { r = { error: { message: e.message } }; }
      if (!r.error) break;
      const code = r.error.code;
      if (code === 4 || code === 17 || code === 613 || code === 80004) { await sleep(5000); continue; } // rate limit
      break;
    }
    if (r && r.error) { console.log(`[hd] acct ${account} chunk err: ${r.error.message}`); }
    for (const img of (r && r.data) || []) {
      const link = img.permalink_url || img.url;
      if (link) resolved.set(img.hash, { url: link, w: img.original_width || 0, h: img.original_height || 0 });
    }
    callCount++;
    if (callCount % 25 === 0) console.log(`[hd] resolve calls: ${callCount}, resolved hashes: ${resolved.size}`);
    await sleep(120);
  }
}
console.log(`[hd] total resolved hashes: ${resolved.size} over ${callCount} calls`);

// Build bulk updates — best (largest) resolved hash per doc.
let ops = [], updated = 0, noresolve = 0;
async function flush() {
  if (!ops.length) return;
  const res = await coll.bulkWrite(ops, { ordered: false });
  updated += res.modifiedCount || 0;
  ops = [];
  console.log(`[hd] updated so far: ${updated}`);
}
const stamp = new Date().toISOString();
for (const dh of docHashes) {
  let best = null;
  for (const h of dh.hashes) {
    const info = resolved.get(h);
    if (!info) continue;
    if (!best || (info.w * info.h) > (best.w * best.h)) best = { ...info, hash: h };
  }
  if (!best) { noresolve++; continue; }
  ops.push({ updateOne: { filter: { _id: dh._id }, update: { $set: {
    thumbnailUrl: best.url, metaPermalinkUrl: best.url, image_hash: best.hash,
    hdWidth: best.w, hdHeight: best.h, _hdUpgradedAt: stamp,
  } } } });
  if (ops.length >= 1000) await flush();
}
await flush();
console.log(`[hd] DONE. updated=${updated}, unresolved=${noresolve}, candidates=${docHashes.length}`);
await client.close();
