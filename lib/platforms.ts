/**
 * Central platform registry — the single source of truth for every advertising
 * platform the dashboard knows about.
 *
 * Historically platform lists were duplicated across the sidebar, the settings
 * view, the connect dialog and the legacy filter, each with slightly different
 * fields. This module consolidates them so navigation, filters, settings and
 * the "Add Platform" picker all read from one place.
 *
 * Which platforms are *active* (visible/usable) is a separate, admin-controlled
 * concern persisted globally — see `actions/platform-actions.ts` and
 * `components/providers/platforms-provider.tsx`.
 */

import type { ComponentType, SVGProps } from "react";
import {
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import {
  MetaLogo,
  GoogleLogo,
  AdRollLogo,
  YouTubeLogo,
  TikTokLogo,
  LinkedInLogo,
  XLogo,
  PinterestLogo,
  ShopifyLogo,
  BingLogo,
} from "@/components/icons/platforms";

// Icons may be a Lucide glyph or one of our brand-logo SVG components. Both
// accept a `className`, which is all the nav/filter rendering relies on.
export type PlatformIcon =
  | LucideIcon
  | ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export interface PlatformDef {
  /** Stable identifier used in URLs (?platform=id), storage, and data. */
  id: string;
  /** Human label shown in nav, filters and settings. */
  label: string;
  /** Tailwind text-color class for the icon (brand color). */
  color: string;
  /** Icon component (brand logo where we have one, else a Lucide glyph). */
  icon: PlatformIcon;
  /** Short description shown in the Add Platform picker. */
  description: string;
  /**
   * Whether the platform has real analysis views wired up. Platforms that are
   * not yet implemented still work as nav targets but render a "coming soon"
   * placeholder in the legacy hub.
   */
  implemented: boolean;
}

/** Every platform the product supports, implemented or not. */
export const PLATFORM_CATALOG: PlatformDef[] = [
  { id: "meta", label: "Meta Ads", color: "text-[#0668E1]", icon: MetaLogo, description: "Facebook & Instagram Ads Manager", implemented: true },
  { id: "google", label: "Google Ads", color: "text-[#4285F4]", icon: GoogleLogo, description: "Search, Display, Performance Max", implemented: true },
  { id: "adroll", label: "AdRoll", color: "text-[#0DBDFF]", icon: AdRollLogo, description: "AdRoll Retargeting", implemented: true },
  { id: "youtube", label: "YouTube", color: "text-[#FF0000]", icon: YouTubeLogo, description: "YouTube Video Ads", implemented: false },
  { id: "tiktok", label: "TikTok", color: "text-foreground", icon: TikTokLogo, description: "TikTok Ads Manager", implemented: false },
  { id: "linkedin", label: "LinkedIn", color: "text-[#0A66C2]", icon: LinkedInLogo, description: "LinkedIn Campaign Manager", implemented: false },
  { id: "x", label: "X (Twitter)", color: "text-foreground", icon: XLogo, description: "X Ads Center", implemented: false },
  { id: "pinterest", label: "Pinterest", color: "text-[#E60023]", icon: PinterestLogo, description: "Pinterest Business", implemented: false },
  { id: "shopify", label: "Shopify", color: "text-[#95BF47]", icon: ShopifyLogo, description: "Shopify Store Products", implemented: false },
  { id: "taboola", label: "Taboola", color: "text-[#285d9a]", icon: Newspaper, description: "Taboola Native Ads", implemented: false },
  { id: "bing", label: "Bing", color: "text-[#0C8484]", icon: BingLogo, description: "Bing Search Ads", implemented: false },
];

/** Platforms enabled by default before an admin has customized anything. */
export const DEFAULT_ENABLED_PLATFORMS: string[] = ["meta", "google", "adroll"];

const CATALOG_BY_ID: Record<string, PlatformDef> = Object.fromEntries(
  PLATFORM_CATALOG.map((p) => [p.id, p])
);

/** Look up a single platform definition by id. */
export function getPlatform(id: string): PlatformDef | undefined {
  return CATALOG_BY_ID[id];
}

/** Resolve a list of ids to their definitions, preserving catalog order. */
export function getPlatforms(ids: string[]): PlatformDef[] {
  const set = new Set(ids);
  return PLATFORM_CATALOG.filter((p) => set.has(p.id));
}

/** Platforms in the catalog that are NOT in the given enabled list. */
export function getAvailableToAdd(enabledIds: string[]): PlatformDef[] {
  const set = new Set(enabledIds);
  return PLATFORM_CATALOG.filter((p) => !set.has(p.id));
}

/** Whether an id refers to a known catalog platform. */
export function isKnownPlatform(id: string): boolean {
  return id in CATALOG_BY_ID;
}
