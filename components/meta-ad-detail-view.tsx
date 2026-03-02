"use client"

import { useState } from "react"
import {
    Sparkles,
    X,
    BarChart3,
    Target,
    Brain,
    Zap,
    TrendingUp,
    Info,
    MessageSquare,
    Lightbulb,
    CheckCircle2,
    AlertCircle,
    Layers,
    DollarSign,
    MousePointerClick,
    ExternalLink,
    PieChart,
    Activity,
    Shield
} from "lucide-react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import MetricsGrid from "./metrics-grid"
import ScoreRadarChart from "./score-radar-chart"

interface MetaAdDetailViewProps {
    ad: AdData
    benchmark?: any
    onClose: () => void
    onEnlargeImage?: (url: string, title: string) => void
    onSelectMetric?: (label: string) => void
    onSelectScore?: (label: string) => void
    activeAnalysis?: { type: string, name: string } | null
}

// Sub-components defined first to avoid hoisting issues and ensure clean symbol table
function SummaryTab({ ad, formatCurrency, benchmark, onSelectMetric, activeAnalysis }: {
    ad: AdData,
    formatCurrency: (val: string | number) => string,
    benchmark?: any,
    onSelectMetric?: (label: string) => void,
    activeAnalysis?: { type: string, name: string } | null
}) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-3 md:p-5 bg-zinc-950 border-white/5 rounded-2xl shadow-xl relative overflow-hidden flex flex-col min-h-[180px] md:min-h-[250px]">
                    <div className="absolute top-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-blue-500/10 rounded-full blur-[60px] md:blur-[80px] -mr-16 md:-mr-24 -mt-16 md:-mt-24" />
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                            <div className="p-1 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-white" />
                            </div>
                            <h3 className="font-bold text-sm md:text-base text-white tracking-tight">Executive Summary</h3>
                        </div>
                        <p className="text-zinc-400 text-[10px] md:text-sm leading-relaxed font-medium italic mb-3 md:mb-4">
                            "{ad.topInsight || "No high-level insight available for this creative yet."}"
                        </p>
                        <div className="mt-auto grid grid-cols-2 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-white/10">
                            <div>
                                <p className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5 md:mb-1">Primary Verdict</p>
                                <div className="flex items-center gap-1">
                                    <div className={cn(
                                        "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse",
                                        ad.actionScale ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-tight">
                                        {ad.actionScale ? "Ready to Scale" : ad.actionPause ? "Immediate Pause" : "Optimize Assets"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5 md:mb-1">Alpha Score</p>
                                <span className="text-sm md:text-base font-bold text-blue-500 tracking-tight">{ad.scoreOverall || 0}/100</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-3 md:p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 rounded-2xl shadow-sm flex flex-col gap-3 md:gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                            <Lightbulb className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </div>
                        <h4 className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">Main Strategy</h4>
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-relaxed italic">
                        {ad.primaryRecommendation || "Continue monitoring performance for more granular data points."}
                    </p>
                    <div className="mt-auto pt-3 md:pt-4 border-t border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-500" />
                            <p className="text-[8px] md:text-[9px] font-medium text-zinc-400 leading-tight">
                                {ad.actionRationale || "Consistent performance across delivery networks."}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function PerformanceTab({ ad, onSelectMetric, activeAnalysis }: { ad: AdData, onSelectMetric?: (l: string) => void, activeAnalysis: any }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-zinc-50/30 dark:bg-white/[0.01] p-4 rounded-2xl border border-zinc-100 dark:border-white/5">
                <MetricsGrid
                    adData={ad}
                    onSelectMetric={onSelectMetric || (() => { })}
                    selectedMetricLabel={activeAnalysis?.type === 'metric' ? activeAnalysis.name : null}
                />
            </div>
        </div>
    )
}

function AnalysisTab({ ad, benchmark }: { ad: AdData, benchmark?: any }) {
    const metrics = [
        { label: 'Visual Design', score: ad.scoreVisualDesign, justification: ad.visualDesignJustification, icon: Activity, color: "text-blue-500" },
        { label: 'Typography', score: ad.scoreTypography, justification: ad.typographyJustification, icon: Layers, color: "text-indigo-500" },
        { label: 'Color Usage', score: ad.scoreColorUsage, justification: ad.colorUsageJustification, icon: PieChart, color: "text-purple-500" },
        { label: 'Composition', score: ad.scoreComposition, justification: ad.compositionJustification, icon: Target, color: "text-rose-500" },
        { label: 'Emotional Appeal', score: ad.scoreEmotionalAppeal, justification: ad.emotionalAppealJustification, icon: Heart, color: "text-emerald-500" },
    ]

    function Heart(props: any) {
        return (
            <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pr-2 overflow-x-hidden">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 rounded-2xl shadow-lg flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <BarChart3 className="h-4 w-4 text-orange-500" />
                        </div>
                        <h3 className="text-base font-bold tracking-tight">Visual Attributes Radar</h3>
                    </div>
                </div>
                <div className="flex-1 min-h-[250px]">
                    <ScoreRadarChart adData={ad} benchmark={benchmark} />
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.map((m, i) => (
                    <Card key={i} className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 rounded-2xl hover:border-blue-500/40 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg bg-zinc-100 dark:bg-white/5 transition-all group-hover:scale-110", m.color)}>
                                    <m.icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-none">{m.label}</h4>
                                    <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mt-1">Attribute</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter">{m.score}</span>
                                <span className="text-[9px] font-black text-zinc-400 ml-0.5">/10</span>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="h-1 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", m.color.replace('text-', 'bg-'))}
                                    style={{ width: `${(m.score || 0) * 10}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] md:text-xs font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {m.justification || "Data synchronization pending for analysis."}
                        </p>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function PsychBox({ label, present, strength, icon: Icon }: any) {
    return (
        <Card className="p-3 md:p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 rounded-2xl flex items-center gap-2 md:gap-3 transition-all hover:border-blue-500/20">
            <div className={cn(
                "p-1.5 md:p-2 rounded-xl flex items-center justify-center shrink-0",
                present ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-100 dark:bg-white/5 text-zinc-400"
            )}>
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-0.5 truncate">{label}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-zinc-900 dark:text-zinc-100 italic truncate">
                    {present ? `Detected (${strength})` : "Not Leveraged"}
                </p>
            </div>
        </Card>
    )
}

function AIDATab({ ad }: { ad: AdData }) {
    const aida = [
        { label: 'Attention', score: ad.aidaAttentionScore, analysis: ad.aidaAttentionAnalysis, color: 'text-amber-500' },
        { label: 'Interest', score: ad.aidaInterestScore, analysis: ad.aidaInterestAnalysis, color: 'text-blue-500' },
        { label: 'Desire', score: ad.aidaDesireScore, analysis: ad.aidaDesireAnalysis, color: 'text-rose-500' },
        { label: 'Action', score: ad.aidaActionScore, analysis: ad.aidaActionAnalysis, color: 'text-emerald-500' },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pr-2 overflow-x-hidden">
            <div className="bg-zinc-50 dark:bg-white/5 p-4 md:p-6 rounded-3xl border border-zinc-100 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2">
                    <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic">Creative Funnel Efficiency</h3>
                    <p className="text-xs font-medium text-zinc-500">Psychological flow through the AIDA framework</p>
                </div>
                <div className="p-4 bg-white dark:bg-black rounded-2xl border border-zinc-100 dark:border-white/10 shadow-xl min-w-[120px]">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5 text-center">Avg Score</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 text-center tracking-tight">
                        {((ad.aidaAttentionScore || 0) + (ad.aidaInterestScore || 0) + (ad.aidaDesireScore || 0) + (ad.aidaActionScore || 0)) / 4}/10
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
                {aida.map((item, i) => (
                    <div key={i} className="space-y-3 md:space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className={cn("text-3xl md:text-5xl font-black opacity-10 italic tracking-tighter", item.color)}>{i + 1}</span>
                                <h4 className="text-base md:text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{item.label}</h4>
                            </div>
                            <span className={cn("text-base md:text-xl font-black tracking-tighter", item.color)}>{item.score}/10</span>
                        </div>
                        <p className="text-[11px] md:text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed pl-5 md:pl-6 border-l-2 border-zinc-200 dark:border-white/5 py-0.5">
                            {item.analysis || "Funnel stage analysis is currently being computed by the creative engine."}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 md:mt-10 pt-6 md:pt-8 border-t border-zinc-200 dark:border-white/10">
                <h4 className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 md:mb-6 text-center">Psychological Biases</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    <PsychBox label="Loss Aversion" present={ad.lossAversionPresent} strength={ad.lossAversionStrength} icon={AlertCircle} />
                    <PsychBox label="Scarcity" present={ad.scarcityPresent} strength={ad.scarcityStrength} icon={Activity} />
                    <PsychBox label="Social Proof" present={ad.socialProofPresent} strength={ad.socialProofStrength} icon={Shield} />
                </div>
            </div>
        </div>
    )
}

function InsightsTab({ ad }: { ad: AdData }) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pr-2 overflow-x-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1 px-2 rounded-md bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest">Strengths</div>
                        <h3 className="text-xs font-bold text-zinc-400">Winning Attributes</h3>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                        {ad.keyStrengths?.split('\n').filter(s => s.trim()).map((s, i) => (
                            <div key={i} className="flex gap-2 md:gap-3 p-3 md:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-900 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                                <p className="text-[10px] md:text-xs font-bold leading-relaxed">{s.replace(/^[-\d.]+\s*/, '')}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1 px-2 rounded-md bg-rose-500/10 text-rose-600 text-[9px] font-black uppercase tracking-widest">Weaknesses</div>
                        <h3 className="text-xs font-bold text-zinc-400">Optimization Required</h3>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                        {ad.keyWeaknesses?.split('\n').filter(w => w.trim()).map((w, i) => (
                            <div key={i} className="flex gap-2 md:gap-3 p-3 md:p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-900 dark:text-rose-400">
                                <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                                <p className="text-[10px] md:text-xs font-bold leading-relaxed">{w.replace(/^[-\d.]+\s*/, '')}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1 px-2 rounded-md bg-blue-500/10 text-blue-600 text-[9px] font-black uppercase tracking-widest">Intelligence</div>
                        <h3 className="text-xs font-bold text-zinc-400">Deep Creative Analysis</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ad.psychology_analysis && (
                            <Card className="p-4 bg-blue-500/5 border-blue-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-2">Psychology</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.psychology_analysis}"</p>
                            </Card>
                        )}
                        {ad.behavioral_economics_analysis && (
                            <Card className="p-4 bg-indigo-500/5 border-indigo-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-indigo-500 mb-2">Behavioral Economics</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.behavioral_economics_analysis}"</p>
                            </Card>
                        )}
                        {ad.neuromarketing_analysis && (
                            <Card className="p-4 bg-purple-500/5 border-purple-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-purple-500 mb-2">Neuromarketing</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.neuromarketing_analysis}"</p>
                            </Card>
                        )}
                        {ad.google_algorithm_analysis && (
                            <Card className="p-4 bg-amber-500/5 border-amber-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-amber-500 mb-2">Algorithm Alignment</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.google_algorithm_analysis}"</p>
                            </Card>
                        )}
                        {ad.competitive_differentiation && (
                            <Card className="p-4 bg-rose-500/5 border-rose-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-rose-500 mb-2">Competition</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.competitive_differentiation}"</p>
                            </Card>
                        )}
                        {ad.predicted_performance_impact && (
                            <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 rounded-2xl">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-2">Growth Vector</h4>
                                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed italic">"{ad.predicted_performance_impact}"</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <Card className="p-6 bg-zinc-950 border-white/5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    <div className="flex-1 space-y-2 md:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 md:p-2 rounded-lg bg-white/5 text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </div>
                            <h4 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">Winning Formula</h4>
                        </div>
                        <p className="text-[10px] md:text-[11px] text-zinc-400 leading-relaxed font-medium">
                            {ad.whatWorks || "Analysis pending."}
                        </p>
                    </div>
                    <div className="flex-1 space-y-2 md:space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 md:p-2 rounded-lg bg-white/5 text-rose-400">
                                <Activity className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </div>
                            <h4 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">Negative Signals</h4>
                        </div>
                        <p className="text-[10px] md:text-[11px] text-zinc-400 leading-relaxed font-medium">
                            {ad.whatDoesntWork || "No significant negative signals."}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}

function StrategyTab({ ad }: { ad: AdData }) {
    const recommendations = [
        { rec: ad.recommendation1, impact: ad.recommendation1Impact, effort: ad.recommendation1Effort, color: 'border-blue-500/30 bg-blue-500/5' },
        { rec: ad.recommendation2, impact: ad.recommendation2Impact, effort: ad.recommendation2Effort, color: 'border-indigo-500/30 bg-indigo-500/5' },
        { rec: ad.recommendation3, impact: ad.recommendation3Impact, effort: ad.recommendation3Effort, color: 'border-purple-500/30 bg-purple-500/5' },
    ].filter(r => r.rec)

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500 pr-4 pb-10 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-tight mb-1">Alpha Testing Strategy</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actionable Scaling Playbook</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {recommendations.map((r, i) => (
                    <Card key={i} className={cn("p-4 md:p-5 rounded-2xl md:rounded-3xl border flex flex-col gap-3 group transition-all hover:shadow-xl hover:bg-white dark:hover:bg-zinc-900", r.color)}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="h-6 w-6 rounded-full bg-white dark:bg-zinc-950 flex items-center justify-center font-black text-[8px] shadow-sm shrink-0">
                                0{i + 1}
                            </div>
                            <div className="flex-1">
                                <div className="h-[1px] w-full bg-zinc-200 dark:bg-white/10" />
                            </div>
                            <Badge variant="outline" className="bg-white/50 dark:bg-black/20 text-blue-600 dark:text-blue-400 text-[6px] font-black uppercase tracking-tighter px-1.5 py-0.5 border-blue-500/20 shrink-0">
                                RECOMMENDATION
                            </Badge>
                        </div>

                        <div className="space-y-2 flex-1">
                            <p className="text-[11px] md:text-sm font-bold text-zinc-900 dark:text-white leading-relaxed">
                                {r.rec}
                            </p>

                            {r.impact && (
                                <div className="mt-2 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <p className="text-[7px] font-black text-blue-600/60 uppercase tracking-widest mb-1">Potential Impact</p>
                                    <p className="text-[9px] md:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 italic leading-tight">
                                        {r.impact}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Effort:</span>
                                <span className="text-[8px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{r.effort}</span>
                            </div>
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500/40" />
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                <Card className="p-6 bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-3xl">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Variant Hooks</h4>
                    </div>
                    <div className="space-y-3">
                        {ad.hookOptions?.split('\n').filter(h => h.trim()).map((h, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 text-xs font-medium">
                                <span className="text-blue-500 font-bold shrink-0">H{i + 1}</span>
                                <p className="italic leading-relaxed">"{h.replace(/^[-\d.]+\s*/, '')}"</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6 bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-3xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="h-5 w-5 text-emerald-500" />
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-tight">CTA Variations</h4>
                    </div>
                    <div className="space-y-3">
                        {ad.ctaOptions?.split('\n').filter(c => c.trim()).map((c, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-white/5 text-xs font-medium">
                                <span className="text-emerald-500 font-bold shrink-0">C{i + 1}</span>
                                <p className="italic leading-relaxed">"{c.replace(/^[-\d.]+\s*/, '')}"</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    )
}

export default function MetaAdDetailView({
    ad,
    benchmark,
    onClose,
    onEnlargeImage,
    onSelectMetric,
    onSelectScore,
    activeAnalysis
}: MetaAdDetailViewProps) {
    const [activeTab, setActiveTab] = useState('summary')

    if (!ad) return null

    const tabs = [
        { id: 'summary', label: 'Summary', icon: Sparkles, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
        { id: 'performance', label: 'Performance', icon: Activity, color: 'text-indigo-500', bgColor: 'bg-indigo-50/50' },
        { id: 'analysis', label: 'Creative Analysis', icon: BarChart3, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
        { id: 'aida', label: 'AIDA & Psych', icon: Brain, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
        { id: 'insights', label: 'Deep Insights', icon: Lightbulb, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
        { id: 'strategy', label: 'Scale Strategy', icon: Zap, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    ]

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 h-full min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4 lg:pb-10 pt-2 lg:pt-4">
            {/* Unique Vertical Navigation - Meta Specific Sidebar */}
            <div className="hidden lg:flex flex-col w-64 shrink-0 gap-6">
                <div className="sticky top-0 space-y-6">
                    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Meta Intelligence</h4>
                        </div>
                        <p className="text-[9px] font-bold text-zinc-400">Creative Control Center</p>
                    </div>

                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-white dark:bg-white/5 shadow-xl shadow-blue-500/5 border border-zinc-200 dark:border-white/10"
                                            : "hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400"
                                    )}
                                >
                                    <div className="flex items-center gap-3 relative z-10 transition-transform duration-200 group-hover:translate-x-1">
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-all",
                                            isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                        )}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <span className={cn("text-[11px] font-black uppercase tracking-tight", isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 shadow-2xl relative overflow-hidden group/ad">
                        <div
                            className="aspect-square rounded-xl overflow-hidden mb-3 border border-white/10 cursor-pointer shadow-lg transition-transform duration-500 hover:scale-[1.02]"
                            onClick={() => onEnlargeImage?.(ad.thumbnailUrl, ad.adName)}
                        >
                            <img src={ad.thumbnailUrl} alt={ad.adName} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <h5 className="text-[10px] font-bold text-white truncate leading-tight">{ad.adName}</h5>
                            <p className="text-[8px] font-mono text-zinc-500 truncate uppercase">ID: {ad.adId.slice(0, 10)}...</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {/* Mobile Tab Switcher (Visible on mobile only) */}
                <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4 border-b border-zinc-100 dark:border-white/5 shrink-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 lg:pr-6">
                    <div className="space-y-6 pb-10">
                        {/* Global Sticky Header */}
                        <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-100 dark:border-white/5 pb-3 pt-1 mb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                        <Badge variant="outline" className="text-[6px] md:text-[7px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border-none px-1.5 py-0.5">
                                            {ad.platform || 'Meta'} Intelligence
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "text-[6px] md:text-[7px] font-black uppercase tracking-widest border-none px-1.5 py-0.5",
                                            ad.performanceLabel === 'TOP_PERFORMER' ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500"
                                        )}>
                                            {ad.performanceLabel?.replace(/_/g, ' ') || 'STANDARD'}
                                        </Badge>
                                    </div>
                                    <h2 className="text-xs md:text-base lg:text-lg font-bold text-zinc-900 dark:text-white truncate max-w-full tracking-tight">
                                        {ad.adName}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex flex-col items-end px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-white/5">
                                        <span className="text-[6px] font-black uppercase tracking-widest text-zinc-400">Total Spend</span>
                                        <span className="text-[10px] md:text-xs font-bold font-mono tracking-tighter">{formatCurrency(ad.spend)}</span>
                                    </div>
                                    <div className="flex flex-col items-end px-2 py-0.5 bg-blue-50 dark:bg-blue-600/10 rounded-lg border border-blue-100 dark:border-blue-600/10">
                                        <span className="text-[6px] font-black uppercase tracking-widest text-blue-600">Efficiency</span>
                                        <span className="text-[10px] md:text-xs font-bold font-mono tracking-tighter text-blue-600">{ad.ctr}% CTR</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="h-8 w-8 md:h-10 md:w-10 rounded-xl hover:bg-red-500/10 text-red-500 transition-all duration-300 group/exit"
                                    >
                                        <X className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover/exit:scale-110 group-active/exit:scale-90" strokeWidth={3} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {activeTab === 'summary' && (
                            <SummaryTab
                                ad={ad}
                                formatCurrency={formatCurrency}
                                benchmark={benchmark}
                                onSelectMetric={onSelectMetric}
                                activeAnalysis={activeAnalysis}
                            />
                        )}
                        {activeTab === 'performance' && (
                            <PerformanceTab
                                ad={ad}
                                onSelectMetric={onSelectMetric}
                                activeAnalysis={activeAnalysis}
                            />
                        )}
                        {activeTab === 'analysis' && <AnalysisTab ad={ad} benchmark={benchmark} />}
                        {activeTab === 'aida' && <AIDATab ad={ad} />}
                        {activeTab === 'insights' && <InsightsTab ad={ad} />}
                        {activeTab === 'strategy' && <StrategyTab ad={ad} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
