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
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getScoresList } from "./scores-section"
import { getMetricsList } from "./metrics-grid"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

interface AnalysisSidebarProps {
    activeDetail: { type: 'score' | 'metric', name: string } | null
    onClose: () => void
    adData: AdData | null
    isMobile: boolean
}

export default function AnalysisSidebar({ activeDetail, onClose, adData, isMobile }: AnalysisSidebarProps) {
    const { toast } = useToast()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !adData || !activeDetail) return null

    // Find the content to display based on type and name
    let itemData: any = null
    if (activeDetail.type === 'score') {
        itemData = getScoresList(adData).find(s => s.name === activeDetail.name)
    } else {
        const metric = getMetricsList(adData).find(m => m.label === activeDetail.name)
        if (metric) {
            itemData = {
                name: metric.label,
                score: metric.value,
                color: metric.color,
                icon: metric.icon,
                description: metric.desc,
                unit: metric.unit,
                isMetric: true
            }
        }
    }

    if (!itemData) return null

    const handleDownload = () => {
        try {
            // CSV content generation
            const headers = ["Metric", "Value", "Description", "Insight"]
            const row = [
                itemData.name,
                itemData.score,
                itemData.description.replace(/,/g, ''),
                (itemData.isMetric ? "Positive Trend" : (adData[itemData.key as keyof AdData] || "N/A")).toString().replace(/,/g, '')
            ]

            const csvString = headers.join(",") + "\n" + row.join(",");
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${itemData.name}_Audit_Report.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Report Downloaded",
                description: `${itemData.name} analysis export complete.`,
            })
        } catch (error) {
            toast({
                title: "Download Failed",
                description: "There was an error generating your report.",
                variant: "destructive"
            })
        }
    }

    const DesktopPanel = (
        <div
            className={cn(
                "fixed top-[64px] bottom-0 right-0 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-md border-l border-border shadow-[-20px_0_80px_rgba(0,0,0,0.06)] z-[100] transition-all duration-500 ease-out flex flex-col w-[280px] xl:w-[320px] 2xl:w-[360px] rounded-l-[1.5rem]",
                activeDetail ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 invisible"
            )}
        >
            <div className="absolute top-4 right-4 z-[110]">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full shadow-md bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-foreground border border-border transition-all active:scale-95"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="h-full overflow-hidden rounded-l-[1.5rem]">
                <DetailContent itemData={itemData} adData={adData} onDownload={handleDownload} />
            </div>
        </div>
    )

    const MobilePopup = (
        <Sheet open={isMobile && !!activeDetail} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="p-0 h-[85vh] rounded-t-[40px] border-none overflow-hidden bg-background dark:bg-zinc-950">
                <SheetHeader className="sr-only">
                    <SheetTitle>{itemData.name} Details</SheetTitle>
                    <SheetDescription>In-depth AI analysis of {itemData.name}</SheetDescription>
                </SheetHeader>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-zinc-200 rounded-full z-20" />
                <div className="absolute top-4 right-6 z-30">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={onClose}
                        className="h-9 w-9 rounded-full shadow-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-foreground border border-border"
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
    return (
        <div className="flex flex-col h-full bg-background dark:bg-zinc-950 animate-in fade-in duration-300">
            {/* Header Container */}
            <div className={cn("p-4 md:p-5 pb-5 md:pb-6 relative overflow-hidden shrink-0 rounded-tl-[1.5rem]", itemData.color)}>
                <div className="relative z-10 space-y-2">
                    <div className="p-1.5 w-fit rounded-lg bg-white/90 dark:bg-white/10 shadow-md backdrop-blur-sm border border-white/50 dark:border-white/10">
                        <itemData.icon className="h-4 w-4 md:h-5 md:w-5 text-zinc-900 dark:text-zinc-100" />
                    </div>
                    <div>
                        <h3 className="text-base md:text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">{itemData.name} {itemData.isMetric ? 'Analysis' : ''}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-baseline gap-1 bg-zinc-900 dark:bg-zinc-100 px-2 py-0.5 rounded shadow-sm">
                                <span className="text-xs font-bold text-white dark:text-zinc-900">{itemData.score}</span>
                                <span className="text-[8px] font-bold text-white/50 dark:text-zinc-500 uppercase tracking-widest">{itemData.isMetric ? itemData.unit : '/10'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Background Decorative Element */}
                <div className="absolute -right-8 -bottom-8 opacity-5 scale-150 rotate-12 pointer-events-none">
                    <itemData.icon className="h-64 w-64" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 md:space-y-8">
                {/* Dimensions Context */}
                <section className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 dark:text-zinc-600">Description</span>
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-1" />
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 text-[10px] md:text-xs leading-relaxed italic pr-1">
                        "{itemData.description}"
                    </p>
                </section>

                {/* AI Insight Section */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                            Insight
                        </h5>
                    </div>
                    <div className="relative p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-normal text-[10px] md:text-xs shadow-inner transition-all hover:bg-white dark:hover:bg-zinc-900 duration-500">
                        {itemData.isMetric
                            ? `Performance is trending higher.`
                            : (adData[itemData.key as keyof AdData] || "Analysis processed by AI.")
                        }
                    </div>
                </section>

                {/* Qualitative Breakdown */}
                {!itemData.isMetric && (
                    <section className="space-y-3">
                        <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-900">Pillars</h5>
                        <div className="grid gap-2">
                            <div className="p-3 rounded-xl bg-white border border-zinc-100 shadow-sm flex gap-3 transition-all hover:shadow-md">
                                <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-900 leading-tight">Retention Potential</p>
                                    <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">Visual cues likely to increase dwell time.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Actionable Recommendations */}
                <section className="space-y-3 pt-1">
                    <div className="p-4 rounded-2xl bg-[#1A1A1A] text-white space-y-3 shadow-lg relative overflow-hidden">
                        <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D9B48F] flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            Optimization
                        </h5>
                        <div className="space-y-2">
                            <div className="flex gap-2.5">
                                <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[7px] font-black border border-zinc-700 shrink-0 text-[#D9B48F]">01</div>
                                <p className="text-[9px] text-zinc-400 leading-tight font-medium">Verify legibility across sizes.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 md:p-6 border-t border-border bg-background/50 dark:bg-zinc-950/50 backdrop-blur-sm shrink-0 pb-safe">
                <button
                    onClick={onDownload}
                    className="group w-full py-2.5 md:py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold text-[9px] md:text-[10px] uppercase tracking-normal md:tracking-[0.15em] transition-all hover:bg-black dark:hover:bg-white hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {itemData.isMetric ? 'Benchmark History' : 'Download Audit Report'}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    )
}
