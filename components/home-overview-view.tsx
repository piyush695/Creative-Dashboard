"use client";

import OverviewBoard from "@/components/overview/overview-board";
import { ALL_OVERVIEW } from "@/components/overview/overview-data";

// Cross-platform Dashboard home. Thin wrapper over the shared OverviewBoard —
// the per-platform Meta / Google overviews reuse the same board with their own
// data (see components/meta-overview-view.tsx, google-overview-view.tsx).
export default function HomeOverviewView() {
  return <OverviewBoard data={ALL_OVERVIEW} />;
}
