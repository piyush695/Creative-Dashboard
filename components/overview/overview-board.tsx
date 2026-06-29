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
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ArrowRight,
} from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { METRIC_NEUTRAL } from "@/lib/metric-colors";
import {
  type OverviewData,
  type TimeRange,
  type Direction,
  RANGE_LABEL,
  FORMAT_COLOR,
  STATUS_COLOR,
  POS,
  NEG,
} from "./overview-data";

// The cross-platform overview is driven by range-bucketed datasets. Map the
// chosen calendar span onto the nearest available bucket so the board responds
// to any custom range the user picks.
function rangeToBucket(range?: DateRange): TimeRange {
  if (!range?.from || !range?.to) return "90D";
  const days = Math.round(
    (endOfDay(range.to).getTime() - startOfDay(range.from).getTime()) / 86400000,
  );
  if (days <= 7) return "7D";
  if (days <= 30) return "30D";
  return "90D";
}

const DEFAULT_RANGE = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return { from, to };
};

// ───────────────────────────────────────────────────────────────────────────
// Gradient-on-clean palette. A blue→violet brand gradient drives hero KPIs,
// charts and funnel; semantic colors appear only where data carries meaning
// (status donut, trend deltas).
// ───────────────────────────────────────────────────────────────────────────
const GRAD_FROM = "#007aff";
const GRAD_TO = "#0dd6ec";
const ACCENT = "#7c6cf5";

function deltaMeta(dir: Direction) {
  if (dir === "up") return { Icon: ArrowUpRight, color: POS };
  if (dir === "down") return { Icon: ArrowDownRight, color: NEG };
  // Neutral / flat → blue (informational), per the dashboard color scheme.
  return { Icon: Minus, color: METRIC_NEUTRAL };
}

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
// Reusable overview board. Renders the KPI cards, performance chart, creative
// status donut, conversion funnel, top creatives and format breakdown — all
// driven by `data` and the selected time range. Used by the cross-platform
// Dashboard home and the per-platform (Meta / Google) overview mockups.
// ───────────────────────────────────────────────────────────────────────────
export default function OverviewBoard({ data }: { data: OverviewData }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(DEFAULT_RANGE);
  const range = rangeToBucket(dateRange);
  const kpis = data.kpisByRange[range];
  const perf = data.perfByRange[range];
  const statusData = data.statusByRange[range];
  const funnel = data.funnelByRange[range];
  const topCreatives = data.topByRange[range];
  const formatData = data.formatByRange[range];
  const rangeLabel = RANGE_LABEL[range];

  return (
    <div className="w-full animate-fade-in">
      {/* Page header — compact aurora-glow hero */}
      <div className="bg-aurora relative mb-5 overflow-hidden rounded-xl border border-border bg-card/40 px-4 py-4 sm:mb-6 sm:px-6 sm:py-5">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="reveal-up flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{data.title}</h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                LIVE
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{data.subtitle}</p>
          </div>
          <div className="reveal-up stagger-2 self-start sm:self-auto">
            <DateRangePicker value={dateRange} onChange={setDateRange} align="end" />
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
                      <Cell key={idx} fill={STATUS_COLOR[entry.name] ?? ACCENT} />
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
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR[entry.name] ?? ACCENT }} />
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
                {funnel[funnel.length - 1].pct}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 px-4 pb-4 lg:grid-cols-4">
          {funnel.map((stage, idx) => {
            const opacity = 1 - idx * 0.2;
            const dropoff = idx > 0 ? ((stage.pct / funnel[idx - 1].pct) * 100).toFixed(1) : null;
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

      {/* Top creatives + Format breakdown */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

        {/* Format breakdown */}
        <Card className="card-premium rounded-xl">
          <CardHeader className="px-4 pb-2 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">Format Breakdown</h3>
                <CardDescription className="text-xs">Volume by creative format, {rangeLabel}.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
                {formatData.map((entry) => (
                  <span key={entry.name} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FORMAT_COLOR[entry.name] ?? ACCENT }} aria-hidden="true" />
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[200px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    <Cell key={idx} fill={FORMAT_COLOR[entry.name] ?? ACCENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
