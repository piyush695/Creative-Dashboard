"use client";

import OverviewBoard from "@/components/overview/overview-board";
import { GOOGLE_OVERVIEW } from "@/components/overview/overview-data";

// Rough Google overview mockup — reuses the shared OverviewBoard with
// Google-only placeholder data. Refine with real Google data later.
export default function GoogleOverviewView() {
  return <OverviewBoard data={GOOGLE_OVERVIEW} />;
}
