'use client'

import { Card, CardContent } from "@/components/ui/card"
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
  Award,
  Info,
  ChevronRight,
  Sparkles
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
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
    {
      name: "Visual Design",
      score: adData.scoreVisualDesign || 0,
      color: "from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/40",
      icon: Palette,
      key: "visualDesignJustification",
      description: "Analysis of the overall visual aesthetic and brand alignment."
    },
    {
      name: "Typography",
      score: adData.scoreTypography || 0,
      color: "from-cyan-100 to-blue-200 dark:from-cyan-900/40 dark:to-blue-900/40",
      icon: Type,
      key: "typographyJustification",
      description: "Legibility, font hierarchy, and typeface styling."
    },
    {
      name: "Color Usage",
      score: adData.scoreColorUsage || 0,
      color: "from-pink-100 to-rose-200 dark:from-pink-900/40 dark:to-rose-900/40",
      icon: Droplets,
      key: "colorUsageJustification",
      description: "Palette harmony and psychological impact of colors."
    },
    {
      name: "Composition",
      score: adData.scoreComposition || 0,
      color: "from-emerald-100 to-teal-200 dark:from-emerald-900/40 dark:to-teal-900/40",
      icon: LayoutTemplate,
      key: "compositionJustification",
      description: "Spatial arrangement and directing eye movement."
    },
    {
      name: "CTA Effectiveness",
      score: adData.scoreCTA || 0,
      color: "from-violet-100 to-purple-200 dark:from-violet-900/40 dark:to-purple-900/40",
      icon: MousePointer2,
      key: "ctaJustification",
      description: "Clarity, placement, and impact of the call-to-action."
    },
    {
      name: "Emotional Appeal",
      score: adData.scoreEmotionalAppeal || 0,
      color: "from-orange-100 to-amber-200 dark:from-orange-900/40 dark:to-amber-900/40",
      icon: Heart,
      key: "emotionalAppealJustification",
      description: "Resonance with target brand values and sentiment."
    },
    {
      name: "Trust Signals",
      score: adData.scoreTrustSignals || 0,
      color: "from-sky-100 to-blue-200 dark:from-sky-900/40 dark:to-blue-900/40",
      icon: ShieldCheck,
      key: "trustSignalsJustification",
      description: "Credibility, social proof, and security indicators."
    },
    {
      name: "Urgency",
      score: adData.scoreUrgency || 0,
      color: "from-yellow-100 to-orange-200 dark:from-yellow-900/40 dark:to-orange-900/40",
      icon: Zap,
      key: "urgencyJustification",
      description: "Time-sensitivity and motivation for immediate engagement."
    },
  ]
}

export default function ScoresSection({ adData, selectedScoreName, onSelectScore }: ScoresSectionProps) {
  if (!adData) return null

  const scores = getScoresList(adData)
  const overallScore = adData.scoreOverall || 0

  return (
    <div className="space-y-8 animate-in fade-in duration-700 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg md:text-xl font-black text-foreground tracking-tightest italic opacity-80">Creative intelligence summary</h3>
          <p className="text-muted-foreground/60 text-[10px] font-black mt-0.5">Dimensional performance metric hub</p>
        </div>
        {!selectedScoreName && (
          <div className="hidden md:flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-border shadow-sm transition-all hover:bg-secondary hover:-translate-y-1">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            Select a Dimension for deep analysis
          </div>
        )}
      </div>

      {/* Overall Score Section - Studio Neutral Hub */}
      <Card className="relative overflow-hidden border border-border shadow-md bg-white dark:bg-[#0A0A0A] p-0.5 rounded-2xl md:rounded-3xl">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-primary opacity-[0.03] dark:opacity-[0.08] blur-[60px] pointer-events-none transition-all duration-1000" />

        <CardContent className="p-4 md:p-5 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
            <div className="flex flex-wrap justify-center gap-3 md:gap-5">
              {/* Creative Score */}
              <div className="text-center group/score">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white dark:bg-zinc-900 border border-border dark:border-white/10 flex flex-col items-center justify-center relative shadow-sm transition-all duration-300 group-hover/score:border-primary/50 group-hover/score:scale-105">
                  <span className="text-2xl md:text-3xl font-black text-foreground dark:text-white tracking-tightest leading-none mb-0.5">{overallScore}</span>
                  <span className="text-[10px] font-black text-primary">Score</span>
                </div>
                <p className="mt-2 text-[9px] font-black text-muted-foreground/60">Intelligence hub</p>
              </div>

              {/* Performance Score */}
              {adData.performanceScore && (
                <div className="text-center group/score">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex flex-col items-center justify-center relative shadow-sm transition-all duration-300 group-hover/score:border-emerald-500/50 group-hover/score:scale-105">
                    <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{adData.performanceScore}</span>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 tracking-tighter">Performance</span>
                  </div>
                  <p className="mt-2 text-[9px] font-black text-muted-foreground/60">Predicted yield</p>
                </div>
              )}

              {/* Composite Rating */}
              {adData.compositeRating && (
                <div className="text-center group/score">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-amber-950/20 border border-amber-900/30 flex flex-col items-center justify-center relative shadow-md transition-all duration-500 group-hover/score:border-amber-500/50 group-hover/score:scale-105">
                    <span className="text-xl md:text-2xl font-black text-amber-400">{adData.compositeRating}</span>
                    <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter">Composite</span>
                  </div>
                  <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-zinc-500">Final Rating</p>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4 text-center lg:text-left pt-6 lg:pt-0">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-xs font-black text-primary">{adData.performanceLabel || "High potential"}</span>
                </div>
                <h4 className="text-base md:text-xl font-black tracking-tight text-zinc-900 dark:text-white italic">Intelligence verdict</h4>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl font-medium">
                  {adData.keyInsight || adData.topInsight || "Our AI engine has analyzed this creative across 50+ dimensions. The current metrics indicate a strong resonance with target audience psychological triggers."}
                </p>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Analysis Mode</span>
                  <span className="text-[9px] font-black text-zinc-200">{adData.analysisMode || "VISUAL & METRICS"}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Psychology Strength</span>
                  <span className="text-[9px] font-black text-zinc-200">{adData.psychologyStrength || "STRONG"}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Design Quality</span>
                  <span className="text-[9px] font-black text-zinc-200">{adData.designQuality || "PROFESSIONAL"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Scores Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {scores.map((score) => {
          const isSelected = selectedScoreName === score.name
          return (
            <Card
              key={score.name}
              className={cn(
                "group cursor-pointer transition-all duration-700 relative overflow-hidden border border-border/40 premium-shadow premium-shadow-hover glass shine-effect rounded-xl md:rounded-2xl",
                isSelected && "ring-2 ring-primary/50 shadow-md -translate-y-1 bg-primary/[0.02]"
              )}
              onClick={() => onSelectScore(score.name)}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 dark:opacity-10 transition-all duration-700 group-hover:opacity-100", score.color)} />
              <CardContent className="p-3 md:p-4 relative z-10 flex flex-col h-full min-h-[100px] md:min-h-[120px]">
                <h4 className="font-black text-[10px] text-primary mb-1 transition-all group-hover:translate-x-1">{score.name}</h4>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-lg md:text-xl font-black text-foreground tracking-tightest transition-all group-hover:scale-110 origin-left">{score.score}</span>
                  <span className="text-[9px] font-black text-primary/40">Rating</span>
                </div>

                <div className="mt-auto space-y-3 md:space-y-4">
                  <div className="w-full bg-secondary/80 dark:bg-white/10 rounded-full h-1.5 overflow-hidden shadow-inner p-[1px]">
                    <div
                      className="bg-gradient-to-r from-primary to-indigo-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                      style={{ width: `${score.score * 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center h-4">
                    <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details</span>
                    <ChevronRight className="h-3 w-3 md:h-4 md:w-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
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
