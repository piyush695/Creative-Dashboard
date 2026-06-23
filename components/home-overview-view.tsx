"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Activity,
  Wallet,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { MetaLogo, GoogleLogo, TikTokLogo, AdRollLogo } from "@/components/icons/platforms";
import { usePlatforms } from "@/components/providers/platforms-provider";

// ───────────────────────────────────────────────────────────────────────────
// Gradient-on-clean palette. A blue→violet brand gradient drives hero KPIs,
// charts, funnel and accents; semantic colors appear only where data carries
// meaning (status donut, trend deltas).
// ───────────────────────────────────────────────────────────────────────────
const GRAD_FROM = "#007aff"; // sky-500
const GRAD_TO = "#0dd6ec";   // HolaPrime cyan
const ACCENT = "#7c6cf5";    // blended mid-tone for single-color marks
const POS = "#10b981";       // emerald — positive delta
const NEG = "#ef4444";       // red — negative delta

// ───────────────────────────────────────────────────────────────────────────
// Mock data — kept lean. Real data wires in later (separate task).
// ───────────────────────────────────────────────────────────────────────────
const performanceData = [
  { name: "Mon", revenue: 182, spend: 64 },
  { name: "Tue", revenue: 214, spend: 71 },
  { name: "Wed", revenue: 198, spend: 68 },
  { name: "Thu", revenue: 263, spend: 79 },
  { name: "Fri", revenue: 301, spend: 84 },
  { name: "Sat", revenue: 358, spend: 91 },
  { name: "Sun", revenue: 412, spend: 96 },
];

// Performance series per time range (revenue/spend in $K). Keyed in
// PERF_BY_RANGE below once the range type is declared.
const performanceData30D = [
  { name: "W1", revenue: 1180, spend: 360 },
  { name: "W2", revenue: 1320, spend: 392 },
  { name: "W3", revenue: 1505, spend: 421 },
  { name: "W4", revenue: 1690, spend: 448 },
];

const performanceData90D = [
  { name: "Month 1", revenue: 4820, spend: 1520 },
  { name: "Month 2", revenue: 5640, spend: 1710 },
  { name: "Month 3", revenue: 6810, spend: 1880 },
];

const funnelStages = [
  { name: "Impressions", value: 2_480_000, pct: 100 },
  { name: "Clicks", value: 312_400, pct: 12.6 },
  { name: "Add to Cart", value: 64_200, pct: 2.6 },
  { name: "Purchases", value: 18_940, pct: 0.76 },
];

// Distinct color per creative format so categories are visually
// distinguishable (previously a single gradient with opacity steps).
// Original brand-consistent distinct colors per format (kept as before).
const FORMAT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7"];
const formatData = [
  { name: "Video", volume: 85, color: FORMAT_COLORS[0] },   // blue
  { name: "UGC", volume: 72, color: FORMAT_COLORS[1] },     // emerald
  { name: "Static", volume: 54, color: FORMAT_COLORS[2] },  // amber
  { name: "Carousel", volume: 41, color: FORMAT_COLORS[3] },// purple
];

// Format → brand color lookup, shared by the bar chart and the top-creatives chips.
const FORMAT_COLOR: Record<string, string> = Object.fromEntries(
  formatData.map((f) => [f.name, f.color])
);

const statusData = [
  { name: "High ROAS", value: 45, color: POS },
  { name: "Testing", value: 35, color: "#f59e0b" },
  { name: "Fatigue", value: 20, color: NEG },
];

const topCreatives = [
  { name: "Summer Launch — Hook A", format: "Video", roas: 9.4, spend: "$48.2K", trend: "up" as const },
  { name: "UGC Testimonial v3", format: "UGC", roas: 8.1, spend: "$31.7K", trend: "up" as const },
  { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.8, spend: "$22.9K", trend: "flat" as const },
  { name: "Static — Promo 40%", format: "Static", roas: 5.2, spend: "$18.4K", trend: "down" as const },
];

const insights = [
  { icon: Zap, tone: "accent" as const, title: "Hook A is scaling fast", desc: "ROAS up 18% in 24h — consider raising budget." },
  { icon: AlertTriangle, tone: "warning" as const, title: "Creative fatigue detected", desc: "3 ads in Promo set crossed frequency 4.0." },
  { icon: CheckCircle2, tone: "success" as const, title: "Meta sync complete", desc: "1,204 new assets ingested this morning." },
  { icon: Sparkles, tone: "accent" as const, title: "New format opportunity", desc: "UGC outperforms static by 1.6x ROAS." },
];

const PLATFORMS = [
  { id: "meta", name: "Meta Ads", Logo: MetaLogo, status: "Connected" as const },
  { id: "google", name: "Google Ads", Logo: GoogleLogo, status: "Connected" as const },
  { id: "adroll", name: "AdRoll", Logo: AdRollLogo, status: "Connected" as const },
  { id: "tiktok", name: "TikTok Ads", Logo: TikTokLogo, status: "Available" as const },
];

// ───────────────────────────────────────────────────────────────────────────
// KPI cards — gradient icon tiles, gradient sparkline mini-trend
// ───────────────────────────────────────────────────────────────────────────
type Direction = "up" | "down" | "flat";

const KPIS: Array<{
  title: string;
  value: string;
  change: string;
  direction: Direction;
  icon: typeof Activity;
  spark: number[];
}> = [
  { title: "Active Assets", value: "24,892", change: "+12.5%", direction: "up", icon: Activity, spark: [12, 18, 15, 22, 26, 24, 31] },
  { title: "Cross-Platform Spend", value: "$1.2M", change: "+8.2%", direction: "up", icon: Wallet, spark: [40, 38, 44, 42, 48, 52, 55] },
  { title: "Revenue", value: "$1.6M", change: "+24.1%", direction: "up", icon: DollarSign, spark: [18, 24, 21, 30, 34, 41, 52] },
  { title: "ROAS", value: "8.6x", change: "-1.2%", direction: "down", icon: TrendingUp, spark: [9, 8.4, 8.8, 8.2, 8.6, 8.1, 7.9] },
];

// ───────────────────────────────────────────────────────────────────────────
// Time-range selector (7D / 30D / 90D). Mock data per range so the dashboard
// visibly responds to the selection. Real data wires in with a later task.
// ───────────────────────────────────────────────────────────────────────────
type TimeRange = "7D" | "30D" | "90D";
const TIME_RANGES: TimeRange[] = ["7D", "30D", "90D"];

const RANGE_LABEL: Record<TimeRange, string> = {
  "7D": "last 7 days",
  "30D": "last 30 days",
  "90D": "last 90 days",
};

// Rough scale factor used for range-agnostic mock figures (funnel counts).
const RANGE_FACTOR: Record<TimeRange, number> = { "7D": 1, "30D": 4.2, "90D": 12.6 };

const PERF_BY_RANGE: Record<TimeRange, typeof performanceData> = {
  "7D": performanceData,
  "30D": performanceData30D,
  "90D": performanceData90D,
};

const KPIS_BY_RANGE: Record<TimeRange, typeof KPIS> = {
  "7D": KPIS,
  "30D": [
    { title: "Active Assets", value: "26,340", change: "+9.8%", direction: "up", icon: Activity, spark: [20, 22, 21, 25, 27, 30, 33] },
    { title: "Cross-Platform Spend", value: "$4.8M", change: "+6.1%", direction: "up", icon: Wallet, spark: [120, 128, 124, 132, 140, 150, 158] },
    { title: "Revenue", value: "$6.9M", change: "+19.4%", direction: "up", icon: DollarSign, spark: [80, 92, 88, 110, 120, 140, 165] },
    { title: "ROAS", value: "8.9x", change: "+0.6%", direction: "up", icon: TrendingUp, spark: [8.4, 8.6, 8.7, 8.8, 8.9, 9.0, 8.9] },
  ],
  "90D": [
    { title: "Active Assets", value: "31,210", change: "+21.3%", direction: "up", icon: Activity, spark: [18, 21, 24, 27, 30, 34, 39] },
    { title: "Cross-Platform Spend", value: "$13.6M", change: "+11.4%", direction: "up", icon: Wallet, spark: [380, 400, 420, 440, 470, 500, 540] },
    { title: "Revenue", value: "$21.2M", change: "+28.7%", direction: "up", icon: DollarSign, spark: [200, 260, 300, 360, 420, 500, 610] },
    { title: "ROAS", value: "9.2x", change: "+3.1%", direction: "up", icon: TrendingUp, spark: [8.1, 8.4, 8.6, 8.8, 9.0, 9.1, 9.2] },
  ],
};

function deltaMeta(dir: Direction) {
  if (dir === "up") return { Icon: ArrowUpRight, color: POS };
  if (dir === "down") return { Icon: ArrowDownRight, color: NEG };
  return { Icon: Minus, color: "currentColor" };
}

// ───────────────────────────────────────────────────────────────────────────
// Tooltip — minimal, theme-aware
// ───────────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg backdrop-blur-sm">
      {label && <div className="mb-1 font-medium opacity-70">{label}</div>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5 font-medium">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: entry.color || entry.payload?.color || ACCENT }}
          />
          <span className="capitalize">{entry.name}</span>: {entry.value}
        </div>
      ))}
    </div>
  );
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

// ───────────────────────────────────────────────────────────────────────────
export default function HomeOverviewView() {
  const { enabledIds } = usePlatforms();
  // Only surface platforms an admin has enabled globally.
  const visiblePlatforms = PLATFORMS.filter((p) => enabledIds.includes(p.id));

  // Selected time range drives the KPIs, performance chart, funnel and labels.
  const [range, setRange] = useState<TimeRange>("7D");
  const kpis = KPIS_BY_RANGE[range];
  const perf = PERF_BY_RANGE[range];
  const rangeLabel = RANGE_LABEL[range];
  const scaledFunnel = funnelStages.map((s) => ({
    ...s,
    value: Math.round(s.value * RANGE_FACTOR[range]),
  }));

  return (
    <div className="w-full animate-fade-in">
      {/* Page header — compact aurora-glow hero */}
      <div className="bg-aurora relative mb-5 overflow-hidden rounded-xl border border-border bg-card/40 px-4 py-4 sm:mb-6 sm:px-6 sm:py-5">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="reveal-up flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">Overview</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Multi-channel creative performance across Meta, Google, and AdRoll.
            </p>
          </div>
          <div className="reveal-up stagger-2 flex items-center gap-1 self-start rounded-lg border border-border bg-background/70 p-1 text-xs shadow-xs backdrop-blur-sm sm:self-auto">
            {TIME_RANGES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setRange(p)}
                aria-pressed={range === p}
                className={
                  range === p
                    ? "cursor-pointer rounded-md bg-gradient-primary px-3 py-1 font-semibold text-white shadow-sm"
                    : "cursor-pointer rounded-md px-3 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards with sparklines */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const { Icon: DeltaIcon, color } = deltaMeta(kpi.direction);
          const sparkData = kpi.spark.map((v, i) => ({ i, v }));
          return (
            <div
              key={kpi.title}
              className="card-premium hover-lift group relative animate-slide-up overflow-hidden p-3.5 sm:p-4"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* gradient wash on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-subtle opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              <div className="relative flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.title}
                  </p>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xl font-bold tracking-tight text-foreground nums sm:text-2xl">
                    {kpi.value}
                  </span>
                  <span
                    className="inline-flex items-center gap-0.5 text-xs font-semibold"
                    style={{ color: kpi.direction === "flat" ? undefined : color }}
                  >
                    <DeltaIcon className="h-3 w-3" aria-hidden="true" />
                    {kpi.change}
                  </span>
                </div>
                {/* Sparkline mini-trend */}
                <div className="-mb-1 h-9 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`spark-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GRAD_FROM} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={GRAD_TO} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={`spark-stroke-${idx}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={GRAD_FROM} />
                          <stop offset="100%" stopColor={GRAD_TO} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke={`url(#spark-stroke-${idx})`}
                        strokeWidth={2}
                        fill={`url(#spark-${idx})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance area chart + Creative status donut */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 lg:grid-cols-3">
        <Card className="card-premium rounded-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2 pt-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">Performance</h3>
              <CardDescription className="text-xs">Revenue vs. spend, {rangeLabel}.</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gradient-primary" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                Spend
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[260px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={perf} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GRAD_FROM} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={GRAD_TO} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rev-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={GRAD_FROM} />
                    <stop offset="100%" stopColor={GRAD_TO} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
                  dy={4}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.6 }}
                  width={36}
                  tickFormatter={(v: number) => `$${v}K`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.12 }} />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  fill="none"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="url(#rev-stroke)"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                  dot={false}
                  activeDot={{ r: 4, fill: GRAD_TO, stroke: "#fff", strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Creative Status donut */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-4 pb-2 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-foreground">
              <Activity className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              Creative Status
            </h3>
            <CardDescription className="text-xs">Distribution across campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-4 sm:flex-row">
            <div className="h-[130px] w-[130px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex w-full flex-1 flex-col gap-2.5">
              {statusData.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-foreground">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground nums">{entry.value}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Conversion funnel strip */}
      <Card className="card-premium mb-5 rounded-xl sm:mb-6">
        <CardHeader className="px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">Conversion Funnel</h3>
              <CardDescription className="text-xs">From impression to purchase, {rangeLabel}.</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Overall CVR</span>
              <span className="text-sm font-bold tracking-tight text-foreground nums">
                {funnelStages[funnelStages.length - 1].pct}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 pb-4 lg:grid-cols-4">
          {scaledFunnel.map((stage, idx) => {
            const opacity = 1 - idx * 0.2;
            const dropoff = idx > 0 ? ((stage.pct / scaledFunnel[idx - 1].pct) * 100).toFixed(1) : null;
            return (
              <div key={stage.name} className="relative flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stage.name}</span>
                  {dropoff && (
                    <span className="hidden items-center gap-0.5 text-[10px] text-muted-foreground/70 sm:inline-flex">
                      <ArrowRight className="h-2.5 w-2.5" /> {dropoff}%
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground nums">
                  {formatCompact(stage.value)}
                </span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all duration-500"
                    style={{ width: `${Math.max(stage.pct, 4)}%`, opacity }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground nums">{stage.pct}% of total</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Top creatives + Insights feed */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 lg:grid-cols-2">
        {/* Top performing creatives */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-4 pb-2 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-foreground">
              <TrendingUp className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              Top Performing Creatives
            </h3>
            <CardDescription className="text-xs">Ranked by ROAS, {rangeLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col px-2 pb-2">
            {topCreatives.map((c, idx) => {
              const TrendIcon = c.trend === "up" ? TrendingUp : c.trend === "down" ? TrendingDown : Minus;
              const trendColor = c.trend === "up" ? POS : c.trend === "down" ? NEG : undefined;
              return (
                <div
                  key={c.name}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-xs font-bold text-white shadow-sm nums">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.format} · {c.spend} spend
                    </div>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: FORMAT_COLOR[c.format] ?? ACCENT }} aria-hidden="true" />
                    {c.format}
                  </span>
                  <div className="flex shrink-0 items-center gap-1 text-sm font-semibold nums" style={{ color: trendColor }}>
                    <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {c.roas}x
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Insights feed */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-4 pb-2 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-foreground">
              <Sparkles className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              Insights &amp; Activity
            </h3>
            <CardDescription className="text-xs">AI-detected signals across your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col px-2 pb-2">
            {insights.map((item) => {
              const Icon = item.icon;
              const toneClass =
                item.tone === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : item.tone === "success"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-gradient-primary text-white";
              return (
                <div key={item.title} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ${toneClass}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Format breakdown + Connected platforms */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Format breakdown */}
        <Card className="card-premium rounded-xl lg:col-span-2">
          <CardHeader className="px-4 pb-2 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">Format Breakdown</h3>
                <CardDescription className="text-xs">Volume by creative format.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
                {formatData.map((entry) => (
                  <span key={entry.name} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[200px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="format-bar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={GRAD_FROM} />
                    <stop offset="100%" stopColor={GRAD_TO} />
                  </linearGradient>
                </defs>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.7 }}
                  width={64}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.04 }} />
                <Bar dataKey="volume" radius={[0, 6, 6, 0]} barSize={20}>
                  {formatData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Connected platforms */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="space-y-1 px-4 pb-3 pt-4">
            <h3 className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-foreground">
              <Globe className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              Connected Platforms
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-4 pb-4">
            {visiblePlatforms.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <p.Logo className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    p.status === "Connected"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
