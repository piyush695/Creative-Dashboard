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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tightest uppercase italic opacity-80">Creative Intelligence Summary</h3>
          <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Dimensional Performance Metric Hub</p>
        </div>
        {!selectedScoreName && (
          <div className="hidden md:flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl border border-border shadow-sm transition-all hover:bg-secondary hover:-translate-y-1">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Select a Dimension for deep analysis
          </div>
        )}
      </div>

      {/* Overall Score Section - Studio Neutral Hub */}
      <Card className="relative overflow-hidden border border-border shadow-xl bg-white dark:bg-[#0A0A0A] p-1 rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-primary opacity-[0.03] dark:opacity-[0.08] blur-[80px] pointer-events-none transition-all duration-1000" />

        <CardContent className="p-8 md:p-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex flex-wrap justify-center gap-8">
              {/* Creative Score */}
              <div className="text-center group/score">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-border dark:border-white/10 flex flex-col items-center justify-center relative shadow-sm transition-all duration-300 group-hover/score:border-primary/50 group-hover/score:scale-105">
                  <span className="text-5xl md:text-6xl font-black text-foreground dark:text-white tracking-tightest leading-none mb-1">{overallScore}</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Score</span>
                </div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Intelligence Hub</p>
              </div>

              {/* Performance Score */}
              {adData.performanceScore && (
                <div className="text-center group/score">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 flex flex-col items-center justify-center relative shadow-sm transition-all duration-300 group-hover/score:border-emerald-500/50 group-hover/score:scale-105">
                    <span className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400">{adData.performanceScore}</span>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">Performance</span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Predicted Yield</p>
                </div>
              )}

              {/* Composite Rating */}
              {adData.compositeRating && (
                <div className="text-center group/score">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-amber-950/20 border border-amber-900/30 flex flex-col items-center justify-center relative shadow-2xl transition-all duration-500 group-hover/score:border-amber-500/50 group-hover/score:scale-105">
                    <span className="text-3xl md:text-4xl font-black text-amber-400">{adData.compositeRating}</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">Composite</span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Final Rating</p>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-6 text-center lg:text-left pt-6 lg:pt-0">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{adData.performanceLabel || "HIGH POTENTIAL"}</span>
                </div>
                <h4 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase italic">Intelligence Verdict</h4>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                  {adData.keyInsight || adData.topInsight || "Our AI engine has analyzed this creative across 50+ dimensions. The current metrics indicate a strong resonance with target audience psychological triggers."}
                </p>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Analysis Mode</span>
                  <span className="text-[10px] font-black text-zinc-200">{adData.analysisMode || "VISUAL & METRICS"}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Psychology Strength</span>
                  <span className="text-[10px] font-black text-zinc-200">{adData.psychologyStrength || "STRONG"}</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-start gap-0.5">
                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Design Quality</span>
                  <span className="text-[10px] font-black text-zinc-200">{adData.designQuality || "PROFESSIONAL"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Scores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
        {scores.map((score) => {
          const isSelected = selectedScoreName === score.name
          return (
            <Card
              key={score.name}
              className={cn(
                "group cursor-pointer transition-all duration-700 relative overflow-hidden border border-border/40 premium-shadow premium-shadow-hover glass shine-effect rounded-[2rem]",
                isSelected && "ring-2 ring-primary/50 shadow-3xl -translate-y-3 bg-primary/[0.02]"
              )}
              onClick={() => onSelectScore(score.name)}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 dark:opacity-10 transition-all duration-700 group-hover:opacity-100", score.color)} />
              <CardContent className="p-6 md:p-8 relative z-10 flex flex-col h-full min-h-[160px]">
                <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-primary mb-2 transition-all group-hover:translate-x-1">{score.name}</h4>

                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-3xl md:text-4xl font-black text-foreground tracking-tightest transition-all group-hover:scale-110 origin-left">{score.score}</span>
                  <span className="text-[11px] font-black text-primary/40 uppercase">Rating</span>
                </div>

                <div className="mt-auto space-y-5">
                  <div className="w-full bg-secondary/80 dark:bg-white/10 rounded-full h-2 overflow-hidden shadow-inner p-[1px]">
                    <div
                      className="bg-gradient-to-r from-primary to-indigo-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                      style={{ width: `${score.score * 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details</span>
                    <ChevronRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
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
