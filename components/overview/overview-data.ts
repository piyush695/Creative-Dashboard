// ───────────────────────────────────────────────────────────────────────────
// Overview mock data
//
// Drives the cross-platform Dashboard overview plus the rough Meta / Google
// overview mockups. Everything here is placeholder data keyed by time range so
// the whole board (KPIs, charts, funnel, top creatives, format mix, creative
// status) visibly responds to the 7D / 30D / 90D selector. Real data wires in
// with a later task.
// ───────────────────────────────────────────────────────────────────────────
import {
  Activity,
  Wallet,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import type { ComponentType } from "react";

export type TimeRange = "7D" | "30D" | "90D";
export type Direction = "up" | "down" | "flat";

export const TIME_RANGES: TimeRange[] = ["7D", "30D", "90D"];

export const RANGE_LABEL: Record<TimeRange, string> = {
  "7D": "last 7 days",
  "30D": "last 30 days",
  "90D": "last 90 days",
};

// Shared palette so every variant renders with consistent brand colors.
export const POS = "#10b981"; // emerald — positive delta
export const NEG = "#ef4444"; // red — negative delta
// Distinct color per creative format (looked up by name in the board).
export const FORMAT_COLOR: Record<string, string> = {
  Video: "#3b82f6",
  UGC: "#10b981",
  Static: "#f59e0b",
  Carousel: "#a855f7",
};
// Creative-status color by name.
export const STATUS_COLOR: Record<string, string> = {
  "High ROAS": POS,
  Testing: "#f59e0b",
  Fatigue: NEG,
};

type IconType = ComponentType<{ className?: string }>;

export interface KpiDatum {
  title: string;
  value: string;
  change: string;
  direction: Direction;
  icon: IconType;
  spark: number[];
}
export interface PerfPoint {
  name: string;
  revenue: number;
  spend: number;
}
export interface StatusDatum {
  name: string;
  value: number;
}
export interface FunnelStage {
  name: string;
  value: number;
  pct: number;
}
export interface TopCreative {
  name: string;
  format: string;
  roas: number;
  spend: string;
  trend: Direction;
}
export interface FormatDatum {
  name: string;
  volume: number;
}

export interface OverviewData {
  title: string;
  subtitle: string;
  kpisByRange: Record<TimeRange, KpiDatum[]>;
  perfByRange: Record<TimeRange, PerfPoint[]>;
  statusByRange: Record<TimeRange, StatusDatum[]>;
  funnelByRange: Record<TimeRange, FunnelStage[]>;
  topByRange: Record<TimeRange, TopCreative[]>;
  formatByRange: Record<TimeRange, FormatDatum[]>;
}

// ── Formatters ──────────────────────────────────────────────────────────────
function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

// ── KPI builder ──────────────────────────────────────────────────────────────
// Numeric specs in, formatted KPI rows out — lets us scale figures per platform
// without hand-typing every string.
const KPI_SPECS: Array<{
  title: string;
  icon: IconType;
  spark: number[];
  format: "int" | "usd" | "x";
}> = [
  { title: "Active Assets", icon: Activity, spark: [12, 18, 15, 22, 26, 24, 31], format: "int" },
  { title: "Spend", icon: Wallet, spark: [40, 38, 44, 42, 48, 52, 55], format: "usd" },
  { title: "Revenue", icon: DollarSign, spark: [18, 24, 21, 30, 34, 41, 52], format: "usd" },
  { title: "ROAS", icon: TrendingUp, spark: [9, 8.4, 8.8, 8.2, 8.6, 8.1, 7.9], format: "x" },
];

export function buildKpis(
  spendLabel: string,
  rows: Record<TimeRange, Array<{ n: number; change: string; dir: Direction }>>,
): Record<TimeRange, KpiDatum[]> {
  const out = {} as Record<TimeRange, KpiDatum[]>;
  for (const range of TIME_RANGES) {
    out[range] = KPI_SPECS.map((spec, i) => {
      const { n, change, dir } = rows[range][i];
      const value =
        spec.format === "int"
          ? n.toLocaleString("en-US")
          : spec.format === "usd"
          ? usd(n)
          : `${n.toFixed(1)}x`;
      return {
        title: i === 1 ? spendLabel : spec.title,
        value,
        change,
        direction: dir,
        icon: spec.icon,
        spark: spec.spark,
      };
    });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Cross-platform (Dashboard home)
// ───────────────────────────────────────────────────────────────────────────
export const ALL_OVERVIEW: OverviewData = {
  title: "Overview",
  subtitle: "Multi-channel creative performance across Meta, Google, and AdRoll.",
  kpisByRange: buildKpis("Cross-Platform Spend", {
    "7D": [
      { n: 24892, change: "+12.5%", dir: "up" },
      { n: 1_200_000, change: "+8.2%", dir: "up" },
      { n: 1_600_000, change: "+24.1%", dir: "up" },
      { n: 8.6, change: "-1.2%", dir: "down" },
    ],
    "30D": [
      { n: 26340, change: "+9.8%", dir: "up" },
      { n: 4_800_000, change: "+6.1%", dir: "up" },
      { n: 6_900_000, change: "+19.4%", dir: "up" },
      { n: 8.9, change: "+0.6%", dir: "up" },
    ],
    "90D": [
      { n: 31210, change: "+21.3%", dir: "up" },
      { n: 13_600_000, change: "+11.4%", dir: "up" },
      { n: 21_200_000, change: "+28.7%", dir: "up" },
      { n: 9.2, change: "+3.1%", dir: "up" },
    ],
  }),
  perfByRange: {
    "7D": [
      { name: "Mon", revenue: 182, spend: 64 },
      { name: "Tue", revenue: 214, spend: 71 },
      { name: "Wed", revenue: 198, spend: 68 },
      { name: "Thu", revenue: 263, spend: 79 },
      { name: "Fri", revenue: 301, spend: 84 },
      { name: "Sat", revenue: 358, spend: 91 },
      { name: "Sun", revenue: 412, spend: 96 },
    ],
    "30D": [
      { name: "W1", revenue: 1180, spend: 360 },
      { name: "W2", revenue: 1320, spend: 392 },
      { name: "W3", revenue: 1505, spend: 421 },
      { name: "W4", revenue: 1690, spend: 448 },
    ],
    "90D": [
      { name: "Month 1", revenue: 4820, spend: 1520 },
      { name: "Month 2", revenue: 5640, spend: 1710 },
      { name: "Month 3", revenue: 6810, spend: 1880 },
    ],
  },
  statusByRange: {
    "7D": [
      { name: "High ROAS", value: 45 },
      { name: "Testing", value: 35 },
      { name: "Fatigue", value: 20 },
    ],
    "30D": [
      { name: "High ROAS", value: 52 },
      { name: "Testing", value: 31 },
      { name: "Fatigue", value: 17 },
    ],
    "90D": [
      { name: "High ROAS", value: 48 },
      { name: "Testing", value: 28 },
      { name: "Fatigue", value: 24 },
    ],
  },
  funnelByRange: {
    "7D": [
      { name: "Impressions", value: 2_480_000, pct: 100 },
      { name: "Clicks", value: 312_400, pct: 12.6 },
      { name: "Add to Cart", value: 64_200, pct: 2.6 },
      { name: "Purchases", value: 18_940, pct: 0.76 },
    ],
    "30D": [
      { name: "Impressions", value: 10_640_000, pct: 100 },
      { name: "Clicks", value: 1_404_000, pct: 13.2 },
      { name: "Add to Cart", value: 287_000, pct: 2.7 },
      { name: "Purchases", value: 89_300, pct: 0.84 },
    ],
    "90D": [
      { name: "Impressions", value: 31_250_000, pct: 100 },
      { name: "Clicks", value: 4_280_000, pct: 13.7 },
      { name: "Add to Cart", value: 906_000, pct: 2.9 },
      { name: "Purchases", value: 297_000, pct: 0.95 },
    ],
  },
  topByRange: {
    "7D": [
      { name: "Summer Launch — Hook A", format: "Video", roas: 9.4, spend: "$48.2K", trend: "up" },
      { name: "UGC Testimonial v3", format: "UGC", roas: 8.1, spend: "$31.7K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.8, spend: "$22.9K", trend: "flat" },
      { name: "Static — Promo 40%", format: "Static", roas: 5.2, spend: "$18.4K", trend: "down" },
    ],
    "30D": [
      { name: "UGC Testimonial v3", format: "UGC", roas: 8.7, spend: "$142K", trend: "up" },
      { name: "Summer Launch — Hook A", format: "Video", roas: 8.5, spend: "$196K", trend: "flat" },
      { name: "Retargeting — Cart", format: "Static", roas: 7.1, spend: "$88.5K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.4, spend: "$94.2K", trend: "down" },
    ],
    "90D": [
      { name: "Evergreen — Hook B", format: "Video", roas: 9.1, spend: "$612K", trend: "up" },
      { name: "UGC Testimonial v3", format: "UGC", roas: 8.9, spend: "$438K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 7.0, spend: "$281K", trend: "up" },
      { name: "Static — Promo 40%", format: "Static", roas: 5.6, spend: "$203K", trend: "down" },
    ],
  },
  formatByRange: {
    "7D": [
      { name: "Video", volume: 85 },
      { name: "UGC", volume: 72 },
      { name: "Static", volume: 54 },
      { name: "Carousel", volume: 41 },
    ],
    "30D": [
      { name: "Video", volume: 340 },
      { name: "UGC", volume: 305 },
      { name: "Static", volume: 212 },
      { name: "Carousel", volume: 168 },
    ],
    "90D": [
      { name: "Video", volume: 1020 },
      { name: "UGC", volume: 884 },
      { name: "Static", volume: 631 },
      { name: "Carousel", volume: 472 },
    ],
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Per-platform mockups — rough copies derived from the cross-platform data so
// each page differs visibly. Hand-tuned placeholder numbers, refine later.
// ───────────────────────────────────────────────────────────────────────────
function scaleNum(n: number, f: number): number {
  // Keep round-ish placeholder figures.
  return Math.round((n * f) / 10) * 10;
}

function buildVariant(
  base: OverviewData,
  opts: {
    title: string;
    subtitle: string;
    spendLabel: string;
    factor: number; // scales assets / spend / revenue / funnel / format
    roasByRange: Record<TimeRange, number>;
    status: Record<TimeRange, StatusDatum[]>;
    top: Record<TimeRange, TopCreative[]>;
  },
): OverviewData {
  const kpiRows = {} as Record<
    TimeRange,
    Array<{ n: number; change: string; dir: Direction }>
  >;
  const perfByRange = {} as Record<TimeRange, PerfPoint[]>;
  const funnelByRange = {} as Record<TimeRange, FunnelStage[]>;
  const formatByRange = {} as Record<TimeRange, FormatDatum[]>;

  for (const range of TIME_RANGES) {
    const k = base.kpisByRange[range];
    // Re-derive numeric KPI base from the cross-platform figures by scaling.
    const assets = Number(k[0].value.replace(/[^0-9.]/g, ""));
    kpiRows[range] = [
      { n: scaleNum(assets, opts.factor), change: k[0].change, dir: k[0].direction },
      { n: scaleFromUsd(k[1].value, opts.factor), change: k[1].change, dir: k[1].direction },
      { n: scaleFromUsd(k[2].value, opts.factor), change: k[2].change, dir: k[2].direction },
      { n: opts.roasByRange[range], change: k[3].change, dir: k[3].direction },
    ];
    perfByRange[range] = base.perfByRange[range].map((p) => ({
      name: p.name,
      revenue: scaleNum(p.revenue, opts.factor),
      spend: scaleNum(p.spend, opts.factor),
    }));
    funnelByRange[range] = base.funnelByRange[range].map((s) => ({
      name: s.name,
      value: Math.round(s.value * opts.factor),
      pct: s.pct,
    }));
    formatByRange[range] = base.formatByRange[range].map((f) => ({
      name: f.name,
      volume: Math.max(1, Math.round(f.volume * opts.factor)),
    }));
  }

  return {
    title: opts.title,
    subtitle: opts.subtitle,
    kpisByRange: buildKpis(opts.spendLabel, kpiRows),
    perfByRange,
    statusByRange: opts.status,
    funnelByRange,
    topByRange: opts.top,
    formatByRange,
  };
}

function scaleFromUsd(value: string, f: number): number {
  const num = Number(value.replace(/[^0-9.]/g, ""));
  const mult = value.includes("M") ? 1_000_000 : value.includes("K") ? 1_000 : 1;
  return scaleNum(num * mult, f);
}

export const META_OVERVIEW: OverviewData = buildVariant(ALL_OVERVIEW, {
  title: "Meta Overview",
  subtitle: "Creative performance across Meta — Facebook & Instagram.",
  spendLabel: "Meta Spend",
  factor: 0.62,
  roasByRange: { "7D": 8.2, "30D": 8.5, "90D": 8.8 },
  status: {
    "7D": [
      { name: "High ROAS", value: 48 },
      { name: "Testing", value: 33 },
      { name: "Fatigue", value: 19 },
    ],
    "30D": [
      { name: "High ROAS", value: 54 },
      { name: "Testing", value: 30 },
      { name: "Fatigue", value: 16 },
    ],
    "90D": [
      { name: "High ROAS", value: 50 },
      { name: "Testing", value: 27 },
      { name: "Fatigue", value: 23 },
    ],
  },
  top: {
    "7D": [
      { name: "IG Reels — Hook A", format: "Video", roas: 9.6, spend: "$31.4K", trend: "up" },
      { name: "FB Feed — UGC v3", format: "UGC", roas: 8.3, spend: "$22.1K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.9, spend: "$15.2K", trend: "flat" },
      { name: "Stories — Promo 40%", format: "Static", roas: 5.1, spend: "$11.8K", trend: "down" },
    ],
    "30D": [
      { name: "FB Feed — UGC v3", format: "UGC", roas: 8.9, spend: "$96.3K", trend: "up" },
      { name: "IG Reels — Hook A", format: "Video", roas: 8.6, spend: "$128K", trend: "flat" },
      { name: "Retargeting — Cart", format: "Static", roas: 7.0, spend: "$54.1K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.2, spend: "$61.4K", trend: "down" },
    ],
    "90D": [
      { name: "IG Reels — Hook B", format: "Video", roas: 9.2, spend: "$402K", trend: "up" },
      { name: "FB Feed — UGC v3", format: "UGC", roas: 8.8, spend: "$286K", trend: "up" },
      { name: "Carousel — Bestsellers", format: "Carousel", roas: 6.8, spend: "$178K", trend: "up" },
      { name: "Stories — Promo 40%", format: "Static", roas: 5.4, spend: "$132K", trend: "down" },
    ],
  },
});

export const GOOGLE_OVERVIEW: OverviewData = buildVariant(ALL_OVERVIEW, {
  title: "Google Overview",
  subtitle: "Creative performance across Google Ads & YouTube.",
  spendLabel: "Google Spend",
  factor: 0.31,
  roasByRange: { "7D": 9.1, "30D": 9.4, "90D": 9.6 },
  status: {
    "7D": [
      { name: "High ROAS", value: 41 },
      { name: "Testing", value: 38 },
      { name: "Fatigue", value: 21 },
    ],
    "30D": [
      { name: "High ROAS", value: 47 },
      { name: "Testing", value: 34 },
      { name: "Fatigue", value: 19 },
    ],
    "90D": [
      { name: "High ROAS", value: 44 },
      { name: "Testing", value: 31 },
      { name: "Fatigue", value: 25 },
    ],
  },
  top: {
    "7D": [
      { name: "YouTube — Hook A", format: "Video", roas: 10.2, spend: "$18.6K", trend: "up" },
      { name: "PMax — Bestsellers", format: "Static", roas: 8.4, spend: "$12.9K", trend: "up" },
      { name: "Demand Gen — UGC", format: "UGC", roas: 7.2, spend: "$9.4K", trend: "flat" },
      { name: "Display — Promo 40%", format: "Static", roas: 5.5, spend: "$6.7K", trend: "down" },
    ],
    "30D": [
      { name: "YouTube — Hook A", format: "Video", roas: 9.7, spend: "$74.2K", trend: "up" },
      { name: "PMax — Bestsellers", format: "Static", roas: 8.8, spend: "$58.9K", trend: "up" },
      { name: "Demand Gen — UGC", format: "UGC", roas: 7.5, spend: "$33.1K", trend: "flat" },
      { name: "Display — Retargeting", format: "Static", roas: 6.1, spend: "$28.4K", trend: "down" },
    ],
    "90D": [
      { name: "YouTube — Hook B", format: "Video", roas: 9.9, spend: "$214K", trend: "up" },
      { name: "PMax — Bestsellers", format: "Static", roas: 9.0, spend: "$168K", trend: "up" },
      { name: "Demand Gen — UGC", format: "UGC", roas: 7.6, spend: "$96.2K", trend: "up" },
      { name: "Display — Promo 40%", format: "Static", roas: 5.8, spend: "$71.5K", trend: "down" },
    ],
  },
});
