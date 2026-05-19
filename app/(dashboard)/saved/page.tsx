"use client";

import { Suspense } from "react";
import SavedCreativesView from "@/components/saved-creatives-view";

export default function SavedPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-6">
        <SavedCreativesView />
      </div>
    </Suspense>
  );
}
