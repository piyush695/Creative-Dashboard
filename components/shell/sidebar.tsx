"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOP_NAV, PRIMARY_NAV, ACCOUNT_NAV, type NavItem } from "./nav-config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlatforms } from "@/components/providers/platforms-provider";

// Shared active-route matcher. Pathname must match (exact for root,
// prefix-or-exact otherwise); any query params in `href` must also match.
function useIsActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");

    const pathMatches =
      hrefPath === "/"
        ? pathname === "/"
        : pathname === hrefPath || pathname.startsWith(hrefPath + "/");

    if (!pathMatches) return false;
    if (!hrefQuery) return true;

    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };
}

// ── Brand block ──────────────────────────────────────────────────────────────
function Brand({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    // suppressHydrationWarning: security browser extensions (e.g. Bitdefender)
    // inject a `bis_skin_checked` attribute onto divs before React hydrates,
    // which otherwise trips a benign SSR/client mismatch warning here.
    <div suppressHydrationWarning className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed ? "justify-center" : "justify-start pl-5")}>
      <Link
        href="/"
        onClick={onNavigate}
        className="group flex items-center gap-2.5 overflow-hidden"
        aria-label="HolaPrime — Creative Analyzer"
      >
        {collapsed ? (
          /* Compact mark for the narrow rail */
          <div suppressHydrationWarning className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-white text-[14px] font-bold shadow-sm transition-transform duration-200 group-hover:scale-105">
            <span className="relative z-10">h</span>
            <div suppressHydrationWarning className="absolute inset-0 rounded-lg bg-gradient-primary opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60" aria-hidden="true" />
          </div>
        ) : (
          /* Full HolaPrime wordmark — theme aware, natural aspect ratio (matches login) */
          <div suppressHydrationWarning className="flex min-w-0 flex-col items-center transition-transform duration-200 group-hover:scale-[1.02]">
            <Image
              src="/logos/holaprime-dark.svg"
              alt="HolaPrime"
              width={176}
              height={103}
              unoptimized
              className="h-9 w-auto dark:hidden"
            />
            <Image
              src="/logos/holaprime-light.svg"
              alt="HolaPrime"
              width={176}
              height={103}
              unoptimized
              className="hidden h-9 w-auto dark:block"
            />
            <span className="mt-0.5 w-full text-center text-[8px] font-semibold uppercase leading-none tracking-[0.1em] text-muted-foreground">
              Creative Analyzer
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}

// ── Nav body — shared between docked sidebar and mobile drawer ────────────────
function SidebarBody({
  collapsed,
  onNavigate,
  onAddPlatform,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onAddPlatform: () => void;
}) {
  const isActive = useIsActive();
  const { enabledPlatforms, isAdmin } = usePlatforms();

  // Sections start collapsed for a cleaner look — they expand only when the
  // user clicks the header. (On the narrow rail, items always show as icons.)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    Analyze: false,
    ...Object.fromEntries(PRIMARY_NAV.map((section) => [section.label, false])),
  }));

  const toggleSection = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  // The Analyze section is built from the globally-enabled platforms.
  const analyzeItems: NavItem[] = enabledPlatforms.map((p) => ({
    label: p.label,
    href: `/legacy?platform=${p.id}`,
    icon: p.icon,
  }));
  const analyzeOpen = collapsed || openSections.Analyze;

  return (
    <>
      <Brand collapsed={collapsed} onNavigate={onNavigate} />

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* Standalone top-level items (Overview) — always visible, never nested. */}
        <ul className="flex flex-col gap-0.5">
          {TOP_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        {/* Analyze — dynamic, driven by the globally-enabled platforms */}
        <div suppressHydrationWarning className="mt-6">
          {collapsed ? (
            <div suppressHydrationWarning className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={() => toggleSection("Analyze")}
              className="group/section mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
              aria-expanded={analyzeOpen}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover/section:text-foreground",
                  analyzeOpen && "rotate-90"
                )}
                aria-hidden="true"
              />
              <span>Analytics</span>
            </button>
          )}
          {analyzeOpen && (
            <ul className="flex flex-col gap-0.5">
              {analyzeItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
              {isAdmin && (
                <AddPlatformButton
                  collapsed={collapsed}
                  onClick={() => {
                    // Close the mobile drawer (if open) before the picker opens.
                    onNavigate?.();
                    onAddPlatform();
                  }}
                />
              )}
            </ul>
          )}
        </div>

        {/* Grouped static sections (Create) */}
        {PRIMARY_NAV.map((section) => {
          // In the narrow rail there's no room for a dropdown — always show icons.
          const isOpen = collapsed || openSections[section.label];

          return (
            <div key={section.label} suppressHydrationWarning className="mt-6">
              {collapsed ? (
                /* Divider stands in for the section label on the narrow rail. */
                <div suppressHydrationWarning className="mx-2 mb-2 h-px bg-sidebar-border" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className="group/section mb-1.5 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                  aria-expanded={isOpen}
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover/section:text-foreground",
                      isOpen && "rotate-90"
                    )}
                    aria-hidden="true"
                  />
                  <span>{section.label}</span>
                </button>
              )}
              {isOpen && (
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href)}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Account nav (no nested AddPlatformDialog here — it lives in AppShell) */}
      <div suppressHydrationWarning className="border-t border-sidebar-border px-2 py-2">
        <ul className="flex flex-col gap-0.5">
          {ACCOUNT_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

// "Add Platform" entry shown under Analyze for admins. Styled to sit alongside
// NavLink rows; collapses to an icon-only button with a tooltip on the rail.
function AddPlatformButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-9 w-full items-center gap-2.5 rounded-lg border border-dashed border-sidebar-border px-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-sidebar-accent hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
      aria-label="Add platform"
    >
      <Plus className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">Add Platform</span>}
    </button>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Add Platform
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return <li>{button}</li>;
}

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onAddPlatform: () => void;
  className?: string;
};

// ── Docked sidebar (desktop) ──────────────────────────────────────────────────
export function Sidebar({ collapsed, onToggle, onAddPlatform, className }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-sidebar-border bg-sidebar/70 text-sidebar-foreground backdrop-blur-xl backdrop-saturate-150 transition-[width] duration-200 ease-out",
          collapsed ? "w-[60px]" : "w-[232px]",
          className
        )}
        aria-label="Primary navigation"
      >
        <SidebarBody collapsed={collapsed} onAddPlatform={onAddPlatform} />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-9 items-center gap-2 border-t border-sidebar-border px-3 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>
    </TooltipProvider>
  );
}

// ── Mobile drawer contents (rendered inside a Sheet) ──────────────────────────
export function MobileSidebarNav({
  onNavigate,
  onAddPlatform,
}: {
  onNavigate?: () => void;
  onAddPlatform: () => void;
}) {
  return (
    <div suppressHydrationWarning className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <SidebarBody collapsed={false} onNavigate={onNavigate} onAddPlatform={onAddPlatform} />
    </div>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-subtle text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
      aria-current={active ? "page" : undefined}
    >
      {/* Active gradient indicator bar */}
      {active && !collapsed && (
        <span
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-primary"
          aria-hidden="true"
        />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-primary" : "group-hover:text-foreground"
        )}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span
          className={cn(
            "ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            active
              ? "bg-gradient-primary text-white"
              : "bg-muted text-muted-foreground"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return <li>{link}</li>;
}
