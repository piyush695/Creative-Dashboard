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
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Creative Quality Scores</h3>
          <p className="text-zinc-500 text-sm mt-1">Detailed analysis of creative performance dimensions.</p>
        </div>
        {!selectedScoreName && (
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-zinc-400 bg-white dark:bg-zinc-900 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 translate-y-0 hover:-translate-y-0.5">
            <Info className="h-4 w-4 text-primary" />
            Select a card for deep-dive analysis
          </div>
        )}
      </div>

      {/* Overall Score Section */}
      <Card className="relative overflow-hidden border-none shadow-2xl bg-[#0F0F0F] text-white p-1">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[150%] bg-[#007AFF] opacity-[0.08] blur-[100px] pointer-events-none transition-all duration-1000 group-hover:opacity-[0.12]" />

        <CardContent className="p-8 md:p-10 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex flex-wrap justify-center gap-6">
              {/* Creative Score */}
              <div className="text-center group/score">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center relative shadow-2xl transition-all duration-500 group-hover/score:border-[#007AFF]/50 group-hover/score:scale-105">
                  <span className="text-3xl md:text-4xl font-black text-white">{overallScore}</span>
                  <span className="text-[9px] font-black text-[#007AFF] uppercase tracking-tighter">Creative</span>
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Quality Score</p>
              </div>

              {/* Performance Score */}
              {adData.performanceScore && (
                <div className="text-center group/score">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col items-center justify-center relative shadow-2xl transition-all duration-500 group-hover/score:border-emerald-500/50 group-hover/score:scale-105">
                    <span className="text-3xl md:text-4xl font-black text-emerald-400">{adData.performanceScore}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Performance</span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Predicted Yield</p>
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20 mb-2">
                  <Sparkles className="h-3 w-3 text-[#007AFF]" />
                  <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-[0.2em]">{adData.performanceLabel || "HIGH POTENTIAL"}</span>
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
                "group cursor-pointer transition-all duration-500 relative overflow-hidden border-none shadow-sm hover:shadow-xl hover:-translate-y-2 bg-white dark:bg-zinc-900/60 backdrop-blur-sm",
                isSelected && "ring-2 ring-[#8B4513] dark:ring-primary shadow-xl dark:shadow-2xl -translate-y-2 dark:-translate-y-2.5"
              )}
              onClick={() => onSelectScore(score.name)}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 dark:opacity-20 transition-all duration-500 group-hover:opacity-80 dark:group-hover:opacity-40", score.color)} />
              <CardContent className="p-5 md:p-6 relative z-10 flex flex-col h-full min-h-[140px]">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-[#8B4513]/70 dark:text-primary mb-1">{score.name}</h4>

                <div className="flex items-baseline gap-1 mb-4 md:mb-6">
                  <span className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50">{score.score}</span>
                  <span className="text-[10px] font-bold text-zinc-900/40 dark:text-zinc-400">/10</span>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="w-full bg-zinc-900/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#8B4513] dark:bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${score.score * 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#8B4513]/60 dark:text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Details</span>
                    <ChevronRight className="h-4 w-4 text-[#8B4513] dark:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
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
