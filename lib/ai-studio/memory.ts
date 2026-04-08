/**
 * Creative Memory System
 * 
 * Stores every generation in MongoDB with scores and metadata.
 * Queries top performers to inform future generations.
 * The system gets smarter over time — high-scoring patterns get reinforced.
 */

import clientPromise from '@/lib/mongodb-client';

const DB_NAME = process.env.MONGODB_DB_NAME || 'reddit_data';
const COLLECTION = 'creative_generations';

export interface CreativeMemoryEntry {
  // Identification
  generatedAt: Date;
  sourceAdIds: string[];
  generationType: 'pattern-based' | 'custom';
  
  // Inputs
  userPrompt?: string;
  tone?: string;
  targetAudience?: string;
  
  // Brief (condensed — not the full 10KB object)
  concept: string;
  headline: string;
  cta: string;
  hookText: string;
  psychologyPrimary: string;
  psychologySecondary: string;
  
  // Variants
  variants: {
    id: string;
    label: string;
    score: number | null;
    textAccuracy: number | null;
    layoutQuality: number | null;
    psychologyScore: number | null;
    predictedCtr: string | null;
    strengths: string[];
    weaknesses: string[];
    verdict: string | null;
  }[];
  
  // Best score across variants
  bestScore: number;
  bestVariantId: string;
  
  // Performance (filled in later when actual ad data comes back)
  actualCtr?: number;
  actualRoas?: number;
  adSpend?: number;

  // User feedback (filled in when user likes/dislikes)
  userFeedback?: { variantId: string; feedback: 'like' | 'dislike'; timestamp: Date }[];
}

/**
 * Save a completed generation to memory.
 */
export async function saveGeneration(entry: CreativeMemoryEntry): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    
    await collection.insertOne({
      ...entry,
      generatedAt: new Date(),
    });
    
    console.log(`[Memory] Saved generation: "${entry.concept}" (best score: ${entry.bestScore})`);
  } catch (err: any) {
    console.warn('[Memory] Failed to save generation:', err.message);
  }
}

/**
 * Query top-performing past generations to inform new creative briefs.
 * Returns the top N generations by score, optionally filtered by type.
 */
export async function getTopGenerations(
  limit: number = 5,
  generationType?: string
): Promise<CreativeMemoryEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    
    const filter: any = { bestScore: { $gte: 6 } }; // Only include decent outputs
    if (generationType) filter.generationType = generationType;
    
    const results = await collection
      .find(filter)
      .sort({ bestScore: -1, generatedAt: -1 })
      .limit(limit)
      .project({
        concept: 1,
        headline: 1,
        cta: 1,
        hookText: 1,
        psychologyPrimary: 1,
        psychologySecondary: 1,
        bestScore: 1,
        bestVariantId: 1,
        variants: 1,
        tone: 1,
        actualCtr: 1,
        actualRoas: 1,
      })
      .toArray();
    
    console.log(`[Memory] Found ${results.length} past top-performing generations`);
    return results as any[];
  } catch (err: any) {
    console.warn('[Memory] Failed to query past generations:', err.message);
    return [];
  }
}

/**
 * Query generations that were explicitly liked by the user.
 * These represent user-approved patterns and should be weighted heavily.
 */
export async function getTopLikedGenerations(limit: number = 3): Promise<CreativeMemoryEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Find generations that have like feedback from user_preferences collection
    const likedEvents = await db.collection('user_preferences')
      .find({ feedback: 'like' })
      .sort({ timestamp: -1 })
      .limit(limit * 2)
      .project({ generationId: 1 })
      .toArray();

    if (likedEvents.length === 0) return [];

    const generationIds = [...new Set(likedEvents.map((e: any) => e.generationId).filter(Boolean))];
    if (generationIds.length === 0) return [];

    const results = await db.collection(COLLECTION)
      .find({ _id: { $in: generationIds.map(id => { try { const { ObjectId } = require('mongodb'); return new ObjectId(id); } catch { return id; } }) } })
      .limit(limit)
      .project({
        concept: 1, headline: 1, cta: 1, hookText: 1,
        psychologyPrimary: 1, psychologySecondary: 1,
        bestScore: 1, bestVariantId: 1, variants: 1, tone: 1,
      })
      .toArray();

    console.log(`[Memory] Found ${results.length} user-liked generations`);
    return results as any[];
  } catch (err: any) {
    console.warn('[Memory] Failed to query liked generations:', err.message);
    return [];
  }
}

/**
 * Build a context string from past winners to inject into Claude's prompt.
 * Now includes both top-scoring AND user-liked generations.
 */
export async function buildMemoryContext(generationType?: string): Promise<string> {
  const topGens = await getTopGenerations(5, generationType);
  const likedGens = await getTopLikedGenerations(3);

  if (topGens.length === 0 && likedGens.length === 0) {
    return '';
  }

  let context = '';

  if (topGens.length > 0) {
    const entries = topGens.map((g, i) => {
      const bestVariant = g.variants?.find(v => v.id === g.bestVariantId);
      return `${i + 1}. "${g.concept}" (Score: ${g.bestScore}/10)
   - Headline: "${g.headline}"
   - CTA: "${g.cta}"
   - Hook: "${g.hookText}"
   - Psychology: ${g.psychologyPrimary}${g.psychologySecondary ? ` + ${g.psychologySecondary}` : ''}
   - Strengths: ${bestVariant?.strengths?.join(', ') || 'N/A'}
   - Weaknesses to avoid: ${bestVariant?.weaknesses?.join(', ') || 'N/A'}${g.actualCtr ? `\n   - ACTUAL CTR: ${g.actualCtr}%` : ''}`;
    }).join('\n\n');

    context += `\n\n## CREATIVE MEMORY — TOP PERFORMING PAST GENERATIONS
Learn from these high-scoring past creatives. Amplify their strengths and avoid their weaknesses.

${entries}

Use these patterns as inspiration but do NOT copy them — create something new that builds on what worked.
`;
  }

  if (likedGens.length > 0) {
    const likedEntries = likedGens.map((g: any, i: number) => {
      return `${i + 1}. "${g.concept}" (Score: ${g.bestScore}/10)
   - Headline: "${g.headline}"
   - Psychology: ${g.psychologyPrimary}${g.psychologySecondary ? ` + ${g.psychologySecondary}` : ''}
   - Tone: ${g.tone || 'N/A'}`;
    }).join('\n');

    context += `\n\n## USER-APPROVED PATTERNS — HIGHEST PRIORITY
The user explicitly liked these creatives. These patterns represent confirmed taste preferences. Prioritize these styles, psychology frameworks, and tones in your generation.

${likedEntries}
`;
  }

  return context;
}

/**
 * Update a generation with actual ad performance data.
 * Call this when real CTR/ROAS data comes back from ad platforms.
 */
export async function updateWithPerformance(
  generationId: string,
  performance: { actualCtr?: number; actualRoas?: number; adSpend?: number }
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).updateOne(
      { _id: generationId as any },
      { $set: performance }
    );
    console.log(`[Memory] Updated generation ${generationId} with performance data`);
  } catch (err: any) {
    console.warn('[Memory] Failed to update performance:', err.message);
  }
}
