/**
 * scripts/set-admin.js
 *
 * Grant (or revoke) the "Admin" role for a user by email. Admins can manage
 * the globally-available advertising platforms (add / enable / disable) from
 * the Analyze sidebar and the Settings page.
 *
 * The role is read on every session refresh (see lib/auth.ts), so the change
 * takes effect the next time the user's session is validated — usually the
 * next page navigation; a re-login guarantees it.
 *
 * USAGE
 *   node scripts/set-admin.js you@holaprime.com            # make Admin
 *   node scripts/set-admin.js you@holaprime.com --revoke   # back to Viewer
 *
 * Alternatively, set ADMIN_EMAILS=you@holaprime.com (comma-separated) in .env
 * for an env-based grant that needs no DB write.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('[set-admin] No .env found at', envPath);
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

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));
  const revoke = args.includes('--revoke');

  if (!email) {
    console.error('Usage: node scripts/set-admin.js <email> [--revoke]');
    process.exit(1);
  }

  const env = loadEnv();
  const MONGO_URI = env.MONGODB_URI || process.env.MONGODB_URI || '';
  const MONGO_DB = env.MONGODB_DB || process.env.MONGODB_DB || 'reddit_data';
  if (!MONGO_URI) { console.error('[set-admin] MONGODB_URI missing in .env'); process.exit(1); }

  const role = revoke ? 'Viewer' : 'Admin';
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(MONGO_DB);
    const res = await db.collection('users').updateOne(
      { email },
      { $set: { role, updatedAt: new Date() } }
    );
    if (res.matchedCount === 0) {
      console.error(`[set-admin] No user found with email "${email}".`);
      process.exit(1);
    }
    console.log(`[set-admin] "${email}" role set to "${role}". Re-login (or navigate) to refresh the session.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[set-admin] Failed:', err);
  process.exit(1);
});
