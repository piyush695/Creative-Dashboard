"use server";

// ───────────────────────────────────────────────────────────────────────────
// Home Overview — REAL cross-platform data for the Dashboard overview board.
//
// Aggregates the three live per-platform overview fetchers (Meta creative_data,
// Google Ads, AdRoll) into the OverviewData shape the board consumes, for each
// of the 7D / 30D / 90D buckets. Replaces the old mock (overview-data.ts).
//
// Honest notes on data provenance:
//  - spend / revenue / roas / funnel / formats / top / perf: REAL, per platform,
//    filtered to the window. (Meta docs are filtered by createdTime — the same
//    behaviour as the rest of the dashboard — so a short window mostly reflects
//    Google + AdRoll, which carry true daily performance.)
//  - Active Assets + Creative Status: portfolio-level from creative_data (real
//    counts / ROAS distribution), so they read the whole inventory, not a window.
//  - KPI deltas: derived from the merged daily trend (first half vs second half).
//  - No fabricated numbers anywhere; a stage/field with no source is omitted.
// ───────────────────────────────────────────────────────────────────────────

import clientPromise from "@/server/mongodb-client";
import { fetchMetaOverview } from "./ads";
import { fetchGoogleOverview } from "./google-live";
import { fetchAdrollOverview } from "./adroll-live";
import type { RangePayload, HomePayload, OverviewTR, OverviewDir } from "./home-overview-types";

type TR = OverviewTR;
type Dir = OverviewDir;
const DAYS: Record<TR, number> = { "7D": 7, "30D": 30, "90D": 90 };

// ── helpers (module-private) ────────────────────────────────────────────────
function ymd(d: Date): string { return d.toISOString().slice(0, 10); }
function windowFor(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - (days - 1));
  return { from: ymd(from), to: ymd(to) };
}
function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}
function normFmt(name: string): string {
  const s = (name || "").toLowerCase();
  if (/(video|reel|youtube)/.test(s)) return "Video";
  if (/carousel/.test(s)) return "Carousel";
  if (/ugc/.test(s)) return "UGC";
  if (/(image|static|display|search|pmax|performance|banner)/.test(s)) return "Static";
  return name || "Other";
}
// Trend from a numeric daily series: first half vs second half.
function trend(vals: number[]): { change: string; dir: Dir } {
  const clean = vals.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return { change: "—", dir: "flat" };
  const mid = Math.floor(clean.length / 2);
  const a = clean.slice(0, mid), b = clean.slice(mid);
  const avg = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
  const h1 = avg(a), h2 = avg(b);
  if (h1 <= 0) return { change: "—", dir: "flat" };
  const pct = ((h2 - h1) / h1) * 100;
  const dir: Dir = Math.abs(pct) < 1 ? "flat" : pct > 0 ? "up" : "down";
  return { change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, dir };
}

// Portfolio-level Meta figures (whole inventory, not windowed).
async function metaPortfolio(): Promise<{ assets: number; status: Array<{ name: string; value: number }> }> {
  try {
    const client = await clientPromise;
    const coll = client.db(process.env.MONGODB_DB || "reddit_data").collection("creative_data");
    const num = (f: string) => ({ $convert: { input: `$${f}`, to: "double", onError: 0, onNull: 0 } });
    const [assets, statusAgg] = await Promise.all([
      coll.countDocuments({}),
      coll.aggregate([
        // Only creatives that actually ran (spend > 0); the rest never launched
        // and would drown the distribution in a meaningless "Testing" bucket.
        { $project: { spend: num("spend"), pv: num("purchase_value") } },
        { $match: { spend: { $gt: 0 } } },
        { $project: { spend: 1, roas: { $cond: [{ $gt: ["$spend", 0] }, { $divide: ["$pv", "$spend"] }, 0] } } },
        { $group: {
          _id: null,
          // Testing = still ramping (low spend); High = proven winners; Fatigue = spent enough but underperforming.
          testing: { $sum: { $cond: [{ $lt: ["$spend", 250] }, 1, 0] } },
          high: { $sum: { $cond: [{ $and: [{ $gte: ["$spend", 250] }, { $gte: ["$roas", 2] }] }, 1, 0] } },
          fatigue: { $sum: { $cond: [{ $and: [{ $gte: ["$spend", 250] }, { $lt: ["$roas", 2] }] }, 1, 0] } },
        } },
      ]).toArray(),
    ]);
    const s: any = statusAgg[0] || { testing: 0, high: 0, fatigue: 0 };
    const total = (s.testing + s.high + s.fatigue) || 1;
    const status = [
      { name: "High ROAS", value: Math.round((s.high / total) * 100) },
      { name: "Testing", value: Math.round((s.testing / total) * 100) },
      { name: "Fatigue", value: Math.round((s.fatigue / total) * 100) },
    ];
    return { assets, status };
  } catch (e) {
    console.error("[home-overview] metaPortfolio failed:", e);
    return { assets: 0, status: [{ name: "High ROAS", value: 0 }, { name: "Testing", value: 0 }, { name: "Fatigue", value: 0 }] };
  }
}

async function buildRange(days: number, portfolio: { assets: number; status: Array<{ name: string; value: number }> }): Promise<RangePayload> {
  const dateRange = windowFor(days);
  const [meta, google, adroll] = await Promise.all([
    fetchMetaOverview({ dateRange }).catch(() => null),
    fetchGoogleOverview({ dateRange }).catch(() => null),
    fetchAdrollOverview({ dateRange }).catch(() => null),
  ]);
  const plats = [meta, google, adroll].filter(Boolean) as any[];
  const sum = (sel: (p: any) => number) => plats.reduce((s, p) => s + (sel(p) || 0), 0);
  const spend = sum((p) => p.kpis.spend);
  const revenue = sum((p) => p.kpis.convValue);
  const impressions = sum((p) => p.kpis.impressions);
  const clicks = sum((p) => p.kpis.clicks);
  const conversions = sum((p) => p.kpis.conversions);
  const roas = spend > 0 ? revenue / spend : 0;

  // Performance series — merge Meta + Google daily (both "MMM DD" labels), sum, K-scale.
  const map = new Map<string, { name: string; revenue: number; spend: number }>();
  for (const p of [meta, google]) {
    for (const pt of (p?.series || [])) {
      if (!pt.label) continue;
      const e = map.get(pt.label) || { name: pt.label, revenue: 0, spend: 0 };
      e.revenue += pt.revenue || 0; e.spend += pt.spend || 0; map.set(pt.label, e);
    }
  }
  const perf = [...map.values()]
    .sort((a, b) => (Date.parse(`${a.name} 2026`) || 0) - (Date.parse(`${b.name} 2026`) || 0))
    .map((e) => ({ name: e.name, revenue: Math.round(e.revenue / 1000), spend: Math.round(e.spend / 1000) }));

  // Funnel — real stages we can source (impression → click → purchase).
  const pct = (v: number) => (impressions > 0 ? Math.round((v / impressions) * 10000) / 100 : 0);
  const funnel = [
    { name: "Impressions", value: Math.round(impressions), pct: 100 },
    { name: "Clicks", value: Math.round(clicks), pct: pct(clicks) },
    { name: "Purchases", value: Math.round(conversions), pct: pct(conversions) },
  ];

  // Top creatives — merge top campaigns across platforms by ROAS.
  const tagged = [
    ...(meta?.topCampaigns || []).map((c: any) => ({ ...c, plat: "Meta" })),
    ...(google?.topCampaigns || []).map((c: any) => ({ ...c, plat: "Google" })),
    ...(adroll?.topCampaigns || []).map((c: any) => ({ ...c, plat: "AdRoll" })),
  ].filter((c) => c.spend > 0);
  const top = tagged.sort((a, b) => b.roas - a.roas).slice(0, 4).map((c) => ({
    name: c.name, format: c.plat, roas: Math.round(c.roas * 10) / 10, spend: usd(c.spend),
    trend: (c.roas >= roas ? "up" : c.roas < roas * 0.7 ? "down" : "flat") as Dir,
  }));

  // Format breakdown — merge each platform's format spend, normalise names.
  const fmt = new Map<string, number>();
  for (const p of plats) for (const f of (p.formats || [])) fmt.set(normFmt(f.name), (fmt.get(normFmt(f.name)) || 0) + (f.value || 0));
  const format = [...fmt.entries()].map(([name, value]) => ({ name, volume: Math.round(value) })).filter((x) => x.volume > 0).sort((a, b) => b.volume - a.volume);

  // KPI deltas from the merged daily trend.
  const revTrend = trend(perf.map((p) => p.revenue));
  const spendTrend = trend(perf.map((p) => p.spend));
  const roasTrend = trend(perf.map((p) => (p.spend > 0 ? p.revenue / p.spend : 0)));

  const kpiRows = [
    { n: portfolio.assets, change: "—", dir: "flat" as Dir },
    { n: Math.round(spend), change: spendTrend.change, dir: spendTrend.dir },
    { n: Math.round(revenue), change: revTrend.change, dir: revTrend.dir },
    { n: Math.round(roas * 10) / 10, change: roasTrend.change, dir: roasTrend.dir },
  ];

  return { kpiRows, perf, status: portfolio.status, funnel, top, format };
}

/** Real cross-platform overview for all three range buckets. */
export async function fetchHomeOverview(): Promise<HomePayload> {
  const portfolio = await metaPortfolio();
  const [d7, d30, d90] = await Promise.all([
    buildRange(DAYS["7D"], portfolio),
    buildRange(DAYS["30D"], portfolio),
    buildRange(DAYS["90D"], portfolio),
  ]);
  return { "7D": d7, "30D": d30, "90D": d90 };
}
