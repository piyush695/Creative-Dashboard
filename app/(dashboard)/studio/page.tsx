"use client";

import { Suspense } from "react";
import CreativeStudioView from "@/components/creative-studio-view";

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      {/* suppressHydrationWarning: security extensions (e.g. Bitdefender) stamp a
          `bis_skin_checked` attribute onto top-level divs before React hydrates. */}
      <div suppressHydrationWarning className="h-full">
        <CreativeStudioView />
      </div>
    </Suspense>
  );
}
