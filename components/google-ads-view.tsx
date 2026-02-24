"use client"

import { useState, useMemo } from "react"
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
    Globe
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

interface GoogleAdsViewProps {
    googleAds: AdData[]
    selectedAccountId: string
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onViewLibrary?: () => void
}

export default function GoogleAdsView({
    googleAds,
    selectedAccountId,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onViewLibrary
}: GoogleAdsViewProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("ads")
    const [selectedCampaign, setSelectedCampaign] = useState<string>("all")
    const [selectedType, setSelectedType] = useState<string>("all")
    const [selectedDate, setSelectedDate] = useState<string>("7d")
    const [dataSource, setDataSource] = useState<"database" | "realtime">("database")
    const [displayLimit, setDisplayLimit] = useState(24)
    const [copiedId, setCopiedId] = useState<string | null>(null)

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
            return matchesAccount && matchesCampaign && matchesType && matchesSearch
        })
    }, [googleAds, selectedAccountId, selectedCampaign, selectedType, searchQuery])

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
        { id: "audiences", label: "Audiences", icon: Info },
    ]

    const renderTabContent = () => {
        if (activeTab === "overview") {
            // Aggregated Data for Overview
            const topCampaigns = Array.from(new Set(filteredAds.map(ad => ad.campaignName || "Unnamed Campaign")))
                .map(name => {
                    const campAds = filteredAds.filter(ad => (ad.campaignName || "Unnamed Campaign") === name)
                    const cost = campAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
                    const impr = campAds.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0)
                    const clicks = campAds.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0)
                    const ctr = impr > 0 ? (clicks / impr) * 100 : 0
                    return { name, cost, count: campAds.length, ctr }
                })
                .sort((a, b) => b.cost - a.cost)

            const typeBreakdown = Array.from(new Set(filteredAds.map(ad => ad.adType || "Other")))
                .map(type => {
                    const typeAds = filteredAds.filter(ad => (ad.adType || "Other") === type)
                    const cost = typeAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
                    const impr = typeAds.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0)
                    const clicks = typeAds.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0)
                    const ctr = impr > 0 ? (clicks / impr) * 100 : 0
                    return { type, cost, ctr, count: typeAds.length }
                })
                .sort((a, b) => b.cost - a.cost)

            // Extract "Keywords" from tags or searchableContent or common words in ad names
            const extractedKeywords = Array.from(new Set(filteredAds.flatMap(ad =>
                ad.tags || []).concat(filteredAds.flatMap(ad => (ad.adName || "").split(' ').filter(w => w.length > 4)))
            ))
                .map(word => {
                    const normalized = word.toLowerCase().trim().replace(/[^\w\s]/gi, '')
                    if (normalized.length < 4) return null
                    const keywordAds = filteredAds.filter(ad =>
                        (ad.adName || "").toLowerCase().includes(normalized) ||
                        (ad.tags || []).some(t => t.toLowerCase().includes(normalized))
                    )
                    if (keywordAds.length === 0) return null
                    const cost = keywordAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
                    const ctr = keywordAds.reduce((sum, ad) => sum + Number(ad.ctr || 0), 0) / keywordAds.length
                    return { word: normalized, cost, ctr, count: keywordAds.length }
                })
                .filter((k): k is { word: string, cost: number, ctr: number, count: number } => !!k)
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 8)

            const avgOptScore = filteredAds.length > 0
                ? (filteredAds.reduce((sum, ad) => sum + (Number(ad.scoreOverall) || 0), 0) / filteredAds.length) * 10
                : 0

            const sortedAdsForChart = [...filteredAds].sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0)).slice(0, 15);
            const maxSpendForChart = Math.max(...sortedAdsForChart.map(a => Number(a.spend) || 1));

            // Prepare Recharts data for spend distribution
            const spendChartData = sortedAdsForChart.map((ad, i) => ({
                name: ad.adName?.slice(0, 10) || `Ad ${i + 1}`,
                spend: Number(ad.spend) || 0,
                ctr: Number(ad.ctr) || 0,
                fullName: ad.adName
            }));

            // Prepare Recharts data for format breakdown
            const formatChartData = typeBreakdown.map(item => ({
                name: item.type,
                value: item.cost,
                ctr: item.ctr
            }));

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
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20 overflow-hidden max-w-full">
                    {/* Primary Row: High-Level Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <Card className="lg:col-span-4 p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a73e8]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#1a73e8]/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 md:mb-10">
                                <div>
                                    <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#1a73e8]">Account Excellence</h3>
                                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Optimization Benchmark</p>
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
                                        <span className="text-[9px] md:text-[11px] font-black text-[#1a73e8] uppercase tracking-widest mt-1">Percent</span>
                                    </div>
                                </div>
                                <div className="mt-8 md:mt-10 w-full space-y-4">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-widest">Growth Potential</span>
                                        <span className="text-[10px] font-black text-emerald-500">+{(100 - avgOptScore).toFixed(1)}%</span>
                                    </div>
                                    <Button className="w-full h-11 md:h-12 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all">Review Key Shifts</Button>
                                </div>
                            </div>
                        </Card>

                        {/* Performance Trends Chart */}
                        <Card className="lg:col-span-8 p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">Performance Snapshot</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Real-time spend distribution across top assets</p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-[#1a73e8]/10 text-[#1a73e8] border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest group-hover:scale-105 transition-transform">Active Scaling</Badge>
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
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Top Performer</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">${Number(sortedAdsForChart[0]?.spend || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/stat hover:border-blue-500/20 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">Avg. Efficiency</p>
                                    <p className="text-xs md:text-sm font-black text-zinc-900 dark:text-zinc-100">{(totalInteractions / (totalImpr || 1) * 100).toFixed(2)}%</p>
                                </div>
                                <div className="text-center p-2 md:p-4 rounded-[1.5rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 group/stat hover:bg-blue-100/50 transition-all flex flex-col justify-center">
                                    <p className="text-[7px] md:text-[9px] font-black text-[#1a73e8] uppercase tracking-widest mb-1 group-hover:scale-105 transition-transform">Volatility</p>
                                    <p className="text-xs md:text-sm font-black text-[#1a73e8]">Low</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Secondary Row: Lists & Breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Campaigns List */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Top Campaigns</h3>
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
                                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tight">{camp.ctr.toFixed(2)}% CTR</span>
                                                        </div>
                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tight">• {camp.count} assets</span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[13px] font-black text-zinc-900 dark:text-zinc-100 block">${camp.cost.toLocaleString()}</span>
                                                    <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{percentage.toFixed(1)}% weight</span>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">No Active Data Flows</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Ad Type Distribution */}
                        <Card className="p-6 md:p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] flex flex-col min-h-[450px] lg:h-[520px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Format Performance</h3>
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
                                                    <span className="text-[9px] md:text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest truncate">{item.type}</span>
                                                </div>
                                                <div className="shrink-0 px-2 py-0.5 rounded-full bg-blue-500/10 text-[#1a73e8] text-[9px] font-black">{item.ctr.toFixed(2)}% CTR</div>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Efficiency</p>
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
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Search Keywords</h3>
                                <div className="h-8 w-8 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/10">
                                    <Search className="h-4 w-4 text-zinc-300" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-x-auto overflow-y-auto pr-3 custom-scrollbar">
                                <div className="min-w-[300px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-none hover:bg-transparent">
                                                <TableHead className="h-auto py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0">Term</TableHead>
                                                <TableHead className="h-auto py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-right">Cost</TableHead>
                                                <TableHead className="h-auto py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 text-right pr-0">CTR</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {extractedKeywords.length > 0 ? extractedKeywords.map((kw, i) => (
                                                <TableRow key={`${kw.word}-${i}`} className="border-none group/kw hover:bg-[#1a73e8]/5 transition-colors">
                                                    <TableCell className="py-4 pl-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-2 w-2 rounded-full bg-[#1a73e8] shadow-[0_0_8px_rgba(26,115,232,0.4)] opacity-20 group-hover/kw:opacity-100 transition-all duration-500" />
                                                            <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 group-hover/kw:text-[#1a73e8] transition-colors uppercase tracking-tight">{kw.word}</span>
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
                                                    <TableCell colSpan={3} className="pt-24 text-center border-none">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center">
                                                                <Search className="h-6 w-6 text-zinc-200" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No signals detected</p>
                                                                <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest">Enable tag monitoring</p>
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
                        <Card className="p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] group-hover:bg-purple-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">Psychological IQ</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Winning behavioral patterns detected</p>
                                </div>
                                <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner group-hover:scale-110 transition-transform">
                                    <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                {[
                                    { label: "Social Proof", key: "socialProof" as const, color: "from-purple-500 to-blue-500" },
                                    { label: "Scarcity", key: "scarcity" as const, color: "from-purple-400 to-pink-500" },
                                    { label: "Loss Aversion", key: "lossAversion" as const, color: "from-blue-600 to-purple-600" },
                                    { label: "Curiosity", key: "curiosityGap" as const, color: "from-indigo-500 to-purple-400" },
                                ].map(trigger => {
                                    const count = filteredAds.filter(ad => (ad as any)[trigger.key] === "Yes" || (ad as any)[trigger.key + "Present"] === true).length
                                    const percentage = (count / (filteredAds.length || 1)) * 100
                                    return (
                                        <div key={trigger.label} className="p-5 rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group/trig hover:border-purple-500/30 transition-all hover:bg-white dark:hover:bg-white/10 shadow-sm hover:shadow-xl">
                                            <div className="flex justify-between items-end mb-3">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover/trig:text-purple-500 transition-colors">{trigger.label}</span>
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
                        <Card className="p-8 border border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl rounded-[2.5rem] relative overflow-hidden group">
                            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-all duration-1000" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">AIDA Funnel Flow</h3>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Creative resonance across user stages</p>
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
                                        <div className="flex justify-between mb-2 px-1">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-4 w-4 rounded-lg flex items-center justify-center text-[8px] font-black text-white", stage.color)}>{i + 1}</div>
                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover/stage:text-emerald-500 transition-colors uppercase pr-2">{stage.label}</span>
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
                    <div className="space-y-8 bg-[#09090b] p-6 md:p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-[#1a73e8]/10 text-[#1a73e8] border-[#1a73e8]/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                                        Active Engine
                                    </Badge>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black tracking-tightest text-white uppercase leading-none">
                                    Optimization Hub
                                </h3>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                    Neutral Engine Detected <span className="text-white">{recommendations.length} Strategic Shifts</span>
                                </p>
                            </div>
                            <Button variant="outline" className="border-zinc-800 bg-[#121214] text-zinc-400 hover:text-white hover:bg-[#18181b] rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest">
                                Scan complete
                            </Button>
                        </div>



                        <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 overflow-x-auto md:overflow-visible pb-6 md:pb-0 snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 hide-scrollbar">
                            {recommendations.length > 0 ? recommendations.map((rec, i) => (
                                <div key={i} className="min-w-[280px] w-[280px] md:w-auto snap-center flex-shrink-0 p-5 md:p-6 bg-[#121214] hover:bg-[#18181b] rounded-[2rem] border border-white/5 hover:border-white/10 transition-all cursor-pointer group/rec shadow-md hover:-translate-y-1 duration-300 relative overflow-hidden">
                                    <div className="flex flex-col h-full relative z-10">
                                        <div className="flex items-start justify-between mb-4 md:mb-6">
                                            <div className="h-10 w-10 rounded-xl bg-zinc-800/50 flex items-center justify-center group-hover/rec:bg-[#1a73e8] transition-all duration-300">
                                                <TrendingUp className="h-5 w-5 text-zinc-500 group-hover/rec:text-white" />
                                            </div>
                                            {i === 0 && <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase tracking-widest px-2.5 py-1">Top Priority</Badge>}
                                        </div>
                                        <div className="space-y-3 md:space-y-4 flex-1">
                                            <div className="space-y-1.5 md:space-y-2">
                                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-tight">Strategy Shift</p>
                                                <h4 className="text-sm md:text-base font-black text-zinc-100 leading-tight uppercase tracking-tight group-hover/rec:text-[#1a73e8] transition-colors line-clamp-2">
                                                    {rec.title}
                                                </h4>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 font-medium leading-relaxed pt-3 md:pt-4 border-t border-white/5 line-clamp-3">
                                                Projected <span className="text-zinc-100 font-bold">{rec.impact} uplit</span> by optimizing {rec.category.toLowerCase()} signals.
                                            </p>
                                        </div>
                                        <Button className="mt-4 md:mt-6 h-10 md:h-12 w-full rounded-xl bg-zinc-800 text-zinc-300 hover:bg-[#1a73e8] hover:text-white font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-lg border border-transparent">
                                            Apply Optimization
                                        </Button>
                                    </div>
                                </div>
                            )) : (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="min-w-[280px] w-full md:w-auto snap-center flex-shrink-0 h-64 bg-[#121214] rounded-[2rem] animate-pulse" />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Final Row: Top Creative Grid */}
                    <div className="space-y-8 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="space-y-2">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tightest text-white uppercase leading-none">Power Creatives</h3>
                                <p className="text-[10px] md:text-xs text-zinc-500 font-black uppercase tracking-widest mt-1">Benchmarking highest efficiency neural outputs</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="hidden md:flex text-[11px] font-black uppercase tracking-[0.2em] text-[#1a73e8] hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl h-14 px-8 border border-zinc-200 dark:border-white/5 shadow-xl transition-all hover:scale-105 group"
                                onClick={() => setActiveTab("ads")}
                            >
                                View Global Assets <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-10 w-10 rounded-xl bg-zinc-800 text-[#1a73e8]"
                                onClick={() => setActiveTab("ads")}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Mobile: Horizontal Scroll, Desktop: Grid */}
                        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x snap-mandatory -mx-3 px-3 md:mx-0 md:px-0 hide-scrollbar pt-2">
                            {filteredAds.slice(0, 4).map((ad, i) => (
                                <Card key={ad.id} className="min-w-[280px] w-[280px] md:w-full bg-[#09090b] border border-zinc-800 hover:border-zinc-700 rounded-[1.5rem] p-4 flex flex-col gap-4 group shadow-xl transition-all duration-300 snap-center">

                                    {/* Image Header Section */}
                                    <div className="relative aspect-[1.5] w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50">
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
                                        <Badge className="absolute top-3 right-3 bg-[#10b981] hover:bg-[#059669] text-white border-none rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wide shadow-lg z-10 transition-transform group-hover:scale-105">
                                            Top Performer
                                        </Badge>

                                        {/* Gradient Fade for Text Readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                    </div>

                                    {/* Title Section */}
                                    <div className="flex items-center justify-between gap-2 px-1">
                                        <h3 className="text-zinc-100 font-bold text-[15px] leading-tight truncate flex-1">{ad.adName}</h3>
                                    </div>

                                    {/* Stats Grid - MATCHING REFERENCE */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Spend Box: Darker */}
                                        <div className="bg-[#121214] rounded-2xl p-3.5 border border-zinc-800/50 flex flex-col justify-between h-[72px]">
                                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">Spend</p>
                                            <p className="text-[17px] font-bold text-zinc-100 tracking-tight">${Number(ad.spend).toLocaleString()}</p>
                                        </div>

                                        {/* CTR Box: Blue Tint/Outline */}
                                        <div className="bg-[#1a73e8]/10 rounded-2xl p-3.5 border border-[#1a73e8]/20 flex flex-col justify-between h-[72px] relative overflow-hidden group/ctr">
                                            {/* Subtle background glow */}
                                            <div className="absolute top-0 right-0 w-12 h-12 bg-[#1a73e8]/20 blur-xl rounded-full -mr-4 -mt-4 transition-opacity" />

                                            <div className="flex justify-end">
                                                <p className="text-[10px] text-[#8ab4f8] font-black uppercase tracking-wide opacity-80">CTR</p>
                                            </div>
                                            <p className="text-[17px] font-black text-[#4285f4] tracking-tight text-right relative z-10">
                                                {Number(ad.ctr).toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer Section: ID & Copy */}
                                    <div className="mt-auto pt-3 border-t border-dashed border-zinc-800 flex items-center justify-between px-1">
                                        <span className="text-[10px] font-mono text-zinc-600 tracking-wider">ID: {ad.id.replace(/\D/g, '').substring(0, 12)}...</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(ad.id)
                                                setCopiedId(ad.id)
                                                setTimeout(() => setCopiedId(null), 2000)
                                            }}
                                            className="text-zinc-600 hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800"
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
                    <Card className="rounded-[2rem] border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table">
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8]" />
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
                                        campaignsData.map((camp) => (
                                            <TableRow key={camp.name} className="group/row hover:bg-blue-50/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-zinc-900 dark:text-zinc-100 font-black text-[13px] group-hover/row:text-[#1a73e8] transition-colors">{camp.name}</span>
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
                                                <TableCell className="text-right px-6 font-black text-[15px] text-[#1a73e8] bg-blue-50/5 dark:bg-blue-900/5">{camp.ctr.toFixed(2)}%</TableCell>
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
            const extractedKeywords = Array.from(new Set(filteredAds.flatMap(ad =>
                ad.tags || []).concat(filteredAds.flatMap(ad => (ad.adName || "").split(' ').filter(w => w.length > 5)))
            ))
                .map(word => {
                    const normalized = word.toLowerCase().trim().replace(/[^\w\s]/gi, '')
                    if (normalized.length < 5) return null
                    const keywordAds = filteredAds.filter(ad =>
                        (ad.adName || "").toLowerCase().includes(normalized) ||
                        (ad.tags || []).some(t => t.toLowerCase().includes(normalized))
                    )
                    if (keywordAds.length === 0) return null
                    const spend = keywordAds.reduce((sum, ad) => sum + Number(ad.spend || 0), 0)
                    const impr = keywordAds.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0)
                    const clicks = keywordAds.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0)
                    const ctr = impr > 0 ? (clicks / impr) * 100 : 0
                    return { word: normalized, spend, impr, clicks, ctr }
                })
                .filter((k): k is { word: string, spend: number, impr: number, clicks: number, ctr: number } => !!k)
                .sort((a, b) => b.spend - a.spend)

            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
                    <Card className="rounded-[2rem] border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table">
                        <div className="w-full overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-6 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8]" />
                                        </TableHead>
                                        <TableHead className="min-w-[200px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-6 py-4">Search Keyword</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center">Match Type</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Spend</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Impr.</TableHead>
                                        <TableHead className="w-[120px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right">Clicks</TableHead>
                                        <TableHead className="w-[120px] text-[#1a73e8] font-black text-[9px] uppercase tracking-widest text-right px-6">CTR</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extractedKeywords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-[400px] text-center">
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <Search className="h-12 w-12 text-zinc-200" />
                                                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No keyword data found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        extractedKeywords.map((kw, i) => (
                                            <TableRow key={`${kw.word}-${i}`} className="group/row hover:bg-blue-50/30 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300">
                                                <TableCell className="px-6 text-center hidden lg:table-cell">
                                                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/10" />
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <span className="text-zinc-900 dark:text-zinc-100 font-black text-[13px] group-hover/row:text-[#1a73e8] transition-colors uppercase tracking-tight">{kw.word}</span>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-[10px] text-zinc-400 uppercase tracking-widest">Broad Match</TableCell>
                                                <TableCell className="text-right font-black text-[13px] text-zinc-900 dark:text-zinc-100">${kw.spend.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 dark:text-zinc-400">{kw.impr.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-[12px] text-zinc-500 dark:text-zinc-400">{kw.clicks.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-6 font-black text-[14px] text-[#1a73e8]">{kw.ctr.toFixed(2)}%</TableCell>
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
            const audiences = Array.from(new Set(filteredAds.flatMap(ad => ad.tags || [])))
                .filter(tag => tag.length > 5 && !tag.includes(' '))
                .slice(0, 10)
                .map(tag => {
                    // Create a simple deterministic "random" value based on the string
                    const seed = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
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
                        {audiences.length > 0 ? audiences.map((aud) => (
                            <Card key={aud.name} className="p-6 border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 rounded-[2rem] hover:scale-[1.02] transition-transform cursor-pointer group shadow-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#1a73e8]">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[9px] uppercase tracking-widest">{aud.score}% Affinity</Badge>
                                </div>
                                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-2 group-hover:text-[#1a73e8] transition-colors">{aud.name}</h3>
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
                <Card className="rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl group/table">
                    <div className="overflow-x-auto custom-scrollbar">
                        <div className="min-w-[800px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#f8f9fa] dark:bg-white/5 hover:bg-[#f8f9fa] dark:hover:bg-white/5 transition-none border-b border-zinc-200 dark:border-white/10">
                                        <TableHead className="w-[40px] px-4 text-center hidden lg:table-cell">
                                            <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8] focus:ring-[#1a73e8]" />
                                        </TableHead>
                                        <TableHead className="w-[60px] md:w-[80px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4">Creative</TableHead>
                                        <TableHead className="min-w-[150px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest px-4">Details</TableHead>
                                        <TableHead className="w-[90px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-4 hidden md:table-cell">Status</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4">Cost</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden sm:table-cell">Impr.</TableHead>
                                        <TableHead className="w-[80px] md:w-[100px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-right px-4 hidden md:table-cell">Int.</TableHead>
                                        <TableHead className="w-[100px] md:w-[120px] text-[#1a73e8] font-black text-[9px] uppercase tracking-widest text-right px-6 bg-blue-50/10 dark:bg-blue-900/5">Int. Rate</TableHead>
                                        <TableHead className="w-[120px] md:w-[140px] text-zinc-400 dark:text-zinc-500 font-black text-[9px] uppercase tracking-widest text-center px-4">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAds.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-[400px] text-center border-none">
                                                <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-150 opacity-20" />
                                                        <div className="relative h-20 w-20 rounded-[2rem] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-2xl flex items-center justify-center">
                                                            <Search className="h-10 w-10 text-[#1a73e8]" />
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
                                                    className="group/row hover:bg-blue-50/10 dark:hover:bg-blue-900/5 cursor-pointer border-b border-zinc-100 dark:border-white/5 transition-all duration-300 h-20"
                                                    onClick={() => onSelectAd(ad)}
                                                >
                                                    <TableCell className="px-4 text-center hidden lg:table-cell">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 dark:border-white/10 text-[#1a73e8] focus:ring-[#1a73e8]" onClick={(e) => e.stopPropagation()} />
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="h-12 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/5 shadow-sm group-hover/row:scale-105 transition-transform">
                                                            <img src={ad.thumbnailUrl || "/placeholder.svg"} className="w-full h-full object-cover" alt="Preview" />
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
                                                    <TableCell className="text-right font-black text-[15px] text-[#1a73e8] px-6 bg-blue-50/10 dark:bg-blue-900/5">{(Number(ad.ctr) || 0).toFixed(2)}%</TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="flex items-center justify-center">
                                                            <Button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectAd(ad);
                                                                }}
                                                                className="relative h-9 px-5 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-[#1a73e8] border border-zinc-200 dark:border-white/10 hover:border-[#1a73e8] text-zinc-600 dark:text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:shadow-[0_0_20px_rgba(26,115,232,0.3)] transition-all duration-300 group overflow-hidden"
                                                            >
                                                                <span className="relative z-10 flex items-center">
                                                                    <Sparkles className="h-3.5 w-3.5 mr-2 text-[#1a73e8] group-hover:text-white transition-colors" />
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
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-3xl border-b border-zinc-200 dark:border-white/5 shadow-2xl">
                <div className="px-4 md:px-8 py-3 md:h-12 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/5 bg-white/40 dark:bg-[#09090b]/40 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 shadow-inner group/icon shrink-0">
                            <TrendingUp className="h-4 w-4 md:h-4.5 md:w-4.5 text-[#1a73e8] dark:text-[#4285f4] transition-transform group-hover/icon:scale-110" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-[#1a73e8] opacity-80 truncate">Google Ads Platform</span>
                            <div className="flex items-center gap-2 group/acc cursor-pointer">
                                <h1 className="text-xs md:text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100 group-hover/acc:text-[#1a73e8] transition-colors flex items-center gap-1.5 truncate">
                                    {selectedAccountId !== "all"
                                        ? (googleAds.find(a => a.adAccountId === selectedAccountId)?.accountName || "Account")
                                        : "Global Overview"}
                                    <ChevronDown className="h-3 w-3 text-zinc-400 group-hover/acc:translate-y-0.5 transition-transform shrink-0" />
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto self-start md:self-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 px-3 w-full sm:w-auto bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-between sm:justify-start gap-2 hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-2">
                                        {dataSource === "database" ? <Database className="h-3.5 w-3.5 text-[#1a73e8]" /> : <Activity className="h-3.5 w-3.5 text-[#1a73e8] animate-pulse" />}
                                        <span className="text-[10px] md:text-xs font-black text-zinc-700 dark:text-zinc-300">
                                            {dataSource === "database" ? "Database Stored Data" : "Realtime Data"}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-3 w-3 text-zinc-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-3xl z-50">
                                <DropdownMenuItem onClick={() => setDataSource("database")} className="rounded-xl py-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/10 mb-1">
                                    <div className="flex items-center gap-2">
                                        <Database className="h-4 w-4 text-zinc-500" />
                                        <span className="text-xs font-bold">Database Stored Data</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDataSource("realtime")} className="rounded-xl py-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/10 bg-primary/5">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-[#1a73e8]" />
                                        <span className="text-xs font-bold">Realtime Data</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-9 px-3 w-full sm:w-auto bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-between sm:justify-start gap-2 hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5 text-[#1a73e8]" />
                                        <span className="text-[10px] md:text-xs font-black text-zinc-700 dark:text-zinc-300">
                                            {selectedDate === "7d" ? "Jan 1 - Jan 7" : "Lifetime"}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-3 w-3 text-zinc-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-zinc-200 dark:border-white/10 shadow-3xl">
                                <DropdownMenuItem onClick={() => setSelectedDate("7d")} className="rounded-xl py-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/10">
                                    <span className="text-xs font-bold">Last 7 Days</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSelectedDate("all")} className="rounded-xl py-2 cursor-pointer focus:bg-blue-50 dark:focus:bg-blue-900/10">
                                    <span className="text-xs font-bold">Lifetime</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="hidden sm:block">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-[#1a73e8] hover:bg-blue-50 dark:hover:bg-white/5 rounded-xl">
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="end" className="bg-zinc-900 text-white rounded-xl border-none shadow-2xl p-3 max-w-xs transition-all animate-in fade-in zoom-in-95">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[#1a73e8] mb-1">Account Tooltip</p>
                                    <p className="text-xs font-medium leading-relaxed opacity-80">This view aggregates performance data for selected accounts and campaigns. Switch filters to drill down into specific creative assets.</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {dataSource === "database" && (
                    <div className="px-4 md:px-6 flex items-center gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-100 dark:border-white/5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 md:px-5 py-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] whitespace-nowrap transition-all relative group h-11",
                                        isActive ? "text-[#1a73e8] dark:text-[#4285f4]" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                    {isActive && <div className="absolute bottom-0 inset-x-4 md:inset-x-5 h-[3px] bg-[#1a73e8] dark:bg-[#4285f4] rounded-t-full" />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {dataSource === "realtime" ? (
                <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950/50 h-[calc(100vh-[header_height])] overflow-hidden relative" style={{ height: "calc(100vh - 120px)" }}>
                    <iframe src="http://localhost:3001" className="absolute inset-0 w-full h-full border-none" title="Realtime Data Dashboard" />
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="px-3 md:px-8 py-8 space-y-8 w-full max-w-full overflow-hidden">
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

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
                            {[
                                { label: "Interactions", value: totalInteractions, color: "text-[#1a73e8]", icon: MousePointer2, id: "interactions", desc: "Total Clicks", info: "Measures how many times people interacted with your ad." },
                                { label: "Impressions", value: totalImpr, color: "text-zinc-900 dark:text-zinc-100", icon: Eye, id: "impr", desc: "Total Reach", info: "The number of times your ad was displayed." },
                                { label: "Avg. CPC", value: `$${avgCpc.toFixed(2)}`, color: "text-zinc-900 dark:text-zinc-100", icon: DollarSign, id: "cpc", desc: "Cost Efficiency", info: "Average cost paid for each click on your ad." },
                                { label: "Conversions", value: totalConversions, color: "text-[#1a73e8]", icon: Check, id: "conv", desc: "Total Acquisitions", info: "The total number of attributed conversions." },
                                { label: "Conv. Value", value: `$${totalConvValue.toLocaleString()}`, color: "text-zinc-900 dark:text-zinc-100", icon: BarChart3, id: "value", desc: "Gross Return", info: "The total value of all attributed conversions." },
                                { label: "Account ROAS", value: `${avgRoas.toFixed(2)}x`, color: "text-[#1a73e8]", icon: TrendingUp, id: "roas", desc: "Efficiency", info: "Return on Ad Spend (Conv Value / Spend)." }
                            ].map((metric) => (
                                <Card key={metric.id} className="relative p-4 md:p-5 border border-zinc-200/50 dark:border-white/5 shadow-lg bg-white/80 dark:bg-[#0c0c0e]/80 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] group transition-all hover:scale-[1.02] duration-500 overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-700" />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 group-hover:scale-110 transition-transform">
                                            <metric.icon className={cn("h-4 w-4", (metric.id === "interactions" || metric.id === "conv" || metric.id === "roas") ? "text-[#1a73e8]" : "text-zinc-400")} />
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 cursor-help transition-colors">
                                                    <Info className="h-3.5 w-3.5 text-zinc-300" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-zinc-900 text-white dark:bg-zinc-800 rounded-xl p-2 border-none">
                                                <p className="text-[10px] font-bold">{metric.info}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 relative z-10">
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400">{metric.label}</p>
                                        <h2 className={cn("text-lg md:text-2xl font-black tracking-tighter", metric.color)}>
                                            {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
                                        </h2>
                                        <p className="text-[7px] md:text-[9px] font-bold text-zinc-400/60 uppercase tracking-widest">{metric.desc}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        {renderTabContent()}
                    </div>
                </div>
            )}
        </TooltipProvider>
    )
}
