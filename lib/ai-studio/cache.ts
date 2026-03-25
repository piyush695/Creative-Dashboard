/**
 * Creative Cache Layer
 * 
 * Caches generated creatives in MongoDB to avoid regenerating identical requests.
 * Cache key = hash of (prompt + sourceAdIds + type + tone).
 * Saves API costs and speeds up repeated/similar requests.
 */

import clientPromise from '@/lib/mongodb-client';
import crypto from 'crypto';

const DB_NAME = process.env.MONGODB_DB_NAME || 'reddit_data';
const COLLECTION = 'creative_cache';
const CACHE_TTL_DAYS = 30; // Cache entries expire after 30 days

/**
 * Generate a cache key from request parameters.
 */
function buildCacheKey(params: {
  type: string;
  prompt?: string;
  adIds?: string[];
  tone?: string;
}): string {
  const normalized = JSON.stringify({
    type: params.type,
    prompt: (params.prompt || '').trim().toLowerCase().substring(0, 500),
    adIds: (params.adIds || []).sort(),
    tone: (params.tone || '').trim().toLowerCase(),
  });
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

/**
 * Look up a cached creative result.
 * Returns null if not found or expired.
 */
export async function getCached(params: {
  type: string;
  prompt?: string;
  adIds?: string[];
  tone?: string;
}): Promise<any | null> {
  try {
    const key = buildCacheKey(params);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const cached = await db.collection(COLLECTION).findOne({
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      // Update hit count
      await db.collection(COLLECTION).updateOne(
        { cacheKey: key },
        { $inc: { hitCount: 1 }, $set: { lastAccessedAt: new Date() } }
      );
      console.log(`[Cache] HIT for key ${key.substring(0, 8)}... (${cached.hitCount + 1} hits)`);
      return cached.result;
    }

    console.log(`[Cache] MISS for key ${key.substring(0, 8)}...`);
    return null;
  } catch (err: any) {
    console.warn('[Cache] Lookup failed:', err.message);
    return null;
  }
}

/**
 * Store a creative result in cache.
 */
export async function setCache(
  params: { type: string; prompt?: string; adIds?: string[]; tone?: string },
  result: any
): Promise<void> {
  try {
    const key = buildCacheKey(params);
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    await db.collection(COLLECTION).updateOne(
      { cacheKey: key },
      {
        $set: {
          cacheKey: key,
          result,
          expiresAt,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          hitCount: 0,
        },
      },
      { upsert: true }
    );
    
    console.log(`[Cache] Stored result for key ${key.substring(0, 8)}...`);
  } catch (err: any) {
    console.warn('[Cache] Store failed:', err.message);
  }
}

/**
 * Clear expired cache entries. Call periodically.
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION).deleteMany({
      expiresAt: { $lt: new Date() },
    });
    if (result.deletedCount > 0) {
      console.log(`[Cache] Cleaned ${result.deletedCount} expired entries`);
    }
    return result.deletedCount;
  } catch (err: any) {
    console.warn('[Cache] Cleanup failed:', err.message);
    return 0;
  }
}
