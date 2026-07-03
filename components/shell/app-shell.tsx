"use client";

import { Suspense, useEffect, useState, type CSSProperties } from "react";
import { Sidebar, MobileSidebarNav } from "./sidebar";
import { Topbar } from "./topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import Footer from "@/components/footer";
import { AddPlatformDialog } from "@/components/add-platform-dialog";
import { useUiSettings } from "@/components/providers/ui-settings-provider";
import { usePathname } from "next/navigation";

// Bumped to :v2 so the default flip to expanded isn't overridden by a stale
// collapsed preference saved under the old key. New explicit choices persist here.
const COLLAPSED_KEY = "shell:sidebar-collapsed:v2";

export function AppShell({ children }: { children: React.ReactNode }) {
  // Expanded by default on desktop — the sidebar only collapses when the user
  // explicitly chooses to. A saved preference (either way) overrides this.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addPlatformOpen, setAddPlatformOpen] = useState(false);
  const { contentZoom } = useUiSettings();
  // Footer appears on the Main Dashboard overview only — hidden on inner pages.
  const pathname = usePathname();
  // Studio and Saved have their own page headers, so the global top bar is
  // redundant there. We hide it on desktop (lg+, where the sidebar is docked)
  // but keep it on smaller screens, since it carries the hamburger that opens
  // the mobile nav drawer.
  const hideTopbarDesktop =
    (pathname?.startsWith("/studio") || pathname?.startsWith("/saved")) ?? false;

  // Opening the platform picker must close the mobile drawer first — otherwise
  // the dialog would stack on top of the off-canvas Sheet and get clipped.
  const openAddPlatform = () => {
    setMobileOpen(false);
    setAddPlatformOpen(true);
  };

  // Restore persisted collapse state — once, client-side only
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored === "1") setCollapsed(true);
      else if (stored === "0") setCollapsed(false);
    } catch {
      // ignore — localStorage may be blocked
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    // suppressHydrationWarning: security extensions (e.g. Bitdefender) stamp a
    // `bis_skin_checked` attribute onto top-level divs before hydration.
    <div suppressHydrationWarning className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* App-wide neon aurora + grid backdrop, behind all glass surfaces */}
      <div suppressHydrationWarning className="app-backdrop" aria-hidden="true" />

      {/* Docked sidebar — desktop only (lg+) */}
      <Suspense fallback={<aside className="hidden lg:block w-[232px] border-r border-sidebar-border bg-sidebar" />}>
        <Sidebar
          collapsed={collapsed}
          onToggle={toggle}
          onAddPlatform={openAddPlatform}
          className="z-10 hidden lg:flex"
        />
      </Suspense>

      {/* Off-canvas drawer — mobile/tablet (below lg) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 lg:hidden" hideClose>
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <Suspense fallback={null}>
            <MobileSidebarNav onNavigate={() => setMobileOpen(false)} onAddPlatform={openAddPlatform} />
          </Suspense>
        </SheetContent>
      </Sheet>

      {/* Platform picker lives at the shell level so it's never nested inside —
          and clipped by — the mobile navigation drawer. */}
      <AddPlatformDialog open={addPlatformOpen} onOpenChange={setAddPlatformOpen} />

      <div suppressHydrationWarning className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} className={hideTopbarDesktop ? "lg:hidden" : undefined} />
        <main className="flex flex-1 flex-col overflow-auto">
          {/* Content zoom scales ONLY this inner content (CSS `zoom` reflows
              within the fixed main container); the shell/topbar are unaffected. */}
          <div suppressHydrationWarning className="flex-1 min-h-0" style={{ zoom: contentZoom } as CSSProperties}>{children}</div>
          {pathname === "/" && <Footer />}
        </main>
      </div>
    </div>
  );
}
