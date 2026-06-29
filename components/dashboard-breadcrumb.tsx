"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Section-rooted dashboard breadcrumb.
 *
 * The first crumb reflects the user's current sidebar section, not a generic
 * "Dashboard" root:
 *   Analytics ▸ Meta
 *   Analytics ▸ Google ▸ Analysis
 *   Creative Studio ▸ Studio ▸ History
 *   Settings / Profile (single)
 *
 * Section crumbs are context labels (not links); the platform crumb links back
 * to its root; the deepest crumb is the current page. The ad-account switcher
 * no longer lives here — it sits in the platform header next to Live status
 * (see components/account-switcher.tsx). Pure data-driven so platforms inherit
 * it with no extra code.
 */

export interface BreadcrumbAccount {
  id: string;
  name: string;
  count: number;
}

export interface DashboardBreadcrumbState {
  selectedPlatform: string;
  platformMeta: Record<string, { label: string; icon?: any }>;
  isProfileOpen: boolean;
  isSettingsOpen: boolean;
  isGuideOpen: boolean;
  isViewAllAdsOpen: boolean;
  activeView: string;
  isStudioHistoryOpen: boolean;
  selectedAdId: string | null;
  selectedAccountId: string;
  accountStats: BreadcrumbAccount[];
  totalMetaAds: number;
  selectedRealtimeCampaign: string;
  realtimeCampaigns: any[];
}

export interface DashboardBreadcrumbProps extends DashboardBreadcrumbState {
  onGoHome: () => void;
  onGoToPlatformRoot: (platform: string) => void;
  onSelectAccount: (id: string) => void;
}

type Segment =
  | { kind: "section"; label: string }
  | { kind: "platform"; label: string }
  | { kind: "page"; label: string };

export interface BreadcrumbModel {
  segments: Segment[];
  /** True on the bare dashboard home where the breadcrumb adds no value. */
  isRoot: boolean;
}

/** Single source of truth for the breadcrumb path. Pure + platform agnostic. */
export function computeBreadcrumb(s: DashboardBreadcrumbState): BreadcrumbModel {
  const platformLabel =
    s.selectedPlatform === "all"
      ? "All platforms"
      : s.platformMeta[s.selectedPlatform]?.label || s.selectedPlatform;

  // Account-level destinations (single crumb).
  if (s.isProfileOpen) return { segments: [{ kind: "page", label: "Profile" }], isRoot: false };
  if (s.isSettingsOpen) return { segments: [{ kind: "page", label: "Settings" }], isRoot: false };
  if (s.isGuideOpen) return { segments: [{ kind: "page", label: "Help" }], isRoot: false };

  // Creative Studio section.
  if (s.activeView === "ai-studio") {
    const segments: Segment[] = [{ kind: "section", label: "Creative Studio" }, { kind: "page", label: "Studio" }];
    if (s.isStudioHistoryOpen) segments.push({ kind: "page", label: "History" });
    return { segments, isRoot: false };
  }
  if (s.activeView === "saved-creatives")
    return { segments: [{ kind: "section", label: "Creative Studio" }, { kind: "page", label: "Saved" }], isRoot: false };
  if (s.activeView === "history")
    return { segments: [{ kind: "section", label: "Creative Studio" }, { kind: "page", label: "Generation history" }], isRoot: false };

  // Bare dashboard home — collapses the whole bar.
  if (s.selectedPlatform === "home") return { segments: [{ kind: "page", label: "Dashboard" }], isRoot: true };

  // Analytics section ▸ platform ▸ current. The account switcher used to be the
  // trailing crumb here; it now lives in the platform header next to Live.
  const segments: Segment[] = [{ kind: "section", label: "Analytics" }, { kind: "platform", label: platformLabel }];
  if (s.isViewAllAdsOpen) segments.push({ kind: "page", label: "All ads" });
  else if (s.selectedAdId) segments.push({ kind: "page", label: "Analysis" });

  return { segments, isRoot: false };
}

export function DashboardBreadcrumb(props: DashboardBreadcrumbProps) {
  const { segments, isRoot } = computeBreadcrumb(props);
  if (isRoot) return null;

  const last = segments.length - 1;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1.5">
        {segments.map((seg, i) => {
          const isLast = i === last;
          // Platform crumb shows the selected platform's icon next to its name.
          const PlatformIcon =
            seg.kind === "platform" ? props.platformMeta[props.selectedPlatform]?.icon : undefined;
          return (
            <React.Fragment key={`${seg.kind}-${i}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {seg.kind === "section" ? (
                  <span className="font-medium text-muted-foreground">{seg.label}</span>
                ) : seg.kind === "platform" && !isLast ? (
                  <BreadcrumbLink asChild>
                    <button
                      onClick={() => props.onGoToPlatformRoot(props.selectedPlatform)}
                      className="flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                      title={`Go to ${seg.label} home`}
                    >
                      {PlatformIcon && <PlatformIcon className="h-3.5 w-3.5 shrink-0" />}
                      {seg.label}
                    </button>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-1.5 max-w-[140px] truncate font-medium text-foreground sm:max-w-[220px] lg:max-w-none">
                    {PlatformIcon && <PlatformIcon className="h-3.5 w-3.5 shrink-0" />}
                    {seg.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
