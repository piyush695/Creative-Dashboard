'use client'

import { Card, CardContent } from "@/components/ui/card"
import { AdData } from "@/lib/types"
import {
  TrendingUp,
  MousePointer2,
  DollarSign,
  Target,
  ShoppingBag,
  CreditCard,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface MetricItem {
  label: string
  value: string | number
  unit: string
  icon: any
  color: string
  desc: string
}

interface MetricsGridProps {
  adData: AdData | null
  selectedMetricLabel?: string | null
  onSelectMetric: (label: string) => void
  isClickable?: boolean
}

export function getMetricsList(adData: AdData): MetricItem[] {
  const formatValue = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? "0.00" : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return [
    { label: "ROAS", value: formatValue(adData.roas), unit: "x", icon: Activity, color: "from-[#F5E6D3] to-[#E5D3BD] dark:from-[#3d3326] dark:to-[#2d2419]", desc: "Return on Ad Spend: Measuring the effectiveness of your advertising campaigns." },
    { label: "Spend", value: `$${formatValue(adData.spend)}`, unit: "", icon: DollarSign, color: "from-[#FCE4EC] to-[#F8BBD0] dark:from-[#3d1a24] dark:to-[#2e1a3d]", desc: "Total amount spent on this ad." },
    { label: "Impressions", value: adData.impressions?.toLocaleString() || "0", unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Total number of times the ad was seen." },
    { label: "Clicks", value: adData.clicks?.toLocaleString() || "0", unit: "", icon: MousePointer2, color: "from-[#E3F2FD] to-[#BBDEFB] dark:from-[#1a2e3d] dark:to-[#12222e]", desc: "Total number of clicks on the ad." },
    { label: "CTR", value: formatValue(adData.ctr), unit: "%", icon: MousePointer2, color: "from-[#E3F2FD] to-[#BBDEFB] dark:from-[#1a2e3d] dark:to-[#12222e]", desc: "Click-Through Rate: The percentage of people who clicked your ad after seeing it." },
    { label: "CPC", value: `$${formatValue(adData.cpc)}`, unit: "", icon: DollarSign, color: "from-[#FCE4EC] to-[#F8BBD0] dark:from-[#3d1a24] dark:to-[#2e1a3d]", desc: "Cost Per Click: The amount you pay for each click on your advertisement." },
    { label: "CPM", value: `$${formatValue(adData.cpm)}`, unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Cost Per Mille: The cost per 1,000 impressions of your ad." },
    { label: "Reach", value: adData.reach?.toLocaleString() || "0", unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Number of unique people who saw the ad." },
    { label: "Frequency", value: formatValue(adData.frequency), unit: "x", icon: Activity, color: "from-[#F5E6D3] to-[#E5D3BD] dark:from-[#3d3326] dark:to-[#2d2419]", desc: "Average number of times each person saw the ad." },
  ]
}

export default function MetricsGrid({ adData, selectedMetricLabel, onSelectMetric, isClickable = true }: MetricsGridProps) {
  if (!adData) return null

  const metrics = getMetricsList(adData)

  return (
    <div className="space-y-6 w-full relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Performance Metrics</h3>

        {/* Desktop Hint Message - Professionally positioned above the grid */}
        {!isClickable && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-500 animate-in fade-in slide-in-from-right-4 duration-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Search an Ad ID first to see results or metrics</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 md:gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const isSelected = selectedMetricLabel === metric.label
          return (
            <Card
              key={metric.label}
              className={cn(
                "group transition-all duration-300 relative overflow-hidden border-none shadow-sm bg-white dark:bg-zinc-900/60",
                isClickable ? "cursor-pointer hover:shadow-xl hover:-translate-y-1" : "cursor-default",
                isSelected && "ring-2 ring-zinc-800 dark:ring-primary shadow-xl -translate-y-1"
              )}
              onClick={() => isClickable && onSelectMetric(metric.label)}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 dark:opacity-20 transition-opacity group-hover:opacity-50 dark:group-hover:opacity-40", metric.color)} />

              <CardContent className="p-3 relative z-10">
                <div className="flex flex-col items-center md:items-start gap-1">
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{metric.label}</span>
                    <Icon className="h-2.5 w-2.5 text-zinc-400 dark:text-zinc-500 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base md:text-xl font-black text-zinc-900 dark:text-zinc-100">{metric.value}</span>
                    <span className="text-[8px] font-bold text-zinc-500 dark:text-zinc-400">{metric.unit}</span>
                  </div>
                </div>

              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
