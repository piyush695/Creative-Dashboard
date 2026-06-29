"use client"

import { useState, useMemo, useEffect } from "react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Activity, DollarSign, MousePointer2, TrendingUp, Check, Eye, Info,
    LayoutDashboard, RefreshCw, Layers, Percent, Users, BarChart3, PieChart as PieChartIcon, 
    List, ShoppingCart, Zap, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreVertical, Filter, ArrowUpRight, Search,
    BarChart2, Calendar, LayoutGrid, Clock, CalendarIcon, X, Layout
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
import { fetchMetaAdsPage, fetchMetaAdsAll } from "@/actions/ads"

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
    onViewLibrary?: () => void
    defaultShowOverview?: boolean
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
    onPlatformChange,
    onViewLibrary,
    defaultShowOverview = false
}: MetaAdsViewProps) {
    const [mounted, setMounted] = useState(false)
    const [showOverview, setShowOverview] = useState(defaultShowOverview)
    const [isDark, setIsDark] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const adsPerPage = 12

    useEffect(() => {
        setMounted(true)
        const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"))
        checkDark()
        const observer = new MutationObserver(checkDark)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        setShowOverview(defaultShowOverview);
    }, [defaultShowOverview]);

    // --- Server-side pagination ---------------------------------------------
    // The grid pulls ONE page (12 docs) straight from MongoDB instead of holding
    // the whole ~24k collection in the browser. Search is debounced so we don't
    // fire a query on every keystroke.
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const [gridAds, setGridAds] = useState<AdData[]>([])
    const [gridTotal, setGridTotal] = useState(0)
    const [gridLoading, setGridLoading] = useState(true)

    // Snap back to page 1 whenever the filter changes (account/search switch).
    useEffect(() => { setCurrentPage(1) }, [selectedAccountId, debouncedSearch])

    // Fetch the current page from the server.
    useEffect(() => {
        let cancelled = false
        setGridLoading(true)
        fetchMetaAdsPage({
            accountId: selectedAccountId,
            search: debouncedSearch,
            page: currentPage,
            perPage: adsPerPage,
        })
            .then(res => { if (!cancelled) { setGridAds(res.ads); setGridTotal(res.total) } })
            .finally(() => { if (!cancelled) setGridLoading(false) })
        return () => { cancelled = true }
    }, [selectedAccountId, debouncedSearch, currentPage])

    const totalAdPages = Math.max(1, Math.ceil(gridTotal / adsPerPage))
    // Never strand the user on a page that no longer exists.
    useEffect(() => { if (currentPage > totalAdPages) setCurrentPage(1) }, [currentPage, totalAdPages])
    // Jump-to-page box — Prev/Next alone is impractical across ~2k pages.
    const [pageInput, setPageInput] = useState("1")
    useEffect(() => { setPageInput(String(currentPage)) }, [currentPage])
    const goToPage = (raw: string) => {
        const n = Math.min(totalAdPages, Math.max(1, parseInt(raw || "1", 10) || 1))
        setCurrentPage(n)
        setPageInput(String(n))
    }

    // --- Overview data (KPIs + charts) --------------------------------------
    // Loaded on demand only when the Overview opens, since those aggregates
    // genuinely need every matching ad. `filteredAds` feeds all the KPI/chart
    // memos below, exactly as before.
    const [overviewAds, setOverviewAds] = useState<AdData[]>([])
    const [overviewLoading, setOverviewLoading] = useState(false)
    useEffect(() => {
        if (!showOverview) return
        let cancelled = false
        setOverviewLoading(true)
        fetchMetaAdsAll({ accountId: selectedAccountId, search: debouncedSearch })
            .then(all => { if (!cancelled) setOverviewAds(all) })
            .finally(() => { if (!cancelled) setOverviewLoading(false) })
        return () => { cancelled = true }
    }, [showOverview, selectedAccountId, debouncedSearch])
    const filteredAds = overviewAds

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

    const totalPurchases = totalConversions;

    // ===== KPI CARD COMPONENT (inline) =====
    const kpiCards = [
        { label: "Total Spend",   value: `$${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,  icon: DollarSign,    theme: "blue",    desc: "Total Investment",       info: "Total amount spent on active ads." },
        { label: "Total Revenue", value: `$${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: TrendingUp,   theme: "emerald", desc: "Revenue Generated",      info: "Total revenue generated from conversion value." },
        { label: "Purchases",     value: totalPurchases.toLocaleString("en-US"),                   icon: ShoppingCart,  theme: "amber",   desc: "Total Sales",            info: "Total number of completed purchases." },
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
        blue:    "#007aff", emerald: "#10b981", green:  "#10b981",
        red:     "#ef4444", indigo:  "#007aff",  violet: "#8b5cf6",
        amber:   "#f59e0b", sky:     "#0ea5e9",  pink:   "#ec4899",
        teal:    "#14b8a6", orange:  "#f97316",
    }
    const bgThemeMap: Record<string, string> = {
        blue:    "bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400",
        emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        green:   "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        red:     "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400",
        indigo:  "bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400",
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
                "rounded-xl px-3.5 py-2.5 shadow-sm border text-xs font-bold backdrop-blur-md",
                isDark
                    ? "bg-card border-border text-zinc-100"
                    : "bg-white border-border text-zinc-900"
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
                "rounded-xl px-3.5 py-2.5 shadow-sm border backdrop-blur-md",
                isDark
                    ? "bg-card border-border"
                    : "bg-white border-border"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: fill }} />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isDark ? "text-zinc-300" : "text-muted-foreground")}>
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
                        <div className="flex items-center justify-between mb-5 px-1">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-gradient-primary text-white shadow-sm">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-foreground tracking-tight leading-none">
                                        Performance Overview
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-1">
                                        {selectedAccountId === "all"
                                            ? `All Accounts · ${filteredAds.length} ads`
                                            : `${filteredAds[0]?.accountName || "Account"} · ${filteredAds.length} ads`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── ZONE 1: Hero KPI cards ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
                            {[
                                { label: "Total Spend",   value: `$${totalSpend.toLocaleString(undefined,   { maximumFractionDigits: 0 })}`, sub: "ad spend",  color: "blue" },
                                { label: "Revenue", value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, sub: "revenue",   color: "emerald" },
                                { label: "Net Profit",    value: `$${netProfit.toLocaleString(undefined,    { maximumFractionDigits: 0 })}`, sub: netProfit >= 0 ? "profit" : "loss", color: netProfit >= 0 ? "emerald" : "red" },
                                { label: "Purchases",     value: totalPurchases.toLocaleString(undefined),                                 sub: "total sales", color: "amber" },
                                { label: "ROAS",          value: `${avgRoas.toFixed(2)}x`,                                                 sub: "on ad spend", color: "indigo" },
                            ].map((h, i) => {
                                const cm: Record<string, { val: string; bg: string; bd: string }> = {
                                    blue:    { val: "text-sky-500",    bg: isDark ? "bg-sky-500/10"    : "bg-sky-50",    bd: isDark ? "border-sky-500/20"    : "border-sky-200" },
                                    emerald: { val: "text-emerald-500", bg: isDark ? "bg-emerald-500/10" : "bg-emerald-50", bd: isDark ? "border-emerald-500/20" : "border-emerald-200" },
                                    red:     { val: "text-red-500",     bg: isDark ? "bg-red-500/10"     : "bg-red-50",     bd: isDark ? "border-red-500/20"     : "border-red-200" },
                                    indigo:  { val: "text-sky-500",  bg: isDark ? "bg-sky-500/10"  : "bg-sky-50",  bd: isDark ? "border-sky-500/20"  : "border-sky-200" },
                                    amber:   { val: "text-amber-500",   bg: isDark ? "bg-amber-500/10"   : "bg-amber-50",   bd: isDark ? "border-amber-500/20"   : "border-amber-200" },
                                }
                                const c = cm[h.color]
                                return (
                                    <div 
                                        key={h.label} 
                                        style={{ animationDelay: `${i * 100}ms` }}
                                        className={cn(
                                            "flex flex-col justify-between p-4 rounded-xl border min-h-[90px] transition-all duration-500", // Removed group and cursor-default
                                            "hover:-translate-y-1.5 hover:shadow-sm dark:hover:shadow-black/40",
                                            "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
                                            c.bg, c.bd,
                                            h.color === "blue"    && "hover:border-sky-500/40 hover:shadow-sky-500/10",
                                            h.color === "emerald" && "hover:border-emerald-500/40 hover:shadow-emerald-500/10",
                                            h.color === "red"     && "hover:border-red-500/40 hover:shadow-red-500/10",
                                            h.color === "indigo"  && "hover:border-sky-500/40 hover:shadow-sky-500/10",
                                            h.color === "amber"   && "hover:border-amber-500/40 hover:shadow-amber-500/10"
                                        )}
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-muted-foreground transition-colors">{h.label}</p>
                                        <div>
                                            <p className={cn("text-2xl font-black font-mono nums leading-none mt-2 transition-transform group-hover:scale-105 origin-left", c.val)}>{h.value}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{h.sub}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* ── ZONE 2: Secondary stats ── */}
                        <div className={cn(
                            "mb-3 rounded-xl border overflow-hidden",
                            isDark ? "border-border bg-white/[0.02]" : "border-border bg-zinc-50"
                        )}>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:flex items-stretch -ml-px -mt-px">
                                {kpiCards.slice(4).map((k, i) => (
                                    <div key={k.label}
                                        style={{ animationDelay: `${(i + 4) * 50}ms` }}
                                        className={cn(
                                        "flex-1 flex flex-col items-center justify-center py-3 px-1 text-center transition-all duration-300",
                                        "border-l border-t border-border",
                                        "hover:bg-zinc-100 dark:hover:bg-white/5",
                                        "animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                                    )}>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1.5 whitespace-nowrap transition-colors">{k.label}</p>
                                        <p className="text-sm font-black font-mono leading-none transition-transform hover:scale-110" style={{ color: themeColors[k.theme] }}>{k.value}</p>
                                    </div>
                                ))}
                            </div>
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
                                    icon: <BarChart2 className="h-4 w-4 text-sky-500" />,
                                    iconBg: "bg-sky-500/15",
                                    badge: "Campaigns",
                                    badgeColor: "text-sky-500",
                                    name: topCamp ? topCamp[0] : "No campaigns",
                                    metaLeft: `${campaigns.length} active`,
                                    metaLeftColor: "text-sky-500",
                                    metaRight: topCamp ? `$${topCamp[1].toLocaleString("en-US", { maximumFractionDigits: 0 })} top spend` : "",
                                },
                            ].filter(Boolean) as { icon: React.ReactNode; iconBg: string; badge: string; badgeColor: string; name: string; metaLeft: string; metaLeftColor: string; metaRight: string }[]
                            return (
                                <div className={cn("rounded-xl border mb-3 overflow-hidden", isDark ? "border-border bg-white/[0.02]" : "border-border bg-zinc-50")}>
                                    {rows.map((row, i) => (
                                        <div key={row.badge} className={cn(
                                            "flex items-center gap-3 px-4 py-3.5 transition-all duration-300", // Removed group and cursor-default
                                            "hover:bg-zinc-100/80 dark:hover:bg-white/[0.05]",
                                            i > 0 && (isDark ? "border-t border-border" : "border-t border-border")
                                        )}>
                                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3", row.iconBg)}>
                                                {row.icon}
                                            </div>
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={cn("text-[9px] font-black uppercase tracking-widest transition-opacity group-hover:opacity-100 opacity-80", row.badgeColor)}>{row.badge}</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-foreground truncate leading-tight max-w-[120px] sm:max-w-[240px] transition-all group-hover:translate-x-1 group-hover:text-[#1877F2]">
                                                    {row.name}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 transition-transform group-hover:scale-105">
                                                <p className={cn("text-sm font-black font-mono", row.metaLeftColor)}>{row.metaLeft}</p>
                                                <p className="text-[9px] text-muted-foreground font-bold whitespace-nowrap">{row.metaRight}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}



                        {/* ── ZONE 4: Tabbed charts ── */}
                        <Tabs defaultValue="spend" className="w-full">
                            <TabsList className="mb-4 h-auto p-1 bg-zinc-100 dark:bg-card border border-border rounded-xl grid grid-cols-2 lg:grid-cols-4 w-full">
                                <TabsTrigger value="spend" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <BarChart2 className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">ROAS Trends</span><span className="sm:hidden">ROAS</span>
                                </TabsTrigger>
                                <TabsTrigger value="ctr" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <Percent className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">CTR Analysis</span><span className="sm:hidden">CTR</span>
                                </TabsTrigger>
                                <TabsTrigger value="format" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <PieChartIcon className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Format Mix</span><span className="sm:hidden">Format</span>
                                </TabsTrigger>
                                <TabsTrigger value="top" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wide data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <List className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">Top Performers</span><span className="sm:hidden">Top</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* ---- TAB 1: Spend & Revenue ---- */}
                            <TabsContent value="spend" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="card-premium rounded-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-border transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <h3 className="text-sm font-black text-foreground mb-0.5">ROAS Trends</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium mb-4">Top 10 ads by ROAS</p>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={spendChartData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }} style={{ background: "transparent" }}>
                                                        <defs>
                                                            <linearGradient id="metaSpendGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#007aff" />
                                                                <stop offset="100%" stopColor="#0dd6ec" />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 700, fill: "currentColor", fillOpacity: 0.6 }} angle={-35} textAnchor="end" tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: "currentColor", fillOpacity: 0.6 }} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} />
                                                        <RechartsTooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                                                        <Bar dataKey="spend"   fill="url(#metaSpendGrad)" radius={[4,4,0,0]} maxBarSize={22} />
                                                        <Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]} maxBarSize={22} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Spend</div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Revenue</div>
                                            </div>
                                        </div>
                                        {/* RIGHT: Stats */}
                                        <div className="p-5 flex flex-col justify-between">
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Summary</h3>
                                            <div className="space-y-3 flex-1">
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-sky-500/5 hover:border-sky-500/20" : "bg-zinc-50 border-border hover:bg-sky-50 hover:border-sky-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-sky-500/70 transition-colors">Total Spend</p>
                                                        <p className="text-lg font-black text-sky-500 font-mono transition-transform group-hover:scale-105 origin-left">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <DollarSign className="h-5 w-5 text-sky-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-sky-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-emerald-500/5 hover:border-emerald-500/20" : "bg-zinc-50 border-border hover:bg-emerald-50 hover:border-emerald-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-emerald-500/70 transition-colors">Total Revenue</p>
                                                        <p className="text-lg font-black text-emerald-500 font-mono transition-transform group-hover:scale-105 origin-left">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <TrendingUp className="h-5 w-5 text-emerald-500/30 transition-all group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:text-emerald-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300",
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-amber-500/5 hover:border-amber-500/20" : "bg-zinc-50 border-border hover:bg-amber-50 hover:border-amber-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-500/70 transition-colors">Total Purchases</p>
                                                        <p className="text-lg font-black text-amber-500 font-mono transition-transform group-hover:scale-105 origin-left">{totalPurchases.toLocaleString()}</p>
                                                    </div>
                                                    <ShoppingCart className="h-5 w-5 text-amber-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-amber-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    netProfit >= 0 
                                                        ? (isDark ? "bg-emerald-900/10 border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/30" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400")
                                                        : (isDark ? "bg-red-900/10 border-red-500/15 hover:bg-red-500/10 hover:border-red-500/30" : "bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-400")
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground transition-colors">Net Profit</p>
                                                        <p className={cn("text-lg font-black font-mono transition-transform group-hover:scale-105 origin-left", netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                    </div>
                                                    <Zap className={cn("h-5 w-5 transition-all group-hover:scale-110 group-hover:rotate-12", netProfit >= 0 ? "text-emerald-500/30 group-hover:text-emerald-500" : "text-red-500/30 group-hover:text-red-500")} />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-sky-500/5 hover:border-sky-500/20" : "bg-zinc-50 border-border hover:bg-sky-50 hover:border-sky-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-sky-500/70 transition-colors">ROAS</p>
                                                        <p className="text-lg font-black text-sky-500 font-mono transition-transform group-hover:scale-105 origin-left">{avgRoas.toFixed(2)}x</p>
                                                    </div>
                                                    <Activity className="h-5 w-5 text-sky-500/30 transition-all group-hover:scale-110 group-hover:text-sky-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>

                            {/* ---- TAB 2: CTR Analysis ---- */}
                            <TabsContent value="ctr" className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <Card className="card-premium rounded-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-border transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <h3 className="text-sm font-black text-foreground mb-0.5">CTR by Ad</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium mb-4">Top 10 ads by click-through rate</p>
                                            <div className="h-52">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={ctrChartData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }} style={{ background: "transparent" }}>
                                                        <defs>
                                                            <linearGradient id="metaCtrGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#007aff" />
                                                                <stop offset="100%" stopColor="#0dd6ec" />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 700, fill: "currentColor", fillOpacity: 0.6 }} angle={-35} textAnchor="end" tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: "currentColor", fillOpacity: 0.6 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                                                        <RechartsTooltip content={<ChartTooltip prefix="" suffix="%" />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                                                        <Bar dataKey="ctr" fill="url(#metaCtrGrad)" radius={[4,4,0,0]} maxBarSize={22} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-3">
                                                <div className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
                                                <span className="text-[9px] font-black text-muted-foreground">CTR %</span>
                                            </div>
                                        </div>
                                        {/* RIGHT: Stats */}
                                        <div className="p-5 flex flex-col justify-between">
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">CTR Insights</h3>
                                            <div className="space-y-3 flex-1">
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-border hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-violet-500/70 transition-colors">Best CTR</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{(Math.max(...filteredAds.map(a => Number(a.ctr) || 0))).toFixed(2)}%</p>
                                                    </div>
                                                    <Percent className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-border hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-violet-500/70 transition-colors">Avg CTR</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{avgCtr.toFixed(2)}%</p>
                                                    </div>
                                                    <Activity className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-violet-500/5 hover:border-violet-500/20" : "bg-zinc-50 border-border hover:bg-violet-50 hover:border-violet-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-violet-500/70 transition-colors">Total Clicks</p>
                                                        <p className="text-lg font-black text-violet-500 font-mono transition-transform group-hover:scale-105 origin-left">{totalClicks.toLocaleString()}</p>
                                                    </div>
                                                    <MousePointer2 className="h-5 w-5 text-violet-500/30 transition-all group-hover:scale-110 group-hover:rotate-12 group-hover:text-violet-500" />
                                                </div>
                                                <div className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-300", // Removed group and cursor-default
                                                    isDark ? "bg-white/[0.03] border-border hover:bg-amber-500/5 hover:border-amber-500/20" : "bg-zinc-50 border-border hover:bg-amber-50 hover:border-amber-300"
                                                )}>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-500/70 transition-colors">Avg CPC</p>
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
                                <Card className="card-premium rounded-xl overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">
                                        {/* LEFT: Pie Chart */}
                                        <div className="p-5 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-border transition-colors duration-300 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                                            <h3 className="text-sm font-black text-foreground mb-0.5">Format Diversity</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium mb-2">Spend by ad type</p>
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
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Spend Breakdown</h3>
                                            <div className="space-y-2.5">
                                                {formatChartData.map((item, i) => {
                                                    const pct = totalSpend > 0 ? (item.value / totalSpend * 100) : 0
                                                    return (
                                                        <div key={item.name} className="group cursor-default p-2 rounded-lg transition-all duration-300 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                                    <span className="text-[10px] font-black text-foreground uppercase tracking-wide group-hover:text-[#1877F2] transition-colors">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[9px] font-black transition-transform group-hover:scale-110" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>{pct.toFixed(1)}%</span>
                                                                    <span className="text-[9px] text-muted-foreground font-bold">${item.value.toLocaleString()}</span>
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
                            <Card className="card-premium p-5 md:p-6 rounded-xl overflow-x-auto">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-foreground">Top Performers</h3>
                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">Top 10 ads ranked by ROAS</p>
                                        </div>
                                        <Badge className="bg-gradient-primary text-white border-none font-black text-xs px-3 py-1">
                                            {topAdsByRoas.length} Ads
                                        </Badge>
                                    </div>
                                    <div className="overflow-x-auto -mx-5 md:mx-0">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-zinc-100 dark:border-border">
                                                    {["#", "Ad Name", "Spend", "Revenue", "ROAS", "CTR", "Clicks", "Purchases"].map(h => (
                                                        <th key={h} className="pb-3 px-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
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
                                                            className="border-b border-zinc-50 dark:border-border hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group"
                                                        >
                                                            <td className="py-3 px-4 text-[10px] font-black text-muted-foreground">#{i + 1}</td>
                                                            <td className="py-3 px-4 max-w-[140px] md:max-w-[200px]">
                                                                <p className="text-xs font-bold text-foreground truncate group-hover:text-[#1877F2] transition-colors">{ad.adName}</p>
                                                                <p className="text-[9px] text-muted-foreground font-medium truncate">{ad.campaignName}</p>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-black text-sky-500 whitespace-nowrap">${sp.toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-black text-emerald-500 whitespace-nowrap">${rev.toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-black whitespace-nowrap">
                                                                <span className={cn(adRoas >= 2 ? "text-emerald-500" : adRoas >= 1 ? "text-amber-500" : "text-red-400")}>
                                                                    {adRoas.toFixed(2)}x
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-xs font-black text-violet-500 whitespace-nowrap">{(Number(ad.ctr) || 0).toFixed(2)}%</td>
                                                            <td className="py-3 px-4 text-xs font-bold text-muted-foreground dark:text-muted-foreground">{(Number(ad.clicks) || 0).toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-xs font-bold text-muted-foreground dark:text-muted-foreground">{(Number(ad.purchases) || 0).toLocaleString()}</td>
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
                            <div className="p-1.5 rounded-lg bg-gradient-primary text-white shadow-sm">
                                <Layout className="h-3.5 w-3.5" />
                            </div>
                            <h1 className="text-[10px] font-black tracking-[0.25em] gradient-text uppercase">
                                HOLAPRIME SOURCE LIBRARY
                            </h1>
                        </div>

                        <SampleAds
                            ads={gridAds}
                            hasAdsInAccount={gridTotal > 0 || gridLoading}
                            searchQuery={searchQuery}
                            selectedAdId={null}
                            onSelect={(id) => {
                                const ad = gridAds.find(a => a.id === id);
                                if (ad && onSelectAd) {
                                  onSelectAd(ad);
                                }
                            }}
                            onEnlargeImage={onEnlargeImage}
                            extraActions={
                                 <button
                                     onClick={() => setShowOverview(true)}
                                     className="btn-gradient group flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white cursor-pointer"
                                 >
                                     <TrendingUp className="h-3 w-3 shrink-0 transition-transform group-hover:-translate-y-px" />
                                     <span>OVERVIEW</span>
                                 </button>
                            }
                        />

                        {totalAdPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5 mt-5 pb-2 flex-wrap">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    title="First page"
                                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronsLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                                </button>
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground tabular-nums px-1">
                                    Page
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={pageInput}
                                        onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
                                        onKeyDown={(e) => { if (e.key === "Enter") goToPage(pageInput) }}
                                        onBlur={() => goToPage(pageInput)}
                                        className="w-14 h-8 text-center rounded-lg border border-border bg-card text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-500"
                                    />
                                    / {totalAdPages.toLocaleString()}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalAdPages, p + 1))}
                                    disabled={currentPage === totalAdPages}
                                    className="flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalAdPages)}
                                    disabled={currentPage === totalAdPages}
                                    title="Last page"
                                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <ChevronsRight className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] font-bold text-muted-foreground tabular-nums ml-2">
                                    {gridLoading ? "loading…" : `${gridTotal.toLocaleString()} ads`}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}
