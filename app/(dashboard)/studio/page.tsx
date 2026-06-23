"use client";

import { Suspense } from "react";
import CreativeStudioView from "@/components/creative-studio-view";

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <div className="h-full">
        <CreativeStudioView />
      </div>
    </Suspense>
  );
}
