"use client"

import { useState, useMemo, useEffect } from "react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Play,
    Search,
    Filter,
    TrendingUp,
    DollarSign,
    MousePointer2,
    BarChart3,
    ArrowUpRight,
    ChevronDown,
    MoreVertical,
    Download,
    Columns,
    Calendar,
    Circle,
    Pause,
    MoreHorizontal,
    Info,
    ChevronRight,
    Layout,
    Pencil,
    ExternalLink,
    Sparkles,
    Copy,
    Eye,
    Check,
    LayoutGrid,
    Library,
    Brain,
    Activity,
    Database,
    RefreshCw,
    RotateCcw,
    Wifi,
    ZoomIn,
    X,
    Globe,
    Facebook,
    Target
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from "recharts"
import { RealtimeNativeView } from "./realtime-native-view"

interface GoogleAdsViewProps {
    googleAds: AdData[]
    selectedAccountId: string
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onViewLibrary?: () => void
    onRealtimeCampaignsLoaded?: (campaigns: any[]) => void
    selectedRealtimeCampaignId?: string
    onEnlargeImage?: (url: string, title: string) => void
    onDataSourceChange?: (source: "database" | "realtime") => void
    onRefresh?: () => void
    isSyncing?: boolean
    selectedPlatform?: string
    onPlatformChange?: (platform: string) => void
}

export default function GoogleAdsView({
    googleAds,
    selectedAccountId,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onViewLibrary,
    onRealtimeCampaignsLoaded,
    selectedRealtimeCampaignId,
    onEnlargeImage,
    onDataSourceChange,
    onRefresh,
    isSyncing,
    selectedPlatform = "google",
    onPlatformChange
}: GoogleAdsViewProps) {
    const { toast } = useToast()
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState("ads")
    const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
    const [cardLimit, setCardLimit] = useState(4)

    useEffect(() => {
        const updateLimit = () => {
            setCardLimit(window.innerWidth >= 1536 ? 4 : 3)
        }
        updateLimit()
        window.addEventListener('resize', updateLimit)
        return () => window.removeEventListener('resize', updateLimit)
    }, [])
    const [selectedType, setSelectedType] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>("all")
    const [dataSource, setDataSource] = useState<"database" | "realtime">("database")
    const [displayLimit, setDisplayLimit] = useState(24)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [realtimeDateRange, setRealtimeDateRange] = useState('LAST_30_DAYS')
    const [realtimeSearchQuery, setRealtimeSearchQuery] = useState('')
    const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0)
    const [realtimeView, setRealtimeView] = useState<'campaigns' | 'ads' | 'assets'>('campaigns')

    useEffect(() => {
        setMounted(true)
    }, [])

    const [isRefreshing, setIsRefreshing] = useState(false)

    // Extract unique analysis dates from DB records (newest first)
    const uniqueAnalysisDates = useMemo(() => {
        const daySet = new Set<string>()
        googleAds.forEach(ad => {
            if (ad.analysisDate) {
                // Normalize to YYYY-MM-DD key
                const dayKey = new Date(ad.analysisDate).toISOString().slice(0, 10)
                daySet.add(dayKey)
            }
        })
        return Array.from(daySet)
            .sort((a, b) => b.localeCompare(a)) // newest first
            .map(day => ({
                value: day,
                label: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }))
    }, [googleAds])

    const selectedDateLabel = useMemo(() => {
        if (selectedDate === 'all') return 'All Time'
        const found = uniqueAnalysisDates.find(d => d.value === selectedDate)
        return found ? found.label : 'All Time'
    }, [selectedDate, uniqueAnalysisDates])

    const uniqueCampaigns = useMemo(() => {
        const camps = Array.from(new Set(googleAds.map(ad => ad.campaignName).filter((c): c is string => !!c)))
        return camps.length > 0 ? camps : ["Unnamed Campaign"]
    }, [googleAds])

    const campaignTypes = useMemo(() => {
        const types = Array.from(new Set(googleAds.map(ad => ad.adType).filter((t): t is string => !!t)))
        if (types.length === 0) return ["Search", "Display", "Shopping", "Video", "PMAX", "App", "Discovery"]
        return types
    }, [googleAds])

    const filteredAds = useMemo(() => {
        return googleAds.filter(ad => {
            const matchesAccount = selectedAccountId === "all" || ad.adAccountId === selectedAccountId
            const matchesCampaign = selectedCampaign === "all" || ad.campaignName === selectedCampaign
            const adType = ad.adType || (ad.campaignName?.toLowerCase().includes('pmax') ? 'PMAX' : 'Search')
            const matchesType = selectedType === "all" || adType === selectedType
            const term = searchQuery.toLowerCase().trim()
            const matchesSearch = !term ||
                (ad.adName?.toLowerCase() || "").includes(term) ||
                (ad.campaignName?.toLowerCase() || "").includes(term) ||
                (ad.adId?.toLowerCase() || "").includes(term)
            // Date filter — match by analysis date day
            const matchesDate = selectedDate === "all" || (
                ad.analysisDate
                    ? new Date(ad.analysisDate).toISOString().slice(0, 10) === selectedDate
                    : false
            )
            return matchesAccount && matchesCampaign && matchesType && matchesSearch && matchesDate
        })
    }, [googleAds, selectedAccountId, selectedCampaign, selectedType, searchQuery, selectedDate])

    const totalCost = filteredAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
    const totalImpr = filteredAds.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0)
    const totalInteractions = filteredAds.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0)
    const totalConversions = filteredAds.reduce((sum, ad) => sum + Number(ad.purchases || 0), 0)
    const totalConvValue = filteredAds.reduce((sum, ad) => sum + Number(ad.purchaseValue || 0), 0)
    const avgInteractionRate = totalImpr > 0 ? (totalInteractions / totalImpr) * 100 : 0
    const avgCpc = totalInteractions > 0 ? totalCost / totalInteractions : 0
    const avgRoas = totalCost > 0 ? totalConvValue / totalCost : 0

    const tabs = [
        { id: "overview", label: "Overview", icon: Layout },
        { id: "campaigns", label: "Campaigns", icon: TrendingUp },
        { id: "ads", label: "Ads & assets", icon: Play },
        { id: "keywords", label: "Keywords", icon: Search },
    ]

    // Memoize analytics data to prevent expensive recalculations on every render
    const analyticsData = useMemo(() => {
        // topCampaigns aggregation
        const campaignMap = new Map<string, { name: string, cost: number, count: number, clicks: number, impr: number }>()
        filteredAds.forEach(ad => {
            const name = ad.campaignName || "Unnamed Campaign"
            const current = campaignMap.get(name) || { name, cost: 0, count: 0, clicks: 0, impr: 0 }
            current.cost += Number(ad.spend || 0)
            current.count += 1
            current.clicks += Number(ad.clicks || 0)
            current.impr += Number(ad.impressions || 0)
            campaignMap.set(name, current)
        })
        const topCampaigns = Array.from(campaignMap.values())
            .map(c => ({
                name: c.name,
                cost: c.cost,
                count: c.count,
                ctr: c.impr > 0 ? (c.clicks / c.impr) * 100 : 0
            }))
            .sort((a, b) => b.cost - a.cost)

        // typeBreakdown aggregation
        const typeMap = new Map<string, { type: string, cost: number, count: number, clicks: number, impr: number }>()
        filteredAds.forEach(ad => {
            const type = ad.adType || "Other"
            const current = typeMap.get(type) || { type, cost: 0, count: 0, clicks: 0, impr: 0 }
            current.cost += Number(ad.spend || 0)
            current.count += 1
            current.clicks += Number(ad.clicks || 0)
            current.impr += Number(ad.impressions || 0)
            typeMap.set(type, current)
        })
        const typeBreakdown = Array.from(typeMap.values())
            .map(t => ({
                type: t.type,
                cost: t.cost,
                count: t.count,
                ctr: t.impr > 0 ? (t.clicks / t.impr) * 100 : 0
            }))
            .sort((a, b) => b.cost - a.cost)

        const detailedKeywordsMap = new Map<string, { word: string, spend: number, impr: number, clicks: number, ctr: number }>();
        filteredAds.forEach(ad => {
            const kws: string[] = (ad as any).keywords || (ad as any).searchTerms || [];
            kws.forEach(kw => {
                const existing = detailedKeywordsMap.get(kw) || { word: kw, spend: 0, impr: 0, clicks: 0, ctr: 0 };
                existing.spend += Number(ad.spend || 0);
                existing.impr += Number(ad.impressions || 0);
                existing.clicks += Number(ad.clicks || 0);
                detailedKeywordsMap.set(kw, existing);
            });
        });

        const detailedKeywords = Array.from(detailedKeywordsMap.values()).map(kw => ({
            ...kw,
            ctr: kw.impr > 0 ? (kw.clicks / kw.impr) * 100 : 0
        })).sort((a, b) => b.spend - a.spend);


        const avgOptScore = filteredAds.length > 0
            ? (filteredAds.reduce((sum, ad) => sum + (Number(ad.scoreOverall) || 0), 0) / filteredAds.length) * 10
            : 0

        const sortedAdsForChart = [...filteredAds].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0)).slice(0, 15);
        const spendChartData = sortedAdsForChart.map((ad, i) => ({
            name: ad.adName?.slice(0, 10) || `Ad ${i + 1}`,
            spend: Number(ad.spend) || 0,
            ctr: Number(ad.ctr) || 0,
            fullName: ad.adName
        }));

        const formatChartData = typeBreakdown.map(item => ({
            name: item.type,
            value: item.cost,
            ctr: item.ctr
        }));

        // Keep the legacy keywords for overview tab compatibility if needed, 
        // with both 'cost' and 'spend' property to satisfy all usages
        const keywords = detailedKeywords.slice(0, 8).map(k => ({ ...k, cost: k.spend }))

        return { topCampaigns, typeBreakdown, keywords, avgOptScore, spendChartData, formatChartData, sortedAdsForChart, detailedKeywords }
    }, [filteredAds])

    const renderMetricsCards = () => {
        if (filteredAds.length === 0 && searchQuery.trim() !== "") return null;

        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-6">
                {[
                    { label: "Interactions", value: totalInteractions, color: "text-blue-500", icon: MousePointer2, id: "interactions", desc: "Total Clicks", info: "Measures how many times people interacted with your ad.", theme: "blue" },
                    { label: "Impressions", value: totalImpr, color: "text-indigo-500", icon: Eye, id: "impr", desc: "Total Reach", info: "The number of times your ad was displayed.", theme: "indigo" },
                    { label: "Avg. CPC", value: `$${avgCpc.toFixed(2)}`, color: "text-amber-500", icon: DollarSign, id: "cpc", desc: "Cost Efficiency", info: "Average cost paid for each click on your ad.", theme: "amber" },
                    { label: "Conversions", value: totalConversions, color: "text-emerald-500", icon: Check, id: "conv", desc: "Total Acquisitions", info: "The total number of attributed conversions.", theme: "emerald" },
                    { label: "Conv. Value", value: `$${totalConvValue.toLocaleString()}`, color: "text-violet-500", icon: BarChart3, id: "value", desc: "Gross Return", info: "The total value of all attributed conversions.", theme: "violet" },
                    { label: "Account ROAS", value: `${avgRoas.toFixed(2)}x`, color: "text-sky-500", icon: TrendingUp, id: "roas", desc: "Efficiency", info: "Return on Ad Spend (Conv Value / Spend).", theme: "sky" }
                ].map((metric) => (
                    <Card key={metric.id} className="relative p-2 md:p-3.5 border border-zinc-200/50 dark:border-white/5 shadow-sm bg-white dark:bg-[#09090b] rounded-2xl group transition-all duration-300 hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 overflow-hidden min-h-0">
                        {/* Thematic Background Glow */}
                        <div className={cn(
                            "absolute -right-6 -top-6 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-all duration-700",
                            metric.theme === "blue" ? "bg-blue-500" :
                                metric.theme === "indigo" ? "bg-indigo-500" :
                                    metric.theme === "amber" ? "bg-amber-500" :
                                        metric.theme === "emerald" ? "bg-emerald-500" :
                                            metric.theme === "violet" ? "bg-violet-500" : "bg-sky-500"
                        )} />

                        <div className="flex items-center justify-between mb-1.5 md:mb-4">
                            <div className={cn(
                                "p-1 md:p-2 rounded-xl border transition-all duration-300 group-hover:scale-110",
                                metric.theme === "blue" ? "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400" :
                                    metric.theme === "indigo" ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400" :
                                        metric.theme === "amber" ? "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                            metric.theme === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                metric.theme === "violet" ? "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20 text-violet-600 dark:text-violet-400" :
                                                    "bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400"
                            )}>
                                <metric.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 md:h-3.5 md:w-3.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 transition-colors cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-300 rounded-xl px-4 py-2 text-xs font-medium max-w-[200px]">
                                    <p>{metric.info}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                        <div className="space-y-0 md:space-y-1">
                            <p className="text-[8px] md:text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest leading-tight">{metric.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-base md:text-2xl font-black font-mono tracking-tighter text-zinc-900 dark:text-white leading-none">
                                    {metric.value}
                                </h3>
                            </div>
                            <div className="pt-1 md:pt-2 border-t border-zinc-100 dark:border-white/5 mt-1.5 md:mt-3 hidden md:flex items-center justify-between">
                                <span className="text-[7.5px] md:text-[8px] font-black uppercase text-zinc-400 tracking-widest">{metric.desc}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        )
    }

    const renderTabContent = () => {
        if (activeTab === "overview") {
            const { topCampaigns, typeBreakdown, keywords: extractedKeywords, avgOptScore, spendChartData, formatChartData, sortedAdsForChart } = analyticsData
            const maxSpendForChart = Math.max(...spendChartData.map(a => a.spend || 1));

            // Aggregate Recommendations
            const recommendations = filteredAds
                .filter(ad => !!ad.primaryRecommendation)
                .slice(0, 3)
                .map(ad => ({
                    title: ad.primaryRecommendation,
                    impact: ad.recommendation1Impact || "High",
                    category: ad.adType || "Ad Performance"
                }))

            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20 overflow-hidden max-w-full">
                    {/* Primary Row: High-Level Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Card className="lg:col-span-4 p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a73e8]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#1a73e8]/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 md:mb-10">
                                <div>
                                    <h3 className="text-sm md:text-base font-black tracking-tight text-[#1a73e8]">Account excellence</h3>
                                    <p className="text-[10px] md:text-[11px] text-zinc-500 font-bold mt-1">Optimization benchmark</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-[#1a73e8]/10 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-[#1a73e8]" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center py-2 md:py-4">
                                <div className="relative h-32 w-32 md:h-40 md:w-40 flex items-center justify-center">
                                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            className="text-zinc-100 dark:text-white/5"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * avgOptScore) / 100}
                                            strokeLinecap="round"
                                            className="text-[#1a73e8] transition-all duration-[2000ms] ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter italic">{avgOptScore.toFixed(0)}</span>
                                        <span className="text-xs md:text-sm font-black text-[#1a73e8] tracking-tight mt-1">Percent</span>
                                    </div>
                                </div>
                                <div className="mt-8 md:mt-10 w-full space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[9px] md:text-[10px] font-black text-zinc-400 tracking-tight">Growth potential</span>
                                        <span className="text-[10px] font-black text-emerald-500">+{(100 - avgOptScore).toFixed(1)}%</span>
                                    </div>
                                    <Button className="w-full h-11 md:h-12 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-black text-xs md:text-sm tracking-tight shadow-xl transition-all">Review key shifts</Button>
                                </div>
                            </div>
                        </Card>

                        {/* Performance Trends Chart */}
                        <Card className="lg:col-span-8 p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tightest text-zinc-900 dark:text-zinc-100">Performance snapshot</h3>
                                    <p className="text-xs text-zinc-500 font-bold mt-1">Real-time spend distribution across top assets</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-[#1a73e8]/10 text-[#1a73e8] border-none px-3 py-1 font-black text-xs group-hover:scale-105 transition-transform">Active scaling</Badge>
                                </div>
                            </div>

                            <div className="h-48 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={spendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#1a73e8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.1} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tick={({ x, y, payload }) => (
                                                <text x={x} y={y + 10} fill="#888888" fontSize={9} fontWeight={700} textAnchor="middle">
                                                    {payload.value.length > 8 ? `${payload.value.slice(0, 8)}...` : payload.value}
                                                </text>
                                            )}
                                            hide={filteredAds.length > 8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#888888' }}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                fontSize: '10px',
                                                fontWeight: '900',
                                                textTransform: 'uppercase'
                                            }}
                                            itemStyle={{ color: '#1a73e8' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="spend"
                                            stroke="#1a73e8"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorSpend)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:gap-6 mt-8">
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/stat hover:border-blue-500/20 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Top performer</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">${Number(sortedAdsForChart[0]?.spend || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/stat hover:border-blue-500/20 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Avg. efficiency</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">{(totalInteractions / (totalImpr || 1) * 100).toFixed(2)}%</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 group/stat hover:bg-blue-100/50 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-[#1a73e8] tracking-widest mb-1 group-hover:scale-105 transition-transform">Volatility</p>
                                    <p className="text-xs md:text-sm font-black text-[#1a73e8]">Low</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Secondary Row: Lists & Breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Campaigns List */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black tracking-[0.2em] text-zinc-400">Top campaigns</h3>
                                <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/10">
                                    <ArrowUpRight className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>
                            <div className="space-y-6 flex-1 overflow-y-auto pr-3 custom-scrollbar">
                                {topCampaigns.length > 0 ? topCampaigns.map((camp, i) => {
                                    const percentage = (camp.cost / (totalCost || 1)) * 100
                                    return (
                                        <div key={camp.name} className="group/item transition-all hover:translate-x-1">
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="flex flex-col min-w-0 flex-1 mr-4">
                                                    <span className="text-[13px] font-black text-zinc-800 dark:text-zinc-200 truncate group-hover/item:text-[#1a73e8] transition-colors">{camp.name}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className="h-2 w-2 rounded-full bg-[#1a73e8]" />
                                                            <span className="text-[9px] text-zinc-500 font-black tracking-tight">{camp.ctr.toFixed(2)}% CTR</span>
                                                        </div>
                                                        <span className="text-[9px] text-zinc-400 font-bold tracking-tight">• {camp.count} assets</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100 block">${camp.cost.toLocaleString()}</span>
                                                    <span className="text-[8px] font-black text-zinc-300 tracking-widest">{percentage.toFixed(1)}% weight</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-white/5 shadow-inner">
                                                <div className="h-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(26,115,232,0.3)]" style={{ width: `${Math.max(percentage, 5)}%` }} />
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-4">
                                        <div className="h-16 w-16 rounded-[2rem] bg-zinc-50 dark:bg-white/5 flex items-center justify-center">
                                            <Circle className="h-8 w-8 opacity-20 animate-pulse" />
                                        </div>
                                        <p className="text-[10px] font-black tracking-widest opacity-60">No active data flows</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Ad Type Distribution */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black tracking-[0.2em] text-zinc-400">Format performance</h3>
                                <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/10">
                                    <LayoutGrid className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>

                            <div className="h-44 w-full mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={formatChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {formatChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={["#1a73e8", "#34a853", "#fbbc05", "#ea4335", "#a855f7", "#ec4899"][index % 6]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                fontSize: '9px',
                                                fontWeight: '900',
                                                textTransform: 'uppercase'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                {typeBreakdown.map((item, i) => {
                                    const colors = ["bg-[#1a73e8]", "bg-[#34a853]", "bg-[#fbbc05]", "bg-[#ea4335]", "bg-purple-500", "bg-pink-500"]
                                    return (
                                        <div key={item.type} className="p-3.5 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group hover:border-[#1a73e8]/30 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
                                                    <div className={cn("h-3 w-3 rounded-full shadow-sm shrink-0", colors[i % colors.length])} />
                                                    <span className="text-[9px] md:text-[10px] font-black text-zinc-900 dark:text-zinc-100 tracking-widest truncate">{item.type}</span>
                                                </div>
                                                <div className="shrink-0 px-2 py-0.5 rounded-full bg-blue-500/10 text-[#1a73e8] text-[9px] font-black">{item.ctr.toFixed(2)}% CTR</div>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-zinc-400 tracking-widest">Efficiency</p>
                                                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100">${item.cost.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{item.count} assets</p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Top Keywords / Search Terms */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px] overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black tracking-[0.2em] text-zinc-400">Search keywords</h3>
                                <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/10">
                                    <Search className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
                                <div className="w-full">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-none hover:bg-transparent">
                                                <TableHead className="h-auto py-2 text-[9px] font-black tracking-widest text-zinc-400 pl-0">Term</TableHead>
                                                <TableHead className="h-auto py-2 text-[9px] font-black tracking-widest text-zinc-400 text-right">Cost</TableHead>
                                                <TableHead className="h-auto py-2 text-[9px] font-black tracking-widest text-zinc-400 text-right pr-0">CTR</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {extractedKeywords.length > 0 ? extractedKeywords.map((kw, i) => (
                                                <TableRow key={`${kw.word}-${i}`} className="border-none group/kw hover:bg-[#1a73e8]/5 transition-colors">
                                                    <TableCell className="py-4 pl-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2 w-2 rounded-full bg-[#1a73e8] shadow-[0_0_8px_rgba(26,115,232,0.4)] opacity-20 group-hover/kw:opacity-100 transition-all duration-500" />
                                                            <span className="text-[10px] md:text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 group-hover/kw:text-[#1a73e8] transition-colors tracking-tight break-all">{kw.word}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">${kw.cost.toLocaleString()}</span>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right pr-0">
                                                        <span className="px-2 py-0.5 rounded-full bg-[#1a73e8]/10 text-[#1a73e8] text-[10px] font-black">{kw.ctr.toFixed(2)}%</span>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="pt-16 pb-12 text-center border-none hover:bg-transparent">
                                                        <div className="flex flex-col items-center justify-center space-y-5 max-w-[200px] mx-auto group">
                                                            <div className="relative">
                                                                <div className="absolute inset-0 bg-[#1a73e8]/10 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                                                                <div className="relative h-16 w-16 rounded-3xl bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/10 shadow-xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-500">
                                                                    <Search className="h-6 w-6 text-[#1a73e8]" />
                                                                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-md flex items-center justify-center animate-bounce delay-150">
                                                                        <div className="h-1.5 w-1.5 rounded-full bg-[#1a73e8]" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1 opacity-90 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                                                <p className="text-[11px] font-black tracking-widest text-zinc-900 dark:text-zinc-100 uppercase">No Signals Detected</p>
                                                                <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">Awaiting keyword data sync</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Tertiary Row: Creative Intelligence & Analytics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Psychological Triggers Card */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Psychological IQ</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Winning behavioral patterns detected</p>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                {[
                                    { label: "Social Proof", key: "socialProofPresent" as const, color: "from-purple-500 to-blue-500" },
                                    { label: "Scarcity", key: "scarcityPresent" as const, color: "from-purple-400 to-pink-500" },
                                    { label: "Loss Aversion", key: "lossAversionPresent" as const, color: "from-blue-600 to-purple-600" },
                                    { label: "Anchoring", key: "anchoringPresent" as const, color: "from-indigo-500 to-purple-400" },
                                ].map(trigger => {
                                    // Strictly count true values from db
                                    const count = filteredAds.filter(ad => ad[trigger.key] === true).length
                                    const percentage = filteredAds.length > 0 ? (count / filteredAds.length) * 100 : 0

                                    return (
                                        <div key={trigger.label} className="p-4 md:p-5 rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/trig hover:border-purple-500/30 transition-all hover:bg-white dark:hover:bg-white/10 shadow-sm hover:shadow-xl">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[10px] font-black text-zinc-400 tracking-widest group-hover/trig:text-purple-500 transition-colors">{trigger.label}</span>
                                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                <div className={cn("h-full rounded-full transition-all duration-[2000ms] bg-gradient-to-r shadow-[0_0_12px_rgba(168,85,247,0.4)]", trigger.color)} style={{ width: `${Math.max(percentage, 5)}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Behavioral Triggers */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div>
                                    <h3 className="text-lg md:text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Behavioral Triggers</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Creative resonance across user stages</p>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-6 relative z-10 pr-2">
                                {[
                                    { label: "Attention", score: filteredAds.reduce((sum, ad) => sum + (Number(ad.aidaAttentionScore) || 0), 0) / (filteredAds.length || 1), color: "bg-emerald-500" },
                                    { label: "Interest", score: filteredAds.reduce((sum, ad) => sum + (Number(ad.aidaInterestScore) || 0), 0) / (filteredAds.length || 1), color: "bg-emerald-400" },
                                    { label: "Desire", score: filteredAds.reduce((sum, ad) => sum + (Number(ad.aidaDesireScore) || 0), 0) / (filteredAds.length || 1), color: "bg-emerald-300" },
                                    { label: "Action", score: filteredAds.reduce((sum, ad) => sum + (Number(ad.aidaActionScore) || 0), 0) / (filteredAds.length || 1), color: "bg-emerald-200" },
                                ].map((stage, i) => (
                                    <div key={stage.label} className="group/stage">
                                        <div className="flex justify-between mb-1.5 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-4 w-4 rounded-lg flex items-center justify-center text-[8px] font-black text-white", stage.color)}>{i + 1}</div>
                                                <span className="text-[10px] font-black text-zinc-500 tracking-widest group-hover/stage:text-emerald-500 transition-colors pr-2">{stage.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{stage.score.toFixed(1)}</span>
                                                <span className="text-[9px] font-black text-zinc-400">/10</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden p-1 border border-zinc-200 dark:border-white/5 shadow-inner">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-[2000ms] shadow-[0_0_10px_rgba(16,185,129,0.3)]", stage.color)}
                                                style={{ width: `${stage.score * 10}%`, transitionDelay: `${i * 150}ms` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Final Row: Recommendations Hub */}
                    {/* Optimization Hub - Redesigned to Sleek Dark/Glass */}
                    {/* Optimization Hub - Redesigned to Match Performance Snapshot Style */}
                    <div className="space-y-8 bg-zinc-50/50 dark:bg-[#09090b] p-6 md:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-[#1a73e8]/10 text-[#1a73e8] border-[#1a73e8]/20 font-bold text-[10px] px-2.5 py-0.5">
                                        Active engine
                                    </Badge>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black tracking-tightest text-zinc-900 dark:text-white leading-none">
                                    Optimization Hub
                                </h3>
                                <p className="text-xs font-bold text-zinc-500">
                                    Neutral engine detected <span className="text-zinc-900 dark:text-white">{recommendations.length} Strategic shifts</span>
                                </p>
                            </div>
                            <Button variant="outline" className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121214] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-[#18181b] hover:text-zinc-900 dark:hover:text-white rounded-xl h-10 px-4 text-xs font-black">
                                Scan complete
                            </Button>
                        </div>



                        <div className="flex xl:grid xl:grid-cols-3 gap-3 md:gap-4 overflow-x-auto xl:overflow-visible pb-6 md:pb-0 snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 hide-scrollbar">
                            {recommendations.length > 0 ? recommendations.map((rec, i) => (
                                <div key={i} className="min-w-[280px] w-[280px] xl:w-full xl:min-w-0 snap-center flex-shrink-0 xl:flex-shrink-1 p-5 md:p-6 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-all cursor-pointer group/rec shadow-sm hover:shadow-md hover:-translate-y-1 duration-300 relative overflow-hidden">
                                    <div className="flex flex-col h-full relative z-10">
                                        <div className="flex items-start justify-between mb-4 md:mb-6">
                                            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center group-hover/rec:bg-[#1a73e8] transition-all duration-300">
                                                <TrendingUp className="h-5 w-5 text-zinc-500 group-hover/rec:text-white" />
                                            </div>
                                            {i === 0 && <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] px-2.5 py-1">Top priority</Badge>}
                                        </div>
                                        <div className="space-y-3 md:space-y-4 flex-1">
                                            <div className="space-y-1.5 md:space-y-2">
                                                <p className="text-[10px] font-black text-zinc-500 leading-tight">Strategy shift</p>
                                                <h4 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight group-hover/rec:text-[#1a73e8] transition-colors line-clamp-2">
                                                    {rec.title}
                                                </h4>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed pt-3 md:pt-4 border-t border-zinc-100 dark:border-white/5 line-clamp-3">
                                                Projected <span className="text-zinc-900 dark:text-zinc-100 font-bold">{rec.impact} uplit</span> by optimizing {rec.category.toLowerCase()} signals.
                                            </p>
                                        </div>

                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-16 flex flex-col items-center justify-center text-center group">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-[#1a73e8]/10 blur-3xl rounded-full scale-[2] opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                                        <div className="relative h-20 w-20 rounded-[2rem] bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/10 shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500">
                                            <Activity className="h-8 w-8 text-[#1a73e8]" />
                                            <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center animate-bounce delay-150">
                                                <div className="h-2 w-2 rounded-full bg-[#1a73e8]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 mt-6 opacity-90 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                        <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tightest">No Strategic Shifts Detected Yet</h3>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.15em]">Our analyzer needs more diverse data segments</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Final Row: Top Creative Grid */}
                    <div className="space-y-8 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-2">
                                <h3 className="text-xl md:text-2xl font-black tracking-tightest text-zinc-900 dark:text-white leading-none">Power creatives</h3>
                                <p className="text-[10px] md:text-xs text-zinc-500 font-black mt-1">Benchmarking highest efficiency neural outputs</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="hidden md:flex text-xs font-black text-[#1a73e8] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl h-14 px-8 border border-zinc-200 dark:border-white/5 shadow-xl transition-all hover:scale-105 group"
                                onClick={() => setActiveTab("ads")}
                            >
                                View global assets <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[#1a73e8]"
                                onClick={() => setActiveTab("ads")}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Mobile: Horizontal Scroll, Desktop: Grid */}
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 hide-scrollbar pt-2">
                            {filteredAds.slice(0, cardLimit).map((ad, i) => (
                                <Card key={ad.id} className="min-w-[280px] md:min-w-0 w-[280px] md:w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-3.5 flex flex-col gap-4 group shadow-xl transition-all duration-300 snap-center flex-shrink-0 md:flex-shrink-1">

                                    {/* Image Header Section */}
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50">
                                        <img
                                            src={ad.thumbnailUrl || "/placeholder.svg"}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            alt={ad.adName}
                                        />

                                        {/* Platform Icon Overlay (Top Left) */}
                                        <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg z-10">
                                            <span className="font-black text-white text-[10px]">G</span>
                                        </div>

                                        {/* Top Performer Badge (Top Right) */}
                                        <Badge className="absolute top-3 right-3 bg-[#10b981] hover:bg-[#059669] text-white border-none rounded-full px-3 py-1 font-bold text-xs shadow-lg z-10 transition-transform group-hover:scale-105">
                                            Top performer
                                        </Badge>

                                        {/* Gradient Fade for Text Readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                    </div>

                                    {/* Title Section */}
                                    <div className="flex items-center justify-between gap-2 px-1">
                                        <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-[14px] leading-tight truncate flex-1">{ad.adName}</h3>
                                    </div>

                                    {/* Stats Grid - MATCHING REFERENCE */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Spend Box */}
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-2.5 border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-between h-[75px] group/spend transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 group-hover/spend:bg-zinc-600 dark:group-hover/spend:bg-zinc-300 transition-colors" />
                                                <p className="text-[9px] text-zinc-500 font-black">Spend</p>
                                            </div>
                                            <p className="text-[17px] font-black text-zinc-900 dark:text-zinc-100 tracking-tightest">${Number(ad.spend).toLocaleString()}</p>
                                        </div>

                                        {/* CTR Box */}
                                        <div className="bg-blue-50 dark:bg-blue-500/5 rounded-2xl p-2.5 border border-blue-100 dark:border-blue-500/10 flex flex-col justify-between h-[75px] relative overflow-hidden group/ctr transition-all hover:bg-blue-100/50 dark:hover:bg-blue-500/10">
                                            {/* Subtle background glow */}
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/10 blur-xl rounded-full -mr-4 -mt-4 transition-opacity" />

                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                <p className="text-[9px] text-blue-500 dark:text-blue-400 font-black opacity-80">Efficiency</p>
                                            </div>
                                            <p className="text-[17px] font-black text-blue-600 dark:text-blue-500 tracking-tightest text-right relative z-10">
                                                {Number(ad.ctr).toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer Section: ID & Copy */}
                                    <div className="mt-auto pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-1">
                                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 tracking-wider">ID: {ad.id.replace(/\D/g, '').substring(0, 12)}...</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(ad.id)
                                                setCopiedId(ad.id)
                                                setTimeout(() => setCopiedId(null), 2000)
                                            }}
                                            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            {copiedId === ad.id ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }


        if (activeTab === "campaigns") {
            const campaignsData = Array.from(new Set(filteredAds.map(ad => ad.campaignName || "Unnamed Campaign")))
                .map(name => {
                    const campAds = filteredAds.filter(ad => (ad.campaignName || "Unnamed Campaign") === name)
                    const cost = campAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
                    const impr = campAds.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0)
                    const clicks = campAds.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0)
                    const ctr = impr > 0 ? (clicks / impr) * 100 : 0
                    return { name, cost, impr, clicks, ctr, count: campAds.length }
                })
                .sort((a, b) => b.cost - a.cost)

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    {renderMetricsCards()}
                    <Card className="rounded-[2.5rem] border-zinc-200 dark:border-white/10 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table overflow-hidden">
                        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-white/10">
                            <Table className="w-full min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8]" />
                                        </TableHead>
                                        <TableHead className="w-auto text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4 py-4">Campaign</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-1 hidden md:table-cell">Status</TableHead>
                                        <TableHead className="w-[80px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1 hidden md:table-cell">Ads</TableHead>
                                        <TableHead className="w-[90px] md:w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1">Cost</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1 hidden lg:table-cell">Impr.</TableHead>
                                        <TableHead className="w-[80px] md:w-[120px] text-[#1a73e8] font-black text-[9px] uppercase tracking-widest text-right px-4 md:px-6">CTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaignsData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-[400px] text-center border-none">
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <TrendingUp className="h-12 w-12 text-zinc-200 dark:text-zinc-800" />
                                                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No campaigns found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        campaignsData.map((camp) => (
                                            <TableRow key={camp.name} className="group/row hover:bg-blue-50/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col w-full min-w-0 max-w-[150px] md:max-w-[220px] lg:max-w-[350px] xl:max-w-[500px]">
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-[13px] md:text-[14px] group-hover/row:text-[#1a73e8] transition-colors truncate block leading-tight">{camp.name}</span>
                                                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-0.5 opacity-70 truncate block">Analytics</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center px-1 hidden md:table-cell">
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-[#34a853]" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#1a7e43] dark:text-[#52c41a]">Active</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-[13px] text-zinc-500 dark:text-zinc-400 px-1 hidden md:table-cell">{camp.count}</TableCell>
                                                <TableCell className="text-right font-black text-[12px] md:text-[14px] text-zinc-900 dark:text-zinc-100 px-1">${camp.cost.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[13px] text-zinc-500 dark:text-zinc-400 px-1 hidden lg:table-cell">{camp.impr.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-4 md:px-6 font-black text-[13px] md:text-[15px] text-[#1a73e8] bg-blue-50/5 dark:bg-blue-900/5">{camp.ctr.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )
        }

        if (activeTab === "keywords") {
            const { detailedKeywords: extractedKeywords } = analyticsData

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    {renderMetricsCards()}
                    <Card className="rounded-[2.5rem] border-zinc-200 dark:border-white/10 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table overflow-hidden">
                        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-white/10">
                            <Table className="w-full min-w-[600px] md:min-w-full">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8]" />
                                        </TableHead>
                                        <TableHead className="w-auto text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4 py-4">Keyword</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-1">Match</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1">Spend</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1 hidden md:table-cell">Impr.</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-1 hidden md:table-cell">Clicks</TableHead>
                                        <TableHead className="w-[100px] text-[#1a73e8] font-black text-[9px] uppercase tracking-widest text-right px-6">CTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extractedKeywords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-[400px] text-center border-none p-0 relative hover:bg-transparent">
                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                                    <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto group w-full">
                                                        <div className="relative">
                                                            <div className="absolute inset-0 bg-[#1a73e8]/10 blur-3xl rounded-full scale-[2] opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                                                            <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/10 shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500">
                                                                <Search className="h-8 w-8 md:h-10 md:w-10 text-[#1a73e8] bg-clip-text" />
                                                                <div className="absolute -bottom-2 -right-2 h-6 w-6 md:h-8 md:w-8 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center animate-bounce delay-150">
                                                                    <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[#1a73e8]" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5 opacity-90 group-hover:opacity-100 transition-opacity duration-500 delay-100 text-center">
                                                            <h3 className="text-base md:text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tightest">No Keyword Data Found</h3>
                                                            <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] px-4">Adjust filters or tags to analyze signals</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        extractedKeywords.map((kw, i) => (
                                            <TableRow key={`${kw.word}-${i}`} className="group/row hover:bg-blue-50/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-4 py-4">
                                                    <div className="w-full min-w-0">
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-[12px] md:text-[13px] group-hover/row:text-[#1a73e8] transition-colors uppercase tracking-tight truncate block leading-tight">{kw.word}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-[10px] text-zinc-400 uppercase tracking-widest px-1">Broad</TableCell>
                                                <TableCell className="text-right font-black text-[12px] md:text-[13px] text-zinc-900 dark:text-zinc-100 px-1">${kw.spend.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[11px] md:text-[12px] text-zinc-500 dark:text-zinc-400 px-1 hidden md:table-cell">{kw.impr.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[11px] md:text-[12px] text-zinc-500 dark:text-zinc-400 px-1 hidden md:table-cell">{kw.clicks.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-6 font-black text-[13px] md:text-[14px] text-[#1a73e8]">{kw.ctr.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card >
                </div >
            )
        }


        // Ads & Assets tab (the main table)
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                {renderMetricsCards()}
                <Card className="rounded-[2.5rem] border border-zinc-200 dark:border-white/10 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table overflow-hidden">
                    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-white/10">
                        <Table className="w-full min-w-[700px] md:min-w-full">
                            <TableHeader>
                                <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                    <TableHead className="w-[40px] px-4 text-center hidden lg:table-cell">
                                        <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8] focus:ring-[#1a73e8]" />
                                    </TableHead>
                                    <TableHead className="w-[60px] md:w-[80px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-2">Ad</TableHead>
                                    <TableHead className="w-auto text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-2">Details</TableHead>
                                    <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-4 hidden md:table-cell">Status</TableHead>
                                    <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-2">Cost</TableHead>
                                    <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden lg:table-cell">Impr.</TableHead>
                                    <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden lg:table-cell">Int.</TableHead>
                                    <TableHead className="w-[80px] md:w-[120px] text-[#1a73e8] font-black text-[9px] uppercase tracking-widest text-right px-2 bg-blue-50/10 dark:bg-blue-900/5">Rate</TableHead>
                                    <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-2">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAds.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-[400px] text-center border-none p-0 relative">
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                                <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto group w-full">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-[#1a73e8]/10 blur-3xl rounded-full scale-[2] opacity-0 group-hover:opacity-40 transition-opacity duration-700" />
                                                        <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-white/10 shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500">
                                                            <Search className="h-8 w-8 md:h-10 md:w-10 text-[#1a73e8] bg-clip-text" />
                                                            <div className="absolute -bottom-2 -right-2 h-6 w-6 md:h-8 md:w-8 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center animate-bounce delay-150">
                                                                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[#1a73e8]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1.5 opacity-90 group-hover:opacity-100 transition-opacity duration-500 delay-100 text-center">
                                                        <h3 className="text-base md:text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tightest">No Matching Creatives</h3>
                                                        <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] px-4">Adjust filters to see more results</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {filteredAds.slice(0, displayLimit).map((ad) => (
                                            <TableRow
                                                key={ad.id}
                                            // Removed row onClick to prevent accidental analysis openings
                                            >
                                                <TableCell className="px-4 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8] focus:ring-[#1a73e8]" onClick={(e) => e.stopPropagation()} />
                                                </TableCell>
                                                <TableCell className="px-4">
                                                    <div
                                                        className="h-12 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/5 shadow-sm group-hover/row:scale-105 transition-transform duration-300 cursor-pointer relative"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                                                            <ZoomIn className="text-white w-5 h-5" />
                                                        </div>
                                                        <img src={ad.thumbnailUrl || "/placeholder.svg"} className="w-full h-full object-cover group-hover/row:scale-110 transition-transform duration-500" alt="Preview" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4">
                                                    <div className="flex flex-col min-w-0 md:max-w-[200px]">
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold text-[12px] md:text-[12px] truncate leading-tight block">{ad.adName || "Unnamed"}</span>
                                                        <span className="text-[10px] text-zinc-400 font-bold truncate opacity-80 block">{ad.campaignName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 hidden md:table-cell">
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-[11px] md:text-[12px] text-zinc-900 dark:text-zinc-100 px-2">${Number(ad.spend).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 px-4 hidden lg:table-cell">{Number(ad.impressions).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 px-4 hidden lg:table-cell">{Number(ad.clicks).toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-black text-[12px] md:text-[15px] text-[#1a73e8] px-2 bg-blue-50/10 dark:bg-blue-900/5">{(Number(ad.ctr) || 0).toFixed(1)}%</TableCell>
                                                <TableCell className="px-2">
                                                    <div className="flex items-center justify-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectAd(ad);
                                                            }}
                                                            className="h-8 px-2 md:px-4 group-hover/row:bg-[#1a73e8] group-hover/row:text-white rounded-xl transition-all gap-1.5 font-black text-[10px] uppercase tracking-widest"
                                                        >
                                                            <Sparkles className="h-3.5 w-3.5" />
                                                            <span>Analyze</span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredAds.length > displayLimit && (
                                            <TableRow className="hover:bg-transparent">
                                                <TableCell colSpan={9} className="p-8 text-center border-none">
                                                    <Button
                                                        onClick={() => setDisplayLimit(prev => prev + 24)}
                                                        variant="outline"
                                                        className="h-12 px-8 border-none bg-blue-50 text-[#1a73e8] dark:bg-white/5 dark:text-blue-400 text-[11px] font-black uppercase tracking-widest rounded-2xl"
                                                    >
                                                        Show More Creatives
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card >
            </div >
        )
    }

    if (!mounted) return null

    return (
        <TooltipProvider>
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 -mx-4 md:-mx-6">
                {/* Mobile Header */}
                <div className="md:hidden px-4 py-3 flex flex-col gap-3">
                    {/* Row 1: Platform & Mode Toggle */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 shadow-inner group/icon shrink-0">
                                <TrendingUp className="h-4 w-4 text-[#1a73e8] dark:text-[#4285f4]" />
                            </div>
                            <div className="flex flex-col min-w-0 gap-0.5">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1a73e8] opacity-80 leading-tight">
                                    Google Ads Platform
                                </span>
                                <h1 className="text-[13px] font-black tracking-tight text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                                    {selectedAccountId !== "all"
                                        ? (googleAds.find(a => a.adAccountId === selectedAccountId)?.accountName || "Account")
                                        : "Global Overview"}
                                </h1>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-8 px-2.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-2">
                                    {dataSource === "database" ? <Database className="h-3 w-3 text-[#1a73e8]" /> : <Wifi className="h-3 w-3 text-[#1a73e8] animate-pulse" />}
                                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{dataSource === "database" ? "Historical" : "Live"}</span>
                                    <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-2xl z-50">
                                <DropdownMenuItem onClick={() => { setDataSource("database"); onDataSourceChange?.("database"); }} className={cn("rounded-xl py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-blue-500/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Database className={cn("h-4 w-4 shrink-0", dataSource === "database" ? "text-blue-500" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Historical Reports</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Database analysis cards</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDataSource("realtime"); onDataSourceChange?.("realtime"); }} className={cn("rounded-xl py-2.5 cursor-pointer", dataSource === "realtime" && "bg-blue-500/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Wifi className={cn("h-4 w-4 shrink-0", dataSource === "realtime" ? "text-blue-500" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Analytics</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Real-time performance</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </div>

                <div className="hidden md:flex px-6 py-3 items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/5 bg-white dark:bg-black w-full">

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 shadow-inner group/icon shrink-0">
                            <TrendingUp className="h-4 w-4 text-[#1a73e8] dark:text-[#4285f4]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-1 cursor-pointer group/plat">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1a73e8] opacity-80 truncate group-hover/plat:opacity-100 transition-opacity">
                                        {selectedPlatform === "all" ? "All Platforms" : `${selectedPlatform} Ads Platform`}
                                    </span>
                                    <ChevronDown className="h-2.5 w-2.5 text-[#1a73e8] opacity-50 group-hover/plat:opacity-100 transition-all" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-2xl z-[100]">
                                    <DropdownMenuItem onClick={() => onPlatformChange?.("all")} className="rounded-xl py-2 cursor-pointer mb-1">
                                        <Globe className="h-4 w-4 mr-2 text-zinc-500" />
                                        <span className="text-xs font-bold">All Platforms</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onPlatformChange?.("google")} className="rounded-xl py-2 cursor-pointer mb-1">
                                        <Play className="h-4 w-4 mr-2 text-blue-500" />
                                        <span className="text-xs font-bold">Google Ads</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onPlatformChange?.("meta")} className="rounded-xl py-2 cursor-pointer mb-1">
                                        <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                                        <span className="text-xs font-bold">Meta Ads</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onPlatformChange?.("adroll")} className="rounded-xl py-2 cursor-pointer">
                                        <Target className="h-4 w-4 mr-2 text-[#E0267D]" />
                                        <span className="text-xs font-bold">AdRoll</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="flex items-center gap-2 group/acc cursor-pointer">
                                <h1 className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 group-hover/acc:text-[#1a73e8] transition-colors flex items-center gap-1.5 truncate">
                                    {selectedAccountId !== "all"
                                        ? (googleAds.find(a => a.adAccountId === selectedAccountId)?.accountName || "Account")
                                        : "Global Overview"}
                                    <ChevronDown className="h-3 w-3 text-zinc-400 group-hover/acc:translate-y-0.5 transition-transform shrink-0" />
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-3 justify-end">
                        {/* Realtime Search Bar - Moved to Top Bar */}
                        {dataSource === "realtime" && (
                            <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-xl px-1 shadow-sm relative group w-full md:max-w-[260px] transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 h-9 flex items-center mr-auto lg:mr-0">
                                <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-[#1a73e8] transition-colors" />
                                <Input
                                    placeholder={realtimeView === 'campaigns' ? "Search live campaigns..." : realtimeView === 'ads' ? "Search ads..." : "Search assets..."}
                                    className="pl-8 h-full bg-transparent border-none rounded-xl text-[11px] font-bold focus-visible:ring-0 transition-all w-full py-0 shadow-none"
                                    value={realtimeSearchQuery}
                                    onChange={(e) => setRealtimeSearchQuery(e.target.value)}
                                />
                                {realtimeSearchQuery && (
                                    <button onClick={() => setRealtimeSearchQuery('')} className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Date selectors */}
                        {dataSource === "realtime" ? (
                            <Select value={realtimeDateRange} onValueChange={setRealtimeDateRange}>
                                <SelectTrigger className="w-36 h-9 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-xs font-medium focus:ring-1 focus:ring-blue-500 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-zinc-200 dark:border-white/10">
                                    <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                                    <SelectItem value="LAST_14_DAYS">Last 14 Days</SelectItem>
                                    <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                                    <SelectItem value="THIS_MONTH">This Month</SelectItem>
                                    <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-9 px-3 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl flex items-center gap-2 hover:border-blue-500/30 transition-all">
                                        <Calendar className="h-3.5 w-3.5 text-[#1a73e8]" />
                                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{selectedDateLabel}</span>
                                        <ChevronDown className="h-3 w-3 text-zinc-300" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 shadow-2xl overflow-y-auto max-h-72">
                                    <DropdownMenuItem onClick={() => setSelectedDate("all")} className={cn("rounded-xl py-2 cursor-pointer mb-1", selectedDate === "all" && "bg-blue-50 text-blue-600")}>
                                        <Calendar className="h-3.5 w-3.5 mr-2 opacity-60" />
                                        <span className="text-xs font-bold">All Time</span>
                                    </DropdownMenuItem>
                                    {uniqueAnalysisDates.map(({ value, label }) => (
                                        <DropdownMenuItem key={value} onClick={() => setSelectedDate(value)} className={cn("rounded-xl py-2 cursor-pointer", selectedDate === value && "bg-blue-50 text-blue-600")}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                                            <span className="text-xs font-medium">{label}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Mode Toggle */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 px-3 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl flex items-center gap-2 hover:border-blue-500/30 transition-all shadow-sm">
                                    {dataSource === "database" ? <Database className="h-3.5 w-3.5 text-[#1a73e8]" /> : <Wifi className="h-3.5 w-3.5 text-[#1a73e8] animate-pulse" />}
                                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                                        {dataSource === "database" ? "Historical reports" : "Live Analytics"}
                                    </span>
                                    <ChevronDown className="h-3 w-3 text-zinc-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-2xl">
                                <DropdownMenuItem onClick={() => { setDataSource("database"); onDataSourceChange?.("database"); }} className={cn("rounded-xl py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-blue-500/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Database className={cn("h-4 w-4 shrink-0", dataSource === "database" ? "text-blue-500" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Historical Reports</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Database analysis cards</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDataSource("realtime"); onDataSourceChange?.("realtime"); }} className={cn("rounded-xl py-2.5 cursor-pointer", dataSource === "realtime" && "bg-blue-500/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Wifi className={cn("h-4 w-4 shrink-0", dataSource === "realtime" ? "text-blue-500" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Analytics</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Real-time performance</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Refresh button specifically for Historical Data mode as requested */}
                        {dataSource === "database" && onRefresh && (
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onRefresh}
                                disabled={isSyncing}
                                className={cn(
                                    "h-9 w-9 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl ml-1 hover:border-blue-500/30 hover:bg-blue-50 hover:text-blue-500 transition-all shadow-sm",
                                    isSyncing && "opacity-70"
                                )}
                            >
                                <RefreshCw className={cn("h-4 w-4 text-zinc-600 dark:text-zinc-400", isSyncing && "animate-spin")} />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Underline Style Tab Bar — Hidden in Live/Realtime Mode */}
            {dataSource !== "realtime" && (
                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-sm border-b border-zinc-200 dark:border-white/5 px-4 md:px-8">
                    <div className="flex items-center gap-6 md:gap-10 overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative py-4 flex items-center gap-2.5 transition-all shrink-0 group",
                                    activeTab === tab.id ? "opacity-100" : "opacity-60 hover:opacity-100"
                                )}
                            >
                                <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.id ? "text-[#1a73e8]" : "text-zinc-500")} />
                                <span className={cn(
                                    "text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] transition-colors",
                                    activeTab === tab.id ? "text-zinc-900 dark:text-white" : "text-zinc-500"
                                )}>
                                    {tab.label}
                                </span>

                                {/* Active Underline Indicator */}
                                {activeTab === tab.id ? (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1a73e8] rounded-t-full shadow-[0_-2px_10px_rgba(26,115,232,0.3)] animate-in fade-in fill-mode-both duration-300" />
                                ) : (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-zinc-200 dark:bg-zinc-800 rounded-t-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {dataSource === "realtime" ? (
                <div className="flex flex-col w-full px-2 md:px-4 py-4">
                    <div className="bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm" style={{ height: "calc(100vh - 160px)" }}>
                        <RealtimeNativeView
                            key={realtimeRefreshKey}
                            dateRange={realtimeDateRange}
                            onDateRangeChange={setRealtimeDateRange}
                            searchQuery={realtimeSearchQuery}
                            onSearchChange={setRealtimeSearchQuery}
                            onCampaignsLoaded={onRealtimeCampaignsLoaded}
                            selectedCampaignId={selectedRealtimeCampaignId}
                            onViewChange={(v: any) => setRealtimeView(v)}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col w-full">
                    <div className="py-4 md:py-6 space-y-4 md:space-y-6 w-full max-w-full overflow-hidden px-0">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200/50 dark:border-white/5 rounded-2xl md:rounded-[1.5rem] p-3 shadow-xl relative group">
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 min-w-0">
                                <div className="relative group w-full md:max-w-xs">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-[#1a73e8] transition-colors" />
                                    <Input
                                        placeholder="Search ads..."
                                        className="pl-10 h-10 bg-zinc-100/50 dark:bg-white/5 border-none rounded-xl text-xs font-bold focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all w-full"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                    />
                                </div>

                                <div className="h-6 w-[1px] bg-zinc-200 dark:bg-white/10 mx-1 hidden md:block" />

                                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden scroll-smooth flex-nowrap">
                                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                                        <SelectTrigger className="flex-none w-[130px] md:w-[160px] h-10 bg-zinc-100/50 dark:bg-white/5 border-none rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20">
                                            <LayoutGrid className="h-3 w-3 mr-2 text-zinc-400" />
                                            <SelectValue placeholder="Campaigns" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl max-w-[85vw] sm:max-w-[400px]">
                                            <SelectItem value="all" className="rounded-xl font-bold text-xs uppercase cursor-pointer">All Campaigns</SelectItem>
                                            {uniqueCampaigns.map(camp => (
                                                <SelectItem key={camp} value={camp} className="rounded-xl font-bold text-xs uppercase cursor-pointer break-words truncate">
                                                    <span className="truncate block max-w-full">{camp}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={selectedType} onValueChange={setSelectedType}>
                                        <SelectTrigger className="flex-none w-[110px] md:w-[140px] h-10 bg-zinc-100/50 dark:bg-white/5 border-none rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20">
                                            <Filter className="h-3 w-3 mr-2 text-zinc-400" />
                                            <SelectValue placeholder="Types" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl max-w-[85vw] sm:max-w-[400px]">
                                            <SelectItem value="all" className="rounded-xl font-bold text-xs uppercase cursor-pointer">All Types</SelectItem>
                                            {campaignTypes.map(type => (
                                                <SelectItem key={type} value={type} className="rounded-xl font-bold text-xs uppercase cursor-pointer break-words truncate">
                                                    <span className="truncate block max-w-full">{type}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="flex-none flex items-center gap-1 ml-auto lg:hidden">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5"><Columns className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5"><Download className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5"><Columns className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5"><Download className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        {renderTabContent()}
                    </div>
                </div>
            )}
        </TooltipProvider>
    )
}
