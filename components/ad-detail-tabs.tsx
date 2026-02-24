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
}

export default function AdDetailTabs({ adData, benchmark, onClose }: AdDetailTabsProps) {
    if (!adData) return null;

    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            {/* Premium Header for Selected Ad */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                    <Sparkles className="h-64 w-64 text-primary" />
                </div>

                <div className="flex items-start gap-6 relative z-10 w-full">
                    <div className="h-24 w-32 md:h-32 md:w-44 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-2xl shrink-0 group-hover:scale-[1.05] transition-transform duration-700">
                        <img
                            src={adData.thumbnailUrl || "/placeholder.svg"}
                            alt={adData.adName}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em]">In-Depth Analysis</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{adData.platform || "Google"} Ads</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black tracking-tightest text-zinc-900 dark:text-zinc-100 uppercase italic">
                            {adData.adName}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">ID:</span>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 font-mono tracking-tighter leading-none">{adData.adId}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-white/5 rounded-full border border-zinc-200 dark:border-white/10">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Campaign:</span>
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate max-w-[200px] leading-none">{adData.campaignName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {onClose && (
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full absolute top-6 right-6 md:static bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-90"
                    >
                        <X className="h-6 w-6" />
                    </Button>
                )}
            </div>

            {/* Tabbed Navigation Content */}
            <Tabs defaultValue="performance" className="w-full">
                <TabsList className="w-full md:w-auto h-auto p-1.5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-[1.8rem] mb-10 overflow-x-auto no-scrollbar flex justify-start md:justify-center gap-2">
                    <TabsTrigger
                        value="performance"
                        className="flex items-center gap-3 px-8 py-4 px-6 md:px-10 rounded-[1.3rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl shadow-primary/30 transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <Activity className="h-4 w-4" /> Performance
                    </TabsTrigger>
                    <TabsTrigger
                        value="design"
                        className="flex items-center gap-3 px-8 py-4 px-6 md:px-10 rounded-[1.3rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl shadow-primary/30 transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <Zap className="h-4 w-4" /> Design Analysis
                    </TabsTrigger>
                    <TabsTrigger
                        value="insights"
                        className="flex items-center gap-3 px-8 py-4 px-6 md:px-10 rounded-[1.3rem] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl shadow-primary/30 transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <Sparkles className="h-4 w-4" /> AI Insights & Recs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-none bg-transparent">
                        <MetricsGrid
                            adData={adData}
                            onSelectMetric={() => { }}
                            isClickable={false}
                        />
                    </Card>
                </TabsContent>

                <TabsContent value="design" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        <Card className="p-8 border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[3rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <PieChart className="h-32 w-32" />
                            </div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2.5 rounded-xl bg-primary/10 shadow-sm border border-primary/10">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tightest">Design Footprint</h3>
                                </div>
                                <div className="flex-1 min-h-[400px]">
                                    <ScoreRadarChart adData={adData} benchmark={benchmark} />
                                </div>
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <ScoresSection adData={adData} onSelectScore={() => { }} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <InsightsSection adData={adData} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
