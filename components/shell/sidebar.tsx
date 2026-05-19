"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, ACCOUNT_NAV, type NavItem } from "./nav-config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");

    // Pathname must match (exact for root, prefix-or-exact otherwise)
    const pathMatches =
      hrefPath === "/"
        ? pathname === "/"
        : pathname === hrefPath || pathname.startsWith(hrefPath + "/");

    if (!pathMatches) return false;
    if (!hrefQuery) return true;

    // Each query param in href must match the current URL
    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
          collapsed ? "w-[60px]" : "w-[232px]"
        )}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className={cn("flex h-14 items-center border-b border-sidebar-border px-3", collapsed && "justify-center")}>
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-[13px] font-semibold">
              h
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-none">hola prime</div>
                <div className="mt-1 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Creative AI
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {PRIMARY_NAV.map((section, idx) => (
            <div key={section.label} className={cn(idx > 0 && "mt-5")}>
              {!collapsed && (
                <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account nav */}
        <div className="border-t border-sidebar-border px-2 py-2">
          <ul className="flex flex-col gap-0.5">
            {ACCOUNT_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </ul>
        </div>

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

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      className={cn(
        "group flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
