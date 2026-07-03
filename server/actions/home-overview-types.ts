// Shared serialisable types for the home-overview payload. Kept OUT of the
// "use server" module so client components can import them (a "use server"
// file may only export async functions).

export type OverviewTR = "7D" | "30D" | "90D";
export type OverviewDir = "up" | "down" | "flat";

export interface RangePayload {
  kpiRows: Array<{ n: number; change: string; dir: OverviewDir }>; // [activeAssets, spend, revenue, roas]
  perf: Array<{ name: string; revenue: number; spend: number }>;
  status: Array<{ name: string; value: number }>;
  funnel: Array<{ name: string; value: number; pct: number }>;
  top: Array<{ name: string; format: string; roas: number; spend: string; trend: OverviewDir }>;
  format: Array<{ name: string; volume: number }>;
}
export type HomePayload = Record<OverviewTR, RangePayload>;
