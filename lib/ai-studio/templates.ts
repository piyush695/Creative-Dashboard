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

  // User feedback tracking
  likeCount: number;
  dislikeCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;  // 'user' | 'auto-evolved' | 'default'
  tags: string[];
  isPublic: boolean;
  deprecated?: boolean;
}

/**
 * Save a new template
 */
export async function saveTemplate(template: Omit<PromptTemplate, '_id' | 'createdAt' | 'updatedAt' | 'timesUsed' | 'avgScore' | 'bestScore' | 'likeCount' | 'dislikeCount'>): Promise<string> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const result = await db.collection(COLLECTION).insertOne({
    ...template,
    timesUsed: 0,
    avgScore: 0,
    bestScore: 0,
    likeCount: 0,
    dislikeCount: 0,
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
  const filter: any = { deprecated: { $ne: true } };
  if (category) filter.category = category;

  const templates = await db.collection(COLLECTION)
    .find(filter)
    .limit(limit)
    .toArray() as any[];

  // Sort by composite score: (avgScore * 0.4) + (likeRatio * 0.4) + (normalized timesUsed * 0.2)
  const maxUsed = Math.max(1, ...templates.map(t => t.timesUsed || 0));
  return templates.sort((a: any, b: any) => {
    const aLikes = a.likeCount || 0;
    const aDislikes = a.dislikeCount || 0;
    const aRatio = (aLikes + aDislikes) > 0 ? aLikes / (aLikes + aDislikes) : 0.5;
    const aComposite = ((a.avgScore || 0) / 10) * 0.4 + aRatio * 0.4 + ((a.timesUsed || 0) / maxUsed) * 0.2;

    const bLikes = b.likeCount || 0;
    const bDislikes = b.dislikeCount || 0;
    const bRatio = (bLikes + bDislikes) > 0 ? bLikes / (bLikes + bDislikes) : 0.5;
    const bComposite = ((b.avgScore || 0) / 10) * 0.4 + bRatio * 0.4 + ((b.timesUsed || 0) / maxUsed) * 0.2;

    return bComposite - aComposite;
  });
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
      timesUsed: 0, avgScore: 0, bestScore: 0, likeCount: 0, dislikeCount: 0,
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
      timesUsed: 0, avgScore: 0, bestScore: 0, likeCount: 0, dislikeCount: 0,
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
      timesUsed: 0, avgScore: 0, bestScore: 0, likeCount: 0, dislikeCount: 0,
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
      timesUsed: 0, avgScore: 0, bestScore: 0, likeCount: 0, dislikeCount: 0,
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
      timesUsed: 0, avgScore: 0, bestScore: 0, likeCount: 0, dislikeCount: 0,
      tags: ['minimal', 'premium', 'luxury', 'clean'],
      isPublic: true,
    },
  ];
  
  await db.collection(COLLECTION).insertMany(
    defaults.map(t => ({ ...t, createdAt: new Date(), updatedAt: new Date() }))
  );
  console.log(`[Templates] Seeded ${defaults.length} default templates`);
}

/**
 * Auto-create a template from a liked, high-scoring generation.
 * Called when a user likes a variant that scored > 7.5.
 */
export async function autoCreateTemplate(brief: any, score: number, variantLabel: string): Promise<string | null> {
  try {
    if (score < 7.5) return null;

    const concept = brief?.creativeConcept?.title || '';
    const headline = brief?.copywriting?.headline?.primary || '';
    const psychology = brief?.psychologyBlueprint?.primaryTrigger?.principle || '';
    const tone = brief?.creativeConcept?.performanceTier || 'premium';
    const layout = brief?.visualDesign?.layout || '';

    if (!concept && !headline) return null;

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Check if a similar auto-template already exists
    const existing = await db.collection(COLLECTION).findOne({
      createdBy: 'auto-evolved',
      name: { $regex: concept.substring(0, 30), $options: 'i' },
    });
    if (existing) return null;

    const template: any = {
      name: `Auto: ${concept.substring(0, 50)}`,
      description: `Auto-evolved from liked creative (score: ${score}/10). ${variantLabel}`,
      category: 'custom' as const,
      prompt: `Create an ad creative based on this proven concept: ${concept}. Layout: ${layout}. Headline: "${headline}". Apply ${psychology} psychology. Tone: ${tone}. Hola Prime branding.`,
      tone: tone,
      psychologyFramework: psychology.toLowerCase().replace(/\s+/g, '_'),
      timesUsed: 0,
      avgScore: score,
      bestScore: score,
      likeCount: 1,
      dislikeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'auto-evolved',
      tags: ['auto-evolved', variantLabel.toLowerCase().replace(/\s+/g, '-')],
      isPublic: true,
    };

    const result = await db.collection(COLLECTION).insertOne(template);
    console.log(`[Templates] Auto-created template: "${template.name}" from liked creative`);
    return result.insertedId.toString();
  } catch (err: any) {
    console.warn('[Templates] Auto-creation failed:', err.message);
    return null;
  }
}

/**
 * Evolve templates based on user feedback.
 * Promotes high-liked templates, deprecates poorly-received ones.
 */
export async function evolveTemplates(): Promise<{ promoted: number; deprecated: number }> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const templates = await db.collection(COLLECTION)
      .find({ deprecated: { $ne: true } })
      .toArray();

    let promoted = 0;
    let deprecated = 0;

    for (const t of templates) {
      const likes = t.likeCount || 0;
      const dislikes = t.dislikeCount || 0;
      const total = likes + dislikes;
      if (total < 5) continue; // Not enough data

      const likeRatio = likes / total;

      if (likeRatio < 0.3) {
        // Deprecate poorly-received templates
        await db.collection(COLLECTION).updateOne(
          { _id: t._id },
          { $set: { deprecated: true, updatedAt: new Date() } }
        );
        console.log(`[Templates] Deprecated: "${t.name}" (like ratio: ${(likeRatio * 100).toFixed(0)}%)`);
        deprecated++;
      } else if (likeRatio > 0.7 && t.timesUsed > 5) {
        // Promoted templates get a score boost
        const boostedScore = Math.min(10, (t.avgScore || 0) + 0.5);
        await db.collection(COLLECTION).updateOne(
          { _id: t._id },
          { $set: { avgScore: boostedScore, updatedAt: new Date() } }
        );
        promoted++;
      }
    }

    console.log(`[Templates] Evolution: ${promoted} promoted, ${deprecated} deprecated`);
    return { promoted, deprecated };
  } catch (err: any) {
    console.warn('[Templates] Evolution failed:', err.message);
    return { promoted: 0, deprecated: 0 };
  }
}

/**
 * Update template feedback counts when a variant generated from a template is liked/disliked.
 */
export async function updateTemplateFeedback(templateId: string, feedback: 'like' | 'dislike'): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { ObjectId } = await import('mongodb');
    const field = feedback === 'like' ? 'likeCount' : 'dislikeCount';
    await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(templateId) },
      { $inc: { [field]: 1 }, $set: { updatedAt: new Date() } }
    );
  } catch (err: any) {
    console.warn('[Templates] Feedback update failed:', err.message);
  }
}
