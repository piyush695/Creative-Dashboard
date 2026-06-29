"use client";

import OverviewBoard from "@/components/overview/overview-board";
import { META_OVERVIEW } from "@/components/overview/overview-data";

// Rough Meta overview mockup — reuses the shared OverviewBoard with Meta-only
// placeholder data. Refine with real Meta data later.
export default function MetaOverviewView() {
  return <OverviewBoard data={META_OVERVIEW} />;
}
