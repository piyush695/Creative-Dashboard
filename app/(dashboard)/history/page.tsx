"use client";

import { Suspense } from "react";
import CreativeHistoryView from "@/components/creative-history-view";

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-6">
        <CreativeHistoryView />
      </div>
    </Suspense>
  );
}
