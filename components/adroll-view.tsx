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
    Target,
    X
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

interface AdrollViewProps {
    adrollAds: AdData[]
    selectedAccountId: string
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onViewLibrary?: () => void
    onRealtimeCampaignsLoaded?: (campaigns: any[]) => void
    selectedRealtimeCampaignId?: string
    onEnlargeImage?: (url: string, title: string) => void
}

export default function AdrollView({
    adrollAds,
    selectedAccountId,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onViewLibrary,
    onRealtimeCampaignsLoaded,
    selectedRealtimeCampaignId,
    onEnlargeImage,
}: AdrollViewProps) {
    const { toast } = useToast()
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState("ads")
    const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
    const [selectedType, setSelectedType] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>("all")
    const [dataSource, setDataSource] = useState<"database" | "realtime">("database")
    const [displayLimit, setDisplayLimit] = useState(24)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [realtimeDateRange, setRealtimeDateRange] = useState('LAST_30_DAYS')
    const [realtimeSearchQuery, setRealtimeSearchQuery] = useState('')
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '')

    // Sync local search with prop (e.g. if cleared from outside)
    useEffect(() => {
        setLocalSearchQuery(searchQuery || '')
    }, [searchQuery])

    // Debounce search update to parent to prevent heavy re-renders on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchQuery !== (searchQuery || '')) {
                onSearchChange(localSearchQuery)
            }
        }, 150)
        return () => clearTimeout(timer)
    }, [localSearchQuery, onSearchChange, searchQuery])
    const [realtimeRefreshKey, setRealtimeRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Extract unique analysis dates from DB records (newest first)
    const uniqueAnalysisDates = useMemo(() => {
        const daySet = new Set<string>()
        adrollAds.forEach((ad: any) => {
            if (ad.analysisDate) {
                // Normalize to YYYY-MM-DD key
                const dayKey = new Date(ad.analysisDate).toISOString().slice(0, 10)
                daySet.add(dayKey)
            }
        })
        return Array.from(daySet)
            .sort((a: any, b: any) => b.localeCompare(a)) // newest first
            .map(day => ({
                value: day,
                label: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }))
    }, [adrollAds])

    const selectedDateLabel = useMemo(() => {
        if (selectedDate === 'all') return 'All Time'
        const found = uniqueAnalysisDates.find(d => d.value === selectedDate)
        return found ? found.label : 'All Time'
    }, [selectedDate, uniqueAnalysisDates])

    const uniqueCampaigns = useMemo(() => {
        const camps = Array.from(new Set(adrollAds.map((ad: any) => ad.campaignName).filter((c: any): c is string => !!c)))
        return camps.length > 0 ? camps : ["Unnamed Campaign"]
    }, [adrollAds])

    const campaignTypes = useMemo(() => {
        const types = Array.from(new Set(adrollAds.map((ad: any) => ad.adType).filter((t: any): t is string => !!t)))
        if (types.length === 0) return ["Search", "Display", "Shopping", "Video", "PMAX", "App", "Discovery"]
        return types
    }, [adrollAds])

    const filteredAds = useMemo(() => {
        return adrollAds.filter((ad: any) => {
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
    }, [adrollAds, selectedAccountId, selectedCampaign, selectedType, searchQuery, selectedDate])

    const totalCost = filteredAds.reduce((sum: any, ad: any) => sum + Number(ad.spend || 0), 0)
    const totalImpr = filteredAds.reduce((sum: any, ad: any) => sum + Number(ad.impressions || 0), 0)
    const totalInteractions = filteredAds.reduce((sum: any, ad: any) => sum + Number(ad.clicks || 0), 0)
    const totalConversions = filteredAds.reduce((sum: any, ad: any) => sum + Number(ad.purchases || 0), 0)
    const totalConvValue = filteredAds.reduce((sum: any, ad: any) => sum + Number(ad.purchaseValue || 0), 0)
    const avgInteractionRate = totalImpr > 0 ? (totalInteractions / totalImpr) * 100 : 0
    const avgCpc = totalInteractions > 0 ? totalCost / totalInteractions : 0
    const avgRoas = totalCost > 0 ? totalConvValue / totalCost : 0

    const tabs = [
        { id: "overview", label: "Overview", icon: Layout },
        { id: "campaigns", label: "Campaigns", icon: TrendingUp },
        { id: "ads", label: "Ads & assets", icon: Play },
        { id: "keywords", label: "Keywords", icon: Search },
        { id: "audiences", label: "Audiences", icon: Info },
    ]

    // Memoize analytics data to prevent expensive recalculations on every render
    const analyticsData = useMemo(() => {
        // topCampaigns aggregation
        const campaignMap = new Map<string, { name: string, cost: number, count: number, clicks: number, impr: number }>()
        filteredAds.forEach((ad: any) => {
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
        filteredAds.forEach((ad: any) => {
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

        // Optimized Keywords aggregation - single pass
        const wordStats = new Map<string, { word: string, cost: number, count: number, totalCtr: number }>()
        filteredAds.forEach((ad: any) => {
            const adWords = new Set<string>()
            // Extract from tags
            if (ad.tags) {
                ad.tags.forEach((t: any) => {
                    const n = t.toLowerCase().trim().replace(/[^\w\s]/gi, '')
                    if (n.length > 4) adWords.add(n)
                })
            }
            // Extract from name
            if (ad.adName) {
                ad.adName.split(' ').forEach((w: any) => {
                    const n = w.toLowerCase().trim().replace(/[^\w\s]/gi, '')
                    if (n.length > 4) adWords.add(n)
                })
            }

            adWords.forEach(word => {
                const current = wordStats.get(word) || { word, cost: 0, count: 0, totalCtr: 0 }
                current.cost += Number(ad.spend || 0)
                current.count += 1
                current.totalCtr += Number(ad.ctr || 0)
                wordStats.set(word, current)
            })
        })

        const keywords = Array.from(wordStats.values())
            .map(s => ({
                word: s.word,
                cost: s.cost,
                ctr: s.totalCtr / (s.count || 1),
                count: s.count
            }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 15) // Increased slice for keywords tab usage

        const avgOptScore = filteredAds.length > 0
            ? (filteredAds.reduce((sum: any, ad: any) => sum + (Number(ad.scoreOverall) || 0), 0) / filteredAds.length) * 10
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

        return { topCampaigns, typeBreakdown, keywords, avgOptScore, spendChartData, formatChartData, sortedAdsForChart }
    }, [filteredAds])

    const renderTabContent = () => {
        if (activeTab === "overview") {
            const { topCampaigns, typeBreakdown, keywords: extractedKeywords, avgOptScore, spendChartData, formatChartData, sortedAdsForChart } = analyticsData
            const maxSpendForChart = Math.max(...spendChartData.map(a => a.spend || 1));

            // Aggregate Recommendations
            const recommendations = filteredAds
                .filter((ad: any) => !!ad.primaryRecommendation)
                .slice(0, 3)
                .map((ad: any) => ({
                    title: ad.primaryRecommendation,
                    impact: ad.recommendation1Impact || "High",
                    category: ad.adType || "Ad Performance"
                }))

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20 overflow-hidden max-w-full">
                    {/* Primary Row: High-Level Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Card className="lg:col-span-4 p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E0267D]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#E0267D]/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 md:mb-10">
                                <div>
                                    <h3 className="text-sm md:text-base font-black tracking-tight text-[#E0267D]">Account excellence</h3>
                                    <p className="text-[10px] md:text-[11px] text-zinc-500 font-bold mt-1">Optimization benchmark</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-[#E0267D]/10 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-[#E0267D]" />
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
                                            className="text-[#E0267D] transition-all duration-[2000ms] ease-out"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter italic">{avgOptScore.toFixed(0)}</span>
                                        <span className="text-xs md:text-sm font-black text-[#E0267D] tracking-tight mt-1">Percent</span>
                                    </div>
                                </div>
                                <div className="mt-8 md:mt-10 w-full space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[9px] md:text-[10px] font-black text-zinc-400 tracking-tight">Growth potential</span>
                                        <span className="text-[10px] font-black text-emerald-500">+{(100 - avgOptScore).toFixed(1)}%</span>
                                    </div>
                                    <Button className="w-full h-11 md:h-12 rounded-2xl bg-[#E0267D] hover:bg-[#1557b0] text-white font-black text-xs md:text-sm tracking-tight shadow-xl transition-all">Review key shifts</Button>
                                </div>
                            </div>
                        </Card>

                        {/* Performance Trends Chart */}
                        <Card className="lg:col-span-8 p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tightest text-zinc-900 dark:text-zinc-100">Performance snapshot</h3>
                                    <p className="text-xs text-zinc-500 font-bold mt-1">Real-time spend distribution across top assets</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-[#E0267D]/10 text-[#E0267D] border-none px-3 py-1 font-black text-xs group-hover:scale-105 transition-transform">Active scaling</Badge>
                                </div>
                            </div>

                            <div className="h-48 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={spendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#E0267D" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#E0267D" stopOpacity={0} />
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
                                            itemStyle={{ color: '#E0267D' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="spend"
                                            stroke="#E0267D"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorSpend)"
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-2 md:gap-6 mt-8">
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/stat hover:border-#E0267D/20 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 tracking-widest mb-1 group-hover:text-#E0267D transition-colors">Top performer</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">${Number(sortedAdsForChart[0]?.spend || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/stat hover:border-#E0267D/20 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 tracking-widest mb-1 group-hover:text-#E0267D transition-colors">Avg. efficiency</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">{(totalInteractions / (totalImpr || 1) * 100).toFixed(2)}%</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-#E0267D/10 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 group/stat hover:bg-blue-100/50 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-[#E0267D] tracking-widest mb-1 group-hover:scale-105 transition-transform">Volatility</p>
                                    <p className="text-xs md:text-sm font-black text-[#E0267D]">Low</p>
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
                                                    <span className="text-[13px] font-black text-zinc-800 dark:text-zinc-200 truncate group-hover/item:text-[#E0267D] transition-colors">{camp.name}</span>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className="h-2 w-2 rounded-full bg-[#E0267D]" />
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
                                                <div className="h-full bg-gradient-to-r from-[#E0267D] to-[#4285f4] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(26,115,232,0.3)]" style={{ width: `${Math.max(percentage, 5)}%` }} />
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
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px]">
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
                                                <Cell key={`cell-${index}`} fill={["#E0267D", "#34a853", "#fbbc05", "#ea4335", "#a855f7", "#ec4899"][index % 6]} stroke="none" />
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
                                    const colors = ["bg-[#E0267D]", "bg-[#34a853]", "bg-[#fbbc05]", "bg-[#ea4335]", "bg-purple-500", "bg-pink-500"]
                                    return (
                                        <div key={item.type} className="p-3.5 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group hover:border-[#E0267D]/30 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
                                                    <div className={cn("h-3 w-3 rounded-full shadow-sm shrink-0", colors[i % colors.length])} />
                                                    <span className="text-[9px] md:text-[10px] font-black text-zinc-900 dark:text-zinc-100 tracking-widest truncate">{item.type}</span>
                                                </div>
                                                <div className="shrink-0 px-2 py-0.5 rounded-full bg-#E0267D/10 text-[#E0267D] text-[9px] font-black">{item.ctr.toFixed(2)}% CTR</div>
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
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px] overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black tracking-[0.2em] text-zinc-400">Search keywords</h3>
                                <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/10">
                                    <Search className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-x-auto overflow-y-auto pr-3 custom-scrollbar">
                                <div className="min-w-[300px]">
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
                                                <TableRow key={`${kw.word}-${i}`} className="border-none group/kw hover:bg-[#E0267D]/5 transition-colors">
                                                    <TableCell className="py-4 pl-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2 w-2 rounded-full bg-[#E0267D] shadow-[0_0_8px_rgba(26,115,232,0.4)] opacity-20 group-hover/kw:opacity-100 transition-all duration-500" />
                                                            <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 group-hover/kw:text-[#E0267D] transition-colors tracking-tight">{kw.word}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100">${kw.cost.toLocaleString()}</span>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right pr-0">
                                                        <span className="px-2 py-0.5 rounded-full bg-[#E0267D]/10 text-[#E0267D] text-[10px] font-black">{kw.ctr.toFixed(2)}%</span>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="pt-24 text-center border-none">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center">
                                                                <Search className="h-6 w-6 text-zinc-200" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black tracking-widest text-zinc-400">No signals detected</p>
                                                                <p className="text-[8px] font-bold tracking-widest text-zinc-300">Enable tag monitoring</p>
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
                        <Card className="p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
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
                                    { label: "Social Proof", key: "socialProof" as const, color: "from-purple-500 to-#E0267D" },
                                    { label: "Scarcity", key: "scarcity" as const, color: "from-purple-400 to-pink-500" },
                                    { label: "Loss Aversion", key: "lossAversion" as const, color: "from-#E0267D to-purple-600" },
                                    { label: "Curiosity", key: "curiosityGap" as const, color: "from-indigo-500 to-purple-400" },
                                ].map((trigger: any) => {
                                    const count = filteredAds.filter((ad: any) => (ad as any)[trigger.key] === "Yes" || (ad as any)[trigger.key + "Present"] === true).length
                                    const percentage = (count / (filteredAds.length || 1)) * 100
                                    return (
                                        <div key={trigger.label} className="p-5 rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/trig hover:border-purple-500/30 transition-all hover:bg-white dark:hover:bg-white/10 shadow-sm hover:shadow-xl">
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

                        {/* AIDA Model Performance */}
                        <Card className="p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">AIDA funnel flow</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Creative resonance across user stages</p>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-6 relative z-10 pr-2">
                                {[
                                    { label: "Attention", score: (filteredAds.reduce((sum: any, ad: any) => sum + (Number((ad as any).aidaAttentionScore) || 0), 0) / (filteredAds.length || 1)), color: "bg-emerald-500" },
                                    { label: "Interest", score: (filteredAds.reduce((sum: any, ad: any) => sum + (Number((ad as any).aidaInterestScore) || 0), 0) / (filteredAds.length || 1)), color: "bg-emerald-400" },
                                    { label: "Desire", score: (filteredAds.reduce((sum: any, ad: any) => sum + (Number((ad as any).aidaDesireScore) || 0), 0) / (filteredAds.length || 1)), color: "bg-emerald-300" },
                                    { label: "Action", score: (filteredAds.reduce((sum: any, ad: any) => sum + (Number((ad as any).aidaActionScore) || 0), 0) / (filteredAds.length || 1)), color: "bg-emerald-200" },
                                ].map((stage: any, i: number) => (
                                    <div key={stage.label} className="group/stage">
                                        <div className="flex justify-between mb-2 px-1">
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
                                    <Badge variant="outline" className="bg-[#E0267D]/10 text-[#E0267D] border-[#E0267D]/20 font-bold text-[10px] px-2.5 py-0.5">
                                        Active engine
                                    </Badge>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black tracking-tightest text-zinc-900 dark:text-white leading-none">
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
                            {recommendations.length > 0 ? recommendations.map((rec: any, i: number) => (
                                <div key={i} className="min-w-[280px] w-[280px] xl:w-full xl:min-w-0 snap-center flex-shrink-0 xl:flex-shrink-1 p-5 md:p-6 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-all cursor-pointer group/rec shadow-sm hover:shadow-md hover:-translate-y-1 duration-300 relative overflow-hidden">
                                    <div className="flex flex-col h-full relative z-10">
                                        <div className="flex items-start justify-between mb-4 md:mb-6">
                                            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center group-hover/rec:bg-[#E0267D] transition-all duration-300">
                                                <TrendingUp className="h-5 w-5 text-zinc-500 group-hover/rec:text-white" />
                                            </div>
                                            {i === 0 && <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] px-2.5 py-1">Top priority</Badge>}
                                        </div>
                                        <div className="space-y-3 md:space-y-4 flex-1">
                                            <div className="space-y-1.5 md:space-y-2">
                                                <p className="text-[10px] font-black text-zinc-500 leading-tight">Strategy shift</p>
                                                <h4 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight group-hover/rec:text-[#E0267D] transition-colors line-clamp-2">
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
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="min-w-[280px] w-full md:w-auto snap-center flex-shrink-0 h-64 bg-zinc-100 dark:bg-[#121214] rounded-2xl animate-pulse" />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Final Row: Top Creative Grid */}
                    <div className="space-y-8 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-2">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tightest text-zinc-900 dark:text-white leading-none">Power creatives</h3>
                                <p className="text-[11px] md:text-xs text-zinc-500 font-black mt-1">Benchmarking highest efficiency neural outputs</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="hidden md:flex text-xs font-black text-[#E0267D] hover:bg-#E0267D/10 dark:hover:bg-blue-900/10 rounded-2xl h-14 px-8 border border-zinc-200 dark:border-white/5 shadow-xl transition-all hover:scale-105 group"
                                onClick={() => setActiveTab("ads")}
                            >
                                View global assets <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[#E0267D]"
                                onClick={() => setActiveTab("ads")}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Mobile: Horizontal Scroll, Desktop: Grid */}
                        <div className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 hide-scrollbar pt-2">
                            {filteredAds.slice(0, 4).map((ad: any, i: number) => (
                                <Card key={ad.id} className="min-w-[280px] md:min-w-0 w-[280px] md:w-full bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-4 flex flex-col gap-4 group shadow-xl transition-all duration-300 snap-center flex-shrink-0 md:flex-shrink-1">

                                    {/* Image Header Section */}
                                    <div className="relative aspect-[1.5] w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/50">
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
                                        <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-[15px] leading-tight truncate flex-1">{ad.adName}</h3>
                                    </div>

                                    {/* Stats Grid - MATCHING REFERENCE */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Spend Box */}
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-3 border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-between h-[80px] group/spend transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 group-hover/spend:bg-zinc-600 dark:group-hover/spend:bg-zinc-300 transition-colors" />
                                                <p className="text-[10px] text-zinc-500 font-black">Spend</p>
                                            </div>
                                            <p className="text-[18px] font-black text-zinc-900 dark:text-zinc-100 tracking-tightest">${Number(ad.spend).toLocaleString()}</p>
                                        </div>

                                        {/* CTR Box */}
                                        <div className="bg-#E0267D/10 dark:bg-#E0267D/5 rounded-2xl p-3 border border-blue-100 dark:border-#E0267D/10 flex flex-col justify-between h-[80px] relative overflow-hidden group/ctr transition-all hover:bg-blue-100/50 dark:hover:bg-#E0267D/10">
                                            {/* Subtle background glow */}
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-#E0267D/10 blur-xl rounded-full -mr-4 -mt-4 transition-opacity" />

                                            <div className="flex justify-between items-center relative z-10">
                                                <div className="w-1 h-1 rounded-full bg-#E0267D" />
                                                <p className="text-[10px] text-#E0267D dark:text-#E0267D font-black opacity-80">CTR efficiency</p>
                                            </div>
                                            <p className="text-[18px] font-black text-#E0267D dark:text-#E0267D tracking-tightest text-right relative z-10">
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
            const campaignsData = Array.from(new Set(filteredAds.map((ad: any) => ad.campaignName || "Unnamed Campaign")))
                .map((name: any) => {
                    const campAds = filteredAds.filter((ad: any) => (ad.campaignName || "Unnamed Campaign") === name)
                    const cost = campAds.reduce((sum: any, ad: any) => sum + Number(ad.spend || 0), 0)
                    const impr = campAds.reduce((sum: any, ad: any) => sum + Number(ad.impressions || 0), 0)
                    const clicks = campAds.reduce((sum: any, ad: any) => sum + Number(ad.clicks || 0), 0)
                    const ctr = impr > 0 ? (clicks / impr) * 100 : 0
                    return { name, cost, impr, clicks, ctr, count: campAds.length }
                })
                .sort((a: any, b: any) => b.cost - a.cost)

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    <Card className="rounded-[2rem] border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table">
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#E0267D]" />
                                        </TableHead>
                                        <TableHead className="min-w-[200px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-6 py-4">Campaign Name</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-2">Status</TableHead>
                                        <TableHead className="w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-2">Ads</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-2">Total Cost</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-2 hidden sm:table-cell">Impr.</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-6">Avg. CTR</TableHead>
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
                                        campaignsData.map((camp: any) => (
                                            <TableRow key={camp.name} className="group/row hover:bg-#E0267D/10/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-black text-[13px] group-hover/row:text-[#E0267D] transition-colors">{camp.name}</span>
                                                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-0.5">Campaign Analytics</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-[#34a853]" />
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-[#1a7e43] dark:text-[#52c41a]">Active</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-[13px] text-zinc-500 dark:text-zinc-400">{camp.count}</TableCell>
                                                <TableCell className="text-right font-black text-[14px] text-zinc-900 dark:text-zinc-100 px-2">${camp.cost.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[13px] text-zinc-500 dark:text-zinc-400 px-2 hidden sm:table-cell">{camp.impr.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-6 font-black text-[15px] text-[#E0267D] bg-#E0267D/10/5 dark:bg-blue-900/5">{camp.ctr.toFixed(2)}%</TableCell>
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
            const { keywords: extractedKeywords } = analyticsData
            // Prepare data for the keywords table - mapped to expected property names (spend)
            const formattedKeywords = extractedKeywords.map(k => ({ ...k, spend: k.cost }))

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    <Card className="rounded-[2rem] border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md group/table">
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#E0267D]" />
                                        </TableHead>
                                        <TableHead className="min-w-[200px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-6 py-4">Search Keyword</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center">Match Type</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Spend</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Impr.</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Clicks</TableHead>
                                        <TableHead className="w-[120px] text-[#E0267D] font-black text-[9px] uppercase tracking-widest text-right px-6">CTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formattedKeywords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-[400px] text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <Search className="h-12 w-12 text-zinc-200" />
                                                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No keyword data found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        formattedKeywords.map((kw: any, i: number) => (
                                            <TableRow key={`${kw.word}-${i}`} className="group/row hover:bg-#E0267D/10/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-black text-[13px] group-hover/row:text-[#E0267D] transition-colors uppercase tracking-tight">{kw.word}</span>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-[10px] text-zinc-400 uppercase tracking-widest">Broad Match</TableCell>
                                                <TableCell className="text-right font-black text-[13px] text-zinc-900 dark:text-zinc-100">${kw.spend.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 dark:text-zinc-400">{kw.impr.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 dark:text-zinc-400">{kw.clicks.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-6 font-black text-[14px] text-[#E0267D]">{kw.ctr.toFixed(2)}%</TableCell>
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

        if (activeTab === "audiences") {
            const audiences = Array.from(new Set(filteredAds.flatMap((ad: any) => ad.tags || [])))
                .filter((tag: any) => tag.length > 5 && !tag.includes(' '))
                .slice(0, 10)
                .map((tag: any) => {
                    // Create a simple deterministic "random" value based on the string
                    const seed = tag.split('').reduce((acc: any, char: any) => acc + char.charCodeAt(0), 0)
                    return {
                        name: tag,
                        size: "M",
                        reach: (seed * 123) % 40000 + 10000, // Deterministic value between 10k and 50k
                        score: (seed * 7) % 20 + 80 // Deterministic score between 80 and 100
                    }
                })

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {audiences.length > 0 ? audiences.map((aud: any) => (
                            <Card key={aud.name} className="p-6 border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 rounded-[2rem] hover:scale-[1.02] transition-transform cursor-pointer group shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="h-10 w-10 rounded-xl bg-#E0267D/10 flex items-center justify-center text-[#E0267D]">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase tracking-widest">{aud.score}% Affinity</Badge>
                                </div>
                                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2 group-hover:text-[#E0267D] transition-colors">{aud.name}</h3>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Potential Reach</p>
                                        <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">{aud.reach.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Segment Size</p>
                                        <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-100">{aud.size}</p>
                                    </div>
                                </div>
                            </Card>
                        )) : (
                            <div className="col-span-full h-[400px] flex flex-col items-center justify-center text-center p-12 bg-zinc-50 dark:bg-white/5 rounded-[2.5rem] border border-zinc-200/50 dark:border-white/10">
                                <Info className="h-12 w-12 text-zinc-200 mb-4" />
                                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest">No Audience Data Synchronized</h3>
                            </div>
                        )}
                    </div>
                </div>
            )
        }

        // Ads & Assets tab (the main table)
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                <Card className="rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 md:backdrop-blur-xl backdrop-blur-md group/table">
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[800px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-4 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#E0267D] focus:ring-[#E0267D]" />
                                        </TableHead>
                                        <TableHead className="w-[60px] md:w-[80px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4">Creative</TableHead>
                                        <TableHead className="min-w-[150px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4">Details</TableHead>
                                        <TableHead className="w-[90px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-4 hidden md:table-cell">Status</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4">Cost</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden sm:table-cell">Impr.</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden md:table-cell">Int.</TableHead>
                                        <TableHead className="w-[100px] md:w-[120px] text-[#E0267D] font-black text-[9px] uppercase tracking-widest text-right px-6 bg-#E0267D/10/10 dark:bg-blue-900/5">Int. Rate</TableHead>
                                        <TableHead className="w-[120px] md:w-[140px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-4">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-[400px] text-center border-none">
                                                <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-#E0267D/10 blur-3xl rounded-full scale-150 opacity-20" />
                                                        <div className="relative h-20 w-20 rounded-[2rem] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-2xl flex items-center justify-center">
                                                            <Search className="h-10 w-10 text-[#E0267D]" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tightest">No Matching Creatives</h3>
                                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Adjust filters to see more results</p>
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
                                                        <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#E0267D] focus:ring-[#E0267D]" onClick={(e) => e.stopPropagation()} />
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
                                                        <div className="flex flex-col max-w-[200px]">
                                                            <span className="text-zinc-900 dark:text-zinc-100 font-black text-[13px] truncate leading-tight">{ad.adName || "Unnamed"}</span>
                                                            <span className="text-[10px] text-zinc-400 font-bold truncate opacity-80">{ad.campaignName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 hidden md:table-cell">
                                                        <div className="flex items-center justify-center">
                                                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-[14px] text-zinc-900 dark:text-zinc-100 px-4">${Number(ad.spend).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-bold text-[13px] text-zinc-500 px-4 hidden sm:table-cell">{Number(ad.impressions).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-bold text-[13px] text-zinc-500 px-4 hidden md:table-cell">{Number(ad.clicks).toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-black text-[15px] text-[#E0267D] px-6 bg-#E0267D/10/10 dark:bg-blue-900/5">{(Number(ad.ctr) || 0).toFixed(2)}%</TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="flex items-center justify-center">
                                                            <Button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectAd(ad);
                                                                }}
                                                                className="relative h-9 px-5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-[#E0267D] border border-zinc-200 dark:border-white/10 hover:border-[#E0267D] text-zinc-600 dark:text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:shadow-[0_0_20px_rgba(26,115,232,0.3)] transition-all duration-300 group overflow-hidden"
                                                            >
                                                                <span className="relative z-10 flex items-center">
                                                                    <Sparkles className="h-3.5 w-3.5 mr-2 text-[#E0267D] group-hover:text-white transition-colors" />
                                                                    Analyze
                                                                </span>
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
                                                            className="h-12 px-8 border-none bg-#E0267D/10 text-[#E0267D] dark:bg-white/5 dark:text-#E0267D text-[11px] font-black uppercase tracking-widest rounded-2xl"
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
                    </div>
                </Card>
            </div>
        )
    }

    if (!mounted) return null

    return (
        <TooltipProvider>
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/5 -mx-4 md:-mx-6">
                {/* Mobile Header - Professional Approach */}
                <div className="md:hidden px-4 py-3 flex flex-col gap-4">
                    {/* Top Row: Info & Mode Toggle */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#E0267D]/10 flex items-center justify-center border border-[#E0267D]/20 shadow-inner shrink-0">
                                <TrendingUp className="h-4 w-4 text-[#E0267D]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#E0267D] opacity-80 leading-tight">AdRoll Platform</span>
                                <h1 className="text-[13px] font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1 leading-tight truncate">
                                    Global Overview
                                    <ChevronDown className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                                </h1>
                            </div>
                        </div>

                        {/* Search Bar - Mobile Header */}
                        <div className="relative group flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-[#E0267D] transition-colors" />
                            <Input
                                placeholder="Search ads..."
                                className="pl-9 h-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 rounded-lg text-[11px] font-bold focus-visible:ring-1 focus-visible:ring-[#E0267D]/30 transition-all w-full"
                                value={dataSource === "realtime" ? realtimeSearchQuery : localSearchQuery}
                                onChange={(e) => dataSource === "realtime" ? setRealtimeSearchQuery(e.target.value) : setLocalSearchQuery(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-8 px-2.5 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-2">
                                    {dataSource === "database" ? <Database className="h-3 w-3 text-[#E0267D]" /> : <Wifi className="h-3 w-3 text-[#E0267D] animate-pulse" />}
                                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                                        {dataSource === "database" ? "Historical" : "Live"}
                                    </span>
                                    <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-2xl z-50">
                                <DropdownMenuItem onClick={() => setDataSource("database")} className={cn("rounded-xl py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-[#E0267D]/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Database className={cn("h-4 w-4 shrink-0", dataSource === "database" ? "text-[#E0267D]" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Historical Reports</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Database analysis cards</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDataSource("realtime")} className={cn("rounded-xl py-2.5 cursor-pointer", dataSource === "realtime" && "bg-[#E0267D]/5")}>
                                    <div className="flex items-center gap-2.5">
                                        <Wifi className={cn("h-4 w-4 shrink-0", dataSource === "realtime" ? "text-[#E0267D]" : "text-zinc-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Analytics</p>
                                            <p className="text-[10px] text-zinc-400 font-medium">Campaigns → Ads → Analysis</p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>


                    {/* Bottom Row: Contextual Filters (Mobile only snap scroll) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none snap-x h-10">
                        {dataSource === "realtime" ? (
                            <Select value={realtimeDateRange} onValueChange={setRealtimeDateRange}>
                                <SelectTrigger className="w-[130px] h-8 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[11px] font-black uppercase tracking-widest snap-start">
                                    <Calendar className="h-3 w-3 mr-1.5 text-zinc-400" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                                    <SelectItem value="LAST_14_DAYS">Last 14 Days</SelectItem>
                                    <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                                    <SelectItem value="THIS_MONTH">This Month</SelectItem>
                                    <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <>
                                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                                    <SelectTrigger className="w-[160px] h-8 shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[11px] font-black uppercase tracking-widest snap-start">
                                        <LayoutGrid className="h-3 w-3 mr-1.5 text-zinc-400" />
                                        <SelectValue placeholder="Campaigns" />
                                    </SelectTrigger>
                                    <SelectContent className="w-[200px]">
                                        <SelectItem value="all">All Campaigns</SelectItem>
                                        {uniqueCampaigns.map((camp: any) => (
                                            <SelectItem key={camp} value={camp}>{camp}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedType} onValueChange={setSelectedType}>
                                    <SelectTrigger className="w-[120px] h-8 shrink-0 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[11px] font-black uppercase tracking-widest snap-start">
                                        <Filter className="h-3 w-3 mr-1.5 text-zinc-400" />
                                        <SelectValue placeholder="Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {campaignTypes.map((type: any) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                    </div>
                </div>

                {/* Desktop Header - Reverted Original Approach */}
                <div className="hidden md:flex px-6 py-3 items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#E0267D]/10 flex items-center justify-center border border-[#E0267D]/20 shadow-inner shrink-0">
                            <TrendingUp className="h-4 w-4 text-[#E0267D]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E0267D] opacity-80">AdRoll Platform</span>
                            <h1 className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                                Global Overview
                                <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">

                        {/* Date range — live mode only */}
                        {dataSource === "realtime" && (
                            <Select value={realtimeDateRange} onValueChange={setRealtimeDateRange}>
                                <SelectTrigger className="w-36 h-9 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-xs font-medium focus:ring-1 focus:ring-[#E0267D]/50 shadow-sm">
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
                        )}

                        {/* Database / Live toggle */}
                        <div className="flex items-center gap-2">
                            {/* Desktop Search Bar */}
                            <div className="relative group w-[200px] lg:w-[280px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-[#E0267D] transition-colors" />
                                <Input
                                    placeholder="Search ads..."
                                    className="pl-9 h-9 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl text-xs font-medium focus-visible:ring-1 focus-visible:ring-[#E0267D]/50 shadow-sm transition-all w-full"
                                    value={dataSource === "realtime" ? realtimeSearchQuery : localSearchQuery}
                                    onChange={(e) => dataSource === "realtime" ? setRealtimeSearchQuery(e.target.value) : setLocalSearchQuery(e.target.value)}
                                />
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-9 px-3 bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl flex items-center gap-2 hover:border-[#E0267D]/30 transition-all shadow-sm">
                                        {dataSource === "database"
                                            ? <Database className="h-3.5 w-3.5 text-[#E0267D]" />
                                            : <Wifi className="h-3.5 w-3.5 text-[#E0267D] animate-pulse" />}
                                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                                            {dataSource === "database" ? "Historical Reports" : "Live Analytics"}
                                        </span>
                                        <ChevronDown className="h-3 w-3 text-zinc-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-2xl z-50">
                                    <DropdownMenuItem onClick={() => setDataSource("database")} className={cn("rounded-xl py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-[#E0267D]/5")}>
                                        <div className="flex items-center gap-2.5">
                                            <Database className={cn("h-4 w-4 shrink-0", dataSource === "database" ? "text-[#E0267D]" : "text-zinc-500")} />
                                            <div>
                                                <p className="text-xs font-bold">Historical Reports</p>
                                                <p className="text-[10px] text-zinc-400">Database analysis cards</p>
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDataSource("realtime")} className={cn("rounded-xl py-2.5 cursor-pointer", dataSource === "realtime" && "bg-[#E0267D]/5")}>
                                        <div className="flex items-center gap-2.5">
                                            <Wifi className={cn("h-4 w-4 shrink-0", dataSource === "realtime" ? "text-[#E0267D]" : "text-zinc-500")} />
                                            <div>
                                                <p className="text-xs font-bold">Live Analytics</p>
                                                <p className="text-[10px] text-zinc-400">Campaigns → Ads → Analysis</p>
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Refresh (live only) */}
                            {dataSource === "realtime" && (
                                <button
                                    onClick={() => { setIsRefreshing(true); setRealtimeRefreshKey(k => k + 1); setTimeout(() => setIsRefreshing(false), 1500); }}
                                    className="h-9 w-9 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center hover:border-[#E0267D]/40 transition-all shadow-sm"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? 'animate-spin text-[#E0267D]' : ''}`} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content ────────────────────────────────────────────── */}
            {dataSource === "realtime" ? (
                <div className="flex flex-col w-full gap-4 py-6">
                    <div className="bg-white dark:bg-black relative -mx-4 md:-mx-6 rounded-2xl overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
                        <RealtimeNativeView
                            key={realtimeRefreshKey}
                            dateRange={realtimeDateRange}
                            onDateRangeChange={setRealtimeDateRange}
                            searchQuery={realtimeSearchQuery}
                            onSearchChange={setRealtimeSearchQuery}
                            onCampaignsLoaded={onRealtimeCampaignsLoaded}
                            selectedCampaignId={selectedRealtimeCampaignId}
                            platform="adroll"
                        />
                    </div>
                </div>
            ) : (
                /* DATABASE: AdRoll cards from adroll_data MongoDB collection */
                <div className="py-6 space-y-6">
                    {/* Filter Bar (Restored with search) */}
                    <div className="flex flex-col md:flex-row flex-wrap items-center gap-3">

                        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                            <SelectTrigger className="w-44 h-9 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-xs font-bold">
                                <LayoutGrid className="h-3 w-3 mr-2 text-zinc-400" />
                                <SelectValue placeholder="All Campaigns" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="all" className="rounded-xl font-bold text-xs">All Campaigns</SelectItem>
                                {uniqueCampaigns.map((camp: any) => (
                                    <SelectItem key={camp} value={camp} className="rounded-xl text-xs">{camp}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-36 h-9 rounded-xl bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-xs font-bold">
                                <Filter className="h-3 w-3 mr-2 text-zinc-400" />
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="all" className="rounded-xl font-bold text-xs">All Types</SelectItem>
                                {campaignTypes.map((type: any) => (
                                    <SelectItem key={type} value={type} className="rounded-xl text-xs">{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Empty state */}
                    {filteredAds.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#E0267D]/10 flex items-center justify-center mb-4 border border-[#E0267D]/20">
                                <Database className="h-7 w-7 text-[#E0267D]" />
                            </div>
                            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mb-1">No AdRoll Data</h3>
                            <p className="text-sm text-zinc-400 max-w-xs">No AdRoll creatives found in the database. Switch to Live Analytics to view campaigns.</p>
                        </div>
                    ) : (
                        /* Ad Cards Grid - Slider on mobile, Grid on desktop */
                        <div className="flex overflow-x-auto md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-8 md:pb-0 scrollbar-none snap-x snap-mandatory px-4 -mx-4 md:px-0 md:mx-0">
                            {filteredAds.slice(0, displayLimit).map((ad: any) => {
                                const verdict = ad.verdictDecision || ad.performanceLabel || ''
                                const rating = ad.verdictRating || ''
                                const score = Number(ad.scoreOverall || ad.compositeRating) || 0
                                const scoreColor = score >= 7 ? '#10b981' : score >= 4 ? '#f59e0b' : score > 0 ? '#ef4444' : '#6b7280'
                                const verdictColor = verdict === 'SCALE' ? '#10b981' : verdict === 'PAUSE' ? '#ef4444' : verdict === 'OPTIMIZE' ? '#f59e0b' : '#6b7280'

                                return (
                                    <div
                                        key={ad.id}
                                        className={cn(
                                            "group relative flex flex-col min-w-[85vw] md:min-w-0 w-full rounded-xl transition-all duration-300 overflow-hidden snap-center",
                                            "bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/10",
                                            "hover:border-cyan-500/30 dark:hover:border-cyan-500/40 hover:shadow-xl dark:hover:shadow-cyan-500/10",
                                            "hover:-translate-y-1"
                                        )}
                                    >
                                        {/* Media Section */}
                                        <div
                                            className="relative aspect-[1.7] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/5"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (onEnlargeImage && ad.thumbnailUrl) onEnlargeImage(ad.thumbnailUrl, ad.adName || ad.adId)
                                            }}
                                        >
                                            {ad.thumbnailUrl ? (
                                                <img
                                                    src={ad.thumbnailUrl}
                                                    alt={ad.adName || ad.adId}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-20">
                                                    <Brain className="h-7 w-7" />
                                                </div>
                                            )}

                                            {/* Top Badges */}
                                            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 z-10">
                                                <div className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                                <span className="text-[7px] font-bold uppercase tracking-widest text-white">Live</span>
                                            </div>
                                            <div className="absolute top-2 right-2 h-4 w-4 rounded-sm bg-[#E0267D] flex items-center justify-center z-10 shadow-lg">
                                                <span className="text-white text-[8px] font-black italic">A</span>
                                            </div>

                                            {/* Size Overlay */}
                                            {/* Assuming ad.width and ad.height are available, otherwise this might need adjustment */}
                                            {ad.width && ad.height && (
                                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm border border-white/5 text-[7px] font-bold text-zinc-400">
                                                    {ad.width}x{ad.height}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Section */}
                                        <div className="p-4 flex flex-col gap-3.5 flex-1">
                                            <div className="space-y-1">
                                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
                                                    {ad.adName || ad.adId || "Untitled Creative"}
                                                </h3>
                                                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em]">ID: {ad.adId?.substring(0, 8)}</p>
                                            </div>

                                            {/* Minimalist Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-100 dark:border-white/5 flex flex-col justify-center h-[55px] relative overflow-hidden group/m">
                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500 opacity-0 group-hover/m:opacity-100 transition-opacity" />
                                                    <p className="text-[8px] font-black uppercase text-zinc-400 mb-0.5 tracking-wider">Efficiency</p>
                                                    <p className="text-lg font-black font-mono text-zinc-900 dark:text-white tracking-tighter leading-none">
                                                        {Number(ad.ctr || 0).toFixed(2)}%
                                                    </p>
                                                </div>
                                                <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-100 dark:border-white/5 flex flex-col justify-center h-[55px] relative overflow-hidden group/m">
                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 opacity-0 group-hover/m:opacity-100 transition-opacity" />
                                                    <p className="text-[8px] font-black uppercase text-zinc-400 mb-0.5 tracking-wider">Spend</p>
                                                    <p className="text-lg font-black font-mono text-zinc-900 dark:text-white tracking-tighter leading-none">
                                                        ${Number(ad.spend || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* High-Precision Footer */}
                                            <div className="mt-auto pt-3 flex items-center justify-end border-t border-zinc-100 dark:border-white/5">
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); onSelectAd(ad); }}
                                                    className={cn(
                                                        "h-8 px-5 font-bold text-[10px] uppercase tracking-widest rounded-md transition-all duration-300 flex items-center gap-2 active:scale-95",
                                                        "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-teal-600 dark:hover:bg-cyan-500 hover:text-white shadow-lg"
                                                    )}
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Analyze
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Load more */}
                    {filteredAds.length > displayLimit && (
                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={() => setDisplayLimit(prev => prev + 24)}
                                variant="outline"
                                className="h-11 px-8 border-[#E0267D]/30 text-[#E0267D] hover:bg-[#E0267D]/5 rounded-2xl text-xs font-black uppercase tracking-widest"
                            >
                                Show More Creatives
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </TooltipProvider>
    )
}
