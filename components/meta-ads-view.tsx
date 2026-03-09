"use client"

import { useState, useMemo, useEffect } from "react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Activity,
    DollarSign,
    Target,
    MousePointer2,
    TrendingUp,
    Check,
    Eye,
    Info,
    LayoutGrid,
    Layout,
    ArrowUpRight,
    Play,
    X,
    BarChart2,
    PieChart as PieChartIcon,
    List,
    Zap,
    Percent,
    Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
    Sector,
} from "recharts"
import SampleAds from "./sample-ads"

interface MetaAdsViewProps {
    metaAds: AdData[]
    selectedAccountId: string
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onEnlargeImage?: (url: string, title: string) => void
    onDataSourceChange?: (source: "database" | "realtime") => void
    onRefresh?: () => void
    isSyncing?: boolean
    selectedPlatform?: string
    onPlatformChange?: (platform: string) => void
}

const PIE_COLORS = ["#1877F2", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"]

export default function MetaAdsView({
    metaAds,
    selectedAccountId,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onEnlargeImage,
    onDataSourceChange,
    onRefresh,
    isSyncing,
    selectedPlatform = "meta",
    onPlatformChange
}: MetaAdsViewProps) {
    const [mounted, setMounted] = useState(false)
    const [showOverview, setShowOverview] = useState(false)
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        setMounted(true)
        const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"))
        checkDark()
        const observer = new MutationObserver(checkDark)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    // --- Core data filtered by account + search ---
    const filteredAds = useMemo(() => {
        return metaAds.filter(ad => {
            const matchesAccount = selectedAccountId === "all" || ad.adAccountId === selectedAccountId
            const term = searchQuery.toLowerCase().trim()
            const matchesSearch = !term ||
                (ad.adName?.toLowerCase() || "").includes(term) ||
                (ad.campaignName?.toLowerCase() || "").includes(term) ||
                (ad.adId?.toLowerCase() || "").includes(term)
            return matchesAccount && matchesSearch
        })
    }, [metaAds, selectedAccountId, searchQuery])

    // --- Aggregate KPIs ---
    const totalSpend      = filteredAds.reduce((s, a) => s + Number(a.spend || 0), 0)
    const totalImpr       = filteredAds.reduce((s, a) => s + Number(a.impressions || 0), 0)
    const totalClicks     = filteredAds.reduce((s, a) => s + Number(a.clicks || 0), 0)
    const totalConversions= filteredAds.reduce((s, a) => s + Number(a.purchases || 0), 0)
    const totalRevenue    = filteredAds.reduce((s, a) => s + Number(a.purchaseValue || 0), 0)
    const avgCtr          = totalImpr  > 0 ? (totalClicks / totalImpr) * 100 : 0
    const avgCpc          = totalClicks > 0 ? totalSpend / totalClicks : 0
    const avgRoas         = totalSpend  > 0 ? totalRevenue / totalSpend : 0
    const netProfit       = totalRevenue - totalSpend
    const convRate        = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    // --- Top performers sorted by ROAS ---
    const topAdsByRoas = useMemo(() =>
        [...filteredAds].sort((a, b) => {
            const revA = Number(a.purchaseValue) || 0;
            const spendA = Number(a.spend) || 0;
            const roasA = spendA > 0 ? revA / spendA : 0;

            const revB = Number(b.purchaseValue) || 0;
            const spendB = Number(b.spend) || 0;
            const roasB = spendB > 0 ? revB / spendB : 0;

            return roasB - roasA;
        }).slice(0, 10),
        [filteredAds]
    )

    // --- Chart: spend area ---
    const spendChartData = useMemo(() =>
        topAdsByRoas.map((ad, i) => {
            const rev = Number(ad.purchaseValue) || 0;
            const spend = Number(ad.spend) || 0;
            const roas = spend > 0 ? rev / spend : 0;
            return {
                name: (ad.adName?.split("_").slice(0, 3).join("_")) || `Ad ${i + 1}`,
                spend: spend,
                revenue: rev,
                ctr: Number(ad.ctr) || 0,
                roas: roas,
            }
        }),
        [topAdsByRoas]
    )

    // --- Chart: format diversity ---
    const formatChartData = useMemo(() => {
        const map = new Map<string, number>()
        filteredAds.forEach(ad => {
            const type = ad.adType || (ad.adName?.toLowerCase().includes("video") ? "Video" : "Image")
            map.set(type, (map.get(type) || 0) + Number(ad.spend || 0))
        })
        const data = Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
        return data.length > 0 ? data : [{ name: "Image", value: 1 }]
    }, [filteredAds])

    // --- Chart: CTR bar ---
    const ctrChartData = useMemo(() =>
        [...filteredAds]
            .sort((a, b) => (Number(b.ctr) || 0) - (Number(a.ctr) || 0))
            .slice(0, 10)
            .map((ad, i) => ({
                name: ad.adName?.split("_").slice(0, 2).join("_") || `Ad ${i + 1}`,
                ctr: Number(ad.ctr) || 0,
                spend: Number(ad.spend) || 0,
            })),
        [filteredAds]
    )

    // --- Chart: revenue bar per ad ---
    const revenueChartData = useMemo(() =>
        [...filteredAds]
            .sort((a, b) => (Number(b.purchaseValue) || 0) - (Number(a.purchaseValue) || 0))
            .slice(0, 10)
            .map((ad, i) => ({
                name: ad.adName?.split("_").slice(0, 2).join("_") || `Ad ${i + 1}`,
                revenue: Number(ad.purchaseValue) || 0,
                spend: Number(ad.spend) || 0,
            })),
        [filteredAds]
    )

    if (!mounted) return null

    // ===== KPI CARD COMPONENT (inline) =====
    const kpiCards = [
        { label: "Total Spend",   value: `$${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,  icon: DollarSign,    theme: "blue",    desc: "Total Investment",       info: "Total amount spent on active ads." },
        { label: "Total Revenue", value: `$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: TrendingUp,   theme: "emerald", desc: "Revenue Generated",      info: "Total revenue generated from conversion value." },
        { label: "Net Profit",    value: `$${netProfit.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,   icon: Zap,          theme: netProfit >= 0 ? "green" : "red", desc: "Revenue - Spend", info: "Revenue minus total spend." },
        { label: "ROAS",          value: `${avgRoas.toFixed(2)}x`,   icon: Activity,    theme: "indigo",  desc: "Return on Ad Spend",    info: "Conv Value / Spend." },
        { label: "Avg. CTR",      value: `${avgCtr.toFixed(2)}%`,    icon: Percent,     theme: "violet",  desc: "Click-Through Rate",    info: "Clicks / Impressions × 100." },
        { label: "Avg. CPC",      value: `$${avgCpc.toFixed(2)}`,    icon: MousePointer2,theme: "amber",  desc: "Cost per Click",        info: "Total Spend / Clicks." },
        { label: "Impressions",   value: totalImpr.toLocaleString("en-US"), icon: Eye,          theme: "sky",     desc: "Total Reach",           info: "Number of times ads were displayed." },
        { label: "Clicks",        value: totalClicks.toLocaleString("en-US"),icon: MousePointer2,theme: "pink",  desc: "Total Interactions",    info: "Total clicks across all ads." },
        { label: "Conversions",   value: totalConversions.toLocaleString("en-US"), icon: Check,theme: "teal",   desc: "Total Acquisitions",    info: "Total number of purchase conversions." },
        { label: "Conv. Rate",    value: `${convRate.toFixed(2)}%`,  icon: Users,       theme: "orange",  desc: "Conversion Rate",       info: "Conversions / Clicks × 100." },
    ]

    const themeColors: Record<string, string> = {
        blue:    "#3b82f6", emerald: "#10b981", green:  "#10b981",
        red:     "#ef4444", indigo:  "#6366f1",  violet: "#8b5cf6",
        amber:   "#f59e0b", sky:     "#0ea5e9",  pink:   "#ec4899",
        teal:    "#14b8a6", orange:  "#f97316",
    }
    const bgThemeMap: Record<string, string> = {
        blue:    "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        green:   "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        red:     "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400",
        indigo:  "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
        violet:  "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20 text-violet-600 dark:text-violet-400",
        amber:   "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400",
        sky:     "bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400",
        pink:    "bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20 text-pink-600 dark:text-pink-400",
        teal:    "bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20 text-teal-600 dark:text-teal-400",
        orange:  "bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400",
    }

    // Custom tooltip — works for both dark & light mode
    const ChartTooltip = ({ active, payload, label, prefix = "$", suffix = "" }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div className={cn(
                "rounded-xl px-3.5 py-2.5 shadow-xl border text-xs font-bold backdrop-blur-md",
                isDark
                    ? "bg-zinc-900 border-white/10 text-zinc-100"
                    : "bg-white border-zinc-200 text-zinc-900"
            )}>
                {label && <p className="text-[9px] uppercase tracking-widest font-black mb-1.5 opacity-50">{label}</p>}
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color || entry.fill }} />
                        <span className="opacity-60 text-[10px] capitalize">{entry.name}</span>
                        <span className="font-black ml-auto pl-4" style={{ color: entry.color || entry.fill }}>
                            {prefix}{typeof entry.value === "number" ? entry.value.toLocaleString("en-US") : entry.value}{suffix}
                        </span>
                    </div>
                ))}
            </div>
        )
    }

    const PieTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        const { name, value, fill } = payload[0].payload
        return (
            <div className={cn(
                "rounded-xl px-3.5 py-2.5 shadow-xl border backdrop-blur-md",
                isDark
                    ? "bg-zinc-900 border-white/10"
                    : "bg-white border-zinc-200"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: fill }} />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isDark ? "text-zinc-300" : "text-zinc-600")}>
                        {name}
                    </span>
                </div>
                <p className="text-base font-black mt-1" style={{ color: fill }}>
                    ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col w-full pb-20" suppressHydrationWarning>
                {showOverview ? (
                    /* ========== OVERVIEW PANEL ========== */
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
                                    <Activity className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                        Performance Overview
                                    </h2>
                                    <p className="text-[9px] text-zinc-500 font-medium mt-0.5">
                                        {selectedAccountId === "all"
                                            ? `All Accounts · ${filteredAds.length} ads`
                                            : `${filteredAds[0]?.accountName || "Account"} · ${filteredAds.length} ads`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowOverview(false)}
                                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* ── ZONE 1: Hero KPI cards ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                            {[
                                { label: "Total Spend",   value: `$${totalSpend.toLocaleString(undefined,   { maximumFractionDigits: 0 })}`, sub: "ad spend",  color: "blue" },
                                { label: "Total Revenue", value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "revenue",   color: "emerald" },
                                { label: "Net Profit",    value: `$${netProfit.toLocaleString(undefined,    { maximumFractionDigits: 0 })}`, sub: netProfit >= 0 ? "profit" : "loss", color: netProfit >= 0 ? "emerald" : "red" },
                                { label: "ROAS",          value: `${avgRoas.toFixed(2)}x`,                                                 sub: "on ad spend", color: "indigo" },
                            ].map((h, i) => {
                                const cm: Record<string, { val: string; bg: string; bd: string }> = {
                                    blue:    { val: "text-blue-500",    bg: isDark ? "bg-blue-500/10"    : "bg-blue-50",    bd: isDark ? "border-blue-500/20"    : "border-blue-200" },
                                    emerald: { val: "text-emerald-500", bg: isDark ? "bg-emerald-500/10" : "bg-emerald-50", bd: isDark ? "border-emerald-500/20" : "border-emerald-200" },
                                    red:     { val: "text-red-500",     bg: isDark ? "bg-red-500/10"     : "bg-red-50",     bd: isDark ? "border-red-500/20"     : "border-red-200" },
                                    indigo:  { val: "text-indigo-500",  bg: isDark ? "bg-indigo-500/10"  : "bg-indigo-50",  bd: isDark ? "border-indigo-500/20"  : "border-indigo-200" },
                                }
                                const c = cm[h.color]
                                return (
                                    <div 
                                        key={h.label} 
                                        style={{ animationDelay: `${i * 100}ms` }}
                                        className={cn(
                                            "flex flex-col justify-between p-4 rounded-2xl border min-h-[90px] transition-all duration-500 group cursor-default",
                                            "hover:-translate-y-1.5 hover:shadow-2xl dark:hover:shadow-black/40",
                                            "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
                                            c.bg, c.bd,
                                            h.color === "blue"    && "hover:border-blue-500/40 hover:shadow-blue-500/10",
                                            h.color === "emerald" && "hover:border-emerald-500/40 hover:shadow-emerald-500/10",
                                            h.color === "red"     && "hover:border-red-500/40 hover:shadow-red-500/10",
                                            h.color === "indigo"  && "hover:border-indigo-500/40 hover:shadow-indigo-500/10"
                                        )}
                                    >
                                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-500 transition-colors">{h.label}</p>
                                        <div>
                                            <p className={cn("text-2xl font-black font-mono leading-none mt-2 transition-transform group-hover:scale-105 origin-left", c.val)}>{h.value}</p>
                                            <p className="text-[9px] text-zinc-400 font-medium mt-1 truncate">{h.sub}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ── ZONE 2: Secondary stats ── */}
                        <div className={cn(
                            "grid grid-cols-2 md:grid-cols-3 xl:flex items-center gap-0 mb-3 rounded-xl border overflow-hidden",
                            isDark ? "border-white/5 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                        )}>
                            {kpiCards.slice(4).map((k, i) => (
                                <div key={k.label} 
                                    style={{ animationDelay: `${(i + 4) * 50}ms` }}
                                    className={cn(
                                    "flex-1 flex flex-col items-center py-2.5 px-1 text-center sm:shrink-0 transition-all duration-300 group cursor-default hover:bg-zinc-100 dark:hover:bg-white/5",
                                    "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                                    // Borders for grid (mobile/md)
                                    i % (mounted && window.innerWidth < 1280 ? (window.innerWidth < 768 ? 2 : 3) : 6) !== 0 && (isDark ? "border-l border-white/5" : "border-l border-zinc-100"),
                                    i >= (mounted && window.innerWidth < 768 ? 2 : (mounted && window.innerWidth < 1280 ? 3 : 0)) && (isDark ? "border-t border-white/5" : "border-t border-zinc-100"),
                                    // Reset side borders for flex (xl and up)
                                    "xl:border-t-0 xl:border-l xl:first:border-l-0"
                                )}>
                                    <p className="text-[7px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1 whitespace-nowrap group-hover:text-zinc-500 transition-colors">{k.label}</p>
                                    <p className="text-xs font-black font-mono leading-none transition-transform group-hover:scale-110" style={{ color: themeColors[k.theme] }}>{k.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── ZONE 3: Insights — unified card with list rows ── */}
                        {(() => {
                            const best   = [...filteredAds].sort((a,b) => (Number(b.spend)||0)-(Number(a.spend)||0))[0]
                            const topCtr = [...filteredAds].sort((a,b) => (Number(b.ctr)||0)-(Number(a.ctr)||0))[0]
                            const campaigns = [...new Set(filteredAds.map(a => a.campaignName).filter(Boolean))]
                            const cSpend = new Map<string, number>()
                            filteredAds.forEach(a => {
                                const c = a.campaignName || "Unknown"
                                cSpend.set(c, (cSpend.get(c)||0) + Number(a.spend||0))
                            })
                            const topCamp = [...cSpend.entries()].sort((a,b) => b[1]-a[1])[0]
                            const rows = [
                                best && {
                                    icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
                                    iconBg: "bg-emerald-500/15",
                                    badge: "Top Spender",
                                    badgeColor: "text-emerald-500",
                                    name: best.adName,
                                    metaLeft: `$${Number(best.spend||0).toLocaleString("en-US")}`,
                                    metaLeftColor: "text-emerald-500",
                                    metaRight: `CTR ${(Number(best.ctr)||0).toFixed(2)}% · ROAS ${(Number(best.roas)||0).toFixed(2)}x`,
                                },
                                topCtr && {
                                    icon: <Percent className="h-4 w-4 text-violet-500" />,
                                    iconBg: "bg-violet-500/15",
                                    badge: "Highest CTR",
                                    badgeColor: "text-violet-500",
                                    name: topCtr.adName,
                                    metaLeft: `${(Number(topCtr.ctr)||0).toFixed(2)}%`,
                                    metaLeftColor: "text-violet-500",
                                    metaRight: `${Number(topCtr.clicks||0).toLocaleString("en-US")} clicks · $${Number(topCtr.spend||0).toLocaleString("en-US")} spend`,
                                },
                                {
                                    icon: <BarChart2 className="h-4 w-4 text-blue-500" />,
                                    iconBg: "bg-blue-500/15",
                                    badge: "Campaigns",
                                    badgeColor: "text-blue-500",
                                    name: topCamp ? topCamp[0] : "No campaigns",
                                    metaLeft: `${campaigns.length} active`,
                                    metaLeftColor: "text-blue-500",
                                    metaRight: topCamp ? `$${topCamp[1].toLocaleString("en-US", { maximumFractionDigits: 0 })} top spend` : "",
                                },
                            ].filter(Boolean) as { icon: React.ReactNode; iconBg: string; badge: string; badgeColor: string; name: string; metaLeft: string; metaLeftColor: string; metaRight: string }[]
                            return (
                                <div className={cn("rounded-2xl border mb-3 overflow-hidden", isDark ? "border-white/5 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50")}>
                                    {rows.map((row, i) => (
                                        <div key={row.badge} className={cn(
                                            "flex items-center gap-3 px-4 py-3.5 transition-all duration-300 group cursor-default",
                                            "hover:bg-zinc-100/80 dark:hover:bg-white/[0.05]",
                                            i > 0 && (isDark ? "border-t border-white/5" : "border-t border-zinc-200")
                                        )}>
                                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", row.iconBg)}>
                                                {row.icon}
                                            </div>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={cn("text-[8px] font-black uppercase tracking-widest transition-opacity group-hover:opacity-100 opacity-80", row.badgeColor)}>{row.badge}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight max-w-[120px] sm:max-w-[240px] transition-all group-hover:translate-x-1 group-hover:text-[#1877F2]">
                                                    {row.name}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 transition-transform group-hover:scale-105">
                                                <p className={cn("text-sm font-black font-mono", row.metaLeftColor)}>{row.metaLeft}</p>
                                                <p className="text-[8px] text-zinc-400 font-bold whitespace-nowrap">{row.metaRight}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}



                        {/* ── ZONE 4: Tabbed charts ── */}
                        <Tabs defaultValue="spend" className="w-full">
                            <TabsList className="mb-4 h-auto p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl grid grid-cols-2 lg:grid-cols-4 w-full">
                                <TabsTrigger value="spend" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-md flex items-center justify-center gap-1.5">
                                    <BarChart2 className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Spend &amp; Revenue</span><span className="sm:hidden">Spend</span>
                                </TabsTrigger>
                                <TabsTrigger value="ctr" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-md flex items-center justify-center gap-1.5">
                                    <Percent className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">CTR Analysis</span><span className="sm:hidden">CTR</span>
                                </TabsTrigger>
                                <TabsTrigger value="format" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-md flex items-center justify-center gap-1.5">
                                    <PieChartIcon className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Format Mix</span><span className="sm:hidden">Format</span>
                                </TabsTrigger>
                                <TabsTrigger value="top" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-md flex items-center justify-center gap-1.5">
                                    <List className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Top Performers</span><span className="sm:hidden">Top</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* ---- TAB 1: Spend & Revenue ---- */}
                            <TabsContent value="spend" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0f0f11] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-white/5 transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-0.5">Spend vs Revenue</p>
                                            <p className="text-[9px] text-zinc-400 font-medium mb-4">Top 10 ads by ROAS</p>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={spendChartData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }} style={{ background: "transparent" }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 700, fill: "#71717a" }} angle={-35} textAnchor="end" tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: "#71717a" }} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} />
                                                        <RechartsTooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                                                        <Bar dataKey="spend"   fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={22} />
                                                        <Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]} maxBarSize={22} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Spend</div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Revenue</div>
                                            </div>
                                        </div>
                                        {/* RIGHT: Stats */}
                                        <div className="p-5 flex flex-col justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4">Summary</p>
                                            <div className="space-y-3 flex-1">
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-blue-500/5 hover:border-blue-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-blue-50 hover:border-blue-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-blue-500/70 transition-colors">Total Spend</p>
                                                        <p className="text-lg font-black text-blue-500 font-mono transition-transform group-hover:scale-105 origin-left">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <DollarSign className="h-5 w-5 text-blue-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-blue-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-emerald-50 hover:border-emerald-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-500/70 transition-colors">Total Revenue</p>
                                                        <p className="text-lg font-black text-emerald-500 font-mono transition-transform group-hover:scale-105 origin-left">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <TrendingUp className="h-5 w-5 text-emerald-500/30 transition-all group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:text-emerald-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    netProfit >= 0 
                                                        ? (isDark ? "bg-emerald-900/10 border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/30" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400")
                                                        : (isDark ? "bg-red-900/10 border-red-500/15 hover:bg-red-500/10 hover:border-red-500/30" : "bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-400")
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-colors">Net Profit</p>
                                                        <p className={cn("text-lg font-black font-mono transition-transform group-hover:scale-105 origin-left", netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <Zap className={cn("h-5 w-5 transition-all group-hover:scale-110 group-hover:rotate-12", netProfit >= 0 ? "text-emerald-500/30 group-hover:text-emerald-500" : "text-red-500/30 group-hover:text-red-500")} />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-indigo-500/5 hover:border-indigo-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-indigo-50 hover:border-indigo-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-indigo-500/70 transition-colors">ROAS</p>
                                                        <p className="text-lg font-black text-indigo-500 font-mono transition-transform group-hover:scale-105 origin-left">{avgRoas.toFixed(2)}x</p>
                                                    </div>
                                                    <Activity className="h-5 w-5 text-indigo-500/30 transition-all group-hover:scale-110 group-hover:text-indigo-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* ---- TAB 2: CTR Analysis ---- */}
                            <TabsContent value="ctr" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0f0f11] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-white/5 transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-0.5">CTR by Ad</p>
                                            <p className="text-[9px] text-zinc-400 font-medium mb-4">Top 10 ads by click-through rate</p>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={ctrChartData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }} style={{ background: "transparent" }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 700, fill: "#71717a" }} angle={-35} textAnchor="end" tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: "#71717a" }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                                                        <RechartsTooltip content={<ChartTooltip prefix="" suffix="%" />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                                                        <Bar dataKey="ctr" fill="#8b5cf6" radius={[4,4,0,0]} maxBarSize={22} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-3">
                                                <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                                                <span className="text-[9px] font-black text-zinc-500">CTR %</span>
                                            </div>
                                        </div>
                                        {/* RIGHT: Stats */}
                                        <div className="p-5 flex flex-col justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4">CTR Insights</p>
                                            <div className="space-y-3 flex-1">
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-violet-500/70 transition-colors">Best CTR</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{(Math.max(...filteredAds.map(a => Number(a.ctr) || 0))).toFixed(2)}%</p>
                                                    </div>
                                                    <Percent className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-violet-500/70 transition-colors">Avg CTR</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{avgCtr.toFixed(2)}%</p>
                                                    </div>
                                                    <Activity className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-violet-500/70 transition-colors">Total Clicks</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{totalClicks.toLocaleString()}</p>
                                                    </div>
                                                    <MousePointer2 className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group cursor-default",
                                                    isDark ? "bg-white/[0.03] border-white/5 hover:bg-amber-500/5 hover:border-amber-500/20" : "bg-zinc-50 border-zinc-200 hover:bg-amber-50 hover:border-amber-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-amber-500/70 transition-colors">Avg CPC</p>
                                                        <p className="text-lg font-black text-amber-500 font-mono transition-transform group-hover:scale-105 origin-left">${avgCpc.toFixed(2)}</p>
                                                    </div>
                                                    <DollarSign className="h-5 w-5 text-amber-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-amber-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* ---- TAB 3: Format Mix ---- */}
                            <TabsContent value="format" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0f0f11] rounded-2xl shadow-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Pie Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-white/5 transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 mb-0.5">Format Diversity</p>
                                            <p className="text-[9px] text-zinc-400 font-medium mb-2">Spend by ad type</p>
                                            <div className="h-56">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart style={{ background: "transparent" }}>
                                                        <Pie data={formatChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value"
                                                            activeShape={(props: any) => {
                                                                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
                                                                return (
                                                                    <g>
                                                                        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                                                                        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 4} outerRadius={outerRadius + 10} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.25} />
                                                                        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} filter="url(#glow)" />
                                                                    </g>
                                                                )
                                                            }}
                                                        >
                                                            {formatChartData.map((_, i) => (
                                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" strokeWidth={0} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip content={<PieTooltip />} />
                                                        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9, fontWeight: 700, color: "#71717a" }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        {/* RIGHT: Breakdown */}
                                        <div className="p-5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4">Spend Breakdown</p>
                                            <div className="space-y-2.5">
                                                {formatChartData.map((item, i) => {
                                                    const pct = totalSpend > 0 ? (item.value / totalSpend * 100) : 0
                                                    return (
                                                        <div key={item.name} className="group cursor-default p-2 rounded-lg transition-all duration-300 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                                    <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide group-hover:text-[#1877F2] transition-colors">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black transition-transform group-hover:scale-110" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{pct.toFixed(1)}%</span>
                                                                    <span className="text-[9px] text-zinc-400 font-bold">${item.value.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-white/5 overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* ---- TAB 4: Top Performers Table ---- */}
                            <TabsContent value="top" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Card className="p-5 md:p-6 border border-zinc-200 dark:border-white/5 bg-white dark:bg-[#0f0f11] rounded-[2rem] shadow-xl overflow-x-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Top Performers</h3>
                                            <p className="text-xs text-zinc-400 font-medium mt-0.5">Top 10 ads ranked by ROAS</p>
                                        </div>
                                        <Badge className="bg-blue-500/10 text-blue-500 border-none font-black text-xs px-3 py-1">
                                            {topAdsByRoas.length} Ads
                                        </Badge>
                                    </div>
                                    <div className="overflow-x-auto -mx-5 md:mx-0">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-zinc-100 dark:border-white/5">
                                                    {["#", "Ad Name", "Spend", "Revenue", "ROAS", "CTR", "Clicks", "Conv."].map(h => (
                                                        <th key={h} className="pb-3 px-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topAdsByRoas.map((ad, i) => {
                                                    const rev = Number(ad.purchaseValue) || 0
                                                    const sp  = Number(ad.spend) || 0
                                                    const adRoas = sp > 0 ? rev / sp : 0
                                                    return (
                                                        <tr key={ad.id}
                                                            onClick={() => { setShowOverview(false); onSelectAd(ad) }}
                                                            className="border-b border-zinc-50 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                                                        >
                                                            <td className="py-3 px-4 text-[10px] font-black text-zinc-400">#{i + 1}</td>
                                                            <td className="py-3 px-4 max-w-[140px] md:max-w-[200px]">
                                                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#1877F2] transition-colors">{ad.adName}</p>
                                                                <p className="text-[9px] text-zinc-400 font-medium truncate">{ad.campaignName}</p>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-black text-blue-500 whitespace-nowrap">${sp.toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-black text-emerald-500 whitespace-nowrap">${rev.toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-black whitespace-nowrap">
                                                                <span className={cn(adRoas >= 2 ? "text-emerald-500" : adRoas >= 1 ? "text-amber-500" : "text-red-400")}>
                                                                    {adRoas.toFixed(2)}x
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-black text-violet-500 whitespace-nowrap">{(Number(ad.ctr) || 0).toFixed(2)}%</td>
                                                            <td className="py-3 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400">{(Number(ad.clicks) || 0).toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400">{(Number(ad.purchases) || 0).toLocaleString()}</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                ) : (
                    /* ========== ADS LIST ========== */
                    <div className="space-y-4 animate-in fade-in duration-500 pt-0">
                        {/* Brand / Status Header — Top Badge */}
                        <div className="flex items-center gap-2 mb-6 px-1.5 pt-2">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Layout className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <h1 className="text-[10px] font-black tracking-[0.25em] text-blue-500 uppercase">
                                HOLAPRIME SOURCE LIBRARY
                            </h1>
                        </div>

                        <SampleAds
                            ads={[...filteredAds].sort((a, b) => {
                                const revA = Number(a.purchaseValue) || 0;
                                const spA = Number(a.spend) || 0;
                                const roasA = spA > 0 ? revA / spA : 0;
                                const revB = Number(b.purchaseValue) || 0;
                                const spB = Number(b.spend) || 0;
                                const roasB = spB > 0 ? revB / spB : 0;
                                return roasB - roasA;
                            }).slice(0, 10)}
                            hasAdsInAccount={metaAds.length > 0}
                            searchQuery={searchQuery}
                            selectedAdId={null}
                            onSelect={(id) => {
                                const ad = filteredAds.find(a => a.id === id)
                                if (ad) onSelectAd(ad)
                            }}
                            onEnlargeImage={onEnlargeImage}
                            extraActions={
                                 <button
                                     onClick={() => setShowOverview(true)}
                                     className="group flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200
                                         bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm
                                         border border-zinc-200 dark:border-zinc-700
                                         text-zinc-700 dark:text-zinc-200
                                         shadow-sm hover:shadow-md
                                         hover:bg-blue-50 dark:hover:bg-blue-900/15
                                         hover:border-blue-300 dark:hover:border-blue-600
                                         hover:text-blue-600 dark:hover:text-blue-400
                                         active:opacity-80"
                                 >
                                     <TrendingUp className="h-3 w-3 shrink-0 text-blue-500 transition-transform group-hover:-translate-y-px" />
                                     <span>OVERVIEW</span>
                                 </button>
                            }
                        />
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}
