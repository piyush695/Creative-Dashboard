"use client"

import { useState } from "react"
import {
    Sparkles,
    X,
    BarChart3,
    Target,
    Zap,
    TrendingUp,
    Info,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Layers,
    Activity,
    Brain,
    ChevronDown,
    ChevronRight
} from "lucide-react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import MetricsGrid from "./metrics-grid"
import ScoresSection from "./scores-section"
import InsightsSection from "./insights-section"
import ScoreRadarChart from "./score-radar-chart"

interface MetaAdDetailViewProps {
    ad: AdData
    benchmark?: any
    onClose: () => void
    onEnlargeImage?: (url: string, title: string) => void
    onSelectMetric?: (label: string) => void
    onSelectScore?: (label: string) => void
    activeAnalysis?: { type: string, name: string } | null
    onTabChange?: () => void
    onReanalyzed?: () => void
}

// ═══════════════════════════════════════════════════════════════
//  Helpers for the new two-pattern Brief panel
// ═══════════════════════════════════════════════════════════════
function verdictStyle(verdict: string | undefined) {
    const v = (verdict || "").toLowerCase()
    if (v.includes("scale")) return { bg: "bg-emerald-500/15", text: "text-emerald-500", dot: "bg-emerald-500", label: "SCALE" }
    if (v.includes("optim")) return { bg: "bg-amber-500/15", text: "text-amber-500", dot: "bg-amber-500", label: "OPTIMIZE" }
    if (v.includes("pause")) return { bg: "bg-orange-500/15", text: "text-orange-500", dot: "bg-orange-500", label: "PAUSE" }
    if (v.includes("kill")) return { bg: "bg-rose-500/15", text: "text-rose-500", dot: "bg-rose-500", label: "KILL" }
    return { bg: "bg-sky-500/15", text: "text-sky-500", dot: "bg-sky-500", label: (verdict || "ANALYZE").toUpperCase() }
}

function directionBadge(dir: string | undefined) {
    const d = (dir || "").toLowerCase()
    if (d === "drives_up") return { icon: "↑", text: "text-emerald-500", bg: "bg-emerald-500/10" }
    if (d === "drives_down") return { icon: "↓", text: "text-rose-500", bg: "bg-rose-500/10" }
    if (d === "mixed") return { icon: "⇅", text: "text-amber-500", bg: "bg-amber-500/10" }
    return { icon: "?", text: "text-muted-foreground", bg: "bg-zinc-500/10" }
}

function confidencePill(level: string | undefined) {
    const l = (level || "").toLowerCase()
    if (l === "high") return { dot: "bg-emerald-500", text: "text-emerald-500", label: "HIGH" }
    if (l === "medium") return { dot: "bg-amber-500", text: "text-amber-500", label: "MED" }
    if (l === "low") return { dot: "bg-rose-500", text: "text-rose-500", label: "LOW" }
    return { dot: "bg-zinc-400", text: "text-muted-foreground", label: "—" }
}

// ─── Pattern 1: Visual + Metrics rendering ───
function MetricLinksList({ links }: { links: any[] }) {
    if (!Array.isArray(links) || links.length === 0) return null
    return (
        <div className="space-y-2.5">
            {links.map((link, i) => {
                const dir = directionBadge(link.direction)
                const conf = confidencePill(link.confidence)
                return (
                    <Card key={i} className="p-3.5 md:p-4 bg-card border-border rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className={cn("flex items-center justify-center shrink-0 w-7 h-7 rounded-md text-[11px] font-black", dir.bg, dir.text)}>
                                {dir.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{link.metric || "metric"}</span>
                                    <span className="text-[8px] font-mono text-muted-foreground">·</span>
                                    <div className="flex items-center gap-1">
                                        <div className={cn("w-1 h-1 rounded-full", conf.dot)} />
                                        <span className={cn("text-[8px] font-black uppercase tracking-widest", conf.text)}>{conf.label} CONF</span>
                                    </div>
                                </div>
                                <p className="text-[11px] md:text-[12px] font-bold text-foreground leading-snug mb-1.5">
                                    "{link.element || "element"}"
                                </p>
                                <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed">
                                    {link.reasoning || ""}
                                </p>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}

function MetricsStoryCard({ story }: { story: any }) {
    if (!story || typeof story !== "object") return null
    const winners: string[] = Array.isArray(story.winners) ? story.winners : []
    const warnings: string[] = Array.isArray(story.warnings) ? story.warnings : []
    const missing: string[] = Array.isArray(story.missing) ? story.missing : []

    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500">
                    <Activity className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Metrics Story</h4>
            </div>
            {story.headline && (
                <p className="text-[12px] md:text-[13px] font-bold text-foreground leading-snug mb-4 italic">
                    "{story.headline}"
                </p>
            )}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {winners.length > 0 && (
                    <div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1.5">✓ Winners</p>
                        <ul className="space-y-1">
                            {winners.map((w, i) => (
                                <li key={i} className="text-[10px] md:text-[11px] text-foreground leading-relaxed pl-2 border-l-2 border-emerald-500/30">{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {warnings.length > 0 && (
                    <div>
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1.5">⚠ Warnings</p>
                        <ul className="space-y-1">
                            {warnings.map((w, i) => (
                                <li key={i} className="text-[10px] md:text-[11px] text-foreground leading-relaxed pl-2 border-l-2 border-amber-500/30">{w}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {missing.length > 0 && (
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">? Missing Metrics</p>
                        <ul className="space-y-1">
                            {missing.map((w, i) => (
                                <li key={i} className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed pl-2 border-l-2 border-zinc-500/30 italic">{w}</li>
                            ))}
                        </ul>
                        <p className="text-[8px] text-muted-foreground/70 mt-2 italic">Provide these for sharper analysis.</p>
                    </div>
                )}
            </div>
        </Card>
    )
}

// ─── Pattern 2: Visual-only heuristics rendering ───
function HeuristicsGrid({ heuristics }: { heuristics: any }) {
    if (!heuristics || typeof heuristics !== "object") return null
    const entries = Object.entries(heuristics).filter(([, v]: any) => v && typeof v === "object")
    if (entries.length === 0) return null

    const label = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())

    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                    <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Heuristic Scores</h4>
                <span className="text-[8px] font-bold text-muted-foreground italic">(visual-only mode)</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {entries.map(([key, val]: any) => {
                    const score = Number(val.score) || 0
                    const color = score >= 8 ? "bg-emerald-500" : score >= 4 ? "bg-sky-500" : "bg-rose-500"
                    return (
                        <div key={key} className="p-2.5 rounded-md bg-background border border-border">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-black text-foreground uppercase tracking-wide">{label(key)}</span>
                                <span className="text-[11px] font-black text-foreground tabular-nums">{score}<span className="text-[8px] text-muted-foreground font-bold">/10</span></span>
                            </div>
                            <div className="h-1 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mb-1.5">
                                <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score * 10}%` }} />
                            </div>
                            <p className="text-[9px] md:text-[10px] text-muted-foreground leading-snug">{val.note || ""}</p>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

function PredictedPerformanceCard({ prediction }: { prediction: any }) {
    if (!prediction || typeof prediction !== "object") return null
    const pill = (level: string) => {
        const l = (level || "").toLowerCase()
        if (l === "high") return "bg-emerald-500/15 text-emerald-500"
        if (l === "average") return "bg-sky-500/15 text-sky-500"
        if (l === "low") return "bg-rose-500/15 text-rose-500"
        return "bg-zinc-500/15 text-muted-foreground"
    }
    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Predicted Performance</h4>
            </div>
            <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CTR</span>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest", pill(prediction.ctr))}>{prediction.ctr || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CVR</span>
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest", pill(prediction.cvr))}>{prediction.cvr || "—"}</span>
                </div>
            </div>
            {prediction.reasoning && (
                <p className="text-[10px] md:text-[11px] text-muted-foreground italic leading-relaxed">"{prediction.reasoning}"</p>
            )}
        </Card>
    )
}

// ─── Tests to Run (shared between patterns) ───
function TestsToRunList({ tests }: { tests: any[] }) {
    if (!Array.isArray(tests) || tests.length === 0) return null
    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                    <Zap className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Tests to Run</h4>
                <span className="text-[8px] font-bold text-muted-foreground italic">({tests.length})</span>
            </div>
            <div className="space-y-3">
                {tests.map((t, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-md bg-background border border-border">
                        <div className="shrink-0 w-6 h-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] font-black">
                            {i + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                            {t.hypothesis && (
                                <p className="text-[11px] md:text-[12px] font-bold text-foreground leading-snug">
                                    {t.hypothesis}
                                </p>
                            )}
                            {t.variant && (
                                <div className="flex gap-2">
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest shrink-0 mt-0.5">Variant</span>
                                    <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed">{t.variant}</p>
                                </div>
                            )}
                            {t.expectedDelta && (
                                <div className="flex gap-2">
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest shrink-0 mt-0.5">Expected</span>
                                    <p className="text-[10px] md:text-[11px] text-emerald-500 font-bold leading-relaxed">{t.expectedDelta}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

// ─── Strengths + Risks (shared, side-by-side) ───
function StrengthsRisksGrid({ strengths, risks }: { strengths: any, risks: any }) {
    const sArr: string[] = Array.isArray(strengths) ? strengths : (typeof strengths === "string" && strengths ? strengths.split("\n").filter(Boolean) : [])
    const rArr: string[] = Array.isArray(risks) ? risks : (typeof risks === "string" && risks ? risks.split("\n").filter(Boolean) : [])
    if (sArr.length === 0 && rArr.length === 0) return null

    return (
        <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {sArr.length > 0 && (
                <Card className="p-4 md:p-5 bg-emerald-500/5 border-emerald-500/20 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Strengths</h4>
                    </div>
                    <ul className="space-y-2">
                        {sArr.map((s, i) => (
                            <li key={i} className="text-[10px] md:text-[11px] text-foreground leading-relaxed pl-3 border-l-2 border-emerald-500/30">{s}</li>
                        ))}
                    </ul>
                </Card>
            )}
            {rArr.length > 0 && (
                <Card className="p-4 md:p-5 bg-rose-500/5 border-rose-500/20 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-rose-500/15 text-rose-500">
                            <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Risks</h4>
                    </div>
                    <ul className="space-y-2">
                        {rArr.map((r, i) => (
                            <li key={i} className="text-[10px] md:text-[11px] text-foreground leading-relaxed pl-3 border-l-2 border-rose-500/30">{r}</li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
//  Phase-3 components: 5-Funnel pipeline + 5-Lens lever map
// ═══════════════════════════════════════════════════════════════

// ─── Status indicator pill for each funnel stage ───
function FunnelStatusPill({ status }: { status: string | undefined }) {
    const s = String(status || "").toLowerCase()
    const config =
        s === "validates" ? { bg: "bg-emerald-500/15", text: "text-emerald-500", icon: "✓", label: "VALIDATES" } :
        s === "broken" ? { bg: "bg-rose-500/15", text: "text-rose-500", icon: "✗", label: "BROKEN" } :
        s === "on_par" ? { bg: "bg-sky-500/15", text: "text-sky-500", icon: "○", label: "ON PAR" } :
        s === "cannot_assess" ? { bg: "bg-zinc-500/15", text: "text-zinc-400", icon: "⊘", label: "NO DATA" } :
        s === "predicted" ? { bg: "bg-sky-500/15", text: "text-sky-500", icon: "~", label: "PREDICTED" } :
        { bg: "bg-zinc-500/15", text: "text-zinc-400", icon: "?", label: (status || "—").toString().toUpperCase() }
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0", config.bg, config.text)}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    )
}

// ─── Chip showing a single lever name ───
function LeverChip({ name, variant }: { name: string, variant: "firing" | "weak" | "neutral" }) {
    const styles =
        variant === "firing" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
        variant === "weak" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
        "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    // Make CamelCase / snake_case more readable as a chip
    const label = String(name).replace(/_/g, ".").replace(/([A-Z])/g, ".$1").toLowerCase().replace(/^\./, "")
    return (
        <span className={cn("px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold leading-tight", styles)}>
            {label}
        </span>
    )
}

// ─── One row in the funnel pipeline (= one of the 5 stages) ───
function FunnelStageRow({ num, stage }: { num: number, stage: any }) {
    if (!stage || typeof stage !== "object") return null
    const s = String(stage.status || "").toLowerCase()
    const accentBorder =
        s === "validates" ? "border-l-emerald-500" :
        s === "broken" ? "border-l-rose-500" :
        s === "on_par" ? "border-l-sky-500" :
        s === "cannot_assess" ? "border-l-zinc-500" :
        s === "predicted" ? "border-l-sky-500" :
        "border-l-zinc-400"

    const leversFiring: string[] = Array.isArray(stage.leversFiring) ? stage.leversFiring : []
    const leversWeak: string[] = Array.isArray(stage.leversWeak) ? stage.leversWeak : []
    const primaryKpis: string[] = Array.isArray(stage.primaryKpis) ? stage.primaryKpis : []

    return (
        <div className={cn("flex gap-3 md:gap-4 p-3 md:p-4 border-l-4 bg-background rounded-md", accentBorder)}>
            <div className="shrink-0 text-2xl md:text-3xl font-black text-muted-foreground/30 tabular-nums leading-none w-8 text-center">
                {num}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[12px] md:text-sm font-black uppercase tracking-tight text-foreground">
                        {stage.label || `Stage ${num}`}
                    </h4>
                    <FunnelStatusPill status={stage.status} />
                    {stage.predictedLevel && stage.predictedLevel !== "n/a" && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                            predicted: {stage.predictedLevel}
                        </span>
                    )}
                </div>

                {/* KPI line */}
                {stage.actualMetrics && (
                    <p className="text-[10px] md:text-[11px] text-muted-foreground italic leading-relaxed">
                        {String(stage.actualMetrics)}
                    </p>
                )}

                {/* Primary KPIs callout when no actualMetrics or in addition */}
                {primaryKpis.length > 0 && !stage.actualMetrics && (
                    <p className="text-[9px] text-muted-foreground">
                        <span className="font-black uppercase tracking-widest mr-1">KPIs:</span>
                        {primaryKpis.join(" · ")}
                    </p>
                )}

                {/* Levers firing + weak */}
                {(leversFiring.length > 0 || leversWeak.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                        {leversFiring.map((l, i) => <LeverChip key={"f" + i} name={l} variant="firing" />)}
                        {leversWeak.map((l, i) => <LeverChip key={"w" + i} name={l} variant="weak" />)}
                    </div>
                )}

                {/* Root cause if broken */}
                {stage.rootCauseLever && s === "broken" && (
                    <div className="text-[10px] md:text-[11px] text-rose-500 font-bold flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>Root cause:</span>
                        <span className="font-mono">{String(stage.rootCauseLever)}</span>
                    </div>
                )}

                {/* Insight */}
                {stage.insight && (
                    <p className="text-[10px] md:text-[11px] text-foreground leading-relaxed">
                        "{String(stage.insight)}"
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── The 5-stage funnel pipeline ───
function FunnelPipeline({ funnel }: { funnel: any }) {
    if (!funnel || typeof funnel !== "object") return null
    const order = [
        { key: "stage1_hook", num: 1 },
        { key: "stage2_hold", num: 2 },
        { key: "stage3_ctr", num: 3 },
        { key: "stage4_cvr", num: 4 },
        { key: "stage5_fatigue", num: 5 },
    ]
    const present = order.filter((s) => funnel[s.key])
    if (present.length === 0) return null

    // Quick health summary across stages
    const counts = { validates: 0, broken: 0, on_par: 0, cannot_assess: 0, predicted: 0 }
    for (const s of present) {
        const status = String(funnel[s.key]?.status || "").toLowerCase()
        if (status in counts) (counts as any)[status]++
    }

    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500">
                        <Activity className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Funnel Pipeline</h4>
                    <span className="text-[8px] font-bold text-muted-foreground italic">5-stage diagnosis</span>
                </div>
                {/* Stage-status summary */}
                <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                    {counts.validates > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">✓ {counts.validates}</span>}
                    {counts.broken > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">✗ {counts.broken}</span>}
                    {counts.on_par > 0 && <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500">○ {counts.on_par}</span>}
                    {counts.cannot_assess > 0 && <span className="px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-400">⊘ {counts.cannot_assess}</span>}
                    {counts.predicted > 0 && <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-500">~ {counts.predicted}</span>}
                </div>
            </div>
            <div className="space-y-2">
                {present.map((s) => <FunnelStageRow key={s.key} num={s.num} stage={funnel[s.key]} />)}
            </div>
        </Card>
    )
}

// ─── One lever inside a lens ───
function LeverRow({ name, lever }: { name: string, lever: any }) {
    if (!lever || typeof lever !== "object") return null
    const displayLabel = name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())

    // Score-based lever (most common)
    if (typeof lever.score === "number") {
        const score = Number(lever.score) || 0
        const scoreColor =
            score >= 8 ? "text-emerald-500" :
            score >= 4 ? "text-sky-500" :
            "text-rose-500"
        const barColor =
            score >= 8 ? "bg-emerald-500" :
            score >= 4 ? "bg-sky-500" :
            "bg-rose-500"
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-foreground">{displayLabel}</span>
                    <span className={cn("text-[10px] font-black tabular-nums", scoreColor)}>
                        {score}<span className="text-[8px] text-muted-foreground font-bold">/10</span>
                    </span>
                </div>
                <div className="h-1 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-700", barColor)} style={{ width: `${score * 10}%` }} />
                </div>
                {lever.evidence && (
                    <p className="text-[9px] text-muted-foreground italic leading-snug" title={String(lever.evidence)}>
                        "{String(lever.evidence).slice(0, 140)}{String(lever.evidence).length > 140 ? "…" : ""}"
                    </p>
                )}
                {lever.note && lever.note !== lever.evidence && (
                    <p className="text-[9px] text-foreground/70 leading-snug">{String(lever.note)}</p>
                )}
            </div>
        )
    }

    // Presence-based lever (anchoring, lossAversion, scarcityUrgency, socialProof, etc.)
    const isPresent = lever.present === true
    const qualifier = lever.strength || lever.credibility || lever.specificity || (isPresent ? "present" : "absent")
    return (
        <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-foreground">{displayLabel}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", isPresent ? "text-emerald-500" : "text-zinc-400")}>
                    {String(qualifier).toUpperCase()}
                </span>
            </div>
            {lever.evidence && (
                <p className="text-[9px] text-muted-foreground italic leading-snug">"{String(lever.evidence).slice(0, 140)}{String(lever.evidence).length > 140 ? "…" : ""}"</p>
            )}
            {lever.note && lever.note !== lever.evidence && (
                <p className="text-[9px] text-foreground/70 leading-snug">{String(lever.note)}</p>
            )}
        </div>
    )
}

// ─── One lens card (collapsible) ───
function LensCard({ name, lens }: { name: string, lens: any }) {
    const [expanded, setExpanded] = useState(false)
    if (!lens || typeof lens !== "object") return null

    // Average score across levers that report a score
    const scores: number[] = []
    for (const lever of Object.values(lens) as any[]) {
        if (lever && typeof lever === "object" && typeof lever.score === "number") {
            scores.push(Number(lever.score) || 0)
        }
    }
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    const tier = avg === null ? "neutral" : avg >= 7 ? "high" : avg >= 5 ? "mid" : "low"
    const tierBg =
        tier === "high" ? "bg-emerald-500/5 border-emerald-500/20" :
        tier === "mid" ? "bg-sky-500/5 border-sky-500/20" :
        tier === "low" ? "bg-rose-500/5 border-rose-500/20" :
        "bg-card border-border"
    const tierText =
        tier === "high" ? "text-emerald-500" :
        tier === "mid" ? "text-sky-500" :
        tier === "low" ? "text-rose-500" :
        "text-muted-foreground"

    const displayLabel = name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
    const leverCount = Object.keys(lens).length

    return (
        <Card className={cn("p-3 md:p-4 rounded-md border transition-all", tierBg)}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between gap-2 text-left group cursor-pointer"
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {expanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                    <h5 className="text-[10px] font-black text-foreground uppercase tracking-widest truncate">{displayLabel}</h5>
                    <span className="text-[8px] font-bold text-muted-foreground shrink-0">({leverCount})</span>
                </div>
                {avg !== null && (
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-12 h-1 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full",
                                    tier === "high" ? "bg-emerald-500" :
                                    tier === "mid" ? "bg-sky-500" : "bg-rose-500")}
                                style={{ width: `${avg * 10}%` }}
                            />
                        </div>
                        <span className={cn("text-[11px] font-black tabular-nums", tierText)}>
                            {avg.toFixed(1)}<span className="text-[8px] text-muted-foreground">/10</span>
                        </span>
                    </div>
                )}
            </button>
            {expanded && (
                <div className="mt-3 space-y-3 pt-3 border-t border-border">
                    {Object.entries(lens).map(([leverName, lever]) => (
                        <LeverRow key={leverName} name={leverName} lever={lever} />
                    ))}
                </div>
            )}
        </Card>
    )
}

// ─── 5 lenses grid (the lever map) ───
function LensesGrid({ lenses }: { lenses: any }) {
    if (!lenses || typeof lenses !== "object") return null
    const order = [
        "consumerPsychology",
        "behavioralEconomics",
        "advertisingPrinciples",
        "neuromarketing",
        "behavioralPsychology",
    ]
    const present = order.filter((k) => lenses[k])
    if (present.length === 0) return null

    return (
        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500">
                    <Brain className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Lever Map</h4>
                <span className="text-[8px] font-bold text-muted-foreground italic">5 psychology lenses · click any to expand levers</span>
            </div>
            <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                {present.map((k) => <LensCard key={k} name={k} lens={lenses[k]} />)}
            </div>
        </Card>
    )
}

// ─── Sub-components defined first to avoid hoisting issues and ensure clean symbol table ───
function SummaryTab({ ad, formatCurrency, benchmark, onSelectMetric, activeAnalysis }: {
    ad: AdData,
    formatCurrency: (val: string | number) => string,
    benchmark?: any,
    onSelectMetric?: (label: string) => void,
    activeAnalysis?: { type: string, name: string } | null
}) {
    const a = ad as any
    const hasV3 = !!(a.pattern || a.centralConcept || a.observation || a.diagnosis)
    const pattern = a.pattern as string | undefined
    const isVisualMetrics = pattern === "visual_metrics" || (!pattern && (a.creativeMetricLinks || a.metricsStory))
    const verdict = verdictStyle(a.diagnosis?.verdict || a.verdictDecision)

    // Legacy fallback for ads that haven't been re-analyzed with v3 yet
    if (!hasV3) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
                {/* Show the executive-summary card so the page isn't empty */}
                <Card className="p-3 md:p-5 bg-background border-border rounded-md shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1 rounded-lg bg-sky-600 flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h3 className="font-bold text-sm md:text-base text-foreground tracking-tight">Executive Summary</h3>
                    </div>
                    <p className="text-muted-foreground text-[10px] md:text-sm leading-relaxed font-medium italic mb-3">
                        "{a.topInsight || a.verdictSummary || a.keyInsight || "No high-level insight available for this creative yet."}"
                    </p>
                    {a.primaryRecommendation && (
                        <div className="pt-3 border-t border-border">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Main Strategy</p>
                            <p className="text-[10px] md:text-xs font-bold text-foreground leading-relaxed">{a.primaryRecommendation}</p>
                        </div>
                    )}
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* ─── HERO: Central Concept + Verdict pill ─── */}
            <Card className="p-4 md:p-6 bg-card border-border rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-[80px] -mr-24 -mt-24" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Central Concept</span>
                            {pattern && (
                                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-zinc-500/10 text-muted-foreground">
                                    {pattern === "visual_metrics" ? "Pattern 1 · Visual + Metrics" : "Pattern 2 · Visual Only"}
                                </span>
                            )}
                            {a.platform && (
                                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-sky-500/10 text-sky-500">
                                    {String(a.platform).replace(/_/g, " ")}
                                </span>
                            )}
                            {a.objective && (
                                <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-sky-500/10 text-sky-500">
                                    {String(a.objective)}
                                </span>
                            )}
                        </div>
                        <h2 className="text-base md:text-xl font-black text-foreground leading-tight tracking-tight">
                            "{a.centralConcept || "No concept identified yet."}"
                        </h2>
                        {a.designerTradeOffs && (
                            <p className="text-[10px] md:text-[11px] text-muted-foreground italic leading-relaxed">
                                <span className="font-black text-foreground uppercase tracking-widest text-[8px] mr-1">Trade-offs</span>
                                {a.designerTradeOffs}
                            </p>
                        )}
                    </div>
                    <div className={cn("flex flex-col items-center justify-center px-4 py-3 rounded-md shrink-0", verdict.bg)}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", verdict.dot)} />
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Verdict</span>
                        </div>
                        <span className={cn("text-base md:text-lg font-black tracking-tight", verdict.text)}>
                            {verdict.label}
                        </span>
                        {a.diagnosis?.confidence && (
                            <span className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5">
                                {a.diagnosis.confidence} confidence
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* ─── OBSERVATION: what's literally in the ad ─── */}
            {a.observation && (
                <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-md bg-zinc-500/10 text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                        </div>
                        <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Observation</h4>
                    </div>
                    <p className="text-[11px] md:text-[12px] text-foreground leading-relaxed">
                        {a.observation}
                    </p>
                </Card>
            )}

            {/* ─── FUNNEL PIPELINE (primary view — uses the new `funnel` object) ─── */}
            {a.funnel ? (
                <FunnelPipeline funnel={a.funnel} />
            ) : (
                <>
                    {/* Legacy Pattern 1/2 fallback when the ad was analyzed before the 5-lens × 5-funnel framework was introduced */}
                    {isVisualMetrics && a.metricsStory && (
                        <MetricsStoryCard story={a.metricsStory} />
                    )}
                    {isVisualMetrics && Array.isArray(a.creativeMetricLinks) && a.creativeMetricLinks.length > 0 && (
                        <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                    <Target className="h-3.5 w-3.5" />
                                </div>
                                <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Creative → Metric Links</h4>
                                <span className="text-[8px] font-bold text-muted-foreground italic">
                                    ({a.creativeMetricLinks.length} causal links)
                                </span>
                            </div>
                            <MetricLinksList links={a.creativeMetricLinks} />
                        </Card>
                    )}
                    {!isVisualMetrics && a.heuristics && (
                        <HeuristicsGrid heuristics={a.heuristics} />
                    )}
                    {!isVisualMetrics && a.predictedPerformance && (
                        <PredictedPerformanceCard prediction={a.predictedPerformance} />
                    )}
                </>
            )}

            {/* ─── DIAGNOSIS: primary driver + blocker ─── */}
            {a.diagnosis && (a.diagnosis.primaryDriver || a.diagnosis.primaryBlocker) && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {a.diagnosis.primaryDriver && (
                        <Card className="p-4 md:p-5 bg-emerald-500/5 border-emerald-500/20 rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Primary Driver</h4>
                            </div>
                            <p className="text-[11px] md:text-[12px] text-foreground leading-relaxed">{a.diagnosis.primaryDriver}</p>
                        </Card>
                    )}
                    {a.diagnosis.primaryBlocker && (
                        <Card className="p-4 md:p-5 bg-amber-500/5 border-amber-500/20 rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Primary Blocker</h4>
                            </div>
                            <p className="text-[11px] md:text-[12px] text-foreground leading-relaxed">{a.diagnosis.primaryBlocker}</p>
                        </Card>
                    )}
                </div>
            )}

            {/* ─── STRENGTHS + RISKS ─── */}
            <StrengthsRisksGrid strengths={a.strengths} risks={a.risks} />

            {/* ─── LENS MAP (the 5 psychology lenses with all levers) ─── */}
            {a.lenses && <LensesGrid lenses={a.lenses} />}

            {/* ─── TESTS TO RUN ─── */}
            <TestsToRunList tests={a.testsToRun} />
        </div>
    )
}

function PerformanceTab({ ad, onSelectMetric, activeAnalysis }: { ad: AdData, onSelectMetric?: (l: string) => void, activeAnalysis: any }) {
    // Group the metrics into readable categories so the footer reference fills
    // the space below the grid with something genuinely useful instead of a void.
    const groups: { title: string; items: string[] }[] = [
        { title: "Efficiency", items: ["ROAS", "CPC", "CPM"] },
        { title: "Volume", items: ["Spend", "Impressions", "Clicks", "Reach"] },
        { title: "Quality", items: ["CTR", "Frequency"] },
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-zinc-50/30 dark:bg-white/[0.01] p-4 rounded-md border border-zinc-100 dark:border-border">
                <MetricsGrid
                    adData={ad}
                    onSelectMetric={onSelectMetric || (() => { })}
                    selectedMetricLabel={activeAnalysis?.type === 'metric' ? activeAnalysis.name : null}
                />
            </div>

            {/* Reference footer — explains the figures and groups the metrics so
                the lower area reads as a finished section rather than blank space. */}
            <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500">
                        <Info className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">About these metrics</h4>
                </div>
                <p className="text-[11px] md:text-[12px] text-muted-foreground leading-relaxed">
                    Figures reflect this creative's lifetime performance from the connected Meta ad account,
                    using Meta's default attribution window (7-day click · 1-day view). A value of zero means
                    no spend or activity has been recorded for this ad in the selected range yet.
                </p>
                <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    {groups.map((g) => (
                        <div key={g.title} className="rounded-md bg-background border border-border p-3">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2">{g.title}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {g.items.map((m) => (
                                    <span key={m} className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold text-muted-foreground uppercase tracking-wide">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    )
}

// ─── Variants Tab: hook + CTA alternatives, ready to copy ───
// The analyzer produces 3 variants of each so designers can A/B-test
// the same concept with different copy without re-running creative dev.
function VariantsTab({ ad }: { ad: AdData }) {
    const a = ad as any
    const hookList: string[] = a.hookOptions
        ? String(a.hookOptions).split('\n').map((s: string) => s.replace(/^[-\d.]+\s*/, '').trim()).filter(Boolean)
        : []
    const ctaList: string[] = a.ctaOptions
        ? String(a.ctaOptions).split('\n').map((s: string) => s.replace(/^[-\d.]+\s*/, '').trim()).filter(Boolean)
        : []
    const hasVariants = hookList.length > 0 || ctaList.length > 0

    if (!hasVariants) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <Card className="p-4 md:p-6 bg-amber-500/5 border-amber-500/20 rounded-md">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-500 shrink-0">
                            <Info className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest mb-1">No variant suggestions yet</h4>
                            <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed">
                                Click <span className="font-bold text-foreground">Re-analyze (v2)</span> in the sidebar to generate hook + CTA alternatives. The analyzer produces 3 variants of each so you can A/B-test the same concept with different copy.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    const HookCtaSection = ({
        title, items, prefix, accent, Icon
    }: {
        title: string
        items: string[]
        prefix: string
        accent: 'blue' | 'emerald'
        Icon: any
    }) => {
        if (items.length === 0) return null
        const accentBg = accent === 'blue' ? 'bg-sky-500/10' : 'bg-emerald-500/10'
        const accentText = accent === 'blue' ? 'text-sky-500' : 'text-emerald-500'
        const hoverBorder = accent === 'blue' ? 'hover:border-sky-500/30' : 'hover:border-emerald-500/30'
        const hoverBtnBg = accent === 'blue' ? 'hover:bg-sky-500/10' : 'hover:bg-emerald-500/10'

        return (
            <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn("p-1.5 rounded-md", accentBg, accentText)}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">{title}</h4>
                    <span className="text-[8px] font-bold text-muted-foreground italic">({items.length} alternatives)</span>
                </div>
                <div className="space-y-2">
                    {items.map((s, i) => (
                        <div key={i} className={cn("flex items-start gap-3 p-3 rounded-md bg-background border border-border transition-colors", hoverBorder)}>
                            <div className={cn("shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black", accentBg, accentText)}>
                                {prefix}{i + 1}
                            </div>
                            <p className="text-[11px] md:text-[12px] text-foreground leading-relaxed flex-1 min-w-0 italic">
                                "{s}"
                            </p>
                            <button
                                onClick={() => {
                                    try { navigator.clipboard?.writeText(s) } catch { }
                                }}
                                className={cn("shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-white/5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer", hoverBtnBg)}
                                title="Copy to clipboard"
                            >
                                Copy
                            </button>
                        </div>
                    ))}
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pr-2 overflow-x-hidden">
            <Card className="p-4 md:p-5 bg-card border-border rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500 shrink-0">
                        <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest mb-1">Designer's Playbook</h4>
                        <p className="text-[10px] md:text-[11px] text-muted-foreground leading-relaxed">
                            Below are alternative headlines and CTAs the analyzer generated for THIS specific creative concept. They keep the same visual direction but swap the copy — useful for A/B tests without burning a new design cycle.
                        </p>
                    </div>
                </div>
            </Card>

            <HookCtaSection
                title="Hook Variants"
                items={hookList}
                prefix="H"
                accent="blue"
                Icon={MessageSquare}
            />

            <HookCtaSection
                title="CTA Variants"
                items={ctaList}
                prefix="C"
                accent="emerald"
                Icon={Target}
            />
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
    activeAnalysis,
    onTabChange,
    onReanalyzed
}: MetaAdDetailViewProps) {
    const [activeTab, setActiveTab] = useState('summary')

    if (!ad) return null

    const tabs = [
        { id: 'summary', label: 'Brief', icon: Sparkles, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
        { id: 'performance', label: 'Performance', icon: Activity, color: 'text-sky-500', bgColor: 'bg-sky-50/50' },
        { id: 'footprint', label: 'Design footprint', icon: BarChart3, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
        { id: 'intelligence', label: 'Creative intelligence', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
        { id: 'insights', label: 'AI insights', icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
        { id: 'variants', label: 'Variants', icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    ]

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 h-full min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4 lg:pb-10 pt-2 lg:pt-4">
            {/* Vertical sidebar — ad preview on top, section tabs below */}
            <div className="hidden lg:flex flex-col w-64 shrink-0 gap-6">
                <div className="sticky top-0 space-y-6">
                    {/* Ad preview */}
                    <div className="p-4 rounded-md bg-background border border-border shadow-sm relative overflow-hidden group/ad">
                        <div
                            className="aspect-square rounded-xl overflow-hidden mb-3 border border-border cursor-pointer shadow-lg transition-transform duration-500 hover:scale-[1.02]"
                            onClick={() => onEnlargeImage?.(ad.thumbnailUrl, ad.adName)}
                        >
                            <img src={ad.thumbnailUrl} alt={ad.adName} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <h5 className="text-[10px] font-bold text-foreground truncate leading-tight">{ad.adName}</h5>
                            <p className="text-[8px] font-mono text-muted-foreground truncate uppercase">ID: {ad.adId.slice(0, 10)}...</p>
                        </div>
                    </div>

                    {/* Section tabs */}
                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id)
                                        onTabChange?.()
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3.5 rounded-md transition-all duration-200 group relative cursor-pointer",
                                        isActive
                                            ? "bg-white dark:bg-white/5 shadow-sm shadow-sky-500/5 border border-border"
                                            : "hover:bg-zinc-100 dark:hover:bg-white/5 text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400"
                                    )}
                                >
                                    <div className="flex items-center gap-3 relative z-10 transition-transform duration-200 group-hover:translate-x-1">
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-all",
                                            isActive ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <span className={cn("text-[11px] font-black uppercase tracking-tight", isActive ? "text-foreground" : "text-muted-foreground")}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sky-600 rounded-full" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {/* Mobile Tab Switcher (Visible on mobile only) */}
                <div className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4 border-b border-zinc-100 dark:border-border shrink-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id)
                                onTabChange?.()
                            }}
                            className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer",
                                activeTab === tab.id
                                    ? "bg-sky-600 text-white shadow-md shadow-sky-500/20"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 lg:pr-6">
                    <div className="space-y-6 pb-10">
                        {/* Global Sticky Header */}
                        <div className="sticky top-0 z-40 pb-3 pt-2 mb-4 lg:mb-6">
                            <div className="bg-white/90 dark:bg-[#09090b]/95 backdrop-blur-xl border border-border/50 dark:border-border shadow-sm rounded-xl p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 transition-all duration-300 relative">
                                <div className="flex items-center gap-3 min-w-0 flex-1 pr-10 sm:pr-0">
                                    <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                            <Badge variant="outline" className={cn(
                                                "text-[7px] md:text-[8px] font-black uppercase tracking-[0.1em] border-none px-1.5 py-0.5 flex items-center gap-1 shrink-0 rounded-md",
                                                ad.performanceLabel === 'TOP_PERFORMER' ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-zinc-100 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground"
                                            )}>
                                                <div className={cn("w-1 h-1 rounded-full shrink-0", 
                                                    ad.performanceLabel === 'TOP_PERFORMER' ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                                                )} />
                                                {ad.performanceLabel?.replace(/_/g, ' ') || 'STANDARD'}
                                            </Badge>
                                            <span className="text-[8px] font-mono text-muted-foreground truncate opacity-60 min-w-0 shrink">ID: {ad.adId}</span>
                                        </div>
                                        <h2 
                                            className="text-xs md:text-sm font-bold text-foreground truncate max-w-full tracking-tight"
                                            title={ad.adName}
                                        >
                                            {ad.adName}
                                        </h2>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-3 bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-border rounded-lg px-3.5 py-2 w-full sm:w-auto">
                                        <div className="flex flex-col border-r border-border pr-4 sm:pr-3">
                                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground dark:text-muted-foreground mb-0.5">Total Spend</span>
                                            <span className="text-[10px] md:text-xs font-bold font-mono tracking-tighter text-foreground">{formatCurrency(ad.spend)}</span>
                                        </div>
                                        <div className="flex flex-col pl-1">
                                            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-muted-foreground dark:text-muted-foreground mb-0.5">ROAS</span>
                                            <span className="text-[10px] md:text-xs font-bold font-mono tracking-tighter text-foreground">
                                                {(Number(ad.spend) > 0 ? (Number(ad.purchaseValue || 0) / Number(ad.spend)) : 0).toFixed(2)}x
                                            </span>
                                        </div>
                                    </div>
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
                        {activeTab === 'footprint' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <Card className="p-4 md:p-6 bg-card border-border rounded-xl">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-500"><BarChart3 className="h-3.5 w-3.5" /></div>
                                        <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Design footprint</h4>
                                    </div>
                                    <div className="min-h-[360px]">
                                        <ScoreRadarChart adData={ad} benchmark={benchmark} />
                                    </div>
                                </Card>
                            </div>
                        )}
                        {activeTab === 'intelligence' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <ScoresSection
                                    adData={ad}
                                    onSelectScore={onSelectScore || (() => { })}
                                    selectedScoreName={activeAnalysis?.type === 'score' ? activeAnalysis.name : null}
                                />
                            </div>
                        )}
                        {activeTab === 'insights' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <InsightsSection adData={ad} />
                            </div>
                        )}
                        {activeTab === 'variants' && <VariantsTab ad={ad} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
