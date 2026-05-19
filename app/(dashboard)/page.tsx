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
    <div className="mx-auto w-full max-w-screen-2xl px-6 py-6">
      <HomeOverviewView />
    </div>
  );
}
