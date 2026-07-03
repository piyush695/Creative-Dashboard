"use client";

import { useEffect, useState } from "react";
import OverviewBoard from "@/components/overview/overview-board";
import {
  ALL_OVERVIEW,
  buildKpis,
  TIME_RANGES,
  type OverviewData,
  type TimeRange,
  type Direction,
} from "@/components/overview/overview-data";
import { fetchHomeOverview } from "@/server/actions/home-overview";
import type { HomePayload } from "@/server/actions/home-overview-types";

// Map the serialisable server payload (no React icons) into the board's
// OverviewData, re-attaching KPI icons/sparklines via the shared buildKpis.
function toOverviewData(p: HomePayload): OverviewData {
  const kpiRows = {} as Record<TimeRange, Array<{ n: number; change: string; dir: Direction }>>;
  const perfByRange = {} as OverviewData["perfByRange"];
  const statusByRange = {} as OverviewData["statusByRange"];
  const funnelByRange = {} as OverviewData["funnelByRange"];
  const topByRange = {} as OverviewData["topByRange"];
  const formatByRange = {} as OverviewData["formatByRange"];
  for (const r of TIME_RANGES) {
    kpiRows[r] = p[r].kpiRows as Array<{ n: number; change: string; dir: Direction }>;
    perfByRange[r] = p[r].perf;
    statusByRange[r] = p[r].status;
    funnelByRange[r] = p[r].funnel;
    topByRange[r] = p[r].top as OverviewData["topByRange"][TimeRange];
    formatByRange[r] = p[r].format;
  }
  return {
    title: ALL_OVERVIEW.title,
    subtitle: ALL_OVERVIEW.subtitle,
    kpisByRange: buildKpis("Cross-Platform Spend", kpiRows),
    perfByRange,
    statusByRange,
    funnelByRange,
    topByRange,
    formatByRange,
  };
}

// Cross-platform Dashboard home. Fetches REAL aggregated data across Meta,
// Google and AdRoll (server/actions/home-overview.ts) and feeds the shared
// OverviewBoard. The mock renders instantly, then swaps to live data; if the
// fetch fails it degrades gracefully to that fallback.
export default function HomeOverviewView() {
  const [data, setData] = useState<OverviewData>(ALL_OVERVIEW);

  useEffect(() => {
    let alive = true;
    fetchHomeOverview()
      .then((payload) => { if (alive && payload) setData(toOverviewData(payload)); })
      .catch((e) => { console.warn("[HomeOverview] live data fetch failed — showing fallback:", e); });
    return () => { alive = false; };
  }, []);

  return <OverviewBoard data={data} />;
}
