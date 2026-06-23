"use client";

import * as React from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Universal dashboard breadcrumb.
 *
 * Hierarchy: Dashboard ▸ Platform ▸ Page. The behavior is fully data-driven —
 * any platform present in `platformMeta` automatically gets a crumb and the
 * standard "click the platform name → jump straight to that platform's root
 * page" shortcut, with no per-platform code. Add a platform to `platformMeta`
 * and it inherits the navigation system for free.
 *
 * - Ancestor segments (Dashboard, Platform) are links.
 * - The platform segment ALWAYS returns to the platform's main/root page,
 *   never an intermediate level, via `onGoToPlatformRoot`.
 * - The deepest segment is the non-clickable current page (or, for Meta/All,
 *   an inline account switcher).
 */

export interface BreadcrumbAccount {
  id: string;
  name: string;
  count: number;
}

export interface DashboardBreadcrumbState {
  selectedPlatform: string;
  /** Label/icon registry. Any key here automatically gets breadcrumb support. */
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
  /** Navigate to the dashboard home/root. */
  onGoHome: () => void;
  /** Navigate to a platform's root/main page (clears any nested sub-state). */
  onGoToPlatformRoot: (platform: string) => void;
  /** Switch the active ad account (Meta/All current-page switcher). */
  onSelectAccount: (id: string) => void;
}

type Leaf = { kind: "page" | "account"; label: string } | null;

export interface BreadcrumbModel {
  platformLabel: string;
  isTopLevelView: boolean;
  topLevelLabel: string;
  leaf: Leaf;
  showPlatformCrumb: boolean;
  /** True on the bare dashboard home where the breadcrumb adds no value. */
  isRoot: boolean;
}

/**
 * Single source of truth for the breadcrumb hierarchy. Pure and platform
 * agnostic so the page and the component never drift.
 */
export function computeBreadcrumb(s: DashboardBreadcrumbState): BreadcrumbModel {
  const platformLabel =
    s.selectedPlatform === "home"
      ? "Home"
      : s.selectedPlatform === "all"
        ? "All Platforms"
        : s.platformMeta[s.selectedPlatform]?.label || s.selectedPlatform;

  // Global destinations that sit directly under Dashboard (not platform-scoped).
  const isTopLevelView =
    s.isProfileOpen ||
    s.isSettingsOpen ||
    s.isGuideOpen ||
    s.activeView === "ai-studio" ||
    s.activeView === "saved-creatives" ||
    s.activeView === "history";

  const topLevelLabel = s.isProfileOpen
    ? "Profile"
    : s.isSettingsOpen
      ? "Settings"
      : s.isGuideOpen
        ? "Guide"
        : s.activeView === "ai-studio"
          ? "AI Studio"
          : s.activeView === "saved-creatives"
            ? "Creative Vault"
            : s.activeView === "history"
              ? "Generation History"
              : "";

  const accountLabel =
    s.selectedAccountId === "all"
      ? "All Accounts"
      : s.accountStats.find((a) => a.id === s.selectedAccountId)?.name || "All Accounts";

  const campaignLabel =
    s.selectedRealtimeCampaign === "all"
      ? "All Campaigns"
      : s.realtimeCampaigns.find((c) => c.id === s.selectedRealtimeCampaign)?.name ||
        s.realtimeCampaigns.find((c) => c.id === s.selectedRealtimeCampaign)?.campaignName ||
        "Campaign";

  // Deepest segment (current page). `account` renders an inline account switcher;
  // everything else is a static current-page label.
  const leaf: Leaf = isTopLevelView
    ? { kind: "page", label: topLevelLabel }
    : s.selectedPlatform === "home"
      ? null
      : s.isViewAllAdsOpen
        ? { kind: "page", label: "All Ads" }
        : s.selectedAdId
          ? { kind: "page", label: "Analysis" }
          : s.selectedPlatform === "meta" || s.selectedPlatform === "all"
            ? { kind: "account", label: accountLabel }
            : { kind: "page", label: campaignLabel };

  const showPlatformCrumb = !isTopLevelView && s.selectedPlatform !== "home";
  const isRoot = !showPlatformCrumb && !isTopLevelView && !leaf;

  return { platformLabel, isTopLevelView, topLevelLabel, leaf, showPlatformCrumb, isRoot };
}

export function DashboardBreadcrumb(props: DashboardBreadcrumbProps) {
  const { platformLabel, isTopLevelView, topLevelLabel, leaf, showPlatformCrumb, isRoot } =
    computeBreadcrumb(props);

  // Nothing meaningful to show on the bare dashboard home.
  if (isRoot) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1.5">
        {/* Root */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <button
              onClick={props.onGoHome}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              title="Go to dashboard home"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Platform — always a shortcut to the platform's root page */}
        {showPlatformCrumb && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <button
                  onClick={() => props.onGoToPlatformRoot(props.selectedPlatform)}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  title={`Go to ${platformLabel} home`}
                >
                  {platformLabel}
                </button>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {/* Top-level destination (Profile / Settings / AI Studio / …) */}
        {isTopLevelView && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[140px] truncate font-medium sm:max-w-none">
                {topLevelLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {/* Platform-scoped current page */}
        {!isTopLevelView && leaf && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {leaf.kind === "account" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="group inline-flex items-center gap-1 text-[12px] font-medium text-foreground transition-colors hover:text-sky-500"
                      title="Switch ad account"
                      aria-label="Switch ad account"
                    >
                      <span className="max-w-[110px] truncate sm:max-w-[150px] lg:max-w-none">
                        {leaf.label}
                      </span>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72 max-h-[60vh] overflow-y-auto rounded-md p-1.5">
                    <DropdownMenuLabel className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                      Switch Account
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => props.onSelectAccount("all")}
                      className={cn(
                        "flex items-center justify-between rounded-md cursor-pointer p-2",
                        props.selectedAccountId === "all" && "bg-primary/10 text-primary",
                      )}
                    >
                      <span className="text-[12px] font-semibold">All Accounts</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {props.totalMetaAds}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {props.accountStats.length === 0 ? (
                      <div className="px-2 py-3 text-[10px] italic text-muted-foreground">
                        No accounts configured.
                      </div>
                    ) : (
                      (() => {
                        const withAds = props.accountStats.filter((a) => a.count > 0);
                        const empty = props.accountStats.filter((a) => a.count === 0);
                        return (
                          <>
                            {withAds.map((acc) => (
                              <DropdownMenuItem
                                key={acc.id}
                                onClick={() => props.onSelectAccount(acc.id)}
                                className={cn(
                                  "flex items-center justify-between rounded-md cursor-pointer p-2",
                                  props.selectedAccountId === acc.id && "bg-primary/10 text-primary",
                                )}
                              >
                                <span className="text-[12px] truncate pr-2">{acc.name}</span>
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                  {acc.count}
                                </span>
                              </DropdownMenuItem>
                            ))}
                            {empty.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground/70">
                                  Not Synced Yet ({empty.length})
                                </DropdownMenuLabel>
                                {empty.map((acc) => (
                                  <DropdownMenuItem
                                    key={acc.id}
                                    onClick={() => props.onSelectAccount(acc.id)}
                                    className={cn(
                                      "flex items-center justify-between rounded-md cursor-pointer p-2 opacity-60",
                                      props.selectedAccountId === acc.id && "bg-primary/10 text-primary opacity-100",
                                    )}
                                  >
                                    <span className="text-[12px] truncate pr-2">{acc.name}</span>
                                    <span className="shrink-0 font-mono text-[9px] italic text-muted-foreground">
                                      0 ads
                                    </span>
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </>
                        );
                      })()
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <BreadcrumbPage className="max-w-[130px] truncate font-medium sm:max-w-[200px] lg:max-w-none">
                  {leaf.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {/* AI Studio ▸ History */}
        {props.activeView === "ai-studio" && props.isStudioHistoryOpen && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-[11px] uppercase tracking-wider">History</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
