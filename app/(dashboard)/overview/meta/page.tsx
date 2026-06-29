"use client";

import dynamic from "next/dynamic";

// Recharts has known ESM/CJS interop issues with Turbopack SSR. Loading the
// overview client-side avoids the "Super expression must either be null or a
// function" crash on first render (same pattern as the Dashboard home).
const MetaOverviewView = dynamic(() => import("@/components/meta-overview-view"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
      Loading overview…
    </div>
  ),
});

export default function MetaOverviewPage() {
  return (
    <div className="w-full px-4 py-6 md:px-6">
      <MetaOverviewView />
    </div>
  );
}
