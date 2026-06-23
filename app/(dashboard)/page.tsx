"use client";

import dynamic from "next/dynamic";

// Recharts has known ESM/CJS interop issues with Turbopack SSR. Loading the
// overview client-side avoids the "Super expression must either be null or a
// function" crash on first render.
const HomeOverviewView = dynamic(() => import("@/components/home-overview-view"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      Loading overview…
    </div>
  ),
});

export default function OverviewPage() {
  return (
    // Full-width to match the legacy/search view's container (px-4 md:px-6, no
    // max-width). Keeping a centred max-width here caused a visible horizontal
    // shift when navigating to search results on screens wider than 2xl.
    <div className="w-full px-4 py-6 md:px-6">
      <HomeOverviewView />
    </div>
  );
}
