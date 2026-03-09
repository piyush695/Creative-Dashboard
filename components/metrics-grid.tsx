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
  const isGoogle = adData.platform === 'google'
  const formatValue = (val: any) => {
    const num = Number(val)
    return isNaN(num) ? "0.00" : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return [
    { label: "ROAS", value: formatValue(adData.roas), unit: "x", icon: Activity, color: "from-[#FFF7ED] to-[#FED7AA] dark:from-[#3d3326] dark:to-[#2d2419]", desc: "Return on Ad Spend" },
    { label: isGoogle ? "Cost" : "Spend", value: `$${formatValue(adData.spend)}`, unit: "", icon: DollarSign, color: "from-[#FCE4EC] to-[#F8BBD0] dark:from-[#3d1a24] dark:to-[#2e1a3d]", desc: isGoogle ? "Total cost" : "Total amount spent" },
    { label: "Impressions", value: adData.impressions?.toLocaleString() || "0", unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Total impressions" },
    { label: isGoogle ? "Interactions" : "Clicks", value: adData.clicks?.toLocaleString() || "0", unit: "", icon: MousePointer2, color: "from-[#E3F2FD] to-[#BBDEFB] dark:from-[#1a2e3d] dark:to-[#12222e]", desc: isGoogle ? "Total interactions" : "Total clicks" },
    { label: isGoogle ? "Interaction rate" : "CTR", value: formatValue(adData.ctr), unit: "%", icon: MousePointer2, color: "from-[#E3F2FD] to-[#BBDEFB] dark:from-[#1a2e3d] dark:to-[#12222e]", desc: isGoogle ? "Rate of interactions" : "Click-Through Rate" },
    { label: "CPC", value: `$${formatValue(adData.cpc)}`, unit: "", icon: DollarSign, color: "from-[#FCE4EC] to-[#F8BBD0] dark:from-[#3d1a24] dark:to-[#2e1a3d]", desc: "Cost Per Click" },
    { label: "CPM", value: `$${formatValue(adData.cpm)}`, unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Cost Per Mille" },
    { label: "Reach", value: adData.reach?.toLocaleString() || "0", unit: "", icon: Target, color: "from-[#E8F5E9] to-[#C8E6C9] dark:from-[#1a3d1e] dark:to-[#122e16]", desc: "Unique reach" },
    { label: "Frequency", value: formatValue(adData.frequency), unit: "x", icon: Activity, color: "from-[#FFF7ED] to-[#FED7AA] dark:from-[#3d3326] dark:to-[#2d2419]", desc: "Average frequency" },
  ]
}

export default function MetricsGrid({ adData, selectedMetricLabel, onSelectMetric, isClickable = true }: MetricsGridProps) {
  if (!adData) return null

  const metrics = getMetricsList(adData)

  return (
    <div className="space-y-6 w-full relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h3 className="text-xl font-black text-foreground tracking-tightest opacity-80">Performance metrics</h3>

        {/* Desktop Hint Message - Professionally positioned above the grid */}
        {!isClickable && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-500 animate-in fade-in slide-in-from-right-4 duration-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold tracking-wider">Search an ad ID first to see results or metrics</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 2xl:grid-cols-3 gap-3 md:gap-4 pb-2 w-full">
        {metrics.map((metric) => {
          const Icon = metric.icon
          const isSelected = selectedMetricLabel === metric.label
          return (
            <Card
              key={metric.label}
              className={cn(
                "group transition-all duration-300 relative overflow-hidden border border-zinc-200/60 dark:border-white/5 bg-white dark:bg-[#09090b] shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl min-w-0",
                isClickable ? "cursor-pointer active:scale-[0.98]" : "cursor-default",
                isSelected && "ring-2 ring-primary shadow-lg -translate-y-1 bg-primary/[0.01]"
              )}
              onClick={() => isClickable && onSelectMetric(metric.label)}
            >
              {/* Subtle Thematic Glow */}
              <div className={cn("absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500")} />

              <CardContent className="p-3 md:p-4 relative z-10">
                <div className="flex flex-col items-start gap-1 md:gap-2">
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[9px] md:text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">{metric.label}</span>
                    <div className="p-1 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                      <Icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary transition-all duration-500 group-hover:scale-110" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tightest leading-none truncate max-w-full">{metric.value}</span>
                    <span className="text-[10px] sm:text-xs font-extrabold text-primary/60">{metric.unit}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-100 dark:border-white/5 w-full mt-1">
                    <div className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shrink-0" />
                    <p className="text-[7px] md:text-[8px] font-bold text-zinc-400/50 tracking-widest truncate">{metric.desc}</p>
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
