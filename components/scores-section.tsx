'use client'

import { AdData } from "@/lib/types"
import {
  Palette,
  Type,
  Droplets,
  LayoutTemplate,
  MousePointer2,
  Heart,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface ScoreItem {
  name: string
  score: number
  color: string
  icon: any
  key: string
  description: string
}

interface ScoresSectionProps {
  adData: AdData | null
  selectedScoreName?: string | null
  onSelectScore: (name: string) => void
}

export function getScoresList(adData: AdData): ScoreItem[] {
  return [
    { name: "Visual Design", score: adData.scoreVisualDesign || 0, color: "", icon: Palette, key: "visualDesignJustification", description: "Analysis of the overall visual aesthetic and brand alignment." },
    { name: "Typography", score: adData.scoreTypography || 0, color: "", icon: Type, key: "typographyJustification", description: "Legibility, font hierarchy, and typeface styling." },
    { name: "Color Usage", score: adData.scoreColorUsage || 0, color: "", icon: Droplets, key: "colorUsageJustification", description: "Palette harmony and psychological impact of colors." },
    { name: "Composition", score: adData.scoreComposition || 0, color: "", icon: LayoutTemplate, key: "compositionJustification", description: "Spatial arrangement and directing eye movement." },
    { name: "CTA Effectiveness", score: adData.scoreCTA || 0, color: "", icon: MousePointer2, key: "ctaJustification", description: "Clarity, placement, and impact of the call-to-action." },
    { name: "Emotional Appeal", score: adData.scoreEmotionalAppeal || 0, color: "", icon: Heart, key: "emotionalAppealJustification", description: "Resonance with target brand values and sentiment." },
    { name: "Trust Signals", score: adData.scoreTrustSignals || 0, color: "", icon: ShieldCheck, key: "trustSignalsJustification", description: "Credibility, social proof, and security indicators." },
    { name: "Urgency", score: adData.scoreUrgency || 0, color: "", icon: Zap, key: "urgencyJustification", description: "Time-sensitivity and motivation for immediate engagement." },
  ]
}

// Score → semantic colour, per the dashboard scheme: green = good (high),
// blue = average (medium), red = poor (low). No amber.
//   • text     → coloured number/label
//   • bar      → progress-bar fill
//   • solid    → filled tile background (white text on top)
//   • softBg/softBorder → tinted tile background + border
function tier(score: number) {
  if (score >= 8) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", solid: "bg-emerald-500", softBg: "bg-emerald-500/10", softBorder: "border-emerald-500/20" }
  if (score >= 4) return { text: "text-sky-600 dark:text-sky-400", bar: "bg-sky-500", solid: "bg-sky-500", softBg: "bg-sky-500/10", softBorder: "border-sky-500/20" }
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", solid: "bg-rose-500", softBg: "bg-rose-500/10", softBorder: "border-rose-500/20" }
}

export default function ScoresSection({ adData, selectedScoreName, onSelectScore }: ScoresSectionProps) {
  if (!adData) return null

  const scores = getScoresList(adData)
  const overallScore = adData.scoreOverall || 0
  // Colour the hub tiles by their own value (green = high, blue = medium, red = low).
  const overallTier = tier(overallScore)
  const perfTier = tier(Number(adData.performanceScore) || 0)
  const compTier = tier(Number(adData.compositeRating) || 0)
  const verdict = adData.keyInsight || adData.topInsight ||
    "Our AI engine analysed this creative across the dimensions below. Select any to open its detailed breakdown."

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Section heading */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500"><Sparkles className="h-3.5 w-3.5" /></div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-foreground">Creative intelligence</h2>
            <p className="text-xs text-muted-foreground">Dimensional scoring across 8 creative levers.</p>
          </div>
        </div>
        {!selectedScoreName && (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-sky-500" /> Select a dimension for deep analysis
          </span>
        )}
      </div>

      {/* Overall intelligence hub */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col lg:flex-row items-start gap-5">
          <div className="flex flex-wrap gap-3">
            {/* Overall score */}
            <div className={cn("flex h-20 w-20 flex-col items-center justify-center rounded-xl text-white shadow-sm", overallTier.solid)}>
              <span className="text-3xl font-bold leading-none tabular-nums">{overallScore}</span>
              <span className="mt-0.5 text-[10px] font-semibold text-white/85">Score</span>
            </div>
            {adData.performanceScore && (
              <div className={cn("flex h-20 w-[72px] flex-col items-center justify-center rounded-xl border", perfTier.softBorder, perfTier.softBg)}>
                <span className={cn("text-2xl font-bold tabular-nums", perfTier.text)}>{adData.performanceScore}</span>
                <span className={cn("mt-0.5 text-[9px] font-semibold uppercase tracking-wide", perfTier.text)}>Performance</span>
              </div>
            )}
            {adData.compositeRating && (
              <div className={cn("flex h-20 w-[72px] flex-col items-center justify-center rounded-xl border", compTier.softBorder, compTier.softBg)}>
                <span className={cn("text-2xl font-bold tabular-nums", compTier.text)}>{adData.compositeRating}</span>
                <span className={cn("mt-0.5 text-[9px] font-semibold uppercase tracking-wide", compTier.text)}>Composite</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2.5">
            {adData.performanceLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                <Sparkles className="h-3 w-3" /> {adData.performanceLabel.replace(/_/g, " ")}
              </span>
            )}
            <h3 className="text-base font-semibold tracking-tight text-foreground">Intelligence verdict</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{typeof verdict === "object" ? JSON.stringify(verdict) : verdict}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { l: "Analysis mode", v: adData.analysisMode || "Visual & metrics" },
                { l: "Psychology strength", v: adData.psychologyStrength || "Strong" },
                { l: "Design quality", v: adData.designQuality || "Professional" },
              ].map((m) => (
                <div key={m.l} className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                  <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{m.l}</div>
                  <div className="text-[11px] font-semibold text-foreground">{String(m.v).replace(/_/g, " ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dimension grid */}
      <div>
        <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Dimension breakdown</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {scores.map((s) => {
            const isSelected = selectedScoreName === s.name
            const t = tier(s.score)
            const Icon = s.icon
            return (
              <button
                key={s.name}
                onClick={() => onSelectScore(s.name)}
                className={cn(
                  "group flex flex-col rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-sky-500/40 hover:bg-muted/40",
                  isSelected ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30" : "border-border",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-sky-500" />
                  <h4 className="truncate text-[12px] font-semibold text-foreground">{s.name}</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-2xl font-bold tabular-nums", t.text)}>{s.score}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">/10</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all duration-700", t.bar)} style={{ width: `${s.score * 10}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <ChevronRight className="h-3.5 w-3.5 -translate-x-1 text-sky-500 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
