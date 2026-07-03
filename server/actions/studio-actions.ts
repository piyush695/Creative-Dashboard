"use server";

import clientPromise from '@/server/mongodb-client';

export async function getHistoryList(page: number = 1, limit: number = 10, search: string = "") {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const historyCollection = db.collection('history');

    const skip = (page - 1) * limit;

    const query = search ? {
      $or: [
        { creativeId: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // ONE ROW PER CONVERSATION: every creative carries a conversationId (a whole
    // chat session). We group by it so the History panel shows a single entry per
    // conversation, not one per generated creative.
    //
    // The docs carry multi-MB base64 `result` payloads, and this deployment
    // enforces a 32MB in-memory sort and ignores allowDiskUse — so we PROJECT the
    // heavy fields away BEFORE any sort. Full creatives load on demand.
    const convKey = { $ifNull: ["$conversationId", "$creativeId"] };
    const [historyRaw, countRaw] = await Promise.all([
      historyCollection.aggregate([
        { $match: query },
        { $project: {
            conversationId: 1, creativeId: 1, tab: 1, prompt: 1, createdAt: 1,
            headline: 1, score: 1, _key: convKey,
            imageUrl: {
              $cond: { if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$imageUrl" }, ""] } }, 500] }, then: "$imageUrl", else: null }
            },
            resultImageUrl: {
              $cond: { if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$result.imageUrl" }, ""] } }, 500] }, then: "$result.imageUrl", else: null }
            }
          }
        },
        { $sort: { createdAt: 1 } }, // tiny docs → safe sort; oldest→newest within group
        { $group: {
            _id: "$_key",
            conversationId: { $first: "$conversationId" },
            // Title from the first prompt/headline (the conversation's origin).
            firstHeadline: { $first: "$headline" },
            firstPrompt: { $first: "$prompt" },
            // Preview + recency from the latest creative.
            creativeId: { $last: "$creativeId" },
            latestHeadline: { $last: "$headline" },
            tab: { $last: "$tab" },
            score: { $last: "$score" },
            createdAt: { $last: "$createdAt" },
            imageUrl: { $last: "$imageUrl" },
            resultImageUrl: { $last: "$resultImageUrl" },
            count: { $sum: 1 }
          }
        },
        { $project: {
            _id: 0,
            // Return the GROUP KEY (conversationId ?? creativeId) — not $first
            // conversationId (which is null for legacy single-creative rows).
            // This is the stable id the chat continues under, so follow-up
            // creatives rejoin THIS group instead of splitting into a new entry.
            conversationId: "$_id",
            creativeId: 1, tab: 1, score: 1,
            createdAt: 1, count: 1, imageUrl: 1,
            headline: { $ifNull: ["$firstHeadline", "$latestHeadline"] },
            prompt: "$firstPrompt",
            result: { imageUrl: "$resultImageUrl" }
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ], { allowDiskUse: true }).toArray(),
      historyCollection.aggregate([
        { $match: query },
        { $project: { _key: convKey } },
        { $group: { _id: "$_key" } },
        { $count: "total" }
      ], { allowDiskUse: true }).toArray()
    ]);

    const history = JSON.parse(JSON.stringify(historyRaw));
    const totalCount = countRaw[0]?.total || 0;
    return { historyLength: totalCount, history: history || [] };
  } catch (err: any) {
    console.error('Studio Server Action Error:', err);
    return { historyLength: 0, history: [], error: err.message };
  }
}

// All turns of a conversation, oldest→newest, for "View Chat". Base64 images are
// stripped (loaded lazily per creativeId) so even a long conversation stays light.
export async function getConversationMessages(conversationId: string | null, creativeId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const col = db.collection('history');
    // Match the whole group by its key (conversationId ?? creativeId). A legacy
    // origin doc has conversationId=null and is found by creativeId; follow-up
    // creatives carry conversationId=key — the $or gathers every turn either way.
    const key = conversationId || creativeId;
    const match = { $or: [{ conversationId: key }, { creativeId: key }] };
    const docs = await col.aggregate([
      { $match: match },
      { $project: {
          creativeId: 1, prompt: 1, tab: 1, headline: 1, createdAt: 1,
          // Reference images the user attached — short Cloudinary URLs, safe to
          // return whole so they re-render on the turn after a reopen.
          referenceImages: 1,
          result: {
            copywriting: "$result.copywriting",
            creativeConcept: "$result.creativeConcept",
            metaAd: "$result.metaAd",
            targetScore: "$result.targetScore",
            performanceTier: "$result.performanceTier",
            // Preserve the creative score without the heavy variant images:
            // direct-mode creatives store their score ONLY on variants[].score,
            // so carry the best variant score forward so the Score stays visible
            // when a chat is reopened from History.
            score: { $max: "$result.variants.score.overall" },
            // Preserve the variant array so the multi-image strip survives a
            // reopen from History. Keep only the light fields (id/label/score) and
            // short CDN URLs (direct-mode variants are Cloudinary links); any
            // multi-MB base64 variant image is dropped to null so the payload
            // stays light — the strip still renders, just without that thumbnail.
            variants: {
              $map: {
                input: { $ifNull: ["$result.variants", []] },
                as: "v",
                in: {
                  id: "$$v.id",
                  label: "$$v.label",
                  score: "$$v.score",
                  imageUrl: {
                    $cond: { if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$$v.imageUrl" }, ""] } }, 500] }, then: "$$v.imageUrl", else: null }
                  }
                }
              }
            },
            // Keep short URLs; drop multi-MB base64 (lazy-loaded by creativeId).
            imageUrl: {
              $cond: { if: { $lte: [{ $strLenCP: { $ifNull: [{ $toString: "$result.imageUrl" }, ""] } }, 500] }, then: "$result.imageUrl", else: null }
            }
          }
        }
      },
      { $sort: { createdAt: 1 } }
    ], { allowDiskUse: true }).toArray();
    return docs.map((d) => JSON.parse(JSON.stringify(d)));
  } catch (err: any) {
    console.error('Studio getConversationMessages Error:', err);
    return [];
  }
}

// Full creative (incl. base64 images) for a single history item — used by
// "View Chat" to restore a conversation. Single doc, no sort → fast & safe.
export async function getHistoryItemResult(creativeId: string) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const doc = await db.collection('history').findOne(
      { creativeId },
      { projection: { result: 1, prompt: 1, tab: 1, generationOptions: 1, headline: 1 } }
    );
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  } catch (err: any) {
    console.error('Studio getHistoryItemResult Error:', err);
    return null;
  }
}

export async function getSavedCreativesList(page: number = 1, limit: number = 10, search: string = "") {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'reddit_data');
    const savedCollection = db.collection('saved_creative');
    
    const skip = (page - 1) * limit;

    const query = search ? { 
      $or: [
        { creativeId: { $regex: search, $options: 'i' } },
        { headline: { $regex: search, $options: 'i' } }
      ]
    } : {};
    
    // Index the sort keys so MongoDB sorts via the index instead of an in-memory
    // sort (which is capped at 32MB and would fail as the collection grows).
    await savedCollection.createIndex({ savedAt: -1, createdAt: -1 }).catch(() => {});

    const [savedRaw, totalCount] = await Promise.all([
      savedCollection
        .find(query)
        .sort({ savedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          creativeId: 1, tab: 1, prompt: 1, imageUrl: 1,
          createdAt: 1, savedAt: 1, headline: 1, score: 1, parentId: 1, childId: 1,
          'result.imageUrl': 1, 'result.metaAd.primaryText': 1,
          'result.copywriting.headline.primary': 1, 'result.targetScore': 1
        })
        .toArray(),
      savedCollection.countDocuments(query)
    ]);
    
    const savedItems = JSON.parse(JSON.stringify(savedRaw));
    
    return { totalCount, items: savedItems || [] };
  } catch (err: any) {
    console.error('Saved Creative Server Action Error:', err);
    return { totalCount: 0, items: [], error: err.message };
  }
}

