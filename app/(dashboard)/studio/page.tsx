"use client";

import { Suspense } from "react";
import CreativeStudioView from "@/components/creative-studio-view";

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-6">
        <CreativeStudioView />
      </div>
    </Suspense>
  );
}
