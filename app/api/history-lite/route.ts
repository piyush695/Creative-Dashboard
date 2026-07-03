import { NextResponse } from 'next/server';
import clientPromise from '@/server/mongodb-client';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const historyCollection = db.collection('history');

    const query = search ? { 
      $or: [
        { creativeId: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // Fetch all records (only 10-20 exist).
    // CRITICAL: imageUrl may be a multi-MB base64 string. We use aggregation
    // to only include short URL strings (< 500 chars = real URLs) and skip
    // massive base64 blobs so the response is instant.
    // Project FIRST to drop the multi-MB base64 blobs, THEN sort — otherwise the
    // createdAt sort runs on the full documents and exceeds MongoDB's 32MB
    // in-memory sort limit. allowDiskUse is a further safety net.
    const history = await historyCollection
      .aggregate([
        { $match: query },
        { $project: {
            creativeId: 1, tab: 1, prompt: 1,
            createdAt: 1, headline: 1, score: 1, parentId: 1, childId: 1,
            imageUrl: {
              $cond: {
                if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$imageUrl" }, ""] } }, 500] },
                then: "$imageUrl",
                else: null
              }
            },
            'result.imageUrl': {
              $cond: {
                if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$result.imageUrl" }, ""] } }, 500] },
                then: "$result.imageUrl",
                else: null
              }
            }
          }
        },
        { $sort: { createdAt: -1 as const } }
      ], { allowDiskUse: true })
      .toArray();
    
    return NextResponse.json({ historyLength: history.length, history: history || [] });
  } catch (err: any) {
    console.error('API History Fetch Error:', err);
    return NextResponse.json({ historyLength: 0, history: [], error: err.message }, { status: 500 });
  }
}
