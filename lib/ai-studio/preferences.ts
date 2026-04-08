/**
 * User Preference Learning System
 *
 * Self-learning agent that tracks like/dislike feedback on generated creatives.
 * Builds a taste profile over time that influences future generation prompts.
 * Uses time-decay weighting so recent preferences matter more than old ones.
 */

import clientPromise from '@/lib/mongodb-client';

const DB_NAME = process.env.MONGODB_DB_NAME || 'reddit_data';
const COLLECTION = 'user_preferences';

export interface PreferenceEvent {
  generationId: string;
  variantId: string;
  feedback: 'like' | 'dislike';
  timestamp: Date;
  // Snapshot of what was liked/disliked
  variantLabel: string;
  psychologyFramework: string;
  colorPalette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  layoutType?: string;
  headline?: string;
  tone?: string;
  score?: number;
}

export interface TasteProfile {
  preferredPsychology: { framework: string; weight: number }[];
  preferredColors: { color: string; weight: number }[];
  preferredLayouts: { layout: string; weight: number }[];
  preferredTones: { tone: string; weight: number }[];
  avoidPatterns: string[];
  totalLikes: number;
  totalDislikes: number;
  lastUpdated: Date;
}

/**
 * Record a like/dislike event.
 */
export async function recordFeedback(event: PreferenceEvent): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(COLLECTION).insertOne({
      ...event,
      timestamp: new Date(),
    });
    console.log(`[Preferences] Recorded ${event.feedback} for variant "${event.variantId}"`);
  } catch (err: any) {
    console.warn('[Preferences] Failed to record feedback:', err.message);
  }
}

/**
 * Compute time-decay weight. Recent events count more.
 * 0 days = 1.0, 30 days = 0.5, 60+ days = 0.3 (floor)
 */
function decayWeight(timestamp: Date): number {
  const daysSince = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0.3, 1 - (daysSince / 60));
}

/**
 * Build a taste profile from all recorded preferences.
 */
export async function buildTasteProfile(limit: number = 100): Promise<TasteProfile> {
  const empty: TasteProfile = {
    preferredPsychology: [],
    preferredColors: [],
    preferredLayouts: [],
    preferredTones: [],
    avoidPatterns: [],
    totalLikes: 0,
    totalDislikes: 0,
    lastUpdated: new Date(),
  };

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const events = await db.collection(COLLECTION)
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    if (events.length === 0) return empty;

    const psychologyScores: Record<string, number> = {};
    const colorScores: Record<string, number> = {};
    const layoutScores: Record<string, number> = {};
    const toneScores: Record<string, number> = {};
    const avoidSet = new Set<string>();
    let likes = 0;
    let dislikes = 0;

    for (const ev of events) {
      const w = decayWeight(ev.timestamp);
      const sign = ev.feedback === 'like' ? 1 : -1;

      if (ev.feedback === 'like') likes++;
      else dislikes++;

      // Psychology framework
      if (ev.psychologyFramework) {
        psychologyScores[ev.psychologyFramework] = (psychologyScores[ev.psychologyFramework] || 0) + (sign * w);
      }

      // Colors
      if (ev.colorPalette) {
        for (const color of Object.values(ev.colorPalette).filter(Boolean)) {
          colorScores[color as string] = (colorScores[color as string] || 0) + (sign * w);
        }
      }

      // Layout
      if (ev.layoutType) {
        layoutScores[ev.layoutType] = (layoutScores[ev.layoutType] || 0) + (sign * w);
      }

      // Tone
      if (ev.tone) {
        toneScores[ev.tone] = (toneScores[ev.tone] || 0) + (sign * w);
      }

      // Collect avoid patterns from disliked variants
      if (ev.feedback === 'dislike' && ev.variantLabel) {
        avoidSet.add(ev.variantLabel);
      }
    }

    const toSorted = (scores: Record<string, number>) =>
      Object.entries(scores)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, weight]) => ({ framework: name, weight: Math.round(weight * 100) / 100 }));

    const toSortedGeneric = (scores: Record<string, number>, key: string) =>
      Object.entries(scores)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, weight]) => ({ [key]: name, weight: Math.round(weight * 100) / 100 }));

    return {
      preferredPsychology: toSorted(psychologyScores) as any[],
      preferredColors: toSortedGeneric(colorScores, 'color') as any[],
      preferredLayouts: toSortedGeneric(layoutScores, 'layout') as any[],
      preferredTones: toSortedGeneric(toneScores, 'tone') as any[],
      avoidPatterns: Array.from(avoidSet).slice(0, 10),
      totalLikes: likes,
      totalDislikes: dislikes,
      lastUpdated: new Date(),
    };
  } catch (err: any) {
    console.warn('[Preferences] Failed to build taste profile:', err.message);
    return empty;
  }
}

/**
 * Build a context string from user preferences to inject into Claude's prompt.
 * Follows the same pattern as buildMemoryContext() and buildPerformanceInsights().
 */
export async function buildPreferenceContext(): Promise<string> {
  try {
    const profile = await buildTasteProfile();

    if (profile.totalLikes + profile.totalDislikes < 2) {
      return ''; // Not enough feedback yet
    }

    const sections: string[] = [];

    if (profile.preferredPsychology.length > 0) {
      const items = profile.preferredPsychology.slice(0, 5)
        .map(p => `${p.framework} (preference: ${p.weight.toFixed(1)})`)
        .join(', ');
      sections.push(`- Psychology frameworks: ${items}`);
    }

    if (profile.preferredColors.length > 0) {
      const items = profile.preferredColors.slice(0, 6)
        .map((p: any) => p.color)
        .join(', ');
      sections.push(`- Color preferences: ${items}`);
    }

    if (profile.preferredLayouts.length > 0) {
      const items = profile.preferredLayouts.slice(0, 3)
        .map((p: any) => p.layout)
        .join(', ');
      sections.push(`- Layout preferences: ${items}`);
    }

    if (profile.preferredTones.length > 0) {
      const items = profile.preferredTones.slice(0, 3)
        .map((p: any) => p.tone)
        .join(', ');
      sections.push(`- Tone preferences: ${items}`);
    }

    if (profile.avoidPatterns.length > 0) {
      sections.push(`- Patterns to AVOID (disliked): ${profile.avoidPatterns.slice(0, 5).join(', ')}`);
    }

    if (sections.length === 0) return '';

    return `\n\n## USER TASTE PROFILE — PERSONALIZATION LAYER
Based on ${profile.totalLikes} liked and ${profile.totalDislikes} disliked creatives, the user has demonstrated these preferences:

### Preferred Styles (weighted by recency and frequency):
${sections.join('\n')}

DIRECTIVE: Weight these preferences into your creative decisions. The user has demonstrated clear taste patterns — honor them while maintaining creative quality. Recent preferences matter more than older ones.
`;
  } catch (err: any) {
    console.warn('[Preferences] Failed to build preference context:', err.message);
    return '';
  }
}

/**
 * Lightweight summary for frontend display.
 */
export async function getPreferenceSummary(): Promise<{
  likes: number;
  dislikes: number;
  topFramework: string;
  topColors: string[];
  hasEnoughData: boolean;
}> {
  try {
    const profile = await buildTasteProfile(50);
    return {
      likes: profile.totalLikes,
      dislikes: profile.totalDislikes,
      topFramework: profile.preferredPsychology[0]?.framework || 'none yet',
      topColors: profile.preferredColors.slice(0, 3).map((p: any) => p.color),
      hasEnoughData: profile.totalLikes + profile.totalDislikes >= 3,
    };
  } catch (err: any) {
    console.warn('[Preferences] Failed to get summary:', err.message);
    return { likes: 0, dislikes: 0, topFramework: 'none yet', topColors: [], hasEnoughData: false };
  }
}
