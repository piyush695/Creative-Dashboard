"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
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
  ArrowUpRight,
  Globe,
} from "lucide-react";
import { MetaLogo, GoogleLogo, TikTokLogo, AdRollLogo } from "@/components/icons/platforms";

// ───────────────────────────────────────────────────────────────────────────
// Mock data — kept lean. Real data wires in later (separate task).
// ───────────────────────────────────────────────────────────────────────────
const lineData = [
  { name: "W1", roas: 4.2 },
  { name: "W2", roas: 5.8 },
  { name: "W3", roas: 5.1 },
  { name: "W4", roas: 6.7 },
  { name: "W5", roas: 7.9 },
  { name: "W6", roas: 7.3 },
  { name: "W7", roas: 8.6 },
];

// Per-bar distinct colors (feedback: "color should be different for each key point")
const formatData = [
  { name: "Video",    volume: 65, color: "#3b82f6" }, // blue
  { name: "Static",   volume: 45, color: "#f59e0b" }, // amber
  { name: "UGC",      volume: 85, color: "#10b981" }, // emerald
  { name: "Carousel", volume: 55, color: "#a855f7" }, // purple
];

const statusData = [
  { name: "High ROAS", value: 45, color: "#10b981" }, // emerald
  { name: "Testing",   value: 35, color: "#f59e0b" }, // amber
  { name: "Fatigue",   value: 20, color: "#ef4444" }, // red
];

// ───────────────────────────────────────────────────────────────────────────
// Tooltip — minimal, no gradient styling
// ───────────────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      {label && <div className="mb-1 font-medium opacity-70">{label}</div>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5 font-medium">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ backgroundColor: entry.color || entry.payload?.color || "currentColor" }}
          />
          {entry.name}: {entry.name === "roas" ? `${entry.value}x` : entry.value}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Top KPI cards — bigger icons, distinct accent per card, no hover gimmicks
// ───────────────────────────────────────────────────────────────────────────
type KpiAccent = "blue" | "amber" | "emerald" | "purple";

const ACCENT_CLASSES: Record<KpiAccent, { icon: string; iconBg: string; trend: string }> = {
  blue:    { icon: "text-blue-500",    iconBg: "bg-blue-500/10",    trend: "text-blue-500" },
  amber:   { icon: "text-amber-500",   iconBg: "bg-amber-500/10",   trend: "text-amber-500" },
  emerald: { icon: "text-emerald-500", iconBg: "bg-emerald-500/10", trend: "text-emerald-500" },
  purple:  { icon: "text-purple-500",  iconBg: "bg-purple-500/10",  trend: "text-purple-500" },
};

const KPIS: Array<{
  title: string;
  value: string;
  change: string;
  icon: typeof Activity;
  accent: KpiAccent;
}> = [
  { title: "Active Assets",        value: "24,892", change: "+12.5%", icon: Activity,    accent: "blue" },
  { title: "Cross-Platform Spend", value: "$1.2M",  change: "+8.2%",  icon: Wallet,      accent: "amber" },
  { title: "Revenue",              value: "$1.6M",  change: "+24.1%", icon: DollarSign,  accent: "emerald" },
  { title: "ROAS",                 value: "8.6x",   change: "Stable", icon: TrendingUp,  accent: "purple" },
];

// ───────────────────────────────────────────────────────────────────────────
// Connected platforms — real brand logos (feedback: "use original logos")
// ───────────────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { name: "Meta Ads",   Logo: MetaLogo,    status: "Connected" as const },
  { name: "Google Ads", Logo: GoogleLogo,  status: "Connected" as const },
  { name: "AdRoll",     Logo: AdRollLogo,  status: "Connected" as const },
  { name: "TikTok Ads", Logo: TikTokLogo,  status: "Available" as const },
];

// ───────────────────────────────────────────────────────────────────────────
export default function HomeOverviewView() {
  return (
    <div className="w-full">
      {/* Page header — plain typography, no gradient text, tight density */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Multi-channel creative performance across Meta, Google, and AdRoll.
        </p>
      </div>

      {/* KPI cards: 4 distinct accent colors, bigger icons */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const a = ACCENT_CLASSES[kpi.accent];
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="rounded-md border-border bg-card transition-colors hover:bg-accent">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.title}
                  </p>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md ${a.iconBg}`}>
                    <Icon className={`h-4 w-4 ${a.icon}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    {kpi.value}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${a.trend}`}>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    {kpi.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* ROAS Trend — primary chart */}
        <Card className="rounded-md border-border bg-card lg:col-span-2">
          <CardHeader className="space-y-1 px-4 pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">ROAS Trend</CardTitle>
            <CardDescription className="text-xs">Weekly performance, last 7 weeks.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                  domain={[0, 10]}
                  tickFormatter={(v: number) => `${v}x`}
                  width={32}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.1 }} />
                <Line
                  type="monotone"
                  dataKey="roas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 0 }}
                  activeDot={{ r: 4, fill: "#3b82f6", stroke: "transparent" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Format Breakdown — distinct bar colors */}
        <Card className="rounded-md border-border bg-card">
          <CardHeader className="space-y-1 px-4 pb-2 pt-4">
            <CardTitle className="text-sm font-semibold">Format Breakdown</CardTitle>
            <CardDescription className="text-xs">Volume by creative format.</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formatData}
                layout="vertical"
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
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
                <Bar dataKey="volume" radius={[0, 3, 3, 0]} barSize={14}>
                  {formatData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lower row: Connected platforms + Creative status */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Connected platforms — real logos */}
        <Card className="rounded-md border-border bg-card">
          <CardHeader className="space-y-1 px-4 pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Connected Platforms
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 px-4 pb-4">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 rounded-md border border-border bg-background/40 p-3 transition-colors hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                  <p.Logo className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                  <div
                    className={`mt-0.5 text-xs ${
                      p.status === "Connected" ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Creative Status — pie with distinct colors */}
        <Card className="rounded-md border-border bg-card">
          <CardHeader className="space-y-1 px-4 pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Creative Status
            </CardTitle>
            <CardDescription className="text-xs">Distribution across current campaigns.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4 px-4 pb-4">
            <div className="h-[120px] w-[120px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
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
            <ul className="flex flex-1 flex-col gap-2">
              {statusData.map((entry) => (
                <li key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-foreground">{entry.name}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground tabular-nums">
                    {entry.value}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
