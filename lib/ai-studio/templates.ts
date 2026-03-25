/**
 * Prompt Template Library
 * 
 * Save successful creative configurations as reusable templates.
 * Templates store: prompt text, tone, audience, psychology config, and performance data.
 * Users can browse, search, and one-click generate from proven templates.
 */

import clientPromise from '@/lib/mongodb-client';

const DB_NAME = process.env.MONGODB_DB_NAME || 'reddit_data';
const COLLECTION = 'prompt_templates';

export interface PromptTemplate {
  _id?: string;
  name: string;
  description: string;
  category: 'meme' | 'comparison' | 'offer' | 'testimonial' | 'ugc' | 'custom';
  prompt: string;
  tone?: string;
  targetAudience?: string;
  offer?: string;
  psychologyFramework?: string;
  
  // Performance tracking
  timesUsed: number;
  avgScore: number;
  bestScore: number;
  avgCtr?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
  isPublic: boolean;
}

/**
 * Save a new template
 */
export async function saveTemplate(template: Omit<PromptTemplate, '_id' | 'createdAt' | 'updatedAt' | 'timesUsed' | 'avgScore' | 'bestScore'>): Promise<string> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const result = await db.collection(COLLECTION).insertOne({
    ...template,
    timesUsed: 0,
    avgScore: 0,
    bestScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`[Templates] Saved template: "${template.name}"`);
  return result.insertedId.toString();
}

/**
 * List all templates, optionally filtered by category
 */
export async function listTemplates(category?: string, limit: number = 50): Promise<PromptTemplate[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const filter: any = {};
  if (category) filter.category = category;
  
  return await db.collection(COLLECTION)
    .find(filter)
    .sort({ bestScore: -1, timesUsed: -1 })
    .limit(limit)
    .toArray() as any[];
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<PromptTemplate | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const { ObjectId } = await import('mongodb');
  return await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) }) as any;
}

/**
 * Update template stats after a generation uses it
 */
export async function updateTemplateStats(id: string, score: number): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const { ObjectId } = await import('mongodb');
  
  const template = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!template) return;
  
  const newTimesUsed = (template.timesUsed || 0) + 1;
  const newAvgScore = ((template.avgScore || 0) * (template.timesUsed || 0) + score) / newTimesUsed;
  const newBestScore = Math.max(template.bestScore || 0, score);
  
  await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { timesUsed: newTimesUsed, avgScore: newAvgScore, bestScore: newBestScore, updatedAt: new Date() } }
  );
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const { ObjectId } = await import('mongodb');
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

/**
 * Seed default templates for common prop firm ad types
 */
export async function seedDefaultTemplates(): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const count = await db.collection(COLLECTION).countDocuments();
  if (count > 0) return; // Already seeded
  
  const defaults: Omit<PromptTemplate, '_id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Meme Split-Screen (Sad/Happy Trader)',
      description: 'Side-by-side meme comparing trading with other firms vs Hola Prime',
      category: 'meme',
      prompt: 'Create a split-screen meme-style ad. Left: sad cartoon trader (Pepe-style) with "Trading with Other Firms" — gloomy, crying, losses. Right: confident cartoon trader in suit with "Trading with Hola Prime" — smiling, charts going up. Bottom: offer details and CTA.',
      tone: 'Funny, meme culture, relatable to trading community',
      psychologyFramework: 'loss_aversion',
      timesUsed: 0, avgScore: 0, bestScore: 0,
      tags: ['meme', 'split-screen', 'comparison', 'pepe'],
      isPublic: true,
    },
    {
      name: 'Price Anchor Challenge Ad',
      description: 'Hero dollar amount with crossed-out original price — pure value play',
      category: 'offer',
      prompt: 'Create a dark premium ad featuring the challenge price as a massive 3D hero element. Show original price crossed out. Include benefit bullets, urgency element, and bold CTA. Hola Prime branding.',
      tone: 'Premium, authoritative, deal-focused',
      psychologyFramework: 'anchoring_contrast',
      timesUsed: 0, avgScore: 0, bestScore: 0,
      tags: ['pricing', 'anchor', 'deal', 'challenge'],
      isPublic: true,
    },
    {
      name: 'Community Social Proof',
      description: 'Trader count as hero element with community trust signals',
      category: 'testimonial',
      prompt: 'Create an ad centered on social proof. Large "100K+ Active Traders" as hero element. #WeAreTraders community feel. Trust badges, trader testimonial quotes, professional blue/teal palette. CTA to join the community.',
      tone: 'Trustworthy, community-focused, aspirational',
      psychologyFramework: 'social_proof',
      timesUsed: 0, avgScore: 0, bestScore: 0,
      tags: ['social-proof', 'community', 'trust', 'traders'],
      isPublic: true,
    },
    {
      name: 'Countdown Flash Sale',
      description: 'Urgency-driven with countdown timer and limited spots',
      category: 'offer',
      prompt: 'Create a high-urgency ad with countdown timer as prominent element. "Only X Spots Left" badge. Flash sale pricing with discount code. Dark background with red/orange urgency accents transitioning to blue CTA. Mobile-first vertical.',
      tone: 'Urgent, exciting, FOMO-inducing',
      psychologyFramework: 'loss_aversion',
      timesUsed: 0, avgScore: 0, bestScore: 0,
      tags: ['urgency', 'countdown', 'flash-sale', 'scarcity'],
      isPublic: true,
    },
    {
      name: 'Minimal Premium Brand',
      description: 'Clean, minimal ad with maximum whitespace and single focal point',
      category: 'custom',
      prompt: 'Create a minimal, ultra-premium ad. Maximum whitespace. Single oversized headline or dollar amount as the only focal point. Subtle Hola Prime branding. One-line CTA. Dark navy background. The emptiness itself communicates confidence and premium positioning.',
      tone: 'Minimal, luxury, confident',
      psychologyFramework: 'anchoring_contrast',
      timesUsed: 0, avgScore: 0, bestScore: 0,
      tags: ['minimal', 'premium', 'luxury', 'clean'],
      isPublic: true,
    },
  ];
  
  await db.collection(COLLECTION).insertMany(
    defaults.map(t => ({ ...t, createdAt: new Date(), updatedAt: new Date() }))
  );
  console.log(`[Templates] Seeded ${defaults.length} default templates`);
}
