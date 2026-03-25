/**
 * Cross-Platform Creative Adaptation
 * 
 * Takes a single creative brief and adapts it for multiple ad platforms.
 * Each platform has different specs, content rules, and best practices.
 * Generates platform-specific variants in parallel.
 */

import { generateImage } from './imagegen';

export interface PlatformSpec {
  id: string;
  name: string;
  aspectRatio: string;
  maxTextRatio: string;  // Meta 20% rule etc
  bestPractices: string;
}

const PLATFORMS: PlatformSpec[] = [
  {
    id: 'meta_feed',
    name: 'Meta Feed (1:1)',
    aspectRatio: '1:1',
    maxTextRatio: '20% text overlay maximum',
    bestPractices: 'Square format. Hook in first 1 second. Bold headline visible at small size. Minimal text — Meta penalizes text-heavy images. CTA should be in the ad copy, not burned into the image. Clean, uncluttered layout. Works in both light and dark feed themes.',
  },
  {
    id: 'meta_story',
    name: 'Meta/IG Story (9:16)',
    aspectRatio: '9:16',
    maxTextRatio: '25% text overlay',
    bestPractices: 'Full-screen vertical. Top 20% is for profile/brand bar — keep clear. Bottom 15% is swipe-up zone — keep CTA above it. Large, bold text readable on mobile. High-contrast colors. Thumb-stop in first 0.3 seconds. Interactive feel — polls, questions, stickers aesthetic.',
  },
  {
    id: 'tiktok',
    name: 'TikTok (9:16)',
    aspectRatio: '9:16',
    maxTextRatio: 'No strict limit but organic aesthetic preferred',
    bestPractices: 'Must look ORGANIC, not like a polished ad. UGC aesthetic. Raw, authentic feel. Avoid corporate polish. Meme-friendly. Bold text overlays in TikTok style (white outline, centered). Hook must work without sound. Trending format awareness. Safe zones: avoid top 15% (UI) and bottom 20% (description/buttons).',
  },
  {
    id: 'google_display',
    name: 'Google Display (16:9)',
    aspectRatio: '16:9',
    maxTextRatio: 'No strict limit',
    bestPractices: 'Landscape/banner format. Must communicate value in under 2 seconds. Logo prominent. CTA button clearly visible. Works at small sizes (300x250 down to 728x90). High contrast for visibility on varied backgrounds. Clean, professional aesthetic. Headline + CTA + one visual element maximum.',
  },
  {
    id: 'instagram_post',
    name: 'Instagram Post (4:5)',
    aspectRatio: '4:5',
    maxTextRatio: '20% text overlay preferred',
    bestPractices: 'Portrait format takes up more feed real estate than 1:1. Premium, curated aesthetic — Instagram users expect beauty. Muted, sophisticated color palettes perform well. Carousel-ready — design as a standalone but hint at swipe potential. Hashtag-friendly visual style.',
  },
];

export function getAvailablePlatforms(): PlatformSpec[] {
  return PLATFORMS;
}

/**
 * Adapt a creative prompt for a specific platform.
 */
function adaptPromptForPlatform(basePrompt: string, platform: PlatformSpec): string {
  return `PLATFORM: ${platform.name}
ASPECT RATIO: ${platform.aspectRatio}
TEXT RULES: ${platform.maxTextRatio}

PLATFORM-SPECIFIC REQUIREMENTS:
${platform.bestPractices}

Adapt the following creative for this platform. Keep the same message, brand, and psychology — but adjust the LAYOUT, ELEMENT SIZES, and COMPOSITION to match the platform's requirements above.

${basePrompt}`;
}

/**
 * Generate creative variants for multiple platforms in parallel.
 */
export async function generateCrossPlatform(
  basePrompt: string,
  platformIds?: string[],
  referenceUrl?: string
): Promise<{ platformId: string; name: string; aspectRatio: string; imageUrl: string | null; error?: string }[]> {
  const targetPlatforms = platformIds 
    ? PLATFORMS.filter(p => platformIds.includes(p.id))
    : PLATFORMS;

  console.log(`[CrossPlatform] Generating for ${targetPlatforms.length} platforms...`);

  const results = await Promise.allSettled(
    targetPlatforms.map(async (platform) => {
      try {
        const adaptedPrompt = adaptPromptForPlatform(basePrompt, platform);
        const result = await generateImage({
          detailed: adaptedPrompt,
          referenceUrl,
          technicalSpecs: { aspectRatio: platform.aspectRatio },
        }, { tier: 'pro' });

        console.log(`[CrossPlatform] ✓ ${platform.name} generated`);
        return {
          platformId: platform.id,
          name: platform.name,
          aspectRatio: platform.aspectRatio,
          imageUrl: result?.url || result?.dataUri || null,
        };
      } catch (e: any) {
        console.warn(`[CrossPlatform] ✗ ${platform.name} failed:`, e.message);
        return {
          platformId: platform.id,
          name: platform.name,
          aspectRatio: platform.aspectRatio,
          imageUrl: null,
          error: e.message,
        };
      }
    })
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) as any[];
}
