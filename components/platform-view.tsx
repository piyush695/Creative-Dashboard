"use client"

/**
 * PlatformView — the single shared layout for every platform page (Meta, Google,
 * AdRoll, …). It is a 1:1 implementation of the approved dashboard wireframe:
 *
 *   {Platform} overview   ● Live                         [7D] [30D] [90D]
 *   ┌ Reach ┐ ┌ Impr ┐ ┌ CPM ┐ ┌ Results ┐ ┌ Value ┐ ┌ ROAS ┐
 *   Overview · Campaigns · Ads & assets · {4th}
 *   ┌ Performance snapshot (line) ──────┐ ┌ Top campaigns ┐
 *   ┌ Format performance (bars) ───────────────────────────┐
 *
 * Platforms stay thin wrappers: they pass their data, accent, the metric labels,
 * the 4th-tab renderer, and any platform-specific control (e.g. a Historical/Live
 * toggle) or a body override (realtime view). Theming is token-based so Dark mode
 * keeps the dashboard's scheme and Light mode is the clean professional version.
 */

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react"
import { AdData } from "@/lib/types"
import { Layout, TrendingUp, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { startOfDay, endOfDay, subDays } from "date-fns"
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
} from "recharts"
import SampleAds from "./sample-ads"
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker"
import { AccountSwitcher, type AccountStat } from "@/components/account-switcher"
import {
    Pagination, PaginationContent, PaginationItem, PaginationLink,
    PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination"

export const compact = (n: number) => {
    if (!isFinite(n) || n === 0) return "0"
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

// Walk up from `node` to the nearest scrollable ancestor (the dashboard's main
// scroll container). Used for save/restore of the scroll position.
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
    let el = node?.parentElement ?? null
    while (el) {
        const oy = getComputedStyle(el).overflowY
        if (oy === "auto" || oy === "scroll") return el
        el = el.parentElement
    }
    return null
}

export interface PlatformKpis {
    spend: number
    impressions: number
    reach: number
    clicks: number
    conversions: number
    convValue: number
    ctr: number
    cpc: number
    cpm: number
    roas: number
}

export interface PlatformMetric {
    label: string
    value: string
}

export interface FourthTab {
    id: string
    label: string
    icon: any
    render: (ctx: { ads: AdData[]; accent: string; kpis: PlatformKpis; accountId: string; dateRange?: { from?: string; to?: string } }) => ReactNode
}

export interface PlatformViewProps {
    /** Brand accent (hex) — active tab, range pill, chart line, bars. */
    accent: string
    /** Page title, e.g. "Meta overview". */
    title: string
    /** Selected platform's icon, shown next to the title in the section header. */
    icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>
    /** Stable key for persisting tab/page/scroll state across detail round-trips. */
    persistKey?: string
    /** Platform-filtered ads for this view. */
    ads: AdData[]
    selectedAccountId: string
    /** Ad accounts for the in-header switcher (next to Live). */
    accountStats?: AccountStat[]
    /** Total ads across all accounts — shown on the "All accounts" row. */
    totalAds?: number
    /** Switch the active ad account. When omitted, the switcher is hidden. */
    onSelectAccount?: (id: string) => void
    searchQuery: string
    onSearchChange?: (q: string) => void
    onSelectAd: (ad: AdData) => void
    onEnlargeImage?: (url: string, title: string) => void
    onRefresh?: () => void
    isSyncing?: boolean
    /** Builds the 6 metric cards from the computed KPIs. */
    buildMetrics: (k: PlatformKpis) => PlatformMetric[]
    /** The platform-specific 4th tab (Keywords for Google, Audiences elsewhere). */
    fourthTab: FourthTab
    /** Extra header control (e.g. a Historical/Live data-source toggle). */
    headerControls?: ReactNode
    /** When provided, replaces the tabbed body entirely (e.g. realtime view). */
    bodyOverride?: ReactNode
    /** Initial active tab id. */
    defaultTab?: string
    /** Server-side Overview roll-up (KPIs + chart + campaigns + formats). When set, the Overview doesn't read the `ads` prop. */
    fetchOverview?: (opts: { accountId: string; search: string; dateRange?: { from?: string; to?: string } }) => Promise<{ kpis: PlatformKpis; series: { label: string; revenue: number; spend: number }[]; topCampaigns: any[]; formats: { name: string; value: number }[] }>
    /** Server-side Ads pagination. When set, the Ads grid pages from the server instead of slicing `ads`. */
    fetchAdsPage?: (opts: { accountId: string; search: string; page: number; perPage: number; dateRange?: { from?: string; to?: string } }) => Promise<{ ads: AdData[]; total: number }>
    /** Returns the latest date (YYYY-MM-DD) that actually has data. When set, the
     *  default window auto-anchors to it so the first view is never empty. */
    fetchLatestDate?: (opts: { accountId: string }) => Promise<string | null>
}

const ADS_PER_PAGE = 10

export default function PlatformView({
    accent,
    title,
    persistKey,
    ads,
    selectedAccountId,
    accountStats,
    totalAds,
    onSelectAccount,
    searchQuery,
    onSelectAd,
    onEnlargeImage,
    buildMetrics,
    fourthTab,
    headerControls,
    bodyOverride,
    defaultTab = "overview",
    fetchOverview,
    fetchAdsPage,
    fetchLatestDate,
}: PlatformViewProps) {
    const [activeTab, setActiveTab] = useState(defaultTab)
    // Root element ref — used to find the scrollable ancestor so we can restore
    // the scroll position when the user returns from an ad's analysis view.
    const rootRef = useRef<HTMLDivElement>(null)
    // Session key for persisting tab / page / scroll across the unmount that
    // happens when an ad detail view replaces this list and is then closed.
    const storeKey = `pv:${persistKey || title}`
    // Date-range calendar dropdown. Defaults to the last 90 days (bounded recent
    // window — fast, not all-time). Empty range ({}) = "All time".
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
        from: startOfDay(subDays(new Date(), 89)),
        to: endOfDay(new Date()),
    }))
    // Auto-anchor: if the platform reports the latest date that actually has data
    // (e.g. a static snapshot that ends weeks ago), shift the default 90-day window
    // to END at that date so the first view is never empty regardless of the
    // calendar. Runs once on mount; a manual date pick afterwards takes over.
    const anchoredRef = useRef(false)
    useEffect(() => {
        if (!fetchLatestDate || anchoredRef.current) return
        anchoredRef.current = true
        fetchLatestDate({ accountId: selectedAccountId })
            .then((d) => {
                if (!d) return
                const dt = new Date(`${d}T00:00:00`)
                if (isNaN(dt.getTime()) || dt.getTime() >= startOfDay(new Date()).getTime()) return
                setDateRange({ from: startOfDay(subDays(dt, 89)), to: endOfDay(dt) })
            })
            .catch(() => { })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Only apply the recency window when the data actually carries dates, so a
    // dataset without analysisDate never renders empty.
    const hasDates = useMemo(() => ads.some((a: any) => a.analysisDate), [ads])

    // Human label for the snapshot subtitle ("last 7 days", "all time", …).
    const rangeLabel = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return "all time"
        const days = Math.max(1, Math.round((endOfDay(dateRange.to).getTime() - startOfDay(dateRange.from).getTime()) / 86400000))
        return `last ${days} day${days === 1 ? "" : "s"}`
    }, [dateRange])

    // Account + search filtered (NO date window). Drives the Ads catalog so the
    // section can show every ad in the database for the selected account.
    const accountSearchAds = useMemo(() => {
        const term = searchQuery.toLowerCase().trim()
        return ads.filter((ad: any) => {
            const matchesAccount = selectedAccountId === "all" || ad.adAccountId === selectedAccountId
            const matchesSearch = !term ||
                (ad.adName?.toLowerCase() || "").includes(term) ||
                (ad.campaignName?.toLowerCase() || "").includes(term) ||
                (ad.adId?.toLowerCase() || "").includes(term)
            return matchesAccount && matchesSearch
        })
    }, [ads, selectedAccountId, searchQuery])

    // Additionally date-windowed — drives KPIs, snapshot chart and campaigns.
    const filteredAds = useMemo(() => {
        const fromT = dateRange?.from ? startOfDay(dateRange.from).getTime() : null
        const toT = dateRange?.to ? endOfDay(dateRange.to).getTime() : null
        return accountSearchAds.filter((ad: any) => {
            if (!hasDates || !ad.analysisDate) return true
            const t = new Date(ad.analysisDate).getTime()
            return (fromT === null || t >= fromT) && (toT === null || t <= toT)
        })
    }, [accountSearchAds, dateRange, hasDates])

    const kpis: PlatformKpis = useMemo(() => {
        const spend = filteredAds.reduce((s, a) => s + Number(a.spend || 0), 0)
        const impressions = filteredAds.reduce((s, a) => s + Number(a.impressions || 0), 0)
        const reach = filteredAds.reduce((s, a) => s + Number((a as any).reach || 0), 0) || impressions
        const clicks = filteredAds.reduce((s, a) => s + Number(a.clicks || 0), 0)
        const conversions = filteredAds.reduce((s, a) => s + Number(a.purchases || 0), 0)
        const convValue = filteredAds.reduce((s, a) => s + Number(a.purchaseValue || 0), 0)
        return {
            spend, impressions, reach, clicks, conversions, convValue,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
            cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
            roas: spend > 0 ? convValue / spend : 0,
        }
    }, [filteredAds])

    const analytics = useMemo(() => {
        // Daily revenue vs spend series for the snapshot chart.
        const byDay = new Map<string, { day: string; revenue: number; spend: number }>()
        filteredAds.forEach((ad: any) => {
            const day = ad.analysisDate ? new Date(ad.analysisDate).toISOString().slice(0, 10) : "—"
            const e = byDay.get(day) || { day, revenue: 0, spend: 0 }
            e.revenue += Number(ad.purchaseValue || 0)
            e.spend += Number(ad.spend || 0)
            byDay.set(day, e)
        })
        let series = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-14)
            .map(d => ({ label: d.day === "—" ? "—" : new Date(d.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), revenue: d.revenue, spend: d.spend }))
        // With a single data point a line can't draw — pad so the chart still shows.
        if (series.length === 1) series = [{ ...series[0], label: "" }, series[0]]

        const campaignMap = new Map<string, { name: string; spend: number; count: number; clicks: number; impr: number; revenue: number }>()
        filteredAds.forEach((ad: any) => {
            const name = ad.campaignName || "Unnamed campaign"
            const cur = campaignMap.get(name) || { name, spend: 0, count: 0, clicks: 0, impr: 0, revenue: 0 }
            cur.spend += Number(ad.spend || 0); cur.count += 1; cur.clicks += Number(ad.clicks || 0); cur.impr += Number(ad.impressions || 0); cur.revenue += Number(ad.purchaseValue || 0)
            campaignMap.set(name, cur)
        })
        const topCampaigns = Array.from(campaignMap.values())
            .map(c => ({ ...c, ctr: c.impr > 0 ? (c.clicks / c.impr) * 100 : 0, roas: c.spend > 0 ? c.revenue / c.spend : 0 }))
            .sort((a, b) => b.spend - a.spend)

        const typeMap = new Map<string, number>()
        filteredAds.forEach((ad: any) => {
            const type = ad.adType || (ad.adName?.toLowerCase().includes("video") ? "Video" : "Image")
            typeMap.set(type, (typeMap.get(type) || 0) + Number(ad.spend || 0))
        })
        const formats = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

        return { series, topCampaigns, formats }
    }, [filteredAds])

    // Every ad in the database for the selected account (deduped + ROAS-sorted).
    // Independent of the date window so the Ads section lists the full catalog.
    const catalogAds = useMemo(() =>
        [...accountSearchAds]
            .filter((ad, i, self) => i === self.findIndex(t => t.adId === ad.adId))
            .sort((a, b) => {
                const ra = Number(a.spend) > 0 ? (Number(a.purchaseValue) || 0) / Number(a.spend) : 0
                const rb = Number(b.spend) > 0 ? (Number(b.purchaseValue) || 0) / Number(b.spend) : 0
                return rb - ra
            }), [accountSearchAds])

    // ── Ads pagination (10 per page) ──────────────────────────────────────────
    const [adsPage, setAdsPage] = useState(1)
    const totalAdPages = Math.max(1, Math.ceil(catalogAds.length / ADS_PER_PAGE))
    // Reset to the first page whenever the catalog changes (account/search) or
    // the current page falls out of range.
    useEffect(() => { setAdsPage(1) }, [selectedAccountId, searchQuery])
    // CLIENT-MODE ONLY: clamp to the in-memory page count. In server mode the
    // catalog isn't in the browser (so totalAdPages collapses to 1) — running
    // this there snaps every page click back to 1. The server clamp below
    // (guarded by serverGrid) handles out-of-range pages for server mode.
    useEffect(() => { if (!fetchAdsPage && adsPage > totalAdPages) setAdsPage(1) }, [adsPage, totalAdPages, fetchAdsPage])
    const pagedAds = useMemo(
        () => catalogAds.slice((adsPage - 1) * ADS_PER_PAGE, adsPage * ADS_PER_PAGE),
        [catalogAds, adsPage],
    )

    // ── Optional server data source ───────────────────────────────────────────
    // When the platform passes fetchOverview / fetchAdsPage, the heavy roll-up +
    // paging happen in MongoDB and the browser holds only the current page + a
    // small summary (the `ads` prop can be empty). Platforms that don't pass them
    // keep the client-side path above, unchanged.
    const serverOv = !!fetchOverview
    const serverGrid = !!fetchAdsPage
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchQuery), 300); return () => clearTimeout(t) }, [searchQuery])

    // Date window → YYYY-MM-DD strings for the server (filters by ad createdTime).
    // Use LOCAL date parts (not toISOString) so the picked day isn't TZ-shifted.
    const ymdLocal = (d?: Date) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined
    const srvFrom = dateRange?.from ? ymdLocal(dateRange.from) : undefined
    const srvTo = dateRange?.to ? ymdLocal(dateRange.to) : undefined
    const srvDateRange = (srvFrom || srvTo) ? { from: srvFrom, to: srvTo } : undefined
    // Reset to the first page whenever the date window changes.
    useEffect(() => { setAdsPage(1) }, [srvFrom, srvTo])

    const [srvOverview, setSrvOverview] = useState<{ kpis: PlatformKpis; series: { label: string; revenue: number; spend: number }[]; topCampaigns: any[]; formats: { name: string; value: number }[] } | null>(null)
    useEffect(() => {
        if (!fetchOverview) return
        let cancelled = false
        fetchOverview({ accountId: selectedAccountId, search: debouncedSearch, dateRange: srvDateRange }).then(r => { if (!cancelled) setSrvOverview(r) }).catch(() => { })
        return () => { cancelled = true }
    }, [fetchOverview, selectedAccountId, debouncedSearch, srvFrom, srvTo])

    const [srvAds, setSrvAds] = useState<{ ads: AdData[]; total: number }>({ ads: [], total: 0 })
    // Only fetch the ads grid when the Ads tab is actually open — this keeps the
    // initial Overview landing fast (one fewer live query, which matters for the
    // slower Google API path).
    useEffect(() => {
        if (!fetchAdsPage || activeTab !== "ads") return
        let cancelled = false
        fetchAdsPage({ accountId: selectedAccountId, search: debouncedSearch, page: adsPage, perPage: ADS_PER_PAGE, dateRange: srvDateRange }).then(r => { if (!cancelled) setSrvAds(r) }).catch(() => { })
        return () => { cancelled = true }
    }, [fetchAdsPage, selectedAccountId, debouncedSearch, adsPage, srvFrom, srvTo, activeTab])

    const effKpis = serverOv ? (srvOverview?.kpis ?? kpis) : kpis
    const effAnalytics = serverOv ? (srvOverview ?? { series: [], topCampaigns: [], formats: [] }) : analytics
    const effPagedAds = serverGrid ? srvAds.ads : pagedAds
    const effTotalAds = serverGrid ? srvAds.total : catalogAds.length
    const effTotalAdPages = serverGrid ? Math.max(1, Math.ceil(srvAds.total / ADS_PER_PAGE)) : totalAdPages
    useEffect(() => { if (serverGrid && adsPage > effTotalAdPages) setAdsPage(1) }, [serverGrid, adsPage, effTotalAdPages])

    // ── Tab / page / scroll persistence ───────────────────────────────────────
    // Selecting an ad swaps this whole list out for the analysis view; closing it
    // remounts us fresh. To "return to the exact same position and state", we
    // persist the active tab, the ads page and the scroll offset in sessionStorage
    // and restore them on mount. (An explicit "go to platform root" clears the key
    // — see goToPlatformRoot in the dashboard page.)
    const [hydrated, setHydrated] = useState(false)
    // Restore tab + page once on mount. Declared AFTER the page-reset effects so
    // it wins on the initial mount and re-applies the saved page. `hydrated` is a
    // state flag (not a ref) so the persist effect below only runs once the
    // restored values are actually committed — never overwriting them with the
    // transient defaults from the first render.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(storeKey)
            if (raw) {
                const s = JSON.parse(raw)
                if (s.tab) setActiveTab(s.tab)
                if (typeof s.page === "number" && s.page > 0) setAdsPage(s.page)
            }
        } catch { /* sessionStorage may be unavailable */ }
        setHydrated(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Persist tab + page on change (only after the initial restore has committed).
    useEffect(() => {
        if (!hydrated) return
        try {
            const raw = sessionStorage.getItem(storeKey)
            const s = raw ? JSON.parse(raw) : {}
            sessionStorage.setItem(storeKey, JSON.stringify({ ...s, tab: activeTab, page: adsPage }))
        } catch { /* ignore */ }
    }, [hydrated, activeTab, adsPage, storeKey])

    // Restore scroll on mount + keep the saved offset up to date while scrolling.
    useEffect(() => {
        const scroller = getScrollParent(rootRef.current)
        if (!scroller) return
        try {
            const raw = sessionStorage.getItem(storeKey)
            const saved = raw ? JSON.parse(raw).scroll : undefined
            if (typeof saved === "number" && saved > 0) {
                // Restore after paint so the content has its full height.
                requestAnimationFrame(() => { scroller.scrollTop = saved })
            }
        } catch { /* ignore */ }

        let frame = 0
        const onScroll = () => {
            // Throttle writes to one per animation frame.
            if (frame) return
            frame = requestAnimationFrame(() => {
                frame = 0
                try {
                    const raw = sessionStorage.getItem(storeKey)
                    const s = raw ? JSON.parse(raw) : {}
                    sessionStorage.setItem(storeKey, JSON.stringify({ ...s, scroll: scroller.scrollTop }))
                } catch { /* ignore */ }
            })
        }
        scroller.addEventListener("scroll", onScroll, { passive: true })
        return () => {
            scroller.removeEventListener("scroll", onScroll)
            if (frame) cancelAnimationFrame(frame)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeKey])

    const metrics = buildMetrics(effKpis)
    const tabs = [
        { id: "overview", label: "Overview", icon: Layout },
        { id: "campaigns", label: "Campaigns", icon: TrendingUp },
        { id: "ads", label: "Ads & assets", icon: Play },
        { id: fourthTab.id, label: fourthTab.label, icon: fourthTab.icon },
    ]

    const card = "rounded-xl border border-border bg-card shadow-sm"

    const renderTab = () => {
        if (activeTab === "overview") {
            const { series, topCampaigns, formats } = effAnalytics
            const maxFmt = Math.max(1, ...formats.map(f => f.value))
            return (
                <div className="space-y-4 animate-in fade-in duration-300 pb-20">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Performance snapshot */}
                        <div className={cn(card, "lg:col-span-2 p-5")}>
                            <h2 className="text-sm font-semibold text-foreground">Performance snapshot</h2>
                            <p className="text-xs text-muted-foreground mb-3">Revenue vs spend · {rangeLabel}</p>
                            <div className="h-52 w-full">
                                {series.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.12} />
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9aa1ab" }} hide={series.length > 10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9aa1ab" }} tickFormatter={(v) => `$${compact(Number(v))}`} />
                                            <RechartsTooltip contentStyle={{ borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card)", fontSize: "11px" }} formatter={(v: any, n: any) => [`$${Number(v).toLocaleString()}`, n]} />
                                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke={accent} strokeWidth={2.5} dot={false} />
                                            <Line type="monotone" dataKey="spend" name="Spend" stroke="#c3cad3" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data in the selected range.</div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: accent }} />Revenue</span>
                                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c3cad3]" />Spend</span>
                            </div>
                        </div>

                        {/* Top campaigns */}
                        <div className={cn(card, "p-5")}>
                            <h2 className="text-sm font-semibold text-foreground mb-4">Top campaigns</h2>
                            {topCampaigns.length > 0 ? (
                                <div className="space-y-3.5">
                                    {topCampaigns.slice(0, 6).map((c) => {
                                        const pct = (c.spend / (kpis.spend || 1)) * 100
                                        return (
                                            <div key={c.name} className="flex items-center gap-3">
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: accent }} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[12px] text-foreground truncate">{c.name}</div>
                                                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: accent }} />
                                                    </div>
                                                </div>
                                                <span className="text-[12px] font-semibold text-muted-foreground shrink-0">{c.roas.toFixed(1)}x</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No campaigns in range.</p>
                            )}
                        </div>
                    </div>

                    {/* Format performance */}
                    <div className={cn(card, "p-5")}>
                        <h2 className="text-sm font-semibold text-foreground mb-4">Format performance</h2>
                        {formats.length > 0 ? (
                            <div className="space-y-2.5">
                                {formats.map((f) => (
                                    <div key={f.name} className="flex items-center gap-3">
                                        <span className="w-20 text-[12px] text-muted-foreground shrink-0">{f.name}</span>
                                        <div className="flex-1 h-3 rounded-md bg-muted overflow-hidden">
                                            <div className="h-full rounded-md" style={{ width: `${(f.value / maxFmt) * 100}%`, background: accent, opacity: 0.7 }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No format data in range.</p>
                        )}
                    </div>
                </div>
            )
        }

        if (activeTab === "campaigns") {
            // Use effAnalytics (server roll-up in server-mode; client analytics otherwise).
            // Reading `analytics` directly was empty for Meta, whose `ads` prop is [].
            const { topCampaigns } = effAnalytics
            return (
                <div className="animate-in fade-in duration-300 pb-20">
                    <div className={cn(card, "overflow-hidden")}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[560px]">
                                <thead>
                                    <tr className="border-b border-border">
                                        {["Campaign", "Spend", "Conv.", "ROAS"].map((h, i) => (
                                            <th key={h} className={cn("py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", i > 0 && "text-right")}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {topCampaigns.length > 0 ? topCampaigns.map((c) => (
                                        <tr key={c.name} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                                            <td className="py-3.5 px-5 max-w-[280px]"><p className="text-[13px] text-foreground truncate">{c.name}</p></td>
                                            <td className="py-3.5 px-5 text-right text-[13px] font-semibold text-foreground whitespace-nowrap">${c.spend.toLocaleString()}</td>
                                            <td className="py-3.5 px-5 text-right text-[13px] text-muted-foreground whitespace-nowrap">{c.count.toLocaleString()}</td>
                                            <td className="py-3.5 px-5 text-right text-[13px] font-semibold whitespace-nowrap" style={{ color: accent }}>{c.roas.toFixed(2)}x</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="py-16 text-center text-muted-foreground text-sm">No campaign data in range.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )
        }

        if (activeTab === "ads") {
            return (
                <div className="animate-in fade-in duration-300 pb-20 space-y-5">
                    <SampleAds
                        ads={effPagedAds}
                        hasAdsInAccount={effTotalAds > 0}
                        searchQuery={searchQuery}
                        selectedAdId={null}
                        onSelect={(id) => { const ad = effPagedAds.find(a => a.id === id); if (ad) onSelectAd(ad) }}
                        onEnlargeImage={onEnlargeImage}
                        hideToolbar
                    />
                    {effTotalAdPages > 1 && (
                        <AdsPagination
                            page={adsPage}
                            totalPages={effTotalAdPages}
                            onChange={setAdsPage}
                            totalAds={effTotalAds}
                            accent={accent}
                        />
                    )}
                </div>
            )
        }

        return (
            <div className="animate-in fade-in duration-300 pb-20">
                {fourthTab.render({ ads: filteredAds, accent, kpis: effKpis, accountId: selectedAccountId, dateRange: srvDateRange })}
            </div>
        )
    }

    return (
        <div ref={rootRef} className="w-full">
            {/* Header — {Platform} overview · account · date range. The leading
                platform icon was removed per design; the platform mark now lives
                on each ad card as its official logo. */}
            <div className="flex items-center gap-2.5 flex-wrap pt-1 pb-5">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{title}</h1>
                {/* Ad-account switcher — relocated here from the breadcrumb. */}
                {onSelectAccount && accountStats && (
                    <AccountSwitcher
                        selectedAccountId={selectedAccountId}
                        accountStats={accountStats}
                        totalAds={totalAds ?? accountStats.reduce((s, a) => s + a.count, 0)}
                        onSelectAccount={onSelectAccount}
                    />
                )}
                <div className="ml-auto flex items-center gap-2">
                    {headerControls}
                    {!bodyOverride && (
                        <DateRangePicker value={dateRange} onChange={setDateRange} accent={accent} />
                    )}
                </div>
            </div>

            {bodyOverride ? (
                bodyOverride
            ) : (
                <>
                    {/* Metric cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {metrics.map((m) => (
                            <div key={m.label} className="card-premium hover-lift p-4">
                                <div className="text-[12px] text-muted-foreground">{m.label}</div>
                                <div className="text-2xl font-bold tracking-tight text-foreground mt-1 nums">{m.value}</div>
                                <div className="mt-3 h-1.5 rounded-full bg-gradient-primary opacity-70" />
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-5 md:gap-7 border-b border-border mb-6 overflow-x-auto scrollbar-none" role="tablist">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon
                            const on = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 -mb-px py-2.5 text-[13px] transition-colors", on ? "font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}
                                    style={on ? { color: accent, borderColor: accent } : undefined}
                                >
                                    <TabIcon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>

                    {renderTab()}
                </>
            )}
        </div>
    )
}

// Compact page-number list with leading/trailing ellipses, e.g. 1 … 4 5 6 … 20.
function pageWindow(page: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const out: (number | "…")[] = [1]
    const start = Math.max(2, page - 1)
    const end = Math.min(total - 1, page + 1)
    if (start > 2) out.push("…")
    for (let i = start; i <= end; i++) out.push(i)
    if (end < total - 1) out.push("…")
    out.push(total)
    return out
}

function AdsPagination({
    page, totalPages, onChange, totalAds, accent,
}: {
    page: number
    totalPages: number
    onChange: (p: number) => void
    totalAds: number
    accent: string
}) {
    const from = (page - 1) * ADS_PER_PAGE + 1
    const to = Math.min(page * ADS_PER_PAGE, totalAds)
    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
            <p className="text-xs text-muted-foreground order-2 sm:order-1">
                Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
                <span className="font-medium text-foreground">{totalAds.toLocaleString()}</span> ads
            </p>
            <Pagination className="order-1 mx-0 w-auto sm:order-2">
                <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            aria-disabled={page <= 1}
                            className={cn("h-9", page <= 1 && "pointer-events-none opacity-50")}
                            onClick={(e) => { e.preventDefault(); if (page > 1) onChange(page - 1) }}
                        />
                    </PaginationItem>
                    {pageWindow(page, totalPages).map((p, i) =>
                        p === "…" ? (
                            <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                        ) : (
                            <PaginationItem key={p}>
                                <PaginationLink
                                    href="#"
                                    isActive={p === page}
                                    onClick={(e) => { e.preventDefault(); onChange(p) }}
                                    style={p === page ? { backgroundColor: accent, borderColor: accent, color: "#fff" } : undefined}
                                >
                                    {p}
                                </PaginationLink>
                            </PaginationItem>
                        ),
                    )}
                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            aria-disabled={page >= totalPages}
                            className={cn("h-9", page >= totalPages && "pointer-events-none opacity-50")}
                            onClick={(e) => { e.preventDefault(); if (page < totalPages) onChange(page + 1) }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    )
}
