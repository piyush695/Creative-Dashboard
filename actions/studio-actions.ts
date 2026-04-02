"use server";

import clientPromise from '@/lib/mongodb-client';

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
    
    // We must return plain objects from server actions
    const [historyRaw, totalCount] = await Promise.all([
      historyCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          creativeId: 1, tab: 1, prompt: 1, imageUrl: 1,
          createdAt: 1, headline: 1, score: 1, parentId: 1, childId: 1,
          'result.imageUrl': 1
        })
        .toArray(),
      historyCollection.countDocuments(query)
    ]);
    
    // Convert ObjectId objects to strings to pass back to client
    const history = JSON.parse(JSON.stringify(historyRaw));
    
    return { historyLength: totalCount, history: history || [] };
  } catch (err: any) {
    console.error('Studio Server Action Error:', err);
    return { historyLength: 0, history: [], error: err.message };
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

