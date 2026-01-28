'use client'

import { AdData } from "@/lib/types"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import {
    TrendingUp,
    X,
    Zap,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { getMetricsList } from "./metrics-grid"
import { getScoresList } from "./scores-section"

interface AnalysisSidebarProps {
    activeDetail: { type: 'score' | 'metric', name: string } | null
    onClose: () => void
    adData: AdData | null
    isMobile: boolean
}

export default function AnalysisSidebar({ activeDetail, onClose, adData, isMobile }: AnalysisSidebarProps) {
    // Early escape for null data
    if (!adData || !activeDetail) return null

    // Strictlytyped lookup to avoid TS errors
    const scoreItem = activeDetail.type === 'score'
        ? getScoresList(adData).find(s => s.name === activeDetail.name)
        : undefined

    const metricItem = activeDetail.type === 'metric'
        ? getMetricsList(adData).find(m => m.label === activeDetail.name)
        : undefined

    const itemData = scoreItem || metricItem
    if (!itemData) return null

    // Capture values into stable constants for the nested components
    const name = activeDetail.name
    const isDetailVisible = !!activeDetail

    const handleDownload = () => {
        console.log("Downloading report for", name)
    }

    const DesktopPanel = (
        <div
            className={cn(
                "fixed top-[104px] -mt-[1px] bottom-0 right-0 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md border-l border-border shadow-[-20px_0_80px_rgba(0,0,0,0.06)] z-[500] transition-all duration-500 ease-out flex flex-col w-[280px] xl:w-[320px] 2xl:w-[360px] rounded-tl-[1.5rem] rounded-bl-[1.5rem]",
                isDetailVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 invisible"
            )}
        >
            <div className="absolute top-4 right-4 z-[510]">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full shadow-md bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground border border-border transition-all active:scale-95"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="h-full overflow-hidden rounded-tl-[1.5rem] rounded-bl-[1.5rem]">
                <DetailContent itemData={itemData} adData={adData} onDownload={handleDownload} />
            </div>
        </div>
    )

    const MobilePopup = (
        <Sheet open={isMobile && isDetailVisible} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" hideClose={true} className="p-0 h-[85vh] rounded-t-[40px] border-none overflow-hidden bg-background dark:bg-zinc-950">
                <SheetHeader className="sr-only">
                    <SheetTitle>{name} Details</SheetTitle>
                    <SheetDescription>In-depth AI analysis of {name}</SheetDescription>
                </SheetHeader>
                <div className="absolute top-4 right-4 z-[110]">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={onClose}
                        className="h-10 w-10 rounded-full shadow-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md text-foreground border border-border"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <DetailContent itemData={itemData} adData={adData} isMobile onDownload={handleDownload} />
            </SheetContent>
        </Sheet>
    )

    return (
        <>
            {!isMobile && DesktopPanel}
            {isMobile && MobilePopup}
        </>
    )
}

function DetailContent({ itemData, adData, isMobile, onDownload }: { itemData: any, adData: AdData, isMobile?: boolean, onDownload: () => void }) {
    const isScore = 'score' in itemData
    const value = isScore ? itemData.score : itemData.value
    const name = itemData.name || itemData.label
    const color = itemData.color || ""
    const icon = itemData.icon
    const Icon = icon

    return (
        <div className="flex flex-col h-full bg-background dark:bg-zinc-950 animate-in fade-in duration-300">
            {/* Header Container */}
            <div className={cn("p-4 md:p-5 pb-5 md:pb-6 relative overflow-hidden shrink-0 rounded-tl-[1.5rem]", color)}>
                <div className="relative z-10 space-y-2">
                    {Icon && (
                        <div className="p-1.5 w-fit rounded-lg bg-white/90 dark:bg-white/10 shadow-md backdrop-blur-sm border border-white/50 dark:border-white/10">
                            <Icon className="h-4 w-4 md:h-5 md:w-5 text-zinc-900 dark:text-zinc-100" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{name} Analysis</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-black tracking-tighter uppercase whitespace-nowrap">
                                {value}{isScore ? ' / 10' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                {/* Description */}
                <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Description</h3>
                    <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium italic">
                        "{itemData.desc || itemData.description || ""}"
                    </p>
                </section>

                {/* Insight */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Insight</h3>
                    </div>
                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-2xl p-4 md:p-5">
                        <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {isScore ? (adData as any)[itemData.key] : "Performance is trending higher."}
                        </p>
                    </div>
                </section>

                {/* Optimization Checklist */}
                <section className="space-y-4 pb-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Optimization</h3>
                    </div>
                    <div className="bg-zinc-900 dark:bg-zinc-900/50 rounded-2xl p-4 md:p-5 border border-white/5">
                        <div className="space-y-4">
                            {[1].map((i) => (
                                <div key={i} className="flex gap-4 items-start group">
                                    <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-black text-white/50 border border-white/5">
                                        0{i}
                                    </div>
                                    <p className="text-xs md:text-sm text-white/80 leading-snug">
                                        {isScore ? `Review ${name.toLowerCase()} consistency.` : `Verify legibility across sizes.`}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-border mt-auto shrink-0 flex items-center justify-center">
                <Button
                    className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-black text-xs uppercase tracking-widest h-12 rounded-xl group"
                    onClick={onDownload}
                >
                    <span>Download Audit Report</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
            </div>
        </div>
    )
}
