/**
 * Performance Feedback Loop
 * 
 * Connects actual ad platform performance (CTR, ROAS, CPC) back to creative generations.
 * Over time, this builds a dataset of what visual/copy/psychology patterns actually convert.
 * Claude can reference this data to make increasingly accurate creative decisions.
 */

import clientPromise from '@/lib/mongodb-client';

const DB_NAME = process.env.MONGODB_DB_NAME || 'reddit_data';

export interface PerformanceData {
  ctr: number;
  cpc?: number;
  roas?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

/**
 * Link real ad performance data to a creative generation.
 */
export async function linkPerformance(
  generationId: string,
  performance: PerformanceData
): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { ObjectId } = await import('mongodb');
    
    const result = await db.collection('creative_generations').updateOne(
      { _id: new ObjectId(generationId) },
      { 
        $set: {
          actualCtr: performance.ctr,
          actualRoas: performance.roas,
          actualCpc: performance.cpc,
          adSpend: performance.spend,
          adImpressions: performance.impressions,
          adClicks: performance.clicks,
          adConversions: performance.conversions,
          performanceLinkedAt: new Date(),
        }
      }
    );
    
    console.log(`[Performance] Linked CTR ${performance.ctr}% to generation ${generationId}`);
    return result.modifiedCount > 0;
  } catch (err: any) {
    console.warn('[Performance] Failed to link:', err.message);
    return false;
  }
}

/**
 * Build a performance insights string from historical data.
 * Analyzes which psychology frameworks, layouts, and copy patterns
 * actually drove the best real-world performance.
 */
export async function buildPerformanceInsights(): Promise<string> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // Get generations that have real performance data
    const withPerformance = await db.collection('creative_generations')
      .find({ actualCtr: { $exists: true, $gt: 0 } })
      .sort({ actualCtr: -1 })
      .limit(20)
      .toArray();
    
    if (withPerformance.length < 3) return ''; // Not enough data yet
    
    // Analyze patterns
    const topPerformers = withPerformance.slice(0, 5);
    const avgCtr = withPerformance.reduce((s: number, g: any) => s + (g.actualCtr || 0), 0) / withPerformance.length;
    
    const psychologyCounts: Record<string, { count: number; totalCtr: number }> = {};
    for (const gen of withPerformance) {
      const psych = gen.psychologyPrimary || 'unknown';
      if (!psychologyCounts[psych]) psychologyCounts[psych] = { count: 0, totalCtr: 0 };
      psychologyCounts[psych].count++;
      psychologyCounts[psych].totalCtr += gen.actualCtr || 0;
    }
    
    const psychRanking = Object.entries(psychologyCounts)
      .map(([name, data]) => ({ name, avgCtr: data.totalCtr / data.count, count: data.count }))
      .sort((a, b) => b.avgCtr - a.avgCtr);

    const topPerformerSummaries = topPerformers.map((g: any, i: number) => 
      `${i + 1}. "${g.concept}" — CTR: ${g.actualCtr}%${g.actualRoas ? `, ROAS: ${g.actualRoas}x` : ''} (Psychology: ${g.psychologyPrimary || 'N/A'})`
    ).join('\n');

    const psychRankingSummary = psychRanking.map(p => 
      `- ${p.name}: avg CTR ${p.avgCtr.toFixed(2)}% (${p.count} creatives)`
    ).join('\n');

    return `\n\n## REAL PERFORMANCE DATA — WHAT ACTUALLY CONVERTS
Based on ${withPerformance.length} creatives with real ad platform data:

Average CTR across all tested creatives: ${avgCtr.toFixed(2)}%

### Top Performing Creatives (by actual CTR):
${topPerformerSummaries}

### Psychology Framework Performance Ranking:
${psychRankingSummary}

DIRECTIVE: Prioritize psychology frameworks and creative patterns that show higher real-world CTR. The data above is from actual ad campaigns, not predictions.
`;
  } catch (err: any) {
    console.warn('[Performance] Failed to build insights:', err.message);
    return '';
  }
}
