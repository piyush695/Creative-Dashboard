"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MetricsGrid from "./metrics-grid"
import ScoresSection from "./scores-section"
import InsightsSection from "./insights-section"
import ScoreRadarChart from "./score-radar-chart"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import {
    BarChart3,
    Target,
    Sparkles,
    TrendingUp,
    X,
    Layout,
    Zap,
    PieChart,
    Activity,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AdDetailTabsProps {
    adData: AdData
    benchmark?: any
    onClose?: () => void
    onEnlargeImage?: (url: string, title: string) => void
    onSelectMetric?: (label: string) => void
    onSelectScore?: (label: string) => void
    activeAnalysis?: { type: string, name: string } | null
    onTabChange?: () => void
}

export default function AdDetailTabs({ adData, benchmark, onClose, onEnlargeImage, onSelectMetric, onSelectScore, activeAnalysis, onTabChange }: AdDetailTabsProps) {
    if (!adData) return null;

    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20 pt-8 mt-2">
            {/* Premium Header for Selected Ad */}
            <div className="flex flex-col gap-4 p-4 md:p-6 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                    <Sparkles className="h-48 w-48 text-primary" />
                </div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-7 relative z-10 w-full">
                    <div
                        className="h-24 w-40 md:h-28 md:w-44 rounded-xl md:rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shrink-0 group-hover:scale-[1.05] transition-transform duration-700 cursor-pointer aspect-video"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onEnlargeImage) onEnlargeImage(adData.thumbnailUrl, adData.adName);
                        }}
                    >
                        <img
                            src={adData.thumbnailUrl || "/placeholder.svg"}
                            alt={adData.adName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-2 md:space-y-3 text-center md:text-left w-full min-w-0">
                        <div className="flex items-center justify-center md:justify-start gap-2">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest uppercase">In-depth analysis</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{adData.platform || "Google"} Ads</span>
                        </div>
                        <h2 className="text-xl md:text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 italic leading-tight truncate px-2 md:px-0">
                            {adData.adName}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                                <span className="text-[10px] font-black text-zinc-400 leading-none">ID:</span>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 font-mono tracking-tighter leading-none">{adData.adId}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10 max-w-[200px] md:max-w-[400px] lg:max-w-[600px] pr-8">
                                <span className="text-[10px] font-black text-zinc-400 leading-none">Campaign:</span>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate leading-none">{adData.campaignName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {onClose && (
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-full absolute top-2 right-2 md:top-6 md:right-6 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-90 shadow-sm z-20"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Tabbed Navigation Content */}
            <Tabs defaultValue="performance" className="w-full" onValueChange={onTabChange}>
                <TabsList className="w-full h-auto p-1 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl mb-6 md:mb-8 flex flex-nowrap justify-between gap-0.5 overflow-hidden">
                    <TabsTrigger
                        value="performance"
                        className="flex-1 min-w-0 flex justify-center items-center gap-1.5 px-1 py-2 md:px-2 md:py-2.5 rounded-[0.85rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/30 transition-all font-black tracking-tight text-[10px] md:text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        <Activity className="h-3 w-3 flex-shrink-0" /> <span className="truncate block">Performance</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="footprint"
                        className="flex-1 min-w-0 flex justify-center items-center gap-1.5 px-1 py-2 md:px-2 md:py-2.5 rounded-[0.85rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/30 transition-all font-black tracking-tight text-[10px] md:text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        <PieChart className="h-3 w-3 flex-shrink-0" /> <span className="truncate block">Design footprint</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="intelligence"
                        className="flex-1 min-w-0 flex justify-center items-center gap-1.5 px-1 py-2 md:px-2 md:py-2.5 rounded-[0.85rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/30 transition-all font-black tracking-tight text-[10px] md:text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        <Zap className="h-3 w-3 flex-shrink-0" /> <span className="truncate block">Creative intelligence</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="insights"
                        className="flex-1 min-w-0 flex justify-center items-center gap-1.5 px-1 py-2 md:px-2 md:py-2.5 rounded-[0.85rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/30 transition-all font-black tracking-tight text-[10px] md:text-[11px] whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        <Sparkles className="h-3 w-3 flex-shrink-0" /> <span className="truncate block">AI insights</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-none bg-transparent">
                        <MetricsGrid
                            adData={adData}
                            onSelectMetric={onSelectMetric || (() => { })}
                            selectedMetricLabel={activeAnalysis?.type === 'metric' ? activeAnalysis.name : null}
                            isClickable={!!onSelectMetric}
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="footprint" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="p-8 border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[3rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <PieChart className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 rounded-xl bg-primary/10 shadow-sm border border-primary/10">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-black tracking-tightest">Design footprint</h3>
                            </div>
                            <div className="flex-1 min-h-[400px]">
                                <ScoreRadarChart adData={adData} benchmark={benchmark} />
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="intelligence" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                        <ScoresSection
                            adData={adData}
                            onSelectScore={onSelectScore || (() => { })}
                            selectedScoreName={activeAnalysis?.type === 'score' ? activeAnalysis.name : null}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <InsightsSection adData={adData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
